import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../context/AppContext.jsx'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

const SkillNetwork = React.lazy(() => import('../components/SkillNetwork.jsx'))

function Auth() {
  const { api, state: { isAuthenticated } } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const origin = location.state?.from?.pathname || '/workspace'
      navigate(origin, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError(null)
  }

  // Helper to normalize DRF error payloads
  const normalizeError = (err) => {
    if (!err) return 'An unknown error occurred.'
    // If AppContext attached the raw response data
    const data = err.data || err.response?.data
    if (!data) return err.message || 'An error occurred during authentication.'

    if (typeof data === 'string') return data

    if (Array.isArray(data)) {
      return data.join(', ')
    }

    if (typeof data === 'object') {
      const messages = []
      for (const [key, value] of Object.entries(data)) {
        // Skip DRF generic status/detail keys if we want, or just format them
        if (key === 'detail' && typeof value === 'string') return value
        if (key === 'non_field_errors' && Array.isArray(value)) return value.join(', ')
        
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
        let formattedValue = value
        if (Array.isArray(value)) {
          formattedValue = value.join(', ')
        } else if (typeof value === 'object') {
          formattedValue = JSON.stringify(value)
        }
        messages.push(`${formattedKey}: ${formattedValue}`)
      }
      if (messages.length > 0) return messages.join(' | ')
    }

    return err.message || 'An error occurred during authentication.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        if (!formData.username || !formData.password) {
          throw new Error('Please enter username and password.')
        }
        await api.loginUser({ username: formData.username, password: formData.password })
      } else {
        if (!formData.username || !formData.email || !formData.password) {
          throw new Error('Please fill in all required fields.')
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match.')
        }
        await api.registerUser({ 
          username: formData.username, 
          email: formData.email, 
          password: formData.password 
        })
        // After successful registration, switch to login
        setIsLogin(true)
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
      }
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Left: Brand Visual (Simplified Constellation / Deep Space) */}
      <div 
        style={{ 
          flex: 1, 
          display: 'none', 
          '@media (min-width: 900px)': { display: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255,255,255,0.05)'
        }}
        className="auth-visual-panel"
      >
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '500px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="display-1" style={{ color: 'var(--bg-primary)', marginBottom: '1rem' }}>
              Enter the<br />Constellation.
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.25rem', lineHeight: 1.6 }}>
              Join a living network of skills. Trade your time, teach what you know, and learn what you don't.
            </p>
          </motion.div>
        </div>
        
        {/* Simplified SVG Constellation Background for Auth */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.6 }}>
          <React.Suspense fallback={
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="20%" cy="30%" r="400" fill="url(#glow)" />
              <circle cx="80%" cy="70%" r="600" fill="url(#glow)" stopColor="var(--accent-coral)" />
              <g stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                <line x1="20%" y1="30%" x2="45%" y2="50%" />
                <line x1="45%" y1="50%" x2="30%" y2="70%" />
              </g>
              <g fill="rgba(255,255,255,0.5)">
                <circle cx="20%" cy="30%" r="3" />
                <circle cx="45%" cy="50%" r="4" fill="var(--accent-coral)" />
              </g>
            </svg>
          }>
            <SkillNetwork isInteractive={false} />
          </React.Suspense>
        </div>
      </div>

      {/* Right: Auth Panel */}
      <div 
        style={{ 
          flex: 1, 
          maxWidth: '600px', 
          background: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3rem',
          position: 'relative'
        }}
        className="auth-form-panel"
      >
        <div style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
          
          <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.jpg" alt="TradeCraft" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--bg-dark)' }}>TradeCraft</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => { setIsLogin(true); setError(null); }}
              style={{
                background: 'none', border: 'none', padding: '0.5rem 0',
                fontSize: '1.125rem', fontWeight: 600, cursor: 'pointer',
                color: isLogin ? 'var(--bg-dark)' : 'var(--text-secondary)',
                borderBottom: isLogin ? '2px solid var(--accent-coral)' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(null); }}
              style={{
                background: 'none', border: 'none', padding: '0.5rem 0',
                fontSize: '1.125rem', fontWeight: 600, cursor: 'pointer',
                color: !isLogin ? 'var(--bg-dark)' : 'var(--text-secondary)',
                borderBottom: !isLogin ? '2px solid var(--accent-coral)' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: 'rgba(255, 90, 54, 0.1)',
                  color: 'var(--accent-coral)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <motion.div layout>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Username</label>
              <input 
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. adavel"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}
              />
            </motion.div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ paddingTop: '0.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Email</label>
                    <input 
                      name="email"
                      type="email"
                      required={!isLogin}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div layout style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.75rem 1rem', paddingRight: '3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ paddingTop: '0.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Confirm Password</label>
                    <input 
                      name="confirmPassword"
                      type="password"
                      required={!isLogin}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              layout
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%', padding: '1rem' }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </motion.button>
          </form>

        </div>
      </div>
    </div>
  )
}

export default Auth
