import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'
import { getSummary, getIOUs } from '../services/sheets'

export default function Dashboard() {
  const { currentMember, sheetsUrl, isConfigured, showToast } = useApp()
  const navigate = useNavigate()

  const [summary,  setSummary]  = useState(null)
  const [ious,     setIous]     = useState([])
  const [loading,  setLoading]  = useState(false)

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  useEffect(() => {
    if (!isConfigured) return
    loadData()
  }, [isConfigured])

  async function loadData() {
    setLoading(true)
    try {
      const [s, i] = await Promise.all([
        getSummary(sheetsUrl, month),
        getIOUs(sheetsUrl),
      ])
      setSummary(s)
      setIous(i?.ious || [])
    } catch (e) {
      // Silently fail on dashboard — data may not exist yet
    } finally {
      setLoading(false)
    }
  }

  const myData     = summary?.members?.find(m => m.name === currentMember.name)
  const myIOUs     = ious.filter(i => i.owedBy === currentMember.name && i.status === 'unpaid')
  const owedToMe   = ious.filter(i => i.boughtBy === currentMember.name && i.status === 'unpaid')

  return (
    <div className="screen fade-in">
      <Header
        title="Home Vault"
        right={
          <button onClick={() => navigate('/settings')} style={styles.settingsBtn}>⚙</button>
        }
      />

      <div className="scroll-area">
        {/* Greeting */}
        <div style={styles.greeting}>
          <p style={styles.greetSub}>Good {timeOfDay()}</p>
          <h2 style={styles.greetName}>{currentMember.name} 👋</h2>
        </div>

        {!isConfigured && (
          <div className="card" style={styles.setupCard}>
            <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>⚙️ Setup needed</p>
            <p style={{ marginBottom: 14 }}>Add your Gemini API key and Google Sheets URL to get started.</p>
            <button className="btn btn-primary btn-full" onClick={() => navigate('/settings')}>
              Open Settings
            </button>
          </div>
        )}

        {/* This month summary */}
        <p className="section-label" style={{ marginTop: 8 }}>This month — {monthName()}</p>
        <div style={styles.statsGrid}>
          <StatCard
            label="House fund"
            value={`AED ${(summary?.houseTotal || 0).toFixed(2)}`}
            sub={`÷ 10 = AED ${((summary?.houseTotal || 0) / 10).toFixed(2)} each`}
            color="var(--green-dark)"
          />
          <StatCard
            label="My total owed"
            value={`AED ${(myData?.totalOwed || 0).toFixed(2)}`}
            sub="house share + personal"
            color="var(--text)"
          />
        </div>

        {/* My balance breakdown */}
        {myData && (
          <>
            <p className="section-label" style={{ marginTop: 20 }}>My breakdown</p>
            <div className="card">
              <BreakRow label="House share"      value={(myData.houseShare    || 0).toFixed(2)} />
              <BreakRow label="My personal spend" value={(myData.personalSpend || 0).toFixed(2)} info />
              <BreakRow label="IOUs I owe"        value={(myData.iousOwed     || 0).toFixed(2)} />
              <BreakRow label="IOUs owed to me"   value={`-${(myData.iousReceivable || 0).toFixed(2)}`} positive />
              <div className="divider" />
              <BreakRow label="Total owed" value={(myData.totalOwed || 0).toFixed(2)} bold />
            </div>
          </>
        )}

        {/* Pending IOUs */}
        {(myIOUs.length > 0 || owedToMe.length > 0) && (
          <>
            <p className="section-label" style={{ marginTop: 20 }}>Pending IOUs</p>
            <div className="card">
              {myIOUs.map(iou => (
                <div key={iou.id} className="list-row">
                  <span style={styles.iouDot}>●</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{iou.item}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>You owe {iou.boughtBy}</p>
                  </div>
                  <span className="amount-sm" style={{ color: 'var(--red)' }}>AED {Number(iou.amount).toFixed(2)}</span>
                </div>
              ))}
              {owedToMe.map(iou => (
                <div key={iou.id} className="list-row">
                  <span style={{ ...styles.iouDot, color: 'var(--green-dark)' }}>●</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{iou.item}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{iou.owedBy} owes you</p>
                  </div>
                  <span className="amount-sm" style={{ color: 'var(--green-dark)' }}>AED {Number(iou.amount).toFixed(2)}</span>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ marginTop: 4 }} onClick={() => navigate('/settle')}>
                Settle up →
              </button>
            </div>
          </>
        )}

        {/* Quick actions */}
        <p className="section-label" style={{ marginTop: 20 }}>Quick actions</p>
        <div style={styles.actions}>
          <QuickBtn icon="📷" label="Scan receipt" onClick={() => navigate('/scan')} primary />
          <QuickBtn icon="📋" label="History"      onClick={() => navigate('/history')} />
          <QuickBtn icon="📊" label="Month end"    onClick={() => navigate('/month')} />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</p>
    </div>
  )
}

function BreakRow({ label, value, bold, positive, info }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <span style={{ fontSize: 14, color: bold ? 'var(--text)' : 'var(--text-2)', fontWeight: bold ? 700 : 400 }}>{label}</span>
        {info && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>· for your own record</span>}
      </div>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 600, color: info ? 'var(--text-3)' : positive ? 'var(--green-dark)' : 'var(--text)' }}>
        AED {value}
      </span>
    </div>
  )
}

function QuickBtn({ icon, label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.quickBtn,
        ...(primary ? styles.quickBtnPrimary : {}),
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </button>
  )
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function monthName() {
  return new Date().toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })
}

const styles = {
  settingsBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: 'var(--text-2)',
    padding: 4,
  },
  greeting: { marginBottom: 20 },
  greetSub:  { fontSize: 13, color: 'var(--text-3)', marginBottom: 2 },
  greetName: { fontSize: 24, fontWeight: 700, color: 'var(--text)' },
  statsGrid: { display: 'flex', gap: 10 },
  iouDot: { fontSize: 10, color: 'var(--red)', flexShrink: 0 },
  setupCard: { marginBottom: 20, borderColor: 'var(--amber)', background: 'var(--amber-pale)' },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  quickBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: 'var(--text)',
    transition: 'all 0.15s',
  },
  quickBtnPrimary: {
    background: 'var(--green-xpale)',
    borderColor: 'var(--green-light)',
    color: 'var(--green-dark)',
  },
}
