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
      console.error('Login error:', error)
    } finally {
      setSubmitting(null)
    }
  }

  const featuredListings = listings.slice(0, 3)
  const myListings = isAuthenticated && profile ? listings.filter((listing) => listing.provider?.id === profile.id) : []

  const renderListing = (listing) => {
    const isSeller = isAuthenticated && profile && listing.provider?.id === profile.id
    const isBought = isAuthenticated && profile && Array.isArray(profile.bought_listings) && profile.bought_listings.includes(listing.id)
    
    return (
      <article className="listing-item" key={`home-${listing.id}`}>
        <div className="listing-content">
          <h3 className="listing-title">{listing.title}</h3>
          <p className="listing-desc">{listing.description}</p>
          <div className="listing-provider">
            Offered by {listing.provider?.username || 'Seller'} &middot; {listing.location || 'Remote'}
          </div>
          {!isSeller && listing.provider?.upi_id && (
            <div className="metadata mt-4">
              Seller UPI: {listing.provider.upi_id}
            </div>
          )}
        </div>
        <div className="listing-aside">
          {listing.price_timecredits && <div className="credit-cost">{listing.price_timecredits} Time Credits</div>}
          {listing.price_rupees && <div className="credit-cost" style={{background: 'var(--surface-alt)', color: 'var(--text-primary)'}}>₹{Number(listing.price_rupees).toLocaleString('en-IN')}</div>}
          
          <div className="flex-row">
            {isSeller ? (
              <span className="badge">Your listing</span>
            ) : isBought ? (
              <span className="badge">Already requested</span>
            ) : (
              <>
                {listing.price_rupees && (
                  <button className="secondary-btn" onClick={() => startTransaction(listing.id, 'UPI')}>
                    Request (UPI)
                  </button>
                )}
                {listing.price_timecredits && (
                  <button className="secondary-btn" onClick={() => startTransaction(listing.id, 'TC')}>
                    Request (TC)
                  </button>
                )}
                <button className="primary-btn accent" onClick={() => openChatForListing(listing)}>
                  Message
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <>
      <section className="section" style={{ paddingBottom: '2rem' }}>
        <div className="container editorial-grid">
          <div className="editorial-main">
            <h1 className="display-text mb-4">Skills are worth sharing.</h1>
            <p className="lede mb-8">
              Find someone who can help. Offer something you know. Exchange time, skills, and experience with a community that values what you do.
            </p>
            <div className="flex-row">
              <Link className="primary-btn accent" to="/listings">
                Browse skills
              </Link>
              {isAuthenticated ? (
                <Link className="secondary-btn" to="/seller">
                  Offer a skill
                </Link>
              ) : (
                <a href="#join" className="secondary-btn">Join community</a>
              )}
            </div>
          </div>
          
          <div className="editorial-side">
            <div className="object-panel">
              <h3 className="mb-4">Platform Activity</h3>
              <div className="record-list">
                <div className="record-row">
                  <span className="record-meta">Active listings</span>
                  <strong>{stats.listings}</strong>
                </div>
                <div className="record-row">
                  <span className="record-meta">Total exchanges</span>
                  <strong>{stats.transactions}</strong>
                </div>
                {isAuthenticated && (
                  <div className="record-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <span className="record-meta">Your Time Credits</span>
                    <strong className="text-accent">{stats.timeCredits} TC</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isAuthenticated && myListings.length > 0 && (
        <section className="section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div className="container">
            <div className="section-header">
              <h2>Your Offerings</h2>
            </div>
            <div className="listings-feed">
              {myListings.slice(0, 3).map(renderListing)}
            </div>
            {myListings.length > 3 && (
              <div className="mt-8">
                <Link className="secondary-btn" to="/seller">View all in dashboard</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {isAuthenticated ? (
        <section className="section" style={{ paddingTop: '2rem' }}>
          <div className="container">
            <div className="section-header flex-between">
              <h2>Recent Skills</h2>
              <Link className="ghost-btn" to="/listings">View all</Link>
            </div>
            {featuredListings.length === 0 ? (
              <div className="empty-state">
                <p>No skill listings available yet.</p>
                <p>Once someone offers a skill, it will appear here.</p>
                <Link className="primary-btn" to="/seller">Offer a skill</Link>
              </div>
            ) : (
              <div className="listings-feed">
                {featuredListings.map(renderListing)}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section id="join" className="section" style={{ paddingTop: '4rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <div className="container editorial-grid">
            <div className="editorial-half">
              <div className="object-panel" style={{ background: 'var(--bg-primary)' }}>
                <h2 className="mb-6">Create an account</h2>
                <form className="record-list" onSubmit={handleRegister}>
                  <div className="input-group">
                    <label>Username</label>
                    <input
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
                      required
                      placeholder="jane_doe"
                    />
                  </div>
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <button type="submit" className="primary-btn accent mt-4" disabled={submitting === 'register'}>
                    {submitting === 'register' ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
              </div>
            </div>

            <div className="editorial-half">
              <div className="object-panel">
                <h2 className="mb-6">Sign in</h2>
                <form className="record-list" onSubmit={handleLogin}>
                  <div className="input-group">
                    <label>Username</label>
                    <input
                      value={loginForm.username}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                      required
                      placeholder="jane_doe"
                    />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <button type="submit" className="primary-btn mt-4" disabled={submitting === 'login'}>
                    {submitting === 'login' ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

export default Home
