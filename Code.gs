// ============================================================
// Home Vault — Google Apps Script Backend
// Deploy as a Web App (Execute as: Me, Access: Anyone)
// ============================================================

const SHEET_NAMES = {
  TRANSACTIONS: 'Transactions',
  ITEMS:        'LineItems',
  IOUS:         'IOUs',
  SUMMARY:      'MonthlySummary',
}

const MEMBERS = ['Angella','Ben','Alvin','Sachika','Harvy','Ruby','Jobel','Chu','Eva','Ananias']

// ── Entry points ────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action
  try {
    let result
    if      (action === 'getSummary')  result = getSummary(e.parameter.month)
    else if (action === 'getIOUs')     result = getAllIOUs()
    else if (action === 'getHistory')  result = getHistory(e.parameter.member, e.parameter.month)
    else if (action === 'getMonthEnd') result = getMonthEnd(e.parameter.month)
    else result = { error: 'Unknown action' }
    return jsonResponse(result)
  } catch(err) {
    return jsonResponse({ error: err.message })
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const action  = payload.action
    let result
    if      (action === 'saveReceipt') result = saveReceipt(payload)
    else if (action === 'settleIOU')   result = settleIOU(payload.iouId)
    else result = { error: 'Unknown action' }
    return jsonResponse(result)
  } catch(err) {
    return jsonResponse({ error: err.message })
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── Setup: create sheets if missing ─────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  ensureSheet(ss, SHEET_NAMES.TRANSACTIONS, [
    'TxnID','Date','ScannedBy','Store','ReceiptNumber','HouseTotal','PersonalTotal','CreatedAt'
  ])
  ensureSheet(ss, SHEET_NAMES.ITEMS, [
    'TxnID','Date','ItemName','Amount','Category','ForMember','BoughtBy','Status'
  ])
  ensureSheet(ss, SHEET_NAMES.IOUS, [
    'IOUID','TxnID','Date','Item','Amount','BoughtBy','OwedBy','Status','DateSettled'
  ])
  ensureSheet(ss, SHEET_NAMES.SUMMARY, [
    'Month','Member','HouseShare','PersonalSpend','IousOwed','IousReceivable','TotalOwed','UpdatedAt'
  ])
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1B5E3B')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
    sheet.setFrozenRows(1)
  }
  return sheet
}

