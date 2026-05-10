import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'
import { getMonthEnd } from '../services/sheets'

export default function MonthEnd() {
  const { sheetsUrl, isConfigured, currentMember } = useApp()

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [selMonth, setSelMonth] = useState(month)
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Build month options (last 6 months)
  const monthOptions = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })
    monthOptions.push({ val, label })
  }

  useEffect(() => {
    if (isConfigured) load()
  }, [selMonth, isConfigured])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await getMonthEnd(sheetsUrl, selMonth)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const members = data?.members || []
  const houseTotal = data?.houseTotal || 0
  const houseShare = houseTotal / 10

  return (
    <div className="screen fade-in">
      <Header title="Month End" />

      <div className="scroll-area">
        <select
          value={selMonth}
          onChange={e => setSelMonth(e.target.value)}
          style={styles.select}
        >
          {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>

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

        {!loading && data && (
          <>
            {/* House fund summary */}
            <div className="card" style={styles.houseCard}>
              <p style={styles.houseLabel}>🏠 Total house expenses</p>
              <p style={styles.houseAmount}>AED {houseTotal.toFixed(2)}</p>
              <p style={styles.houseSub}>Each member's share: <strong>AED {houseShare.toFixed(2)}</strong></p>
            </div>

            {/* Per member breakdown */}
            <p className="section-label" style={{ marginTop: 16 }}>Everyone's total</p>

            {members
              .sort((a, b) => b.totalOwed - a.totalOwed)
              .map(member => (
                <MemberCard
                  key={member.name}
                  member={member}
                  houseShare={houseShare}
                  isCurrentUser={member.name === currentMember.name}
                />
              ))
            }

            {members.length === 0 && (
              <div className="empty-state">
                <div className="icon">📊</div>
                <h3>No data yet</h3>
                <p>Scan some receipts this month to see the breakdown.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MemberCard({ member, houseShare, isCurrentUser }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card" style={{ ...styles.memberCard, ...(isCurrentUser ? styles.memberCardMe : {}) }}>
      <button onClick={() => setOpen(o => !o)} style={styles.memberRow}>
        <div style={styles.avatar}>
          {member.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={styles.memberName}>
            {member.name}
            {isCurrentUser && <span style={styles.youBadge}> you</span>}
          </p>
          <p style={styles.memberSub}>{member.receiptsCount || 0} receipt{member.receiptsCount !== 1 ? 's' : ''} scanned</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={styles.memberTotal}>AED {Number(member.totalOwed || 0).toFixed(2)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>total owed</p>
        </div>
        <span style={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={styles.breakdown}>
          <div className="divider" />
          <BreakRow label="House share"        value={houseShare.toFixed(2)} />
          <BreakRow label="Personal spend"     value={Number(member.personalSpend || 0).toFixed(2)} />
          <BreakRow label="IOUs owed"          value={Number(member.iousOwed || 0).toFixed(2)} />
          <BreakRow label="IOUs receivable"    value={Number(member.iousReceivable || 0).toFixed(2)} minus />
          <div className="divider" />
          <BreakRow label="Total owed" value={Number(member.totalOwed || 0).toFixed(2)} bold />
        </div>
      )}
    </div>
  )
}

function BreakRow({ label, value, bold, minus }) {
  return (
    <div style={styles.breakRow}>
      <span style={{ fontSize: 13, color: bold ? 'var(--text)' : 'var(--text-2)', fontWeight: bold ? 700 : 400 }}>
        {minus ? '− ' : ''}{label}
      </span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: minus ? 'var(--green-dark)' : 'var(--text)' }}>
        AED {value}
      </span>
    </div>
  )
}

const styles = {
  select: { width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-mid)', background: 'var(--surface)', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', marginBottom: 16 },
  houseCard: { background: 'var(--green-xpale)', borderColor: 'var(--green-light)', textAlign: 'center', padding: 20 },
  houseLabel: { fontSize: 13, color: 'var(--green-dark)', marginBottom: 6, fontWeight: 600 },
  houseAmount: { fontSize: 32, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 4 },
  houseSub: { fontSize: 14, color: 'var(--text-2)' },
  memberCard: { marginBottom: 10, padding: 0, overflow: 'hidden' },
  memberCardMe: { borderColor: 'var(--green-light)', background: 'var(--green-xpale)' },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  avatar: { width: 38, height: 38, borderRadius: '50%', background: 'var(--green-pale)', color: 'var(--green-dark)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  memberName: { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  memberSub:  { fontSize: 12, color: 'var(--text-3)', marginTop: 2 },
  memberTotal: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  youBadge: { fontSize: 11, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-pale)', borderRadius: 4, padding: '1px 5px', marginLeft: 4 },
  chevron: { fontSize: 10, color: 'var(--text-3)' },
  breakdown: { padding: '0 14px 14px' },
  breakRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' },
  error: { background: 'var(--red-pale)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 14 },
}
