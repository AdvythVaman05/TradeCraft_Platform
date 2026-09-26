import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

function Listings() {
  const {
    state: { listings, isAuthenticated, profile },
    api: { startTransaction, openChatForListing },
  } = useAppContext()

  const [query, setQuery] = useState('')

  const myListings = useMemo(
    () => (isAuthenticated && profile ? listings.filter((listing) => listing.provider?.id === profile.id) : []),
    [isAuthenticated, profile, listings],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return listings
    const term = query.toLowerCase()
    return listings.filter((listing) =>
      ['title', 'location', 'description'].some((key) => listing[key]?.toLowerCase().includes(term)),
    )
  }, [listings, query])

  return (
    <section className="section">
      <div className="container">
        <div className="editorial-grid">
          <div className="editorial-main">
            <h1 className="display-text mb-4">Find a skill</h1>
            <p className="lede mb-8">
              Browse community offerings, request exchanges, and use your Time Credits.
            </p>
          </div>
        </div>

        <div className="section-header flex-between mb-8" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0, minWidth: '300px', flex: 1 }}>
            <label>Search listings</label>
            <input
              placeholder="e.g., Python, design, Mumbai..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {isAuthenticated && myListings.length > 0 && !query && (
          <div className="mb-8 object-panel" style={{ background: 'transparent' }}>
            <h3 className="mb-4">Your Active Listings</h3>
            <div className="listings-feed">
              {myListings.map((listing) => (
                <article className="listing-item" key={`mine-${listing.id}`}>
                  <div className="listing-content">
                    <h3 className="listing-title">{listing.title}</h3>
                    <p className="listing-desc">{listing.description}</p>
                    <div className="listing-provider">
                      Offered by you &middot; {listing.location || 'Remote / Online'}
                    </div>
                  </div>
                  <div className="listing-aside">
                    {listing.price_timecredits && <div className="credit-cost">{listing.price_timecredits} TC</div>}
                    {listing.price_rupees && <div className="credit-cost" style={{background: 'var(--surface-alt)', color: 'var(--text-primary)'}}>₹{Number(listing.price_rupees).toLocaleString('en-IN')}</div>}
                    <Link to="/seller" className="secondary-btn">Manage in Dashboard</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        <h3 className="mb-4">Community Offerings</h3>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No listings match your search.</p>
          </div>
        ) : (
          <div className="listings-feed" style={{ borderTop: '1px solid var(--border)' }}>
            {filtered.map((listing) => {
              const isSeller = isAuthenticated && profile && listing.provider?.id === profile.id
              const hasBought =
                isAuthenticated &&
                profile &&
                Array.isArray(profile.bought_listings) &&
                profile.bought_listings.includes(listing.id)
              
              return (
                <article className="listing-item" key={listing.id}>
                  <div className="listing-content">
                    <h3 className="listing-title">{listing.title}</h3>
                    <p className="listing-desc">{listing.description}</p>
                    <div className="listing-provider">
                      Offered by {listing.provider?.username || 'Anonymous'} &middot; {listing.location || 'Remote / Online'}
                    </div>
                    {!isSeller && listing.provider?.upi_id && (
                      <div className="metadata mt-4">
                        Seller UPI: {listing.provider.upi_id}
                      </div>
                    )}
                  </div>
                  
                  <div className="listing-aside">
                    {listing.price_timecredits && <div className="credit-cost">{listing.price_timecredits} TC</div>}
                    {listing.price_rupees && <div className="credit-cost" style={{background: 'var(--surface-alt)', color: 'var(--text-primary)'}}>₹{Number(listing.price_rupees).toLocaleString('en-IN')}</div>}
                    
                    <div className="flex-row">
                      {isAuthenticated ? (
                        isSeller ? (
                          <span className="badge">Your listing</span>
                        ) : hasBought ? (
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
                        )
                      ) : (
                        <p className="form-hint" style={{margin: 0}}>Sign in to request</p>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default Listings
