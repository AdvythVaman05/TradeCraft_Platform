import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

function Home() {
  const {
    state: { stats, isAuthenticated, demoMode, listings, profile },
    api: { registerUser, loginUser, startTransaction, openChatForListing },
  } = useAppContext()

  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [submitting, setSubmitting] = useState(null)

  const handleRegister = async (event) => {
    event.preventDefault()
    setSubmitting('register')
    try {
      await registerUser(registerForm)
      setRegisterForm({ username: '', email: '', password: '' })
    } catch (error) {
      // Error is already handled in registerUser, but we catch to prevent unhandled rejection
      console.error('Registration error:', error)
    } finally {
      setSubmitting(null)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setSubmitting('login')
    try {
      await loginUser(loginForm)
      setLoginForm({ username: '', password: '' })
    } catch (error) {
      // Error is already handled in loginUser, but we catch to prevent unhandled rejection
      console.error('Login error:', error)
    } finally {
      setSubmitting(null)
    }
  }

  const featuredListings = listings.slice(0, 3)
  const myListings = isAuthenticated && profile ? listings.filter((listing) => listing.provider?.id === profile.id) : []

  const renderListingCard = (listing) => {
    const rupee = listing.price_rupees ? `₹${Number(listing.price_rupees).toLocaleString('en-IN')}` : null
    const tc = listing.price_timecredits ? `${listing.price_timecredits} TC` : null
    const isSeller = isAuthenticated && profile && listing.provider?.id === profile.id
    const isBought = isAuthenticated && profile && Array.isArray(profile.bought_listings) && profile.bought_listings.includes(listing.id)
    
    return (
      <article className="listing-card" key={`home-${listing.id}`}>
        <p className="eyebrow">{listing.provider?.username || 'Seller'}</p>
        <h3>{listing.title}</h3>
        <p>{listing.description}</p>
        <div className="listing-meta">
          <span>{listing.location || 'Remote / Online'}</span>
          <span>{new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
        {!isSeller && listing.provider?.upi_id && (
          <p className="hint">
            Seller UPI ID: <strong>{listing.provider.upi_id}</strong>
          </p>
        )}
        <div className="action-row">
          {rupee && <span className="price-chip">{rupee}</span>}
          {tc && <span className="price-chip">{tc}</span>}
          {isSeller && <span className="badge soft">Your listing</span>}
          {isBought && <span className="badge soft" style={{ background: '#6b7280', color: '#fff' }}>Already bought</span>}
        </div>
        {isSeller ? (
          <div className="action-row">
            <p className="hint">This is your listing. Manage it from the Seller Dashboard.</p>
          </div>
        ) : (
          <div className="action-row">
            <button className="ghost-btn" onClick={() => startTransaction(listing.id, 'UPI')} disabled={isBought}>
              Start UPI trade
            </button>
            {tc && (
              <button className="ghost-btn" onClick={() => startTransaction(listing.id, 'TC')} disabled={isBought}>
                Use time credits
              </button>
            )}
            <button className="primary-btn" onClick={() => openChatForListing(listing)}>
              Chat with seller
            </button>
          </div>
        )}
      </article>
    )
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Time-credit powered community</p>
            <h1>Trade skills, earn time credits, and grow together.</h1>
            <p className="lede">
              Post the skills you can share, discover experts around you, and transact instantly with UPI or time
              credits.
            </p>
            <div className="cta-row">
              <Link className="primary-btn" to="/listings">
                Browse listings
              </Link>
              <Link className="ghost-btn" to="/account">
                Manage account
              </Link>
            </div>
          </div>
          <div className="hero-card">
            <p className="hero-card-title">Live platform stats</p>
            <div className="hero-stats">
              <div>
                <p className="stat-value">{stats.listings}</p>
                <p className="stat-label">Active listings</p>
              </div>
              <div>
                <p className="stat-value">{stats.transactions}</p>
                <p className="stat-label">Transactions</p>
              </div>
              <div>
                <p className="stat-value">{stats.timeCredits}</p>
                <p className="stat-label">Your TC balance</p>
              </div>
            </div>
            <p className="hint">
              {demoMode
                ? 'You are previewing TradeCraft in offline demo mode.'
                : (!isAuthenticated ? 'Sign in to create listings and manage your balance.' : '')}
            </p>
          </div>
        </div>
      </section>

      {isAuthenticated && myListings.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Your listings</p>
                <h2>Everything you are offering</h2>
              </div>
            </div>
            <div className="listing-grid">
              {myListings.map((listing) => (
                <article className="listing-card" key={`my-${listing.id}`}>
                  <p className="eyebrow">Your listing</p>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <div className="listing-meta">
                    <span>{listing.location || 'Remote / Online'}</span>
                    <span>{new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="action-row">
                    {listing.price_rupees && (
                      <span className="price-chip">
                        ₹{Number(listing.price_rupees).toLocaleString('en-IN')}
                      </span>
                    )}
                    {listing.price_timecredits && <span className="price-chip">{listing.price_timecredits} TC</span>}
                  </div>
                  <p className="hint">Manage full details from the Seller Dashboard.</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {isAuthenticated ? (
        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Just for you</p>
                <h2>Listings you can act on right away</h2>
              </div>
              <Link className="ghost-btn" to="/listings">
                View all
              </Link>
            </div>
            {featuredListings.length === 0 ? (
              <p className="hint">No listings yet—create one from your account page.</p>
            ) : (
              <div className="listing-grid">{featuredListings.map((listing) => renderListingCard(listing))}</div>
            )}
          </div>
        </section>
      ) : (
        <section className="section auth-grid">
          <div className="container section-grid two-column">
            <article className="card">
              <h2>Create an account</h2>
              <form className="stack" onSubmit={handleRegister}>
                <label>
                  Username
                  <input
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
                    required
                    placeholder="jane_doe"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="jane@example.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </label>
                <button type="submit" className="primary-btn" disabled={submitting === 'register'}>
                  {submitting === 'register' ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            </article>

            <article className="card">
              <h2>Sign in</h2>
              <form className="stack" onSubmit={handleLogin}>
                <label>
                  Username
                  <input
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                    required
                    placeholder="jane_doe"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </label>
                <button type="submit" className="primary-btn" disabled={submitting === 'login'}>
                  {submitting === 'login' ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              {/* JWT token hint removed as requested */}
            </article>
          </div>
        </section>
      )}
    </>
  )
}

export default Home

