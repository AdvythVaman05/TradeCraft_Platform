import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppContext } from '../context/AppContext.jsx'
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'

function ExchangeCard({ txn, isBuyer, isSeller, api, formState, setFormState }) {
  const { submitTxnId, verifyTransaction, rejectTransaction } = api
  
  const status = txn.seller_rejected
    ? 'rejected'
    : txn.seller_verified
    ? 'completed'
    : 'pending'

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface"
      style={{ padding: '1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: status === 'completed' ? 'var(--surface-mint)' : status === 'rejected' ? 'var(--accent-coral)' : 'var(--accent-gold)' }} />
      
      <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div className="flex-center gap-2" style={{ justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
            {status === 'completed' && <span className="tag teal flex-center gap-1"><CheckCircle size={12}/> Completed</span>}
            {status === 'rejected' && <span className="tag coral flex-center gap-1"><XCircle size={12}/> Cancelled</span>}
            {status === 'pending' && <span className="tag amber flex-center gap-1"><Clock size={12}/> Active Request</span>}
            <span className="text-small text-mono">{txn.payment_method} Exchange</span>
          </div>
          
          <h3 className="title-2" style={{ marginBottom: '0.5rem' }}>{txn.listing?.title || 'Listing removed'}</h3>
          
          <div className="flex-center gap-2 text-muted" style={{ justifyContent: 'flex-start' }}>
            <span style={{ fontWeight: isBuyer ? 600 : 400, color: isBuyer ? 'var(--text-primary)' : 'inherit' }}>{txn.buyer?.username}</span>
            <ArrowRight size={14} />
            <span style={{ fontWeight: isSeller ? 600 : 400, color: isSeller ? 'var(--text-primary)' : 'inherit' }}>{txn.seller?.username}</span>
          </div>

          {txn.payment_method === 'UPI' && (
            <div className="text-small text-muted" style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
              Seller UPI: <strong style={{color: 'var(--text-primary)'}}>{txn.seller?.upi_id || 'Not provided'}</strong>
              {txn.buyer_txn_id && <div>Buyer UTR: <strong style={{color: 'var(--text-primary)'}}>{txn.buyer_txn_id}</strong></div>}
            </div>
          )}
        </div>

        <div style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {status === 'pending' && txn.payment_method === 'UPI' && !txn.buyer_txn_id && isBuyer && (
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              onSubmit={(e) => {
                e.preventDefault()
                submitTxnId(txn.id, formState[txn.id]?.buyer_txn_id ?? '')
                setFormState((prev) => ({ ...prev, [txn.id]: { buyer_txn_id: '' } }))
              }}
            >
              <input
                style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                value={formState[txn.id]?.buyer_txn_id ?? ''}
                onChange={(e) => setFormState((prev) => ({ ...prev, [txn.id]: { buyer_txn_id: e.target.value } }))}
                placeholder="Submit UTR / Reference ID"
                required
              />
              <button type="submit" className="btn btn-outline">Submit Reference</button>
            </form>
          )}

          {status === 'pending' && isSeller && (
            <>
              {txn.payment_method === 'TC' || (txn.payment_method === 'UPI' && txn.buyer_txn_id) ? (
                <div className="flex-column gap-2">
                  <button className="btn btn-primary" onClick={() => verifyTransaction(txn.id)}>
                    Complete Exchange
                  </button>
                  <button className="btn btn-ghost" onClick={() => rejectTransaction(txn.id)}>
                    Cancel Request
                  </button>
                </div>
              ) : (
                <div className="text-small text-muted" style={{ textAlign: 'right' }}>
                  Waiting for buyer to submit UPI reference.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function Transactions() {
  const { state: { transactions, isAuthenticated, profile }, api } = useAppContext()
  const [formState, setFormState] = useState({})

  const { active, completed, cancelled } = useMemo(() => {
    return transactions.reduce((acc, txn) => {
      if (txn.seller_rejected) acc.cancelled.push(txn)
      else if (txn.seller_verified) acc.completed.push(txn)
      else acc.active.push(txn)
      return acc
    }, { active: [], completed: [], cancelled: [] })
  }, [transactions])

  if (!isAuthenticated) {
    return (
      <div className="flex-column flex-center" style={{ flex: 1, padding: '4rem 0' }}>
        <h2 className="title-1 mb-2">Sign in to view exchanges</h2>
        <Link to="/auth" className="btn btn-primary mt-2">Sign In</Link>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: '4rem 0' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        <h1 className="display-2" style={{ marginBottom: '3rem' }}>My Exchanges</h1>

        {transactions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-column flex-center" 
            style={{ padding: '4rem', background: 'var(--surface-blue)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}
          >
            <h3 className="title-2" style={{ marginBottom: '1rem', color: 'var(--accent-teal)' }}>No exchanges yet</h3>
            <p style={{ marginBottom: '2rem', maxWidth: '400px' }}>
              Your first exchange starts with finding something worth learning.
            </p>
            <Link to="/discover" className="btn btn-primary">Explore Skills</Link>
          </motion.div>
        ) : (
          <div className="flex-column gap-4">
            {active.length > 0 && (
              <section>
                <h3 className="title-3" style={{ marginBottom: '1rem', color: 'var(--accent-coral)' }}>Active Requests</h3>
                {active.map(txn => (
                  <ExchangeCard 
                    key={txn.id} 
                    txn={txn} 
                    isBuyer={txn.buyer?.id === profile?.id} 
                    isSeller={txn.seller?.id === profile?.id}
                    api={api}
                    formState={formState}
                    setFormState={setFormState}
                  />
                ))}
              </section>
            )}

            {completed.length > 0 && (
              <section style={{ marginTop: '2rem' }}>
                <h3 className="title-3" style={{ marginBottom: '1rem' }}>Completed</h3>
                {completed.map(txn => (
                  <ExchangeCard 
                    key={txn.id} 
                    txn={txn} 
                    isBuyer={txn.buyer?.id === profile?.id} 
                    isSeller={txn.seller?.id === profile?.id}
                    api={api}
                    formState={formState}
                    setFormState={setFormState}
                  />
                ))}
              </section>
            )}

            {cancelled.length > 0 && (
              <section style={{ marginTop: '2rem', opacity: 0.7 }}>
                <h3 className="title-3" style={{ marginBottom: '1rem' }}>Cancelled</h3>
                {cancelled.map(txn => (
                  <ExchangeCard 
                    key={txn.id} 
                    txn={txn} 
                    isBuyer={txn.buyer?.id === profile?.id} 
                    isSeller={txn.seller?.id === profile?.id}
                    api={api}
                    formState={formState}
                    setFormState={setFormState}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Transactions
