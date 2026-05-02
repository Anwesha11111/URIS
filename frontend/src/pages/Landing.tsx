import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Diamond, BarChart3, Shield, Zap, ArrowRight } from 'lucide-react'
import Starfield from '../components/Starfield'
import Navbar from '../components/Navbar'

const features = [
  { icon: BarChart3, tag: 'SCORING ENGINE', title: 'CapacityScore', desc: 'Multidimensional composite: availability, task load, exam flags, rolling performance index, and credibility — recalculated every sync cycle.' },
  { icon: Shield, tag: 'BEHAVIORAL ANALYSIS', title: 'Credibility System', desc: 'Cross-references declared availability against actual login activity, throughput, deadline behavior, and blocker timing patterns.' },
  { icon: Zap, tag: 'ASSIGNMENT ENGINE', title: 'ASL Triad', desc: 'Availability → Skill → Load filter ranks eligible interns into a shortlist with soft reservation and automatic expiration.' },
]

export default function Landing() {
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 400], [0, 70])
  const heroO = useTransform(scrollY, [0, 280], [1, 0])

  return (
    <div style={{ minHeight: '100vh', background: '#07080f', overflowX: 'hidden' }}>
      <Starfield />
      <Navbar />

      {/* HERO */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '5rem 1.5rem 3rem', zIndex: 10 }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(201,168,76,0.045) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <motion.div style={{ y: heroY, opacity: heroO }} className="w-full">
          {/* Signal badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="signal-badge" style={{ display: 'inline-flex' }}>
              <span className="status-dot dot-green animate-pulse-s" />
              <Diamond size={8} style={{ color: '#c9a84c' }} />
              <span className="nav-label" style={{ fontSize: '0.63rem', color: 'rgba(184,212,240,0.65)', letterSpacing: '0.28em' }}>STEMONEF SIGNAL INTELLIGENCE</span>
            </motion.div>
          </div>

          {/* GIANT heading */}
          <div className="relative inline-block mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="text-ice-gradient font-display font-black"
              style={{ fontSize: 'clamp(3.5rem, 15vw, 12rem)', lineHeight: 0.88, letterSpacing: '0.015em', marginBottom: 0 }}
            >
              URIS
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 nav-label text-[0.55rem] text-gold/40 tracking-[0.8em] whitespace-nowrap">
              BY STEMONEF
            </motion.div>
          </div>

          {/* Gold rule */}
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9, duration: 0.9 }}
            className="gold-rule" style={{ width: '40%', maxWidth: '300px', margin: '0 auto 1.6rem' }} />

          {/* Subtitle */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }}
            className="nav-label" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.9rem)', color: 'rgba(184,212,240,0.5)', letterSpacing: '0.32em', marginBottom: '1.5rem' }}>
            UNIFIED RESOURCE INTELLIGENCE SYSTEM
          </motion.p>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15 }}
            className="font-body px-4" style={{ fontSize: '1.1rem', color: 'rgba(184,212,240,0.4)', maxWidth: 520, margin: '0 auto 2.8rem', lineHeight: 1.7 }}>
            A middleware-driven platform integrating Nextcloud, Plane.so, and OpenProject into a single intelligent environment.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}
            className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center px-6">
            <Link to="/dashboard" className="w-full sm:w-auto">
              <motion.button whileHover={{ scale: 1.04, boxShadow: '0 14px 36px rgba(201,168,76,0.35)' }} whileTap={{ scale: 0.97 }}
                className="btn-gold w-full" style={{ padding: '14px 36px', fontSize: '0.72rem', borderRadius: 3 }}>
                OPEN DASHBOARD
              </motion.button>
            </Link>
            <Link to="/availability" className="w-full sm:w-auto">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-outline w-full" style={{ padding: '14px 36px', fontSize: '0.72rem', borderRadius: 3 }}>
                SUBMIT AVAILABILITY
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator - Improved responsiveness */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
          <div className="w-[1px] h-12 relative overflow-hidden bg-white/5">
            <motion.div 
              animate={{ y: [-48, 48] }} 
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/50 to-transparent" />
          </div>
          <span className="nav-label text-[0.45rem] text-gold/20 tracking-[0.4em] group-hover:text-gold/40 transition-colors">EXPLORE</span>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section style={{ position: 'relative', zIndex: 10, padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p className="nav-label" style={{ fontSize: '0.58rem', color: 'rgba(201,168,76,0.45)', letterSpacing: '0.45em', marginBottom: 12 }}>INTELLIGENCE ARCHITECTURE</p>
            <h2 className="font-display font-black text-ice-gradient" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>Layered Intelligence. Unified Truth.</h2>
            <div className="gold-rule" style={{ width: 80, margin: '1.2rem auto 0' }} />
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {features.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.13 }}
                whileHover={{ y: -5, borderColor: 'rgba(201,168,76,0.32)' }}
                className="glass-card" style={{ padding: '1.75rem', borderRadius: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 3, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <f.icon size={15} style={{ color: '#c9a84c' }} />
                  </div>
                  <span className="nav-label" style={{ fontSize: '0.52rem', color: 'rgba(201,168,76,0.5)' }}>{f.tag}</span>
                </div>
                <h3 className="font-display" style={{ fontSize: '1.35rem', color: '#e8f0fb', marginBottom: '0.6rem' }}>{f.title}</h3>
                <p className="font-body" style={{ fontSize: '0.95rem', color: 'rgba(184,212,240,0.45)', lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '4rem 2.5rem', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ height: 1, width: 40, background: 'rgba(201,168,76,0.3)' }} />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-black text-ice-gradient"
            style={{ fontSize: '1.2rem', letterSpacing: '0.4em' }}
          >
            STEMONEF
          </motion.div>
          <p className="nav-label" style={{ fontSize: '0.45rem', color: 'rgba(184,212,240,0.25)', letterSpacing: '0.6em' }}>ADVANCED ANALYTICS · DESIGN SYSTEMS</p>
        </div>

        <p className="nav-label" style={{ fontSize: '0.5rem', color: 'rgba(184,212,240,0.18)', letterSpacing: '0.4em' }}>
          URIS -BY STEMONEF- · MIDDLEWARE-DRIVEN UNIFIED ARCHITECTURE · 2026
        </p>
      </footer>
    </div>
  )
}
