import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'
import ChatDrawer from './ChatDrawer.jsx'

const navLinks = [
  { to: '/listings', label: 'Discover' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/seller', label: 'Workspace' },
]

function Layout() {
  const {
    state: { toast, isAuthenticated, profile, demoMode },
    api: { logout },
  } = useAppContext()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-grid">
          <Link to="/" className="logo">
            <span className="logo-mark">TC</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <p className="logo-title">TradeCraft</p>
            </div>
          </Link>
          
          <nav>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          
          <div className="header-actions">
            {demoMode && <span className="badge">Demo Mode</span>}
            
            {isAuthenticated ? (
              <>
                <span className="metadata" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{profile?.username}</span>
                  <span className="badge accent">{profile?.time_credits ?? 0} TC</span>
                </span>
                <Link to="/account" className="ghost-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}>
                  Profile
                </Link>
                <button className="secondary-btn" onClick={logout} style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}>
                  Logout
                </button>
              </>
            ) : (
              <Link to="/" className="primary-btn accent" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer-grid">
          <div>
            <div className="logo-mark mb-2" style={{ fontSize: '1.25rem' }}>TC</div>
            <p className="mb-0">TradeCraft &copy; {new Date().getFullYear()}</p>
            <p className="metadata mt-1">Community skill exchange platform</p>
          </div>
          <div className="footer-links">
            <a href="#terms">Terms of Service</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#help">Help & Support</a>
          </div>
        </div>
      </footer>

      {toast && (
        <div className={`toast ${toast.variant}`}>
          {toast.message}
        </div>
      )}
      <ChatDrawer />
    </div>
  )
}

export default Layout
