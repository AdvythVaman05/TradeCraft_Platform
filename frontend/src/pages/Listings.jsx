import { useMemo, useState } from 'react'
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
        <div className="section-heading">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h2>Live listings</h2>
          </div>
          <input
            className="search"
            placeholder="Search by title or location…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {isAuthenticated && myListings.length > 0 && (
          <div className="section" style={{ paddingTop: 0 }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Your listings</p>
                <h3>Shown to everyone</h3>
              </div>
            </div>
            <div className="listing-grid">
              {myListings.map((listing) => (
                <article className="listing-card" key={`mine-${listing.id}`}>
                  <p className="eyebrow">Your listing</p>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <div className="listing-meta">
                    <span>{listing.location || 'Remote / Online'}</span>
                    <span>{new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="action-row">
                    {listing.price_rupees && (
                      <span className="price-chip">₹{Number(listing.price_rupees).toLocaleString('en-IN')}</span>
                    )}
                    {listing.price_timecredits && <span className="price-chip">{listing.price_timecredits} TC</span>}
                  </div>
                  <p className="hint">Use the Seller Dashboard to edit or chat with buyers.</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="hint">No listings match your search yet.</p>
        ) : (
          <div className="listing-grid">
            {filtered.map((listing) => {
              const rupee = listing.price_rupees ? `₹${Number(listing.price_rupees).toLocaleString('en-IN')}` : null
              const tc = listing.price_timecredits ? `${listing.price_timecredits} TC` : null
              const isSeller = isAuthenticated && profile && listing.provider?.id === profile.id
              const hasBought =
                isAuthenticated &&
                profile &&
                Array.isArray(profile.bought_listings) &&
                profile.bought_listings.includes(listing.id)
              return (
                <article className="listing-card" key={listing.id}>
                  <p className="eyebrow">{listing.provider?.username || 'Anonymous provider'}</p>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <div className="listing-meta">
                    <span>{listing.location || 'Remote / Online'}</span>
                    <span>{new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {!isSeller && listing.provider?.upi_id && (
                    <p className="hint">Seller UPI ID: <strong>{listing.provider.upi_id}</strong></p>
                  )}
                  <div className="action-row">
                    {rupee && <span className="price-chip">{rupee}</span>}
                    {tc && <span className="price-chip">{tc}</span>}
                    {isSeller && <span className="badge soft">Your listing</span>}
                    {!isSeller && hasBought && (
                      <span className="badge soft" style={{ background: '#6b7280', color: '#fff' }}>
                        Already bought
                      </span>
                    )}
                  </div>
                  {isAuthenticated ? (
                    isSeller ? (
                      <div className="action-row">
                        <p className="hint">This is your listing. Manage it from the Seller Dashboard.</p>
                      </div>
                    ) : (
                      <div className="action-row">
                        <button
                          className="ghost-btn"
                          onClick={() => startTransaction(listing.id, 'UPI')}
                          disabled={hasBought}
                        >
                          Start UPI trade
                        </button>
                        {tc && (
                          <button
                            className="ghost-btn"
                            onClick={() => startTransaction(listing.id, 'TC')}
                            disabled={hasBought}
                          >
                            Use time credits
                          </button>
                        )}
                        <button className="primary-btn" onClick={() => openChatForListing(listing)}>
                          Chat with seller
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="hint">Sign in to start a transaction.</p>
                  )}
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

