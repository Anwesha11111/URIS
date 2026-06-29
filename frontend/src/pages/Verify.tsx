import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, ShieldCheck, AlertTriangle, Ban } from 'lucide-react'
import Starfield from '../components/Starfield'
import { getPublicVerification, type PublicVerificationRecord } from '../services/internshipArchive.service'
import { extractErrorMessage } from '../services/error'

const GOLD = '#c9a84c'
const GREEN = '#4ade80'
const RED = '#f87171'
const AMBER = '#f59e0b'

function statusStyle(status: PublicVerificationRecord['verificationStatus']) {
  switch (status) {
    case 'ACTIVE':  return { color: GREEN, bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', label: 'ACTIVE' }
    case 'REVOKED': return { color: RED,   bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label: 'REVOKED' }
    case 'EXPIRED': return { color: AMBER, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', label: 'EXPIRED' }
    default:        return { color: GOLD,  bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.25)', label: status }
  }
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Verify() {
  const { verificationId } = useParams()
  const [data, setData] = useState<PublicVerificationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!verificationId) {
      setError('Verification ID is required.')
      setLoading(false)
      return
    }
    getPublicVerification(verificationId)
      .then(setData)
      .catch(err => setError(extractErrorMessage(err, 'Verification record not found.')))
      .finally(() => setLoading(false))
  }, [verificationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Loader2 className="text-gold animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-10 text-center">
        <Starfield />
        <AlertTriangle size={32} className="text-red-400 mb-4" />
        <h1 className="font-display text-3xl text-ice-gradient mb-2">Verification Not Found</h1>
        <p className="font-body text-ice/40">{error || 'This verification record does not exist.'}</p>
      </div>
    )
  }

  const vStatus = statusStyle(data.verificationStatus)
  const isInvalid = data.verificationStatus === 'REVOKED' || data.verificationStatus === 'EXPIRED'

  return (
    <div className="min-h-screen bg-navy-950 text-frost selection:bg-gold/30">
      <Starfield />
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-sm p-8 md:p-10"
          style={{ border: `1px solid ${vStatus.border}` }}>

          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="nav-label text-[0.55rem] mb-1" style={{ color: `${GOLD}88` }}>STEMONEF INTERNSHIP VERIFICATION</p>
              <h1 className="font-display font-black text-2xl text-ice-gradient">{data.fullName}</h1>
              <p className="font-mono text-xs mt-2" style={{ color: 'rgba(184,212,240,0.45)' }}>{data.verificationId}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-sm flex-shrink-0"
              style={{ background: vStatus.bg, border: `1px solid ${vStatus.border}` }}>
              {data.verificationStatus === 'REVOKED'
                ? <Ban size={14} style={{ color: vStatus.color }} />
                : <ShieldCheck size={14} style={{ color: vStatus.color }} />}
              <span className="nav-label text-[0.55rem]" style={{ color: vStatus.color }}>{vStatus.label}</span>
            </div>
          </div>

          {isInvalid && (
            <div className="mb-6 p-4 rounded-sm"
              style={{ background: vStatus.bg, border: `1px solid ${vStatus.border}` }}>
              <p className="font-body text-sm" style={{ color: vStatus.color }}>
                {data.verificationStatus === 'REVOKED'
                  ? 'This verification has been revoked and is no longer valid.'
                  : 'This verification has expired and is no longer valid.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Department', value: data.department || '—' },
              { label: 'Internship Role', value: formatRole(data.internshipRole) },
              { label: 'Duration', value: data.duration || '—' },
              { label: 'Internship Status', value: data.status.replace(/_/g, ' ') },
            ].map(row => (
              <div key={row.label} className="p-4 rounded-sm"
                style={{ background: 'rgba(184,212,240,0.03)', border: '1px solid rgba(184,212,240,0.08)' }}>
                <p className="nav-label text-[0.5rem] mb-1" style={{ color: 'rgba(184,212,240,0.4)' }}>{row.label.toUpperCase()}</p>
                <p className="font-body text-sm text-frost/85">{row.value}</p>
              </div>
            ))}
          </div>

          {data.adminReview && (
            <div className="p-4 rounded-sm mb-6"
              style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.12)' }}>
              <p className="nav-label text-[0.5rem] mb-2" style={{ color: `${GOLD}88` }}>ADMIN REVIEW</p>
              <p className="font-body text-sm text-ice/70 leading-relaxed">{data.adminReview}</p>
            </div>
          )}

          <div className="flex items-center justify-center pt-4">
            <div className="text-center">
              <p className="nav-label text-[0.45rem] mb-2" style={{ color: 'rgba(184,212,240,0.35)' }}>
                VERIFIED BY STEMONEF URIS
              </p>
              <div className="gold-rule w-16 mx-auto opacity-30" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
