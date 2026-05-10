import { useNavigate } from 'react-router-dom'
import { useApp, MEMBERS } from '../context/AppContext'

export default function MemberSelect() {
  const { setCurrentMember, currentMember } = useApp()
  const navigate = useNavigate()

  function select(member) {
    setCurrentMember(member)
    navigate('/')
  }

  return (
    <div className="screen-no-nav fade-in" style={styles.page}>
      <div style={styles.top}>
        <div style={styles.emoji}>🏠</div>
        <h1 style={styles.heading}>Home Vault</h1>
        <p style={styles.sub}>Who's scanning today?</p>
      </div>

      <div style={styles.grid}>
        {MEMBERS.map(member => {
          const isActive = currentMember?.name === member.name
          return (
            <button
              key={member.name}
              onClick={() => select(member)}
              style={{
                ...styles.chip,
                ...(isActive ? styles.chipActive : {}),
              }}
            >
              <div style={{ ...styles.avatar, ...(isActive ? styles.avatarActive : {}) }}>
                {member.initials}
              </div>
              <span style={styles.chipName}>{member.name}</span>
              {isActive && <span style={styles.check}>✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    padding: '48px 20px 32px',
  },
  top: {
    textAlign: 'center',
    marginBottom: 36,
  },
  emoji: { fontSize: 48, marginBottom: 12, lineHeight: 1 },
  heading: { fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  sub: { fontSize: 15, color: 'var(--text-2)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    position: 'relative',
  },
  chipActive: {
    borderColor: 'var(--green-light)',
    background: 'var(--green-xpale)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--green-pale)',
    color: 'var(--green-dark)',
    fontWeight: 700,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarActive: {
    background: 'var(--green-dark)',
    color: '#fff',
  },
  chipName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    flex: 1,
  },
  check: {
    fontSize: 14,
    color: 'var(--green-dark)',
    fontWeight: 700,
  },
}
