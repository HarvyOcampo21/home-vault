import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/',        label: 'Home',    icon: '⌂' },
  { to: '/scan',    label: 'Scan',    icon: '⊕', primary: true },
  { to: '/history', label: 'History', icon: '◷' },
  { to: '/settle',  label: 'Settle',  icon: '⇄' },
  { to: '/month',   label: 'Month',   icon: '☷' },
]

export default function BottomNav() {
  return (
    <nav style={styles.nav}>
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          style={({ isActive }) => ({
            ...styles.tab,
            ...(tab.primary ? styles.tabPrimary : {}),
            ...(isActive && !tab.primary ? styles.tabActive : {}),
          })}
        >
          <span style={tab.primary ? styles.iconPrimary : styles.icon}>{tab.icon}</span>
          {!tab.primary && <span style={styles.label}>{tab.label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    height: 'var(--nav-height)',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 'env(safe-area-inset-bottom)',
    zIndex: 100,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    color: 'var(--text-3)',
    textDecoration: 'none',
    flex: 1,
    padding: '6px 0',
    transition: 'color 0.15s',
  },
  tabActive: {
    color: 'var(--green-dark)',
  },
  tabPrimary: {
    flex: '0 0 56px',
  },
  icon: {
    fontSize: 20,
    lineHeight: 1,
  },
  iconPrimary: {
    fontSize: 28,
    lineHeight: 1,
    width: 52,
    height: 52,
    background: 'var(--green-dark)',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(27,94,59,0.35)',
    marginTop: -20,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
}
