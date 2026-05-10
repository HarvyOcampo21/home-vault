import { useState, useEffect } from 'react'
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

  // Build month options (last 6 months)
  const monthOptions = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })
    monthOptions.push({ val, label })
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

        {!isConfigured && (
          <div className="empty-state">
            <div className="icon">⚙️</div>
            <h3>Not configured</h3>
            <p>Set up your API keys in Settings first.</p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {!loading && records.length === 0 && isConfigured && !error && (
          <div className="empty-state">
            <div className="icon">🧾</div>
            <h3>No receipts yet</h3>
            <p>Scan your first receipt to see it here.</p>
          </div>
        )}

        {records.map(rec => (
          <ReceiptRow
            key={rec.txnId}
            rec={rec}
            expanded={expanded === rec.txnId}
            onToggle={() => setExpanded(expanded === rec.txnId ? null : rec.txnId)}
          />
        ))}
      </div>
    </div>
  )
}

function ReceiptRow({ rec, expanded, onToggle }) {
  return (
    <div className="card" style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
      <button onClick={onToggle} style={styles.row}>
        <div style={styles.rowLeft}>
          <p style={styles.store}>{rec.store || 'Unknown store'}</p>
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
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>Ref: #{rec.receiptNumber}</p>
          )}
          {rec.items && rec.items.length > 0 && (
            <>
              <div className="divider" />
              <p className="section-label">Items</p>
              {rec.items.map((item, i) => (
                <div key={i} style={styles.itemRow}>
                  <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{item.name}</span>
                  <span className={`badge badge-${item.category === 'house' ? 'house' : 'personal'}`} style={{ fontSize: 11 }}>
                    {item.category === 'house' ? '🏠' : `👤 ${item.forMember}`}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
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

const styles = {
  filters: { display: 'flex', gap: 8, marginBottom: 16 },
  select: { flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-mid)', background: 'var(--surface)', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)' },
  row: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  rowLeft: { flex: 1 },
  store: { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 },
  rowSub: { fontSize: 12, color: 'var(--text-3)' },
  amount: { fontSize: 15, fontWeight: 700, color: 'var(--green-dark)' },
  chevron: { fontSize: 10, color: 'var(--text-3)' },
  details: { padding: '0 14px 14px', borderTop: '1px solid var(--border)' },
  detailRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' },
  itemRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' },
  error: { background: 'var(--red-pale)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 14, marginBottom: 12 },
}
