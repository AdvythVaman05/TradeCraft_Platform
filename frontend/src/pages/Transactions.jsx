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
      <section className="section">
        <div className="container">
          <article className="card">
            <h2>Sign in to manage transactions</h2>
            <p className="hint">
              Transactions are tied to your buyer/seller account. <Link to="/account">Head to the account page</Link> to
              log in.
            </p>
          </article>
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <div>
            <h2>Your recent transactions</h2>
          </div>
        </div>
        {transactions.length === 0 ? (
          <p className="hint">No transactions yet. Start one from the listings page.</p>
        ) : (
          <div className="transaction-list">
            {transactions.map((txn) => {
              const isBuyer = txn.buyer?.id === profile?.id
              const isSeller = txn.seller?.id === profile?.id
              const status = txn.seller_rejected
                ? { label: 'Rejected', className: 'error' }
                : txn.seller_verified
                ? { label: 'Completed', className: 'success' }
                : txn.payment_method === 'UPI' && !txn.buyer_txn_id
                ? { label: 'Awaiting buyer UPI reference', className: 'warn' }
                : { label: 'Pending seller action', className: 'pending' }

              return (
                <article className="transaction-card" key={txn.id}>
                  <header>
                    <div>
                      <p className="eyebrow">{txn.listing?.title || 'Listing removed'}</p>
                      <h3>{txn.payment_method} payment</h3>
                      <p className="hint">
                        Buyer: {txn.buyer?.username || '—'} • Seller: {txn.seller?.username || '—'}
                      </p>
                      {txn.seller_rejected && (
                        <p className="hint error">
                          Seller rejected this payment on{' '}
                          {txn.seller_rejected_at
                            ? new Date(txn.seller_rejected_at).toLocaleString('en-IN')
                            : '—'}
                        </p>
                      )}
                    </div>
                    <span className={`status-pill ${status.className}`}>{status.label}</span>
                  </header>

                  {txn.payment_method === 'UPI' && (
                    <p className="hint">
                      Seller UPI ID:{' '}
                      {txn.seller?.upi_id ? <strong>{txn.seller.upi_id}</strong> : 'Not provided yet'}
                    </p>
                  )}

                  {txn.payment_method === 'UPI' && !txn.buyer_txn_id && isBuyer && !txn.seller_rejected && (
                    <form
                      className="stack txn-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        submitTxnId(txn.id, formState[txn.id]?.buyer_txn_id ?? '')
                        setFormState((prev) => ({ ...prev, [txn.id]: { buyer_txn_id: '' } }))
                      }}
                    >
                      <label>
                        Provide UPI transaction reference
                        <input
                          value={formState[txn.id]?.buyer_txn_id ?? ''}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              [txn.id]: { buyer_txn_id: event.target.value },
                            }))
                          }
                          placeholder="UTR / UPI reference"
                          required
                        />
                      </label>
                      <button type="submit" className="primary-btn">
                        Submit transaction ID
                      </button>
                    </form>
                  )}

                  {txn.payment_method === 'UPI' && txn.buyer_txn_id && (
                    <p className="hint">
                      Buyer UPI reference:{' '}
                      <code style={{ fontSize: '0.95rem' }}>{txn.buyer_txn_id}</code>
                    </p>
                  )}

                  {txn.payment_method === 'UPI' && txn.buyer_txn_id && !txn.seller_verified && !txn.seller_rejected && isSeller && (
                    <div className="action-row">
                      <button className="primary-btn" onClick={() => verifyTransaction(txn.id)}>
                        Confirm payment
                      </button>
                      <button className="ghost-btn" onClick={() => rejectTransaction(txn.id)}>
                        Reject payment
                      </button>
                    </div>
                  )}

                  {txn.payment_method === 'UPI' && txn.seller_rejected && (
                    <p className="hint error">Seller rejected this payment. Please contact the seller for details.</p>
                  )}

                  {txn.payment_method === 'TC' && (
                    <>
                      {txn.seller_verified ? (
                        <p className="hint">This time-credit transaction has been confirmed by the seller.</p>
                      ) : txn.seller_rejected ? (
                        <p className="hint error">Seller rejected this transaction.</p>
                      ) : isSeller ? (
                        <div className="action-row">
                          <button className="primary-btn" onClick={() => verifyTransaction(txn.id)}>
                            Confirm trade
                          </button>
                          <button className="ghost-btn" onClick={() => rejectTransaction(txn.id)}>
                            Reject trade
                          </button>
                        </div>
                      ) : (
                        <p className="hint">This time-credit transaction is awaiting seller confirmation.</p>
                      )}
                    </>
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

export default Transactions

