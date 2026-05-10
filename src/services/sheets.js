// All writes go to the Google Apps Script web app URL
// The script handles writing to the correct sheet

async function post(scriptUrl, payload) {
  if (!scriptUrl) throw new Error('Google Sheets not configured. Please add the Script URL in Settings.')

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // avoid CORS preflight
    body: JSON.stringify(payload),
    redirect: 'follow',
  })

  if (!response.ok) throw new Error(`Sheets error: ${response.status}`)

  const text = await response.text()
  try { return JSON.parse(text) }
  catch { return { success: true } }
}

async function get(scriptUrl, params) {
  if (!scriptUrl) throw new Error('Google Sheets not configured.')
  const qs  = new URLSearchParams({ ...params }).toString()
  const url = `${scriptUrl}?${qs}`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Sheets error: ${res.status}`)
  return res.json()
}

// Save a completed receipt with all its items
export async function saveReceipt(scriptUrl, { receipt, items, scannedBy }) {
  const txnId = `TXN-${Date.now()}`
  const houseItems    = items.filter(i => i.category === 'house')
  const personalItems = items.filter(i => i.category === 'personal')

  const houseTotal    = houseItems.reduce((s, i) => s + i.totalPrice, 0)
  const personalTotal = personalItems.reduce((s, i) => s + i.totalPrice, 0)

  return post(scriptUrl, {
    action: 'saveReceipt',
    txnId,
    date: receipt.date,
    scannedBy,
    store: receipt.store,
    receiptNumber: receipt.receiptNumber,
    houseTotal: houseTotal.toFixed(2),
    personalTotal: personalTotal.toFixed(2),
    items: items.map(item => ({
      txnId,
      name: item.name,
      amount: item.totalPrice.toFixed(2),
      category: item.category,
      forMember: item.category === 'personal' ? (item.forMember || scannedBy) : '',
      boughtBy: scannedBy,
      status: item.category === 'personal' && item.forMember && item.forMember !== scannedBy
        ? item.status
        : 'paid',
    })),
  })
}

// Fetch summary data for dashboard
export async function getSummary(scriptUrl, month) {
  return get(scriptUrl, { action: 'getSummary', month })
}

// Fetch all pending IOUs
export async function getIOUs(scriptUrl) {
  return get(scriptUrl, { action: 'getIOUs' })
}

// Mark an IOU as paid
export async function settleIOU(scriptUrl, iouId) {
  return post(scriptUrl, { action: 'settleIOU', iouId })
}

// Fetch history of receipts
export async function getHistory(scriptUrl, { member, month } = {}) {
  return get(scriptUrl, { action: 'getHistory', member: member || '', month: month || '' })
}

// Fetch month-end breakdown
export async function getMonthEnd(scriptUrl, month) {
  return get(scriptUrl, { action: 'getMonthEnd', month })
}
