import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'

function ChatDrawer() {
  const {
    state: { chat, isAuthenticated, profile },
    api: { closeChat, sendChatMessage },
  } = useAppContext()
  const [input, setInput] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInput('')
  }, [chat.listing?.id, chat.isOpen])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [chat.messages])

  if (!chat.isOpen || !isAuthenticated) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!input.trim()) return
    await sendChatMessage(input)
    setInput('')
  }

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        <header>
          <div>
            <div className="eyebrow" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chat with {chat.partner?.username || 'Seller'}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{chat.listing?.title || 'Listing chat'}</div>
          </div>
          <button className="ghost-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={closeChat}>
            Close
          </button>
        </header>
        
        <div className="chat-messages" ref={listRef}>
          {chat.loading && <p className="metadata" style={{ textAlign: 'center' }}>Loading conversation…</p>}
          {!chat.loading && chat.messages.length === 0 && (
            <p className="metadata" style={{ textAlign: 'center' }}>Start the conversation with {chat.partner?.username || 'the seller'}.</p>
          )}
          {chat.messages.map((message) => {
            const isMe = message.sender?.id === profile?.id
            return (
              <div key={message.id} className={`chat-message-row ${isMe ? 'sent' : 'received'}`}>
                <div className="chat-meta">
                  {isMe ? 'You' : message.sender?.username || 'User'} &middot; {new Date(message.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="chat-bubble">
                  {message.content}
                </div>
              </div>
            )
          })}
        </div>
        
        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your message…"
          />
          <button type="submit" className="primary-btn accent" style={{ padding: '0.5rem 1rem' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatDrawer
