import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Header({ title, showBack = false, right = null, onBack = null }) {
  const navigate   = useNavigate()
  const { currentMember } = useApp()

  function handleBack() {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        {showBack ? (
          <button onClick={handleBack} style={styles.iconBtn} aria-label="Back">
            ←
          </button>
        ) : (
          <span style={styles.logo}>🏠</span>
        )}
      </div>

      <h1 style={styles.title}>{title}</h1>

      <div style={styles.right}>
        {right || (
          <button
            onClick={() => navigate('/select')}
            style={styles.avatar}
            aria-label="Switch member"
          >
            {currentMember?.initials || '?'}
          </button>
        )}
      </div>
    </header>
  )
}

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    height: 'var(--header-height)',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    zIndex: 100,
  },
  left:  { width: 40, display: 'flex', alignItems: 'center' },
  right: { width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text)',
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    color: 'var(--green-dark)',
    padding: '4px 8px',
    borderRadius: 8,
  },
  logo: { fontSize: 22 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--green-pale)',
    color: 'var(--green-dark)',
    fontWeight: 700,
    fontSize: 11,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
