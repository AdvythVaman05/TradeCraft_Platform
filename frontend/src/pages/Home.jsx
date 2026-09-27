import React, { Suspense, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useAppContext } from '../context/AppContext.jsx'
import { Search, ArrowRight, Activity, Clock, Repeat, Zap } from 'lucide-react'

const SkillNetwork = React.lazy(() => import('../components/SkillNetwork.jsx'))

const SKILL_CHIPS = ['Python', 'UI Design', 'Machine Learning', 'Public Speaking', 'Guitar']

function Home() {
  const { state: { listings, isAuthenticated } } = useAppContext()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { scrollYProgress } = useScroll()

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/discover?q=${encodeURIComponent(search.trim())}`)
    }
  }

  const recentListings = listings.slice(0, 4)

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* SECTION 1: 3D Immersive Hero */}
      <section style={{ height: 'calc(100vh - 72px)', minHeight: '600px', position: 'relative', overflow: 'hidden', background: 'var(--bg-dark)', color: 'white' }}>
        
        {/* 3D Canvas Background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Suspense fallback={<div className="flex-center" style={{height:'100%'}}><Activity className="lucide-spin" color="var(--accent-teal)"/></div>}>
            <SkillNetwork isInteractive={true} />
          </Suspense>
        </div>

        {/* Hero Content Overlay */}
        <motion.div 
          style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', y: heroY, opacity: heroOpacity }}
        >
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', maxWidth: '800px', width: '100%' }}
          >
            <h1 className="display-1" style={{ marginBottom: '1.5rem', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              A living network<br/>of skills.
            </h1>
            
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
              TradeCraft is a community exchange. Share what you know, learn what you don't.
            </p>

            <form 
              onSubmit={handleSearch}
              style={{ position: 'relative', maxWidth: '500px', margin: '0 auto 2rem auto' }}
            >
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                <input 
                  type="text" 
                  placeholder="What do you want to learn?" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.25rem 1.25rem 3.5rem',
                    fontSize: '1.125rem',
                    borderRadius: '0',
                    border: '2px solid var(--accent-teal)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxShadow: '4px 4px 0px var(--accent-coral)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-coral)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--accent-teal)'}
                />
              </div>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              {SKILL_CHIPS.map((chip, i) => (
                <motion.button
                  key={chip}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}
                  onClick={() => navigate(`/discover?q=${chip}`)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.8)',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  {chip}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: 'absolute', bottom: '2rem', left: '50%', x: '-50%', color: 'rgba(255,255,255,0.3)', zIndex: 10 }}
        >
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)' }} />
        </motion.div>
      </section>

      {/* SECTION 2: The Loop */}
      <section style={{ padding: '8rem 0', background: 'var(--bg-primary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 className="display-2" style={{ marginBottom: '1rem' }}>How it works</h2>
            <p className="text-muted" style={{ fontSize: '1.125rem', maxWidth: '500px', margin: '0 auto' }}>A continuous cycle of giving and receiving knowledge.</p>
          </div>
          
          <div className="page-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            {[
              { icon: <Search/>, title: "Discover", desc: "Find exactly what you need to learn from the community network." },
              { icon: <ArrowRight/>, title: "Request", desc: "Propose an exchange using Time Credits or direct payment." },
              { icon: <Repeat/>, title: "Exchange", desc: "Meet online or in-person to share your expertise." },
              { icon: <Zap/>, title: "Learn & Earn", desc: "Gain new skills and earn credits for the time you spend teaching." }
            ].map((step, i) => (
              <motion.div 
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
                className="surface"
                style={{ textAlign: 'center', padding: '3rem 2rem' }}
              >
                <div style={{ 
                  width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-dark)', color: 'white', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' 
                }}>
                  {step.icon}
                </div>
                <h3 className="title-3" style={{ marginBottom: '0.75rem' }}>{step.title}</h3>
                <p className="text-muted">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Live Ecosystem */}
      <section style={{ padding: '8rem 0', background: 'var(--bg-dark)', color: 'white' }}>
        <div className="container">
          <div className="flex-between" style={{ marginBottom: '4rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="display-2" style={{ color: 'var(--bg-primary)' }}>Live in the network</h2>
            <Link to="/discover" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
              Explore Marketplace <ArrowRight size={16}/>
            </Link>
          </div>

          {recentListings.length === 0 ? (
            <div style={{ padding: '6rem 2rem', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <h3 className="title-2" style={{ marginBottom: '1rem' }}>The network is waiting.</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
                No skills are listed yet. Be the first person to offer something and set the standard.
              </p>
              <Link to="/auth" className="btn btn-primary">Offer a Skill</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {recentListings.map((listing, i) => (
                <motion.div 
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onClick={() => navigate('/discover')}
                >
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <span className="tag" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>{listing.location || 'Remote'}</span>
                    {listing.price_timecredits && <span className="text-mono" style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{listing.price_timecredits} TC</span>}
                  </div>
                  <h3 className="title-3" style={{ marginBottom: '1rem', color: 'var(--bg-primary)' }}>{listing.title}</h3>
                  <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {listing.provider?.username?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{listing.provider?.username}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: Time Credits */}
      <section style={{ padding: '8rem 0', background: 'var(--bg-primary)' }}>
        <div className="container">
          <div className="page-grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '4rem' }}>
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="tag amber" style={{ marginBottom: '1.5rem' }}>THE MECHANIC</div>
              <h2 className="display-2" style={{ marginBottom: '1.5rem' }}>Time is the only currency that matters.</h2>
              <p className="text-muted" style={{ fontSize: '1.125rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                TradeCraft operates on Time Credits (TC). When you spend an hour teaching someone a skill, you earn 1 TC. You can then spend that TC to learn from anyone else in the network.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 500 }}><Clock color="var(--accent-coral)"/> 1 Hour Taught = 1 TC Earned</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 500 }}><Repeat color="var(--accent-teal)"/> 1 TC Spent = 1 Hour Learned</li>
              </ul>
              <Link to="/auth" className="btn btn-outline">Start Earning</Link>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              whileInView={{ opacity: 1, scale: 1 }} 
              viewport={{ once: true }}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <div style={{ position: 'relative', width: '300px', height: '300px', borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="text-mono" style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--accent-amber)', lineHeight: 1 }}>+1.0</div>
                  <div style={{ fontWeight: 600, letterSpacing: '0.1em', marginTop: '0.5rem' }}>TIME CREDIT</div>
                </div>
                {/* Decorative orbiting element */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                  style={{ position: 'absolute', inset: -20, border: '1px dashed var(--border-strong)', borderRadius: '50%' }}
                >
                  <div style={{ position: 'absolute', top: -6, left: '50%', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-coral)', transform: 'translateX(-50%)' }} />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Final CTA */}
      {!isAuthenticated && (
        <section style={{ padding: '8rem 0', background: 'var(--accent-teal)', color: 'white', textAlign: 'center' }}>
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ maxWidth: '600px', margin: '0 auto' }}
            >
              <h2 className="display-2" style={{ marginBottom: '1.5rem', color: 'var(--bg-primary)' }}>Enter the Constellation.</h2>
              <p style={{ fontSize: '1.25rem', marginBottom: '2.5rem', color: 'rgba(255,255,255,0.8)' }}>
                Join the skill exchange platform. Build your profile, share your expertise, and tap into the network.
              </p>
              <Link to="/auth" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2.5rem' }}>
                Join TradeCraft
              </Link>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  )
}

export default Home