// ── Save receipt ─────────────────────────────────────────────
function saveReceipt(payload) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet()
  const now  = new Date().toISOString()

  // Transactions sheet
  const txnSheet = getOrCreateSheet(ss, SHEET_NAMES.TRANSACTIONS)
  txnSheet.appendRow([
    payload.txnId,
    payload.date,
    payload.scannedBy,
    payload.store,
    payload.receiptNumber || '',
    payload.houseTotal,
    payload.personalTotal,
    now,
  ])

  // Line items + IOUs
  const itemSheet = getOrCreateSheet(ss, SHEET_NAMES.ITEMS)
  const iouSheet  = getOrCreateSheet(ss, SHEET_NAMES.IOUS)

  for (const item of payload.items) {
    itemSheet.appendRow([
      payload.txnId,
      payload.date,
      item.name,
      item.amount,
      item.category,
      item.forMember || '',
      item.boughtBy,
      item.status || 'paid',
    ])

    // Create IOU if personal item for someone else and unpaid
    if (
      item.category === 'personal' &&
      item.forMember &&
      item.forMember !== item.boughtBy &&
      item.status === 'unpaid'
    ) {
      const iouId = `IOU-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
      iouSheet.appendRow([
        iouId,
        payload.txnId,
        payload.date,
        item.name,
        item.amount,
        item.boughtBy,
        item.forMember,
        'unpaid',
        '',
      ])
    }
  }

  // Refresh monthly summary
  refreshSummary(payload.date.substring(0, 7))

  return { success: true, txnId: payload.txnId }
}

// ── Settle IOU ───────────────────────────────────────────────
function settleIOU(iouId) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet()
  const sheet    = ss.getSheetByName(SHEET_NAMES.IOUS)
  if (!sheet) return { error: 'IOUs sheet not found' }

  const data = sheet.getDataRange().getValues()
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === iouId) {
      sheet.getRange(i + 1, 8).setValue('paid')
      sheet.getRange(i + 1, 9).setValue(new Date().toISOString())
      return { success: true }
    }
  }
  return { error: 'IOU not found' }
}

// ── Get all IOUs ──────────────────────────────────────────────
function getAllIOUs() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(SHEET_NAMES.IOUS)
  if (!sheet) return { ious: [] }

  const data = sheet.getDataRange().getValues()
  if (data.length < 2) return { ious: [] }

  const ious = data.slice(1).map(row => ({
    id:          row[0],
    txnId:       row[1],
    date:        row[2],
    item:        row[3],
    amount:      row[4],
    boughtBy:    row[5],
    owedBy:      row[6],
    status:      row[7],
    dateSettled: row[8],
  }))

  return { ious }
}

// ── Get history ───────────────────────────────────────────────
function getHistory(member, month) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet()
  const txnSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS)
  const itemSheet= ss.getSheetByName(SHEET_NAMES.ITEMS)
  if (!txnSheet) return { records: [] }

  const txnData  = txnSheet.getDataRange().getValues()
  const itemData = itemSheet ? itemSheet.getDataRange().getValues() : []

  const records = []
  for (let i = 1; i < txnData.length; i++) {
    const row = txnData[i]
    const rowMonth = String(row[1]).substring(0, 7)
    if (month && rowMonth !== month) continue
    if (member && row[2] !== member) continue

    const txnId = row[0]
    const items = itemData.slice(1)
      .filter(r => r[0] === txnId)
      .map(r => ({ name: r[2], amount: r[3], category: r[4], forMember: r[5] }))

    records.push({
      txnId,
      date:          row[1],
      scannedBy:     row[2],
      store:         row[3],
      receiptNumber: row[4],
      houseTotal:    row[5],
      personalTotal: row[6],
      items,
    })
  }

  return { records: records.reverse() }
}

// ── Get summary for dashboard ─────────────────────────────────
function getSummary(month) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet()
  const txnSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS)
  if (!txnSheet) return { houseTotal: 0, members: [] }

  const txnData  = txnSheet.getDataRange().getValues()
  let houseTotal = 0

  for (let i = 1; i < txnData.length; i++) {
    const row      = txnData[i]
    const rowMonth = String(row[1]).substring(0, 7)
    if (rowMonth === month) houseTotal += Number(row[5]) || 0
  }

  const monthData = getMonthEnd(month)
  return {
    houseTotal,
    members: monthData.members,
  }
}

// ── Get month-end breakdown ───────────────────────────────────
function getMonthEnd(month) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet()
  const itemSheet = ss.getSheetByName(SHEET_NAMES.ITEMS)
  const iouSheet  = ss.getSheetByName(SHEET_NAMES.IOUS)
  const txnSheet  = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS)

  // House total for month
  let houseTotal = 0
  const txnData = txnSheet ? txnSheet.getDataRange().getValues() : []
  const receiptCounts = {}
  for (let i = 1; i < txnData.length; i++) {
    const row = txnData[i]
    if (String(row[1]).substring(0, 7) !== month) continue
    houseTotal += Number(row[5]) || 0
    receiptCounts[row[2]] = (receiptCounts[row[2]] || 0) + 1
  }
  const houseShare = houseTotal / MEMBERS.length

  // Personal spend per member
  const personalSpend  = {}
  const iousOwed       = {}
  const iousReceivable = {}
  MEMBERS.forEach(m => { personalSpend[m] = 0; iousOwed[m] = 0; iousReceivable[m] = 0 })

  const itemData = itemSheet ? itemSheet.getDataRange().getValues() : []
  for (let i = 1; i < itemData.length; i++) {
    const row = itemData[i]
    if (String(row[1]).substring(0, 7) !== month) continue
    if (row[4] !== 'personal') continue
    const forMember = row[5] || row[6]
    const boughtBy  = row[6]
    const amount    = Number(row[3]) || 0
    // If bought for yourself
    if (forMember === boughtBy && MEMBERS.includes(forMember)) {
      personalSpend[forMember] = (personalSpend[forMember] || 0) + amount
    }
  }

  // IOUs
  const iouData = iouSheet ? iouSheet.getDataRange().getValues() : []
  for (let i = 1; i < iouData.length; i++) {
    const row = iouData[i]
    if (row[7] !== 'unpaid') continue
    const rowMonth = String(row[2]).substring(0, 7)
    if (rowMonth !== month) continue
    const amount   = Number(row[4]) || 0
    const boughtBy = row[5]
    const owedBy   = row[6]
    if (MEMBERS.includes(owedBy))   iousOwed[owedBy]           = (iousOwed[owedBy] || 0)           + amount
    if (MEMBERS.includes(boughtBy)) iousReceivable[boughtBy]   = (iousReceivable[boughtBy] || 0)   + amount
  }

  const members = MEMBERS.map(name => {
    const totalOwed =
      houseShare +
      (personalSpend[name]  || 0) +
      (iousOwed[name]       || 0) -
      (iousReceivable[name] || 0)

    return {
      name,
      houseShare:       parseFloat(houseShare.toFixed(2)),
      personalSpend:    parseFloat((personalSpend[name]  || 0).toFixed(2)),
      iousOwed:         parseFloat((iousOwed[name]       || 0).toFixed(2)),
      iousReceivable:   parseFloat((iousReceivable[name] || 0).toFixed(2)),
      totalOwed:        parseFloat(Math.max(0, totalOwed).toFixed(2)),
      receiptsCount:    receiptCounts[name] || 0,
    }
  })

  return { month, houseTotal, members }
}

// ── Refresh monthly summary sheet ────────────────────────────
function refreshSummary(month) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.SUMMARY)
  const data  = getMonthEnd(month)
  const now   = new Date().toISOString()

  // Remove existing rows for this month
  const rows = sheet.getDataRange().getValues()
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === month) sheet.deleteRow(i + 1)
  }

  // Append updated rows
  for (const m of data.members) {
    sheet.appendRow([
      month, m.name, m.houseShare, m.personalSpend,
      m.iousOwed, m.iousReceivable, m.totalOwed, now
    ])
  }
}

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || setupSheets() || ss.getSheetByName(name)
}
