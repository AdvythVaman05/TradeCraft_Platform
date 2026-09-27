import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../context/AppContext.jsx'
import { Search, ChevronDown, MessageSquare, IndianRupee, Clock } from 'lucide-react'

const FILTERS = ['All', 'Technology', 'Design', 'Music', 'Business', 'Languages', 'Lifestyle']

function ListingCard({ listing, isSeller, hasBought }) {
  const { api: { startTransaction, openChatForListing }, state: { isAuthenticated } } = useAppContext()
  const [expanded, setExpanded] = useState(false)
  const [requestType, setRequestType] = useState(null)

  const handleRequest = (type) => {
    startTransaction(listing.id, type)
    setExpanded(false)
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={!expanded ? { y: -4, boxShadow: 'var(--shadow-md)' } : {}}
      className="surface"
      style={{ overflow: 'hidden', padding: 0 }}
    >
      <div 
        style={{ padding: '1.5rem', cursor: expanded ? 'default' : 'pointer' }}
        onClick={() => !expanded && setExpanded(true)}
      >
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <span className="tag blue">{listing.location || 'Remote'}</span>
          <div className="flex-center gap-2">
            {listing.price_timecredits && (
              <span className="tag amber">
                {listing.price_timecredits} TC
              </span>
            )}
            {listing.price_rupees && (
              <span className="tag coral">
                ₹{Number(listing.price_rupees).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        <h3 className="title-2" style={{ marginBottom: '0.5rem' }}>{listing.title}</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{listing.description}</p>
        
        <div className="flex-between" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <div className="flex-center gap-2">
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
              {listing.provider?.username?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{listing.provider?.username || 'Community Member'}</span>
          </div>
          
          {!expanded && (
            <span className="text-small text-muted flex-center gap-1">
              View details <ChevronDown size={14} />
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px dashed var(--border-strong)', background: 'var(--bg-primary)' }}>
              <div style={{ paddingTop: '1.5rem' }}>
                <h4 className="title-3" style={{ marginBottom: '1rem' }}>Exchange Actions</h4>
                {isAuthenticated ? (
                  isSeller ? (
                    <div className="tag dark">This is your offering</div>
                  ) : hasBought ? (
                    <div className="tag teal">You have an active request for this</div>
                  ) : (
                    <div className="flex-column gap-2">
                      <div className="flex-between gap-2" style={{ flexWrap: 'wrap' }}>
                        {listing.price_timecredits && (
                          <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--accent-gold)' }} onClick={() => handleRequest('TC')}>
                            Request with TC
                          </button>
                        )}
                        {listing.price_rupees && (
                          <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--accent-coral)' }} onClick={() => handleRequest('UPI')}>
                            Request with UPI
                          </button>
                        )}
                        <button className="btn btn-teal" style={{ flex: 1 }} onClick={() => openChatForListing(listing)}>
                          <MessageSquare size={16} /> Message {listing.provider?.username}
                        </button>
                      </div>
                      {!isSeller && listing.provider?.upi_id && (
                        <div className="text-small text-muted" style={{ marginTop: '0.5rem' }}>
                          Seller UPI for reference: <strong style={{color: 'var(--text-primary)'}}>{listing.provider.upi_id}</strong>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-small text-muted">Sign in to request this skill.</p>
                )}
                
                <button className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setExpanded(false)}>
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Listings() {
  const { state: { listings, isAuthenticated, profile } } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const query = searchParams.get('q') || ''
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = useMemo(() => {
    let result = listings
    
    // Naive category filtering based on text matches since backend lacks tags
    if (activeFilter !== 'All') {
      const term = activeFilter.toLowerCase()
      result = result.filter(listing => 
        ['title', 'description'].some(key => listing[key]?.toLowerCase().includes(term))
      )
    }

    if (query.trim()) {
      const term = query.toLowerCase()
      result = result.filter((listing) =>
        ['title', 'location', 'description'].some((key) => listing[key]?.toLowerCase().includes(term)),
      )
    }
    
    return result
  }, [listings, query, activeFilter])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section style={{ padding: '4rem 0 2rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ maxWidth: '800px' }}>
            <h1 className="display-2" style={{ marginBottom: '1.5rem' }}>What do you want to learn?</h1>
            
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
              <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
              <input
                type="text"
                placeholder="Search skills, topics, people..."
                value={query}
                onChange={(e) => setSearchParams({ q: e.target.value })}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.25rem 1.25rem 3.5rem',
                  fontSize: '1.125rem',
                  borderRadius: 'var(--radius-pill)',
                  border: '2px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  backgroundColor: 'var(--bg-primary)'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'none' }}>
              {FILTERS.map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid',
                    borderColor: activeFilter === filter ? 'var(--bg-dark)' : 'var(--border-strong)',
                    background: activeFilter === filter ? 'var(--bg-dark)' : 'transparent',
                    color: activeFilter === filter ? 'white' : 'var(--text-primary)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '4rem 0', flex: 1 }}>
        <div className="container">
          {filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-column flex-center" 
              style={{ padding: '6rem 0', textAlign: 'center' }}
            >
              <h3 className="title-2" style={{ marginBottom: '1rem' }}>No skills found for "{query || activeFilter}"</h3>
              <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
                Maybe it's time to be the first one to offer it. Or try adjusting your search terms.
              </p>
              <button className="btn btn-outline" onClick={() => { setSearchParams({}); setActiveFilter('All') }}>
                Clear Filters
              </button>
            </motion.div>
          ) : (
            <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
              <AnimatePresence>
                {filtered.map((listing) => {
                  const isSeller = isAuthenticated && profile && listing.provider?.id === profile.id
                  const hasBought = isAuthenticated && profile && Array.isArray(profile.bought_listings) && profile.bought_listings.includes(listing.id)
                  
                  return (
                    <ListingCard 
                      key={listing.id} 
                      listing={listing} 
                      isSeller={isSeller} 
                      hasBought={hasBought} 
                    />
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Listings
