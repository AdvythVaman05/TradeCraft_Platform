import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

function Transactions() {
  const {
    state: { transactions, isAuthenticated, profile },
    api: { submitTxnId, verifyTransaction, rejectTransaction },
  } = useAppContext()

  const [formState, setFormState] = useState({})

  if (!isAuthenticated) {
    return (
      <section className="section" style={{ paddingTop: '4rem' }}>
        <div className="container">
          <div className="empty-state">
            <h2 className="mb-2">Sign in to manage transactions</h2>
            <p className="mb-6">
              Transactions are tied to your account. Head to the home page to log in.
            </p>
            <Link to="/" className="primary-btn accent">Go to Home</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="container">
        <div className="editorial-grid mb-8">
          <div className="editorial-main">
            <h1 className="display-text mb-4">Transactions</h1>
            <p className="lede">
              Track your skill exchanges, pending requests, and time credit transfers.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions yet.</p>
            <p>Start a trade from the community listings.</p>
            <Link to="/listings" className="secondary-btn mt-4">Browse listings</Link>
          </div>
        ) : (
          <div className="record-list" style={{ borderTop: '1px solid var(--border)' }}>
            {transactions.map((txn) => {
              const isBuyer = txn.buyer?.id === profile?.id
              const isSeller = txn.seller?.id === profile?.id
              const status = txn.seller_rejected
                ? { label: 'Rejected', className: 'error' }
                : txn.seller_verified
                ? { label: 'Completed', className: 'success' }
                : txn.payment_method === 'UPI' && !txn.buyer_txn_id
                ? { label: 'Awaiting buyer UPI reference', className: 'pending' }
                : { label: 'Pending seller action', className: 'pending' }

              return (
                <div className="record-row" key={txn.id} style={{ alignItems: 'flex-start', padding: '1.5rem 0' }}>
                  <div className="record-main" style={{ flex: 1 }}>
                    <div className="flex-row mb-1">
                      <span className="record-title">{txn.listing?.title || 'Listing removed'}</span>
                      <span className={`status-pill ${status.className}`}>{status.label}</span>
                    </div>
                    
                    <div className="record-meta mb-2">
                      <span>{txn.payment_method} Exchange</span>
                      <span>&middot;</span>
                      <span>Buyer: {txn.buyer?.username || '—'}</span>
                      <span>&middot;</span>
                      <span>Seller: {txn.seller?.username || '—'}</span>
                    </div>

                    {txn.seller_rejected && (
                      <div className="metadata text-accent">
                        Seller rejected on {txn.seller_rejected_at ? new Date(txn.seller_rejected_at).toLocaleString('en-IN') : '—'}
                      </div>
                    )}
                    
                    {txn.payment_method === 'UPI' && (
                      <div className="metadata mt-2">
                        Seller UPI: {txn.seller?.upi_id || 'Not provided'}
                        {txn.buyer_txn_id && ` | Buyer UTR: ${txn.buyer_txn_id}`}
                      </div>
                    )}
                  </div>

                  <div className="record-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', minWidth: '220px' }}>
                    {txn.payment_method === 'UPI' && !txn.buyer_txn_id && isBuyer && !txn.seller_rejected && (
                      <form
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}
                        onSubmit={(event) => {
                          event.preventDefault()
                          submitTxnId(txn.id, formState[txn.id]?.buyer_txn_id ?? '')
                          setFormState((prev) => ({ ...prev, [txn.id]: { buyer_txn_id: '' } }))
                        }}
                      >
                        <input
                          style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                          value={formState[txn.id]?.buyer_txn_id ?? ''}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              [txn.id]: { buyer_txn_id: event.target.value },
                            }))
                          }
                          placeholder="UTR / Reference ID"
                          required
                        />
                        <button type="submit" className="primary-btn" style={{ padding: '0.5rem' }}>
                          Submit UTR
                        </button>
                      </form>
                    )}

                    {txn.payment_method === 'UPI' && txn.buyer_txn_id && !txn.seller_verified && !txn.seller_rejected && isSeller && (
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button className="primary-btn accent" style={{ flex: 1 }} onClick={() => verifyTransaction(txn.id)}>
                          Confirm
                        </button>
                        <button className="ghost-btn" style={{ flex: 1 }} onClick={() => rejectTransaction(txn.id)}>
                          Reject
                        </button>
                      </div>
                    )}

                    {txn.payment_method === 'TC' && !txn.seller_verified && !txn.seller_rejected && isSeller && (
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button className="primary-btn accent" style={{ flex: 1 }} onClick={() => verifyTransaction(txn.id)}>
                          Confirm
                        </button>
                        <button className="ghost-btn" style={{ flex: 1 }} onClick={() => rejectTransaction(txn.id)}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default Transactions
