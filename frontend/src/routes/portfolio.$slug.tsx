import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink, AlertTriangle, Loader2 } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import api from '../services/api'
import { useAuthStore, selectToken } from '../store/authStore'
import { extractErrorMessage } from '../services/error'

interface PortfolioData {
  id: string
  internId: string
  internName: string
  profilePicture?: string
  bio?: string
  skills?: string[]
  experience?: string
  portfolioUrl?: string
  githubUrl?: string
  linkedinUrl?: string
  createdAt: string
}

export default function PortfolioPage() {
  const { slug } = useParams()
  const token = useAuthStore(selectToken)
  const nav = useNavigate()

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      nav('/login')
      return
    }
    if (slug) loadPortfolio()
  }, [token, slug, nav])

  const loadPortfolio = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/portfolio/${slug}`)
      setPortfolio(res.data)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load portfolio'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-gold animate-spin" />
            </div>
          ) : error ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card rounded-sm p-6 flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-400" />
              <p className="text-sm text-red-400/70">{error}</p>
            </motion.div>
          ) : portfolio ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Header */}
              <div className="glass-card rounded-sm p-8">
                <div className="flex items-start gap-6 mb-6">
                  {portfolio.profilePicture && (
                    <img
                      src={portfolio.profilePicture}
                      alt={portfolio.internName}
                      className="w-20 h-20 rounded-sm object-cover border border-gold/20"
                    />
                  )}
                  <div className="flex-1">
                    <p className="nav-label text-[0.55rem] text-gold/40 mb-1">INTERN PORTFOLIO</p>
                    <h1 className="font-display font-black text-3xl text-ice-gradient">{portfolio.internName}</h1>
                    <div className="gold-rule w-12 mt-2" />
                  </div>
                </div>

                {portfolio.bio && (
                  <p className="font-body text-sm text-ice/60 mb-4">{portfolio.bio}</p>
                )}

                <div className="flex gap-3 flex-wrap">
                  {portfolio.portfolioUrl && (
                    <a
                      href={portfolio.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline px-3 py-1.5 rounded-sm text-[0.55rem] flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      PORTFOLIO
                    </a>
                  )}
                  {portfolio.githubUrl && (
                    <a
                      href={portfolio.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline px-3 py-1.5 rounded-sm text-[0.55rem] flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      GITHUB
                    </a>
                  )}
                  {portfolio.linkedinUrl && (
                    <a
                      href={portfolio.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline px-3 py-1.5 rounded-sm text-[0.55rem] flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      LINKEDIN
                    </a>
                  )}
                </div>
              </div>

              {/* Skills */}
              {portfolio.skills && portfolio.skills.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-4">SKILLS</p>
                  <div className="flex flex-wrap gap-2">
                    {portfolio.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-block px-3 py-1.5 rounded-sm bg-gold/10 border border-gold/20 text-[0.55rem] text-gold/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Experience */}
              {portfolio.experience && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-4">EXPERIENCE</p>
                  <p className="font-body text-sm text-ice/60 whitespace-pre-wrap">{portfolio.experience}</p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <p className="text-sm text-ice/40">No portfolio data found</p>
          )}
        </div>
      </main>
    </div>
  )
}
