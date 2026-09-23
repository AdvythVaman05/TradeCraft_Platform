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

  // Initialize profile form when profile loads
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
    // Phone validation: must be 10 digits, all numbers
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
      // Error is already handled in updateProfile
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
    // Validate price_rupees and price_timecredits as positive numbers (> 0)
    if (form.price_rupees) {
      const p = Number(form.price_rupees)
      if (isNaN(p) || !isFinite(p)) {
        alert('Price (₹) must be a valid number.')
        return
      }
      if (p <= 0) {
        alert('Price (₹) must be greater than 0.')
        return
      }
    }

    if (form.price_timecredits) {
      const t = Number(form.price_timecredits)
      if (isNaN(t) || !isFinite(t)) {
        alert('Time Credits must be a valid number.')
        return
      }
      if (t <= 0) {
        alert('Time Credits must be greater than 0.')
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

  return (
    <section className="section">
      <div className="container section-grid two-column">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Your account snapshot</h2>
            </div>
            <p className="badge">TC {profile?.time_credits ?? 0}</p>
          </div>
          {isAuthenticated && profile ? (
            isEditingProfile ? (
              <form className="stack" onSubmit={handleProfileSubmit}>
                <label>
                  Username
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                    required
                    placeholder="jane_doe"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="jane@example.com"
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </label>
                <label>
                  UPI ID
                  <input
                    type="text"
                    value={profileForm.upi_id}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, upi_id: e.target.value }))}
                    placeholder="seller@upi"
                  />
                </label>
                {/* UPI QR upload removed — UPI ID is handled as text only */}
                <label>
                  Bio
                  <textarea
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                  />
                </label>
                <label>
                  Password (required to update)
                  <input
                    type="password"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    placeholder="Enter your password"
                  />
                </label>
                <div className="action-row">
                  <button type="button" className="ghost-btn" onClick={handleProfileCancel} disabled={profileSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" disabled={profileSubmitting}>
                    {profileSubmitting ? 'Updating…' : 'Update profile'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="profile-grid">
                  <div>
                    <p className="eyebrow">Username</p>
                    <p>{profile.username}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Email</p>
                    <p>{profile.email || '—'}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Phone</p>
                    <p>{profile.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="eyebrow">UPI ID</p>
                    <p>{profile.upi_id || '—'}</p>
                  </div>
                  {/* UPI QR display removed — UPI ID is shown as text above */}
                  <div>
                    <p className="eyebrow">Bio</p>
                    <p>{profile.bio || 'Add a short bio.'}</p>
                  </div>
                </div>
                <div className="action-row" style={{ marginTop: '1rem' }}>
                  <button className="primary-btn" onClick={() => setIsEditingProfile(true)}>
                    Edit profile
                  </button>
                </div>
              </>
            )
          ) : (
            <p className="hint">
              Sign in to view your profile. Use the <Link to="/">home page</Link> to register or log into your account.
            </p>
          )}
        </article>

        <article className="card">
          <p className="eyebrow">Share a skill</p>
          <h2>Post a new listing</h2>
          <form className="stack" onSubmit={handleSubmit}>
            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Full-stack mentorship session"
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Describe what you offer…"
                required
              />
            </label>
            <label>
              Location
              <input
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Hybrid / Bengaluru"
              />
            </label>
            <div className="split">
              <label>
                Price (₹)
                <input
                  type="number"
                    min="0.01"
                    step="0.01"
                  value={form.price_rupees}
                  onChange={(event) => setForm((prev) => ({ ...prev, price_rupees: event.target.value }))}
                />
              </label>
              <label>
                Time Credits
                <input
                  type="number"
                    min="0.01"
                    step="0.01"
                  value={form.price_timecredits}
                  onChange={(event) => setForm((prev) => ({ ...prev, price_timecredits: event.target.value }))}
                />
              </label>
            </div>
            <button className="primary-btn" type="submit" disabled={!isAuthenticated || submitting}>
              {!isAuthenticated ? 'Sign in to publish' : submitting ? 'Publishing…' : 'Publish listing'}
            </button>
          </form>
        </article>
      </div>
    </section>
  )
}

export default Account

