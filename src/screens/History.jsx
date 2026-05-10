import { useState, useEffect, useMemo } from 'react'
import Header from '../components/Header'
import { useApp, MEMBERS } from '../context/AppContext'
import { getHistory } from '../services/sheets'

export default function History() {
  const { sheetsUrl, isConfigured, currentMember } = useApp()

  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState(currentMember.name)
  const [expanded, setExpanded] = useState(null)

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selMonth, setSelMonth] = useState(month)

  // Global search across all receipts
  const [globalSearch, setGlobalSearch] = useState('')

  useEffect(() => {
    if (!isConfigured) return
    load()
  }, [filter, selMonth, isConfigured])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await getHistory(sheetsUrl, { member: filter === 'All' ? '' : filter, month: selMonth })
      setRecords(data?.records || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter records by global search
  const filteredRecords = useMemo(() => {
    if (!globalSearch.trim()) return records
    const q = globalSearch.toLowerCase()
    return records.filter(rec =>
      rec.store?.toLowerCase().includes(q) ||
      rec.receiptNumber?.toLowerCase().includes(q) ||
      rec.items?.some(i => i.name?.toLowerCase().includes(q))
    )
  }, [records, globalSearch])

  const monthOptions = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthOptions.push({ val, label: d.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' }) })
  }

  return (
    <div className="screen fade-in">
      <Header title="History" />

      <div className="scroll-area">
        {/* Filters */}
        <div style={styles.filters}>
          <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={styles.select}>
            {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={styles.select}>
            <option value="All">All members</option>
            {MEMBERS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
        </div>

        {/* Global search */}
        {records.length > 0 && (
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search stores, items, ref numbers…"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              style={styles.searchInput}
            />
            {globalSearch && <button onClick={() => setGlobalSearch('')} style={styles.clearBtn}>✕</button>}
          </div>
        )}

        {!isConfigured && (
          <div className="empty-state">
            <div className="icon">⚙️</div>
            <h3>Not configured</h3>
            <p>Set up your API keys in Settings first.</p>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && records.length === 0 && isConfigured && !error && (
          <div className="empty-state">
            <div className="icon">🧾</div>
            <h3>No receipts yet</h3>
            <p>Scan your first receipt to see it here.</p>
          </div>
        )}

        {!loading && globalSearch && filteredRecords.length === 0 && records.length > 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>
            No results for "{globalSearch}"
          </div>
        )}

        {globalSearch && filteredRecords.length > 0 && filteredRecords.length < records.length && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 8 }}>
            Showing {filteredRecords.length} of {records.length} receipts
          </p>
        )}

        {filteredRecords.map(rec => (
          <ReceiptRow
            key={rec.txnId}
            rec={rec}
            expanded={expanded === rec.txnId}
            onToggle={() => setExpanded(expanded === rec.txnId ? null : rec.txnId)}
            highlight={globalSearch}
          />
        ))}
      </div>
    </div>
  )
}

function ReceiptRow({ rec, expanded, onToggle, highlight }) {
  const [itemSearch, setItemSearch] = useState('')

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return rec.items || []
    const q = itemSearch.toLowerCase()
    return (rec.items || []).filter(i => i.name?.toLowerCase().includes(q))
  }, [rec.items, itemSearch])

  // Highlight matching text
  function hl(text) {
    if (!highlight || !text) return text
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'var(--amber-pale)', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + highlight.length)}
        </mark>
        {text.slice(idx + highlight.length)}
      </>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
      <button onClick={onToggle} style={styles.row}>
        <div style={styles.rowLeft}>
          <p style={styles.store}>{hl(rec.store || 'Unknown store')}</p>
          <p style={styles.rowSub}>{rec.date} · by {rec.scannedBy}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={styles.amount}>AED {Number(rec.houseTotal || 0).toFixed(2)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>house</p>
        </div>
        <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={styles.details}>
          <div style={styles.detailRow}>
            <span className="badge badge-house">🏠 House total</span>
            <span style={{ fontWeight: 700 }}>AED {Number(rec.houseTotal || 0).toFixed(2)}</span>
          </div>
          <div style={styles.detailRow}>
            <span className="badge badge-personal">👤 Personal total</span>
            <span style={{ fontWeight: 700 }}>AED {Number(rec.personalTotal || 0).toFixed(2)}</span>
          </div>
          {rec.receiptNumber && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>Ref: #{hl(rec.receiptNumber)}</p>
          )}

          {rec.items && rec.items.length > 0 && (
            <>
              <div className="divider" />

              {/* Item search inside transaction */}
              {rec.items.length > 5 && (
                <div style={{ ...styles.searchWrap, marginBottom: 10 }}>
                  <span style={styles.searchIcon}>🔍</span>
                  <input
                    type="text"
                    placeholder={`Search ${rec.items.length} items…`}
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    style={styles.searchInput}
                  />
                  {itemSearch && <button onClick={() => setItemSearch('')} style={styles.clearBtn}>✕</button>}
                </div>
              )}

              <p className="section-label">
                {itemSearch ? `${filteredItems.length} of ${rec.items.length} items` : `${rec.items.length} items`}
              </p>

              {itemSearch && filteredItems.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>No items match "{itemSearch}"</p>
              )}

              {filteredItems.map((item, i) => (
                <div key={i} style={styles.itemRow}>
                  <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>
                    {itemSearch ? highlight_item(item.name, itemSearch) : item.name}
                  </span>
                  <span className={`badge badge-${item.category === 'house' ? 'house' : 'personal'}`} style={{ fontSize: 11 }}>
                    {item.category === 'house' ? '🏠' : `👤 ${item.forMember}`}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 72, textAlign: 'right' }}>
                    AED {Number(item.amount || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function highlight_item(text, q) {
  if (!text || !q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--amber-pale)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

const styles = {
  filters: { display: 'flex', gap: 8, marginBottom: 10 },
  select: { flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-mid)', background: 'var(--surface)', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)' },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 12 },
  searchIcon: { position: 'absolute', left: 12, fontSize: 14, pointerEvents: 'none', zIndex: 1 },
  searchInput: { width: '100%', padding: '10px 36px', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--border-mid)', background: 'var(--surface)', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', outline: 'none' },
  clearBtn: { position: 'absolute', right: 12, background: 'none', border: 'none', fontSize: 13, color: 'var(--text-3)', cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  rowLeft: { flex: 1 },
  store: { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 },
  rowSub: { fontSize: 12, color: 'var(--text-3)' },
  amount: { fontSize: 15, fontWeight: 700, color: 'var(--green-dark)' },
  chevron: { fontSize: 10, color: 'var(--text-3)' },
  details: { padding: '0 14px 14px', borderTop: '1px solid var(--border)' },
  detailRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' },
  itemRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' },
  error: { background: 'var(--red-pale)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 14, marginBottom: 12 },
}
