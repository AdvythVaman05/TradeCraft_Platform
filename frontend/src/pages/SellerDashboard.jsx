import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

function SellerDashboard() {
  const {
    state: { isAuthenticated, profile, listings },
    api: { apiRequest, notify, verifyTransaction, rejectTransaction },
  } = useAppContext()

  const [buyerListings, setBuyerListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [openChats, setOpenChats] = useState({}) // { "buyerId_listingId": true }
  const [chatMessages, setChatMessages] = useState({}) // { "buyerId_listingId": [messages] }
  const [chatInputs, setChatInputs] = useState({}) // { "buyerId_listingId": "text" }
  const chatPollRefs = useRef({})
  const messageRefs = useRef({})

  useEffect(() => {
    if (isAuthenticated && profile) {
      loadBuyerListings()
    }
  }, [isAuthenticated, profile])

  // Auto-scroll to bottom when messages change
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
      notify(error.message || 'Failed to load buyers', 'error')
      setBuyerListings([])
    } finally {
      setLoading(false)
    }
  }

  const openChat = async (buyerId, listingId) => {
    const key = `${buyerId}_${listingId}`
    setOpenChats((prev) => ({ ...prev, [key]: true }))
    
    // Load chat messages with buyer_id parameter for seller-specific chat
    try {
      const data = await apiRequest(`/chat/listing/${listingId}/thread/?buyer_id=${buyerId}`)
      const messages = Array.isArray(data.messages) ? data.messages : []
      setChatMessages((prev) => ({ ...prev, [key]: messages }))
      
      // Start polling for new messages
      if (chatPollRefs.current[key]) {
        clearInterval(chatPollRefs.current[key])
      }
      chatPollRefs.current[key] = setInterval(async () => {
        try {
          const refreshed = await apiRequest(`/chat/listing/${listingId}/thread/?buyer_id=${buyerId}`)
          const refreshedMessages = Array.isArray(refreshed.messages) ? refreshed.messages : []
          setChatMessages((prev) => ({ ...prev, [key]: refreshedMessages }))
        } catch (error) {
          console.error('Error polling chat:', error)
        }
      }, 3000)
    } catch (error) {
      notify(error.message || 'Failed to load chat', 'error')
      setChatMessages((prev) => ({ ...prev, [key]: [] }))
    }
  }

  const closeChat = (buyerId, listingId) => {
    const key = `${buyerId}_${listingId}`
    setOpenChats((prev) => {
      const newState = { ...prev }
      delete newState[key]
      return newState
    })
    
    // Stop polling
    if (chatPollRefs.current[key]) {
      clearInterval(chatPollRefs.current[key])
      delete chatPollRefs.current[key]
    }
  }

  const sendMessage = async (buyerId, listingId) => {
    const key = `${buyerId}_${listingId}`
    const message = chatInputs[key]?.trim()
    if (!message) {
      notify('Type a message before sending.', 'info')
      return
    }

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(chatPollRefs.current).forEach((interval) => clearInterval(interval))
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <section className="section">
        <div className="container">
          <article className="card">
            <h2>Sign in to access Seller Dashboard</h2>
            <p className="hint">
              <Link to="/">Sign in</Link> to view and manage your listings and buyer communications.
            </p>
          </article>
        </div>
      </section>
    )
  }

  // Get seller's own listings
  const sellerListings = listings.filter((listing) => listing.provider?.id === profile?.id)
  const listingsWithBuyers = buyerListings.map((item) => item.listing.id)
  const listingsWithoutBuyers = sellerListings.filter((listing) => !listingsWithBuyers.includes(listing.id))

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Seller Dashboard</p>
            <h2>Manage your listings and buyers</h2>
          </div>
        </div>

        {loading ? (
          <p className="hint">Loading...</p>
        ) : buyerListings.length === 0 && sellerListings.length === 0 ? (
          <article className="card">
            <p className="hint">
              You don't have any listings yet. <Link to="/account">Create a listing</Link> to get started.
            </p>
          </article>
        ) : (
          <>
            {/* Show listings with buyers */}
            {buyerListings.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <p className="eyebrow">Active Conversations</p>
                    <h3>Listings with buyers ({buyerListings.length})</h3>
                  </div>
                </div>
                <div className="listing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                  {buyerListings.map((item) => {
                    const key = `${item.buyer.id}_${item.listing.id}`
                    const isOpen = openChats[key]
                    const messages = chatMessages[key] || []
                    const inputValue = chatInputs[key] || ''
                    const txnStatus = item.transaction.seller_rejected
                      ? { label: 'Rejected', color: '#ef4444' }
                      : item.transaction.seller_verified
                      ? { label: 'Completed', color: '#22c55e' }
                      : { label: 'Pending', color: '#f59e0b' }

                    return (
                      <article className="card" key={key} style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                        <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e0e0e0' }}>
                          <div style={{ flex: 1 }}>
                            <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>Listing</p>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{item.listing.title}</h3>
                            <p className="hint" style={{ marginBottom: '0.25rem' }}>
                              <strong>Buyer:</strong> {item.buyer.username}
                            </p>
                            <p className="hint" style={{ fontSize: '0.875rem', color: '#666' }}>
                              Transaction #{item.transaction.id}
                            </p>
                            {item.transaction.payment_method === 'UPI' && item.transaction.buyer_txn_id && (
                              <p className="hint" style={{ marginTop: '0.25rem' }}>
                                Buyer UPI reference:{' '}
                                <code style={{ fontSize: '0.95rem' }}>{item.transaction.buyer_txn_id}</code>
                              </p>
                            )}
                          </div>
                          <span
                            className="badge"
                            style={{
                              background: txnStatus.color,
                              color: '#fff',
                              alignSelf: 'flex-start',
                            }}
                          >
                            {txnStatus.label}
                          </span>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <button
                            className={isOpen ? 'primary-btn' : 'ghost-btn'}
                            onClick={() => (isOpen ? closeChat(item.buyer.id, item.listing.id) : openChat(item.buyer.id, item.listing.id))}
                            style={{ marginBottom: '1rem', width: '100%' }}
                          >
                            {isOpen ? '▼ Close Chat' : '▶ Open Chat'}
                          </button>

                          {isOpen && (
                            <div className="chat-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                              {item.transaction.seller_rejected && (
                                <p className="hint error" style={{ marginBottom: '0.5rem' }}>
                                  You rejected this payment on{' '}
                                  {item.transaction.seller_rejected_at
                                    ? new Date(item.transaction.seller_rejected_at).toLocaleString()
                                    : '—'}
                                </p>
                              )}
                              <div
                                ref={(el) => (messageRefs.current[key] = el)}
                                className="chat-messages"
                                style={{
                                  flex: 1,
                                  maxHeight: '400px',
                                  minHeight: '250px',
                                  overflowY: 'auto',
                                  marginBottom: '1rem',
                                  padding: '1rem',
                                  background: '#f8f9fa',
                                  borderRadius: '8px',
                                  border: '1px solid #e0e0e0',
                                }}
                              >
                                {messages.length === 0 ? (
                                  <p className="hint" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                    No messages yet. Start the conversation.
                                  </p>
                                ) : (
                                  messages.map((message) => {
                                    const isSeller = message.sender?.id === profile?.id
                                    return (
                                      <div
                                        key={message.id}
                                        className="chat-bubble"
                                        style={{
                                          marginBottom: '1rem',
                                          padding: '0.75rem',
                                          background: isSeller ? '#e3f2fd' : '#ffffff',
                                          borderRadius: '8px',
                                          border: '1px solid #e0e0e0',
                                          marginLeft: isSeller ? 'auto' : '0',
                                          marginRight: isSeller ? '0' : 'auto',
                                          maxWidth: '85%',
                                        }}
                                      >
                                        <div className="bubble-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                          <strong style={{ fontSize: '0.875rem', color: isSeller ? '#1976d2' : '#333' }}>
                                            {message.sender?.username || 'User'}
                                            {isSeller && ' (You)'}
                                          </strong>
                                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                            {new Date(message.created_at).toLocaleTimeString('en-IN', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: '1.5', color: '#333' }}>
                                          {message.content}
                                        </p>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                              <form
                                className="chat-input"
                                onSubmit={(e) => {
                                  e.preventDefault()
                                  sendMessage(item.buyer.id, item.listing.id)
                                }}
                                style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}
                              >
                                <input
                                  type="text"
                                  value={inputValue}
                                  onChange={(e) =>
                                    setChatInputs((prev) => ({
                                      ...prev,
                                      [key]: e.target.value,
                                    }))
                                  }
                                  placeholder="Type your message..."
                                  style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '6px',
                                    fontSize: '0.9375rem',
                                  }}
                                />
                                <button type="submit" className="primary-btn" style={{ padding: '0.75rem 1.5rem' }}>
                                  Send
                                </button>
                              </form>
                              {/* Show verify/reject for pending transactions (seller only) */}
                              {!item.transaction.seller_verified && !item.transaction.seller_rejected && item.transaction.id && (
                                <div style={{ marginTop: '0.75rem' }} className="action-row">
                                  {(item.transaction.payment_method === 'TC' || (item.transaction.payment_method === 'UPI' && item.transaction.buyer_txn_id)) && (
                                    <>
                                      <button
                                        className="primary-btn"
                                        onClick={() => verifyTransaction(item.transaction.id)}
                                        style={{ marginRight: '0.5rem' }}
                                      >
                                        Confirm
                                      </button>
                                      <button className="ghost-btn" onClick={() => rejectTransaction(item.transaction.id)}>
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Show listings without buyers yet */}
            {listingsWithoutBuyers.length > 0 && (
              <div>
                <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <p className="eyebrow">Your Listings</p>
                    <h3>Listings without buyers ({listingsWithoutBuyers.length})</h3>
                  </div>
                </div>
                <div className="listing-grid">
                  {listingsWithoutBuyers.map((listing) => {
                    const rupee = listing.price_rupees
                      ? `₹${Number(listing.price_rupees).toLocaleString('en-IN')}`
                      : null
                    const tc = listing.price_timecredits ? `${listing.price_timecredits} TC` : null

                    return (
                      <article className="listing-card" key={listing.id}>
                        <p className="eyebrow">Your listing</p>
                        <h3>{listing.title}</h3>
                        <p>{listing.description}</p>
                        <div className="listing-meta">
                          <span>{listing.location || 'Remote / Online'}</span>
                          <span>
                            {new Date(listing.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <div className="action-row">
                          {rupee && <span className="price-chip">{rupee}</span>}
                          {tc && <span className="price-chip">{tc}</span>}
                        </div>
                        <p className="hint" style={{ marginTop: '1rem' }}>Waiting for buyers to show interest.</p>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default SellerDashboard
