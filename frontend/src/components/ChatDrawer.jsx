import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext.jsx'

function ChatDrawer() {
  const {
    state: { chat, isAuthenticated },
    api: { closeChat, sendChatMessage },
  } = useAppContext()
  const [input, setInput] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    // reset draft input whenever the chat target changes
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
    await sendChatMessage(input)
    setInput('')
  }

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        <header>
          <div>
            <p className="eyebrow">Chat</p>
            <h3>{chat.listing?.title || 'Listing chat'}</h3>
            {chat.partner && (
              <p className="hint">With: {chat.partner.username || chat.partner}</p>
            )}
          </div>
          <button className="ghost-btn" onClick={closeChat}>
            Close
          </button>
        </header>
        <div className="chat-messages" ref={listRef}>
          {chat.loading && <p className="hint">Loading conversation…</p>}
          {!chat.loading && chat.messages.length === 0 && <p className="hint">Start the conversation with the seller.</p>}
          {chat.messages.map((message) => (
            <div key={message.id} className="chat-bubble">
              <div className="bubble-header">
                <strong>{message.sender?.username || 'User'}</strong>
                <span>{new Date(message.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your offer or question…"
          />
          <button type="submit" className="primary-btn">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatDrawer

