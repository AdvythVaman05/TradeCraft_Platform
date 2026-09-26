import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext.jsx'

function Account() {
  const {
    state: { profile, isAuthenticated },
    api: { createListing, updateProfile },
  } = useAppContext()

  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    phone: '',
    upi_id: '',
    bio: '',
    password: '',
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    price_rupees: '',
    price_timecredits: '',
  })
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

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    const phone = profileForm.phone.trim()
    if (phone && (!/^\d{10}$/.test(phone))) {
      alert('Phone number must be exactly 10 digits and contain only numbers.')
      return
    }
    if (!profileForm.password) {
      alert('Please enter your password to update your profile.')
      return
    }
    setProfileSubmitting(true)
    try {
      await updateProfile({
        username: profileForm.username,
        email: profileForm.email,
        phone: profileForm.phone,
        bio: profileForm.bio,
        password: profileForm.password,
        upi_id: profileForm.upi_id,
      })
      setIsEditingProfile(false)
      setProfileForm((prev) => ({ ...prev, password: '' }))
    } catch (error) {
      // Error handled in updateProfile
    } finally {
      setProfileSubmitting(false)
    }
  }

  const handleProfileCancel = () => {
    if (profile) {
      setProfileForm({
        username: profile.username || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        password: '',
      })
    }
    setIsEditingProfile(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.price_rupees) {
      const p = Number(form.price_rupees)
      if (isNaN(p) || !isFinite(p) || p <= 0) {
        alert('Price (₹) must be a valid number greater than 0.')
        return
      }
    }

    if (form.price_timecredits) {
      const t = Number(form.price_timecredits)
      if (isNaN(t) || !isFinite(t) || t <= 0) {
        alert('Time Credits must be a valid number greater than 0.')
        return
      }
    }
    setSubmitting(true)
    try {
      await createListing({
        ...form,
        price_rupees: form.price_rupees || null,
        price_timecredits: form.price_timecredits || null,
      })
      setForm({
        title: '',
        description: '',
        location: '',
        price_rupees: '',
        price_timecredits: '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="section" style={{ paddingTop: '4rem' }}>
        <div className="container">
          <div className="empty-state">
            <h2 className="mb-2">Sign in to view your profile</h2>
            <Link to="/" className="primary-btn accent">Go to Home</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="container editorial-grid">
        <div className="editorial-main">
          <div className="section-header mb-8">
            <h1 className="display-text">Your Profile</h1>
          </div>

          <div className="object-panel mb-8" style={{ background: 'var(--bg-primary)' }}>
            <div className="flex-between mb-6">
              <h2 style={{ fontSize: '1.5rem' }}>Identity</h2>
              <div className="badge accent" style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}>
                {profile?.time_credits ?? 0} Time Credits
              </div>
            </div>

            {isEditingProfile ? (
              <form className="record-list" onSubmit={handleProfileSubmit}>
                <div className="grid-2 mb-6">
                  <div className="input-group mb-0">
                    <label>Username</label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="input-group mb-0">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="input-group mb-0">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="input-group mb-0">
                    <label>UPI ID</label>
                    <input
                      type="text"
                      value={profileForm.upi_id}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, upi_id: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="input-group mb-6">
                  <label>Bio</label>
                  <textarea
                    rows={4}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about your background and skills..."
                  />
                </div>

                <div className="input-group mb-6" style={{ maxWidth: '300px' }}>
                  <label>Current Password <span className="text-accent">*</span></label>
                  <input
                    type="password"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    placeholder="Verify to save changes"
                  />
                </div>

                <div className="flex-row pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <button type="button" className="ghost-btn" onClick={handleProfileCancel} disabled={profileSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn accent" disabled={profileSubmitting}>
                    {profileSubmitting ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="grid-2 mb-6">
                  <div>
                    <div className="metadata mb-1">Username</div>
                    <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{profile.username}</div>
                  </div>
                  <div>
                    <div className="metadata mb-1">Email</div>
                    <div>{profile.email || '—'}</div>
                  </div>
                  <div>
                    <div className="metadata mb-1">Phone</div>
                    <div>{profile.phone || '—'}</div>
                  </div>
                  <div>
                    <div className="metadata mb-1">UPI ID</div>
                    <div>{profile.upi_id || '—'}</div>
                  </div>
                </div>
                
                <div className="mb-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="metadata mb-2">Bio & Experience</div>
                  <p style={{ lineHeight: 1.6, maxWidth: '600px', margin: 0 }}>
                    {profile.bio || 'No bio provided. Edit your profile to add one.'}
                  </p>
                </div>

                <div className="pt-4">
                  <button className="secondary-btn" onClick={() => setIsEditingProfile(true)}>
                    Edit Profile Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="editorial-side">
          <div className="object-panel">
            <h3 className="mb-6">Offer a skill</h3>
            <form className="record-list" onSubmit={handleSubmit}>
              <div className="input-group mb-4">
                <label>Skill Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Graphic Design Help"
                  required
                />
              </div>
              <div className="input-group mb-4">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What exactly will you provide?"
                  required
                />
              </div>
              <div className="input-group mb-4">
                <label>Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Remote or Local"
                />
              </div>
              
              <div className="grid-2 mb-6" style={{ gap: '1rem' }}>
                <div className="input-group mb-0">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price_rupees}
                    onChange={(e) => setForm((prev) => ({ ...prev, price_rupees: e.target.value }))}
                  />
                </div>
                <div className="input-group mb-0">
                  <label>Time Credits</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price_timecredits}
                    onChange={(e) => setForm((prev) => ({ ...prev, price_timecredits: e.target.value }))}
                  />
                </div>
              </div>
              
              <button className="primary-btn" type="submit" disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Account
