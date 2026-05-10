import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'
import { getIOUs, settleIOU } from '../services/sheets'

export default function SettleUp() {
  const { sheetsUrl, isConfigured, currentMember, showToast } = useApp()

  const [ious,    setIous]    = useState([])
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('mine') // 'mine' | 'all'
  const [settling, setSettling] = useState(null)

  useEffect(() => {
    if (isConfigured) load()
  }, [isConfigured])

  async function load() {
    setLoading(true)
    try {
      const data = await getIOUs(sheetsUrl)
      setIous(data?.ious || [])
    } catch (e) {
      showToast('Could not load IOUs')
    } finally {
      setLoading(false)
    }
  }

  async function handleSettle(iou) {
    setSettling(iou.id)
    try {
      await settleIOU(sheetsUrl, iou.id)
      setIous(prev => prev.map(i => i.id === iou.id ? { ...i, status: 'paid' } : i))
      showToast(`✅ Marked as paid`)
    } catch (e) {
      showToast('Error: ' + e.message)
    } finally {
      setSettling(null)
    }
  }

  const unpaid = ious.filter(i => i.status === 'unpaid')

  const myDebts    = unpaid.filter(i => i.owedBy   === currentMember.name)
  const owedToMe   = unpaid.filter(i => i.boughtBy === currentMember.name)
  const allUnpaid  = unpaid

  const displayed = tab === 'mine'
    ? [...myDebts, ...owedToMe]
    : allUnpaid

  const myDebtTotal  = myDebts.reduce((s, i)  => s + Number(i.amount), 0)
  const owedTotal    = owedToMe.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="screen fade-in">
      <Header title="Settle Up" />

      <div className="scroll-area">
        {/* My summary chips */}
        <div style={styles.chips}>
          <SummaryChip label="I owe" value={myDebtTotal} color="var(--red)" />
          <SummaryChip label="Owed to me" value={owedTotal} color="var(--green-dark)" />
        </div>

        {/* Tab switch */}
        <div style={styles.tabs}>
          <button onClick={() => setTab('mine')} style={{ ...styles.tab, ...(tab === 'mine' ? styles.tabActive : {}) }}>
            My IOUs
          </button>
          <button onClick={() => setTab('all')} style={{ ...styles.tab, ...(tab === 'all' ? styles.tabActive : {}) }}>
            All pending
          </button>
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

        {!loading && displayed.length === 0 && isConfigured && (
          <div className="empty-state">
            <div className="icon">🎉</div>
            <h3>All clear!</h3>
            <p>No pending IOUs {tab === 'mine' ? 'for you' : 'in the house'}.</p>
          </div>
        )}

        {displayed.map(iou => (
          <IOUCard
            key={iou.id}
            iou={iou}
            currentMember={currentMember.name}
            onSettle={() => handleSettle(iou)}
            settling={settling === iou.id}
          />
        ))}
      </div>
    </div>
  )
}

function IOUCard({ iou, currentMember, onSettle, settling }) {
  const iOwe     = iou.owedBy   === currentMember
  const owesMe   = iou.boughtBy === currentMember

  return (
    <div className="card" style={{ ...styles.card, borderLeftColor: iOwe ? 'var(--red)' : owesMe ? 'var(--green-dark)' : 'var(--border-mid)' }}>
      <div style={styles.cardTop}>
        <div style={{ flex: 1 }}>
          <p style={styles.itemName}>{iou.item}</p>
          <div style={styles.sub}>
            {iOwe ? (
              <span>You owe <strong>{iou.boughtBy}</strong></span>
            ) : owesMe ? (
              <span><strong>{iou.owedBy}</strong> owes you</span>
            ) : (
              <span><strong>{iou.owedBy}</strong> owes <strong>{iou.boughtBy}</strong></span>
            )}
            <span style={{ color: 'var(--text-3)' }}>· {iou.date}</span>
          </div>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: iOwe ? 'var(--red)' : 'var(--green-dark)' }}>
          AED {Number(iou.amount).toFixed(2)}
        </span>
      </div>

      {(iOwe || owesMe) && (
        <button
          className="btn btn-secondary btn-full"
          style={{ marginTop: 10 }}
          onClick={onSettle}
          disabled={settling}
        >
          {settling
            ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
            : iOwe ? '✅ I paid this' : '✅ They paid me'
          }
        </button>
      )}
    </div>
  )
}

function SummaryChip({ label, value, color }) {
  return (
    <div style={{ ...styles.chip, borderColor: color + '33', background: color + '0D' }}>
      <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color }}>AED {value.toFixed(2)}</p>
    </div>
  )
}

const styles = {
  chips: { display: 'flex', gap: 10, marginBottom: 16 },
  chip:  { flex: 1, border: '1.5px solid', borderRadius: 'var(--radius-md)', padding: '12px 14px' },
  tabs:  { display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, gap: 4 },
  tab:   { flex: 1, padding: '8px 0', border: 'none', borderRadius: 10, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer' },
  tabActive: { background: 'var(--green-dark)', color: '#fff' },
  card:  { marginBottom: 10, borderLeft: '3px solid' },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  itemName: { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  sub: { fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 6, flexWrap: 'wrap' },
}
