import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApp, MEMBERS } from '../context/AppContext'
import { saveReceipt } from '../services/sheets'

export default function TagItems() {
  const {
    currentMember, pendingReceipt,
    updateReceiptMeta, addItem, updateItem, removeItem,
    sheetsUrl, showToast, clearReceipt,
  } = useApp()
  const navigate = useNavigate()

  const [saving,      setSaving]      = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [addingItem,  setAddingItem]  = useState(false)
  const [newItem,     setNewItem]     = useState({ name: '', totalPrice: '' })
  const [expandedId,  setExpandedId]  = useState(null)

  const items = pendingReceipt.items

  // ── Save to Sheets ────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (items.length === 0) {
      showToast('Add at least one item first')
      return
    }
    setSaving(true)
    try {
      await saveReceipt(sheetsUrl, {
        receipt: pendingReceipt,
        items,
        scannedBy: currentMember.name,
      })
      clearReceipt()
      showToast('✅ Receipt saved!')
      navigate('/')
    } catch (e) {
      showToast('Error saving: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Add item ──────────────────────────────────────────────────────────────
  function handleAddItem() {
    if (!newItem.name.trim()) { showToast('Enter item name'); return }
    const price = parseFloat(newItem.totalPrice) || 0
    addItem({ name: newItem.name.trim(), totalPrice: price })
    setNewItem({ name: '', totalPrice: '' })
    setAddingItem(false)
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const houseTotal    = items.filter(i => i.category === 'house').reduce((s, i) => s + i.totalPrice, 0)
  const personalTotal = items.filter(i => i.category === 'personal').reduce((s, i) => s + i.totalPrice, 0)

  return (
    <div className="screen fade-in">
      <Header title="Tag Items" showBack />

      <div className="scroll-area">
        {/* Receipt meta */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={styles.metaRow}>
            <div>
              <p style={styles.metaStore}>{pendingReceipt.store || 'Unknown store'}</p>
              <p style={styles.metaSub}>
                {pendingReceipt.date}
                {pendingReceipt.receiptNumber ? ` · #${pendingReceipt.receiptNumber}` : ''}
              </p>
            </div>
            <button onClick={() => setEditingMeta(true)} style={styles.editBtn}>Edit</button>
          </div>
          <div style={styles.metaBadges}>
            <span>Scanned by <strong>{pendingReceipt.scannedBy || currentMember.name}</strong></span>
          </div>
        </div>

        {/* Totals strip */}
        <div style={styles.totals}>
          <TotalPill label="🏠 House" value={houseTotal} color="var(--green-dark)" />
          <TotalPill label="👤 Personal" value={personalTotal} color="var(--blue)" />
          <TotalPill label="Total" value={houseTotal + personalTotal} color="var(--text)" bold />
        </div>

        {/* Items */}
        <p className="section-label" style={{ marginTop: 16 }}>{items.length} items</p>

        {items.length === 0 && (
          <div className="empty-state">
            <div className="icon">🧾</div>
            <h3>No items yet</h3>
            <p>Add items manually or go back and scan a receipt.</p>
          </div>
        )}

        {items.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onChange={(fields) => updateItem(item.id, fields)}
            onDelete={() => { removeItem(item.id); if (expandedId === item.id) setExpandedId(null) }}
            currentMember={currentMember.name}
          />
        ))}

        {/* Add item button */}
        {!addingItem ? (
          <button
            className="btn btn-secondary btn-full"
            style={{ marginTop: 8 }}
            onClick={() => setAddingItem(true)}
          >
            + Add item
          </button>
        ) : (
          <div className="card" style={{ marginTop: 8 }}>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>New item</p>
            <div className="form-group">
              <label>Item name</label>
              <input
                type="text"
                placeholder="e.g. Rice 5kg"
                value={newItem.name}
                onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Price (AED)</label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={newItem.totalPrice}
                onChange={e => setNewItem(n => ({ ...n, totalPrice: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAddingItem(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddItem}>Add</button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 20 }}
          onClick={handleSubmit}
          disabled={saving || items.length === 0}
        >
          {saving ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving…</> : '✅ Save Receipt'}
        </button>
      </div>

      {/* Edit meta modal */}
      {editingMeta && (
        <MetaModal receipt={pendingReceipt} onSave={fields => { updateReceiptMeta(fields); setEditingMeta(false) }} onClose={() => setEditingMeta(false)} />
      )}
    </div>
  )
}

// ── Item card ─────────────────────────────────────────────────────────────
function ItemCard({ item, expanded, onToggle, onChange, onDelete, currentMember }) {
  const isPersonal = item.category === 'personal'
  const forSelf    = !item.forMember || item.forMember === currentMember
  const isIOU      = isPersonal && !forSelf

  return (
    <div className="card" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
      {/* Summary row — always visible */}
      <button onClick={onToggle} style={styles.itemSummary}>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={styles.itemName}>{item.name || 'Unnamed item'}</p>
          <div style={styles.itemBadges}>
            <span className={`badge badge-${item.category === 'house' ? 'house' : 'personal'}`}>
              {item.category === 'house' ? '🏠 House' : `👤 ${item.forMember || currentMember}`}
            </span>
            {isIOU && (
              <span className={`badge badge-${item.status === 'unpaid' ? 'unpaid' : 'paid'}`}>
                {item.status === 'unpaid' ? '🔴 Unpaid' : '✅ Paid'}
              </span>
            )}
          </div>
        </div>
        <span style={styles.itemPrice}>AED {item.totalPrice.toFixed(2)}</span>
        <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded edit area */}
      {expanded && (
        <div style={styles.itemEdit}>
          <div className="form-group">
            <label>Item name</label>
            <input type="text" value={item.name} onChange={e => onChange({ name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Price (AED)</label>
            <input
              type="number" min="0" step="0.01"
              value={item.totalPrice}
              onChange={e => onChange({ totalPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={item.category} onChange={e => onChange({ category: e.target.value, forMember: '', status: 'paid' })}>
              <option value="house">🏠 House (shared)</option>
              <option value="personal">👤 Personal</option>
            </select>
          </div>
          {isPersonal && (
            <div className="form-group">
              <label>Who is this for?</label>
              <select value={item.forMember || currentMember} onChange={e => onChange({ forMember: e.target.value })}>
                {MEMBERS.map(m => (
                  <option key={m.name} value={m.name}>
                    {m.name}{m.name === currentMember ? ' (me)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isPersonal && item.forMember && item.forMember !== currentMember && (
            <div className="form-group">
              <label>Payment status</label>
              <select value={item.status} onChange={e => onChange({ status: e.target.value })}>
                <option value="unpaid">🔴 Unpaid — {item.forMember} will pay me back</option>
                <option value="paid">✅ Already paid</option>
              </select>
            </div>
          )}
          <button className="btn btn-danger btn-full" onClick={onDelete}>🗑 Delete item</button>
        </div>
      )}
    </div>
  )
}

// ── Edit meta modal ───────────────────────────────────────────────────────
function MetaModal({ receipt, onSave, onClose }) {
  const [form, setForm] = useState({
    store: receipt.store,
    date: receipt.date,
    receiptNumber: receipt.receiptNumber,
  })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Edit receipt info</h3>
        <div className="form-group">
          <label>Store / merchant</label>
          <input type="text" value={form.store} onChange={e => setForm(f => ({ ...f, store: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Receipt / reference number</label>
          <input type="text" value={form.receiptNumber} onChange={e => setForm(f => ({ ...f, receiptNumber: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  )
}

function TotalPill({ label, value, color, bold }) {
  return (
    <div style={styles.totalPill}>
      <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: bold ? 700 : 600, color }}>AED {value.toFixed(2)}</p>
    </div>
  )
}

const styles = {
  metaRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  metaStore: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  metaSub:   { fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
  metaBadges:{ fontSize: 12, color: 'var(--text-2)' },
  editBtn: {
    background: 'none', border: '1px solid var(--border-mid)', borderRadius: 8,
    padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    color: 'var(--green-dark)', fontFamily: 'inherit',
  },
  totals: {
    display: 'flex', gap: 8,
  },
  totalPill: {
    flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
  },
  itemSummary: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 14px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left',
  },
  itemName:   { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 },
  itemBadges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  itemPrice:  { fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' },
  chevron:    { fontSize: 10, color: 'var(--text-3)', flexShrink: 0 },
  itemEdit: {
    padding: '0 14px 14px',
    borderTop: '1px solid var(--border)',
  },
}
