import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { setCurrentMember, currentMember, isConfigured } = useApp()
  const navigate = useNavigate()

  function handleSwitchMember() {
    setCurrentMember(null)
    navigate('/select')
  }

  return (
    <div className="screen fade-in">
      <Header title="Settings" showBack />

      <div className="scroll-area">

        <p className="section-label">Current member</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={styles.memberRow}>
            <div style={styles.avatar}>{currentMember?.initials}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{currentMember?.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Tap below to switch</p>
            </div>
          </div>
          <button className="btn btn-secondary btn-full" style={{ marginTop: 12 }} onClick={handleSwitchMember}>
            Switch member
          </button>
        </div>

        <p className="section-label">App status</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <StatusRow label="Gemini AI (scanning)"    ok={isConfigured} />
          <StatusRow label="Google Sheets (storage)" ok={isConfigured} />
          <StatusRow label="Members" ok sub="10 members" />
          <StatusRow label="Currency" ok sub="AED" />
          {!isConfigured && (
            <div style={styles.warn}>
              ⚠️ App not fully configured. Contact the person who set this up.
            </div>
          )}
        </div>

        <p className="section-label">About</p>
        <div className="card">
          <AboutRow label="App"      value="Home Vault" />
          <AboutRow label="Members" value="10" />
          <AboutRow label="Currency" value="AED" />
          <AboutRow label="Split"    value="Equal (÷ 10)" />
        </div>

      </div>
    </div>
  )
}

function StatusRow({ label, ok, sub }) {
  return (
    <div style={styles.statusRow}>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--green-dark)' : 'var(--red)' }}>
          {ok ? '✓ Ready' : '✗ Not set'}
        </span>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</p>}
      </div>
    </div>
  )
}

function AboutRow({ label, value }) {
  return (
    <div style={styles.statusRow}>
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

const styles = {
  memberRow: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: '50%',
    background: 'var(--green-pale)', color: 'var(--green-dark)',
    fontWeight: 700, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statusRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
  warn: {
    marginTop: 12, padding: '10px 12px',
    background: 'var(--amber-pale)', borderRadius: 'var(--radius-sm)',
    fontSize: 13, color: '#92400E',
  },
}
