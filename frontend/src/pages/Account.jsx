import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppContext } from '../context/AppContext.jsx'
import { Settings, Plus, MapPin } from 'lucide-react'

function Account() {
  const {
    state: { profile, isAuthenticated, transactions, listings },
    api: { createListing, updateProfile },
  } = useAppContext()

  const [profileForm, setProfileForm] = useState({
    username: '', email: '', phone: '', upi_id: '', bio: '', password: '',
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isOffering, setIsOffering] = useState(false)
  
  const [form, setForm] = useState({ title: '', description: '', location: '', price_rupees: '', price_timecredits: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (profile) {
      setProfileForm({
        username: profile.username || '',
        email: profile.email || '',
        phone: profile.phone || '',
        upi_id: profile.upi_id || '',
        bio: profile.bio || '',
        password: '',
      })
    }
  }, [profile])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateProfile({ ...profileForm })
      setIsEditingProfile(false)
      setProfileForm(p => ({ ...p, password: '' }))
    } catch (error) {}
  }

  const handleSubmitListing = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createListing({
        ...form,
        price_rupees: form.price_rupees || null,
        price_timecredits: form.price_timecredits || null,
      })
      setForm({ title: '', description: '', location: '', price_rupees: '', price_timecredits: '' })
      setIsOffering(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) return (
    <div className="flex-column flex-center" style={{ flex: 1, padding: '4rem 0' }}>
      <h2 className="title-1 mb-2">Sign in to view your profile</h2>
      <Link to="/auth" className="btn btn-primary mt-2">Sign In</Link>
    </div>
  )

  const myActiveListings = listings.filter(l => l.provider?.id === profile?.id)
  const myCompletedExchanges = transactions.filter(t => t.seller_verified)

  return (
    <div style={{ flex: 1, padding: '4rem 0' }}>
      <div className="container page-grid has-sidebar">
        
        <div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-column gap-4"
          >
            {/* Header Profile */}
            <div className="surface" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: 'var(--accent-teal)', borderBottom: '1px solid var(--border-light)' }} />
              
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-end', gap: '2rem', marginTop: '40px' }}>
                <div style={{ 
                  width: 120, height: 120, borderRadius: '24px', background: 'var(--bg-primary)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 700, 
                  color: 'var(--accent-teal)', boxShadow: 'var(--shadow-md)', border: '4px solid var(--bg-surface)' 
                }}>
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                
                <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                  <h1 className="display-2" style={{ marginBottom: '0.25rem' }}>{profile.username}</h1>
                  <div className="text-muted flex-center" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
                    <span>Community Member</span>
                    <span>&middot;</span>
                    <span className="flex-center gap-1"><MapPin size={14}/> India</span>
                  </div>
                </div>

                <button className="btn btn-outline" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                  <Settings size={18} /> Settings
                </button>
              </div>

              {isEditingProfile ? (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex-column gap-3" 
                  style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid var(--border-light)' }}
                  onSubmit={handleProfileSubmit}
                >
                  <h3 className="title-3">Edit Profile</h3>
                  <div className="page-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="input-group"><label>Username</label><input value={profileForm.username} onChange={e => setProfileForm(p => ({...p, username: e.target.value}))} /></div>
                    <div className="input-group"><label>Email</label><input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({...p, email: e.target.value}))} /></div>
                    <div className="input-group"><label>Phone</label><input type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))} /></div>
                    <div className="input-group"><label>UPI ID</label><input value={profileForm.upi_id} onChange={e => setProfileForm(p => ({...p, upi_id: e.target.value}))} /></div>
                  </div>
                  <div className="input-group"><label>Bio</label><textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(p => ({...p, bio: e.target.value}))} /></div>
                  <div className="input-group"><label>Password (to confirm)</label><input type="password" required value={profileForm.password} onChange={e => setProfileForm(p => ({...p, password: e.target.value}))} /></div>
                  <div className="flex-center" style={{ gap: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Profile</button>
                  </div>
                </motion.form>
              ) : (
                <div style={{ marginTop: '3rem', maxWidth: '600px' }}>
                  <h3 className="title-3" style={{ marginBottom: '1rem' }}>About me</h3>
                  <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                    {profile.bio || "This user hasn't written a bio yet."}
                  </p>
                </div>
              )}
            </div>

            {/* Offerings Section */}
            <div>
              <div className="flex-between" style={{ marginBottom: '1.5rem', marginTop: '2rem' }}>
                <h2 className="title-2">What I can help with</h2>
                <button className="btn btn-primary" onClick={() => setIsOffering(!isOffering)}>
                  <Plus size={18} /> Offer a Skill
                </button>
              </div>

              {isOffering && (
                <motion.form 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="surface flex-column gap-3 mb-4" 
                  onSubmit={handleSubmitListing}
                >
                  <h3 className="title-3">New Offering</h3>
                  <div className="input-group"><label>Title</label><input required value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g. React Mentorship" /></div>
                  <div className="input-group"><label>Description</label><textarea required rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
                  <div className="page-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div className="input-group"><label>Location</label><input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} /></div>
                    <div className="input-group"><label>Price (₹)</label><input type="number" step="0.01" value={form.price_rupees} onChange={e => setForm(p => ({...p, price_rupees: e.target.value}))} /></div>
                    <div className="input-group"><label>Time Credits</label><input type="number" step="0.01" value={form.price_timecredits} onChange={e => setForm(p => ({...p, price_timecredits: e.target.value}))} /></div>
                  </div>
                  <div className="flex-center" style={{ gap: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsOffering(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>Publish</button>
                  </div>
                </motion.form>
              )}

              {myActiveListings.length === 0 && !isOffering ? (
                <div className="surface" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
                  <p className="text-muted">You haven't offered any skills yet.</p>
                </div>
              ) : (
                <div className="flex-column gap-3">
                  {myActiveListings.map(listing => (
                    <div key={listing.id} className="surface flex-between" style={{ padding: '1.5rem' }}>
                      <div>
                        <h3 className="title-3" style={{ marginBottom: '0.25rem' }}>{listing.title}</h3>
                        <div className="text-muted">{listing.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        </div>

        {/* Sidebar */}
        <div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="surface flex-column gap-4" 
            style={{ position: 'sticky', top: '100px', background: 'var(--bg-dark)', color: 'white', border: 'none' }}
          >
            <div>
              <div style={{ color: 'var(--accent-coral)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem', fontWeight: 600 }}>Stats</div>
              <div className="title-1">{myActiveListings.length} Active Skills</div>
              <div className="title-1">{myCompletedExchanges.length} Exchanges</div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  )
}

export default Account
