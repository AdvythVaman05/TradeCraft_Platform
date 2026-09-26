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
      notify(error.message || 'Failed to load buyers', 'error')
      setBuyerListings([])
    } finally {
      setLoading(false)
    }
  }

  const openChat = async (buyerId, listingId) => {
    const key = `${buyerId}_${listingId}`
    setOpenChats((prev) => ({ ...prev, [key]: true }))
    
    try {
      const data = await apiRequest(`/chat/listing/${listingId}/thread/?buyer_id=${buyerId}`)
      const messages = Array.isArray(data.messages) ? data.messages : []
      setChatMessages((prev) => ({ ...prev, [key]: messages }))
      
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

  useEffect(() => {
    return () => {
      Object.values(chatPollRefs.current).forEach((interval) => clearInterval(interval))
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <section className="section" style={{ paddingTop: '4rem' }}>
        <div className="container">
          <div className="empty-state">
            <h2 className="mb-2">Sign in to manage your offerings</h2>
            <p className="mb-6">You must be logged in to view your seller dashboard.</p>
            <Link to="/" className="primary-btn accent">Go to Home</Link>
          </div>
        </div>
      </section>
    )
  }

  const sellerListings = listings.filter((listing) => listing.provider?.id === profile?.id)
  const listingsWithBuyers = buyerListings.map((item) => item.listing.id)
  const listingsWithoutBuyers = sellerListings.filter((listing) => !listingsWithBuyers.includes(listing.id))

  return (
    <section className="section">
      <div className="container">
        <div className="editorial-grid mb-8">
          <div className="editorial-main">
            <h1 className="display-text mb-4">Workspace</h1>
            <p className="lede">
              Manage your community offerings, active exchanges, and incoming requests.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '200px', width: '100%' }}></div>
        ) : buyerListings.length === 0 && sellerListings.length === 0 ? (
          <div className="empty-state">
            <p>You haven't offered any skills yet.</p>
            <Link to="/account" className="primary-btn accent mt-4">Create a Listing</Link>
          </div>
        ) : (
          <>
            {buyerListings.length > 0 && (
              <div className="mb-8">
                <div className="section-header">
                  <h2>Active Exchanges</h2>
                </div>
                <div className="listings-feed" style={{ borderTop: '1px solid var(--border)' }}>
                  {buyerListings.map((item) => {
                    const key = `${item.buyer.id}_${item.listing.id}`
                    const isOpen = openChats[key]
                    const messages = chatMessages[key] || []
                    const inputValue = chatInputs[key] || ''
                    const txnStatus = item.transaction.seller_rejected
                      ? { label: 'Rejected', className: 'error' }
                      : item.transaction.seller_verified
                      ? { label: 'Completed', className: 'success' }
                      : { label: 'Pending', className: 'pending' }

                    return (
                      <article className="listing-item" key={key} style={{ flexWrap: 'wrap' }}>
                        <div className="listing-content" style={{ minWidth: '300px' }}>
                          <h3 className="listing-title mb-2">{item.listing.title}</h3>
                          <div className="record-meta mb-2">
                            <span>Buyer: {item.buyer.username}</span>
                            <span>&middot;</span>
                            <span>Exchange #{item.transaction.id}</span>
                          </div>
                          
                          <div className="flex-row">
                            <span className={`status-pill ${txnStatus.className}`}>{txnStatus.label}</span>
                            {item.transaction.payment_method === 'UPI' && item.transaction.buyer_txn_id && (
                              <span className="metadata">UTR: {item.transaction.buyer_txn_id}</span>
                            )}
                          </div>
                        </div>

                        <div className="listing-aside" style={{ flex: '1 1 auto', minWidth: '300px', maxWidth: isOpen ? '100%' : '200px' }}>
                          {!isOpen ? (
                            <button className="secondary-btn" onClick={() => openChat(item.buyer.id, item.listing.id)}>
                              Open Request
                            </button>
                          ) : (
                            <div className="object-panel" style={{ width: '100%', padding: '1.5rem' }}>
                              <div className="flex-between mb-4">
                                <h3 style={{ fontSize: '1.1rem' }}>Conversation with {item.buyer.username}</h3>
                                <button className="ghost-btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => closeChat(item.buyer.id, item.listing.id)}>
                                  Close
                                </button>
                              </div>

                              <div
                                ref={(el) => (messageRefs.current[key] = el)}
                                className="chat-messages mb-4"
                                style={{
                                  height: '250px',
                                  padding: '1rem',
                                  background: 'var(--bg-primary)',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border)'
                                }}
                              >
                                {messages.length === 0 ? (
                                  <p className="metadata" style={{ textAlign: 'center', marginTop: '2rem' }}>No messages yet.</p>
                                ) : (
                                  messages.map((message) => {
                                    const isSeller = message.sender?.id === profile?.id
                                    return (
                                      <div key={message.id} className={`chat-message-row ${isSeller ? 'sent' : 'received'}`} style={{ marginBottom: '1rem' }}>
                                        <div className="chat-meta">
                                          {new Date(message.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="chat-bubble">
                                          {message.content}
                                        </div>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                              <form
                                className="chat-input"
                                style={{ padding: 0, border: 'none', borderRadius: 0, marginBottom: '1.5rem' }}
                                onSubmit={(e) => {
                                  e.preventDefault()
                                  sendMessage(item.buyer.id, item.listing.id)
                                }}
                              >
                                <input
                                  type="text"
                                  value={inputValue}
                                  onChange={(e) =>
                                    setChatInputs((prev) => ({ ...prev, [key]: e.target.value }))
                                  }
                                  placeholder="Type a message..."
                                />
                                <button type="submit" className="primary-btn">Send</button>
                              </form>

                              {!item.transaction.seller_verified && !item.transaction.seller_rejected && item.transaction.id && (
                                <div className="flex-row pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                                  {(item.transaction.payment_method === 'TC' || (item.transaction.payment_method === 'UPI' && item.transaction.buyer_txn_id)) && (
                                    <>
                                      <button className="primary-btn accent" onClick={() => verifyTransaction(item.transaction.id)}>
                                        Confirm Fulfillment
                                      </button>
                                      <button className="ghost-btn" onClick={() => rejectTransaction(item.transaction.id)}>
                                        Reject Request
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

            {listingsWithoutBuyers.length > 0 && (
              <div>
                <div className="section-header">
                  <h2>Available Offerings</h2>
                </div>
                <div className="listings-feed" style={{ borderTop: '1px solid var(--border)' }}>
                  {listingsWithoutBuyers.map((listing) => (
                    <article className="listing-item" key={listing.id}>
                      <div className="listing-content">
                        <h3 className="listing-title">{listing.title}</h3>
                        <p className="listing-desc">{listing.description}</p>
                        <div className="listing-provider">
                          {listing.location || 'Remote / Online'}
                        </div>
                      </div>
                      <div className="listing-aside">
                        {listing.price_timecredits && <div className="credit-cost">{listing.price_timecredits} TC</div>}
                        {listing.price_rupees && <div className="credit-cost" style={{background: 'var(--surface-alt)', color: 'var(--text-primary)'}}>₹{Number(listing.price_rupees).toLocaleString('en-IN')}</div>}
                        <div className="metadata mt-2">Awaiting requests</div>
                      </div>
                    </article>
                  ))}
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
