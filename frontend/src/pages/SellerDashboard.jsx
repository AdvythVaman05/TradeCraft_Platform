import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../context/AppContext.jsx'
import { MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react'

function Workspace() {
  const {
    state: { isAuthenticated, profile, listings, transactions },
    api: { apiRequest, notify, verifyTransaction, rejectTransaction },
  } = useAppContext()

  const [buyerListings, setBuyerListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [openChats, setOpenChats] = useState({}) 
  const [chatMessages, setChatMessages] = useState({})
  const [chatInputs, setChatInputs] = useState({})
  const chatPollRefs = useRef({})
  const messageRefs = useRef({})

  useEffect(() => {
    if (isAuthenticated && profile) {
      loadBuyerListings()
    }
  }, [isAuthenticated, profile])

  useEffect(() => {
    Object.keys(chatMessages).forEach((key) => {
      const ref = messageRefs.current[key]
      if (ref) {
        ref.scrollTop = ref.scrollHeight
      }
    })
  }, [chatMessages])

  const loadBuyerListings = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const data = await apiRequest('/seller/buyers/')
      setBuyerListings(data || [])
    } catch (error) {
      notify(error.message || 'Failed to load requests', 'error')
      setBuyerListings([])
    } finally {
      setLoading(false)
    }
  }

  const toggleChat = async (buyerId, listingId) => {
    const key = `${buyerId}_${listingId}`
    if (openChats[key]) {
      setOpenChats((prev) => { const newState = { ...prev }; delete newState[key]; return newState; })
      if (chatPollRefs.current[key]) {
        clearInterval(chatPollRefs.current[key])
        delete chatPollRefs.current[key]
      }
      return
    }

    setOpenChats((prev) => ({ ...prev, [key]: true }))
    
    try {
      const data = await apiRequest(`/chat/listing/${listingId}/thread/?buyer_id=${buyerId}`)
      const messages = Array.isArray(data.messages) ? data.messages : []
      setChatMessages((prev) => ({ ...prev, [key]: messages }))
      
      chatPollRefs.current[key] = setInterval(async () => {
        try {
          const refreshed = await apiRequest(`/chat/listing/${listingId}/thread/?buyer_id=${buyerId}`)
          setChatMessages((prev) => ({ ...prev, [key]: Array.isArray(refreshed.messages) ? refreshed.messages : [] }))
        } catch (error) {
          console.error('Error polling chat:', error)
        }
      }, 3000)
    } catch (error) {
      notify(error.message || 'Failed to load chat', 'error')
      setChatMessages((prev) => ({ ...prev, [key]: [] }))
    }
  }

  const sendMessage = async (buyerId, listingId) => {
    const key = `${buyerId}_${listingId}`
    const message = chatInputs[key]?.trim()
    if (!message) return

    try {
      const response = await apiRequest(`/chat/listing/${listingId}/thread/`, {
        method: 'POST',
        body: { message, buyer_id: buyerId },
      })
      
      setChatMessages((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), response],
      }))
      setChatInputs((prev) => ({ ...prev, [key]: '' }))
    } catch (error) {
      notify(error.message || 'Failed to send message', 'error')
    }
  }

  useEffect(() => {
    return () => {
      Object.values(chatPollRefs.current).forEach((interval) => clearInterval(interval))
    }
  }, [])

  const sellerListings = useMemo(() => listings.filter((listing) => listing.provider?.id === profile?.id), [listings, profile])
  
  const pendingRequests = buyerListings.filter(item => !item.transaction.seller_verified && !item.transaction.seller_rejected)
  const completedRequests = buyerListings.filter(item => item.transaction.seller_verified)

  if (!isAuthenticated) {
    return null // Layout handles redirect/empty states usually, or we can show a prompt
  }

  return (
    <div style={{ flex: 1, padding: '4rem 0', background: 'var(--bg-primary)' }}>
      <div className="container page-grid has-sidebar">
        <div>
          <motion.h1 
            className="display-2" 
            style={{ marginBottom: '2rem' }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Welcome back, {profile?.username}
          </motion.h1>

          <section style={{ marginBottom: '4rem' }}>
            <h2 className="title-2" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-coral)' }} />
              Active Requests ({pendingRequests.length})
            </h2>

            {loading ? (
              <div className="surface" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="surface" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
                <p className="text-muted">No active requests at the moment.</p>
              </div>
            ) : (
              <div className="flex-column gap-3">
                <AnimatePresence>
                  {pendingRequests.map((item) => {
                    const key = `${item.buyer.id}_${item.listing.id}`
                    const isOpen = openChats[key]
                    const messages = chatMessages[key] || []
                    const inputValue = chatInputs[key] || ''

                    return (
                      <motion.div 
                        key={key}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="surface"
                        style={{ padding: '1.5rem' }}
                      >
                        <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <div className="text-small text-mono" style={{ color: 'var(--accent-teal)', marginBottom: '0.5rem' }}>
                              Request #{item.transaction.id}
                            </div>
                            <h3 className="title-3" style={{ marginBottom: '0.25rem' }}>{item.listing.title}</h3>
                            <div className="text-muted" style={{ marginBottom: '1rem' }}>Requested by <strong>{item.buyer.username}</strong></div>
                            
                            {item.transaction.payment_method === 'UPI' && item.transaction.buyer_txn_id && (
                              <div className="text-small" style={{ background: 'var(--surface-mint)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                                Buyer UTR: <strong>{item.transaction.buyer_txn_id}</strong>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-center gap-2">
                            <button className={`btn ${isOpen ? 'btn-outline' : 'btn-teal'}`} onClick={() => toggleChat(item.buyer.id, item.listing.id)}>
                              <MessageSquare size={16} /> {isOpen ? 'Close Chat' : 'Open Chat'}
                            </button>
                            {(item.transaction.payment_method === 'TC' || (item.transaction.payment_method === 'UPI' && item.transaction.buyer_txn_id)) && (
                              <button className="btn btn-primary" onClick={() => verifyTransaction(item.transaction.id)}>
                                <CheckCircle size={16} /> Confirm
                              </button>
                            )}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                                <div
                                  ref={(el) => (messageRefs.current[key] = el)}
                                  style={{
                                    height: '300px',
                                    overflowY: 'auto',
                                    background: 'var(--bg-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    padding: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    marginBottom: '1rem'
                                  }}
                                >
                                  {messages.length === 0 ? (
                                    <div className="text-muted text-center" style={{ margin: 'auto' }}>Say hello to {item.buyer.username}</div>
                                  ) : (
                                    messages.map((message) => {
                                      const isMe = message.sender?.id === profile?.id
                                      return (
                                        <div key={message.id} className={`chat-message-row ${isMe ? 'sent' : 'received'}`} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                          <div className="text-small text-muted" style={{ marginBottom: '4px', textAlign: isMe ? 'right' : 'left' }}>
                                            {isMe ? 'You' : message.sender?.username} &middot; {new Date(message.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                          <div style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: isMe ? 'var(--accent-teal)' : 'var(--bg-primary)',
                                            color: isMe ? 'white' : 'var(--text-primary)',
                                            borderBottomRightRadius: isMe ? 4 : 'var(--radius-md)',
                                            borderBottomLeftRadius: !isMe ? 4 : 'var(--radius-md)',
                                            border: isMe ? 'none' : '1px solid var(--border-light)'
                                          }}>
                                            {message.content}
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                                <form
                                  style={{ display: 'flex', gap: '0.5rem' }}
                                  onSubmit={(e) => { e.preventDefault(); sendMessage(item.buyer.id, item.listing.id); }}
                                >
                                  <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setChatInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                                    placeholder={`Message ${item.buyer.username}...`}
                                    style={{ flex: 1, borderRadius: 'var(--radius-md)' }}
                                  />
                                  <button type="submit" className="btn btn-teal" style={{ padding: '0 1rem', borderRadius: 'var(--radius-md)' }}>
                                    <Send size={18} />
                                  </button>
                                </form>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

          <section>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 className="title-2">Your Offerings</h2>
              <Link to="/profile" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>+ New Offering</Link>
            </div>
            
            {sellerListings.length === 0 ? (
              <div className="surface" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
                <p className="text-muted mb-2">You aren't offering any skills yet.</p>
                <Link to="/profile" className="btn btn-primary">Create your first listing</Link>
              </div>
            ) : (
              <div className="flex-column gap-2">
                {sellerListings.map((listing) => (
                  <div key={listing.id} className="surface flex-between" style={{ padding: '1rem 1.5rem', alignItems: 'center' }}>
                    <div>
                      <h3 className="title-3" style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{listing.title}</h3>
                      <div className="text-small text-muted">{listing.location || 'Remote'}</div>
                    </div>
                    <div className="flex-center gap-2">
                      {listing.price_timecredits && <span className="tag amber">{listing.price_timecredits} TC</span>}
                      {listing.price_rupees && <span className="tag coral">₹{Number(listing.price_rupees).toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div>
          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface" 
            style={{ position: 'sticky', top: '100px', background: 'var(--bg-dark)', color: 'white', padding: '2rem' }}
          >
            <h3 className="title-3" style={{ marginBottom: '2rem', color: 'rgba(255,255,255,0.6)' }}>YOUR BALANCE</h3>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '2rem' }}>
              <motion.span 
                key={profile?.time_credits}
                initial={{ scale: 1.2, color: 'var(--accent-coral)' }}
                animate={{ scale: 1, color: 'white' }}
                className="display-1"
              >
                {profile?.time_credits ?? 0}
              </motion.span>
              <span className="title-2" style={{ color: 'var(--accent-gold)' }}>TC</span>
            </div>

            <div className="flex-column gap-2" style={{ paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex-between">
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Completed Requests</span>
                <strong>{completedRequests.length}</strong>
              </div>
              <div className="flex-between">
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Active Listings</span>
                <strong>{sellerListings.length}</strong>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Workspace
