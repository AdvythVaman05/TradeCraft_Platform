import { NavLink, Outlet } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'
import ChatDrawer from './ChatDrawer.jsx'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/listings', label: 'Listings' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/seller', label: 'Seller Dashboard' },
  { to: '/account', label: 'Account' },
]

function Layout() {
  const {
    state: { toast, stats, isAuthenticated, demoMode },
    api: { logout },
  } = useAppContext()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-grid">
          <div className="logo">
            <span className="logo-mark">TC</span>
            <div>
              <p className="logo-title">TradeCraft</p>
              <p className="logo-tagline">Skill exchange marketplace</p>
            </div>
          </div>
          <nav>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <div className="stat-pill">
              <span>Listings</span>
              <strong>{stats.listings}</strong>
            </div>
            <div className="stat-pill">
              <span>Transactions</span>
              <strong>{stats.transactions}</strong>
            </div>
            {demoMode && <span className="badge soft">Demo</span>}
            {isAuthenticated ? (
              <button className="ghost-btn" onClick={logout}>
                Logout
              </button>
            ) : (
              <NavLink to="/" className="ghost-btn">
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} TradeCraft Platform</p>
        </div>
      </footer>

      {toast && (
        <div className={`toast ${toast.variant}`}>
          <p>{toast.message}</p>
        </div>
      )}
      <ChatDrawer />
    </div>
  )
}

export default Layout

