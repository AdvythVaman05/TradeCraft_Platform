import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'
import ChatDrawer from './ChatDrawer.jsx'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'

const authenticatedNav = [
  { to: '/discover', label: 'Discover' },
  { to: '/exchanges', label: 'My Exchanges' },
  { to: '/workspace', label: 'Workspace' },
]

const anonymousNav = [
  { to: '/discover', label: 'Discover' },
]

function Layout() {
  const {
    state: { toast, isAuthenticated, profile, demoMode },
    api: { logout },
  } = useAppContext()
  const location = useLocation()

  const links = isAuthenticated ? authenticatedNav : anonymousNav

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo-link">
            <motion.img 
              src="/logo.jpg" 
              alt="TradeCraft Mark" 
              className="logo-img"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <span className="logo-text">TradeCraft</span>
          </Link>
          
          <nav className="nav-links">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          
          <div className="nav-links">
            {demoMode && <span className="tag amber">Demo Mode</span>}
            
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="tc-pill" style={{ textDecoration: 'none' }}>
                  <span className="tc-label">TC</span>
                  {profile?.time_credits ?? 0}
                </Link>
                <Link to="/profile" className="nav-link">
                  {profile?.username}
                </Link>
                <button className="btn btn-ghost" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn btn-primary">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer style={{ padding: '3rem 0', background: 'var(--bg-dark)', color: 'rgba(255,255,255,0.7)', marginTop: 'auto' }}>
        <div className="container flex-between">
          <div className="flex-center gap-2">
            <img src="/logo.jpg" alt="TC" style={{ width: 24, height: 24, borderRadius: 6, opacity: 0.5 }} />
            <span>TradeCraft &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex-center gap-3">
            <span>Community Skill Exchange</span>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {toast && (
          <motion.div 
            className={`toast ${toast.variant}`}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <ChatDrawer />
    </div>
    </MotionConfig>
  )
}

export default Layout
