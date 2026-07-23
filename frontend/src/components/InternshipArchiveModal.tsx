import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2, Award, Save, Check, RefreshCw } from 'lucide-react'
import {
  getArchivePrefill,
  getWorkCategories,
  saveInternshipArchive,
  finishInternshipWithArchive,
  regenerateVerificationQr,
  getQrImageUrl,
  PERFORMANCE_RATING_OPTIONS,
  RECOMMENDATION_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  INTERNSHIP_ROLE_OPTIONS,
  formatArchiveDate,
  type InternshipArchiveRecord,
  type InternshipArchivePayload,
  type WorkCategoryGroups,
} from '../services/internshipArchive.service'
import { extractErrorMessage } from '../services/error'
import { usePermission } from '../hooks/usePermission'
import { PERMISSIONS } from '../constants/roles'

const GOLD = '#c9a84c'

interface Props {
  internId: string
  internName: string
  mode: 'finish' | 'edit'
  onClose: () => void
  onSaved?: () => void
}

function toPayload(form: InternshipArchiveRecord): InternshipArchivePayload {
  return {
    fullName: form.fullName,
    profilePhotoUrl: form.profilePhotoUrl,
    email: form.email,
    department: form.department,
    reportingLead: form.reportingLead,
    currentRole: form.currentRole,
    internshipRole: form.internshipRole,
    internshipStartDate: formatArchiveDate(form.internshipStartDate) || null,
    internshipEndDate: formatArchiveDate(form.internshipEndDate) || null,
    duration: form.duration,
    status: form.status,
    workCategories: form.workCategories,
    keyContributions: form.keyContributions,
    featuredAchievements: form.featuredAchievements,
    adminReview: form.adminReview,
    performanceRating: form.performanceRating,
    recommendationStatus: form.recommendationStatus,
    internalNotes: form.internalNotes,
    certificateNumber: form.certificateNumber,
    verificationStatus: form.verificationStatus,
  }
}

export default function InternshipArchiveModal({ internId, internName, mode, onClose, onSaved }: Props) {
  // Internal notes are gated by CAN_VIEW_NOTES — only roles with that permission
  // (core_admin, operations_lead, operations_program_manager and peers) can see them.
  // Previously this used CAN_FINISH_INTERNSHIP which excluded technical_lead,
  // research_lead, observer_team_lead, and collaborator_lead incorrectly.
  const canViewInternalNotes = usePermission()(PERMISSIONS.CAN_VIEW_NOTES)
  const [form, setForm] = useState<InternshipArchiveRecord | null>(null)
  const [categories, setCategories] = useState<WorkCategoryGroups | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regeneratingQr, setRegeneratingQr] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([getArchivePrefill(internId), getWorkCategories()])
      .then(([prefill, cats]) => {
        setForm({
          ...prefill,
          internshipStartDate: formatArchiveDate(prefill.internshipStartDate) || null,
          internshipEndDate: mode === 'finish' && !prefill.internshipEndDate
            ? new Date().toISOString().slice(0, 10)
            : formatArchiveDate(prefill.internshipEndDate) || null,
          workCategories: prefill.workCategories ?? [],
        })
        setCategories(cats)
      })
      .catch(err => setError(extractErrorMessage(err, 'Failed to load archive data.')))
      .finally(() => setLoading(false))
  }, [internId, mode])

  function updateField<K extends keyof InternshipArchiveRecord>(key: K, value: InternshipArchiveRecord[K]) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function toggleCategory(cat: string) {
    setForm(prev => {
      if (!prev) return prev
      const set = new Set(prev.workCategories)
      if (set.has(cat)) set.delete(cat)
      else set.add(cat)
      return { ...prev, workCategories: [...set] }
    })
  }

  async function handleRegenerateQr() {
    setRegeneratingQr(true)
    setError('')
    try {
      const updated = await regenerateVerificationQr(internId)
      setForm(prev => prev ? { ...prev, ...updated } : prev)
      setSuccess('Verification QR regenerated.')
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to regenerate QR.'))
    } finally {
      setRegeneratingQr(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = toPayload(form)
      if (mode === 'finish') {
        const result = await finishInternshipWithArchive(internId, payload)
        setForm(prev => prev ? { ...prev, ...result, isExisting: true } : prev)
        setSuccess('Internship completed and archive saved.')
        onSaved?.()
        setTimeout(onClose, 1500)
      } else {
        const result = await saveInternshipArchive(internId, payload)
        setForm(prev => prev ? { ...prev, ...result, isExisting: true } : prev)
        setSuccess('Archive record saved.')
        onSaved?.()
        // Stay open after edit-mode save so the admin can see the generated QR
        // and use the REGENERATE QR button without reopening the modal.
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save archive.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card rounded-sm w-full max-w-3xl my-auto flex flex-col max-h-[90vh]"
        style={{ border: '1px solid rgba(201,168,76,0.2)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div className="flex items-center gap-3">
            <Award size={16} className="text-gold" />
            <div>
              <p className="nav-label text-[0.55rem] text-gold/50">
                {mode === 'finish' ? 'INTERNSHIP COMPLETION' : 'INTERNSHIP ARCHIVE'}
              </p>
              <p className="font-display font-bold text-sm text-frost/90">{internName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ice/30 hover:text-ice/70 p-1"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="text-gold animate-spin" />
            </div>
          )}

          {!loading && form && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile snapshot */}
              <section>
                <p className="nav-label text-[0.55rem] text-gold/50 mb-3">PROFILE SNAPSHOT</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Full Name" value={form.fullName} onChange={v => updateField('fullName', v)} required />
                  <Field label="Email" value={form.email} onChange={v => updateField('email', v)} required />
                  <Field label="Department" value={form.department ?? ''} onChange={v => updateField('department', v)} />
                  <Field label="Reporting Lead" value={form.reportingLead ?? ''} onChange={v => updateField('reportingLead', v)} />
                  <Field label="Profile Photo URL" value={form.profilePhotoUrl ?? ''} onChange={v => updateField('profilePhotoUrl', v || null)} />
                  <div>
                    <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">INTERNSHIP ROLE</label>
                    <select className="uris-input w-full" value={form.internshipRole}
                      onChange={e => updateField('internshipRole', e.target.value)}>
                      {INTERNSHIP_ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <Field label="Start Date" type="date" value={formatArchiveDate(form.internshipStartDate)} onChange={v => updateField('internshipStartDate', v)} />
                  <Field label="End Date" type="date" value={formatArchiveDate(form.internshipEndDate)} onChange={v => updateField('internshipEndDate', v)} required={mode === 'finish'} />
                  <Field label="Duration" value={form.duration ?? ''} onChange={v => updateField('duration', v || null)} />
                  <Field label="Status" value={form.status} onChange={v => updateField('status', v as InternshipArchiveRecord['status'])} readOnly />
                </div>
              </section>

              {/* Work categories */}
              {categories && (
                <section>
                  <p className="nav-label text-[0.55rem] text-gold/50 mb-3">WORK CATEGORIES</p>
                  {Object.entries(categories.categories).map(([group, items]) => (
                    <div key={group} className="mb-3">
                      <p className="nav-label text-[0.5rem] text-ice/40 mb-2">{group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map(cat => {
                          const selected = form.workCategories.includes(cat)
                          return (
                            <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                              className="nav-label text-[0.48rem] px-2 py-1 rounded-sm transition-all"
                              style={{
                                background: selected ? 'rgba(201,168,76,0.15)' : 'rgba(184,212,240,0.04)',
                                border: `1px solid ${selected ? 'rgba(201,168,76,0.35)' : 'rgba(184,212,240,0.1)'}`,
                                color: selected ? GOLD : 'rgba(184,212,240,0.5)',
                              }}>
                              {cat}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Admin fields */}
              <section>
                <p className="nav-label text-[0.55rem] text-gold/50 mb-3">ADMIN REVIEW</p>
                <div className="space-y-3">
                  <TextArea label="Key Contributions" value={form.keyContributions ?? ''} onChange={v => updateField('keyContributions', v || null)} />
                  <TextArea label="Featured Achievements" value={form.featuredAchievements ?? ''} onChange={v => updateField('featuredAchievements', v || null)} />
                  <TextArea label="Admin Review" value={form.adminReview ?? ''} onChange={v => updateField('adminReview', v || null)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">PERFORMANCE RATING</label>
                      <select className="uris-input w-full" value={form.performanceRating ?? ''}
                        onChange={e => updateField('performanceRating', (e.target.value || null) as InternshipArchiveRecord['performanceRating'])}>
                        <option value="">Not set</option>
                        {PERFORMANCE_RATING_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">RECOMMENDATION STATUS</label>
                      <select className="uris-input w-full" value={form.recommendationStatus}
                        onChange={e => updateField('recommendationStatus', e.target.value as InternshipArchiveRecord['recommendationStatus'])}>
                        {RECOMMENDATION_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {canViewInternalNotes && (
                    <TextArea label="Internal Notes (admin only)" value={form.internalNotes ?? ''} onChange={v => updateField('internalNotes', v || null)} />
                  )}
                </div>
              </section>

              {/* Verification */}
              <section>
                <p className="nav-label text-[0.55rem] text-gold/50 mb-3">VERIFICATION</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Verification ID" value={form.verificationId ?? ''} onChange={() => {}} readOnly />
                  <Field label="Certificate Number" value={form.certificateNumber ?? ''} onChange={v => updateField('certificateNumber', v || null)} />
                  <Field label="Verification URL" value={form.verificationUrl ?? ''} onChange={() => {}} readOnly />
                  <div>
                    <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">VERIFICATION STATUS</label>
                    <select className="uris-input w-full" value={form.verificationStatus}
                      onChange={e => updateField('verificationStatus', e.target.value as InternshipArchiveRecord['verificationStatus'])}>
                      {VERIFICATION_STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(form.qrGenerated || form.qrImagePath) && (
                  <div className="mt-4 p-4 rounded-sm flex flex-col items-center gap-3"
                    style={{ background: 'rgba(184,212,240,0.03)', border: '1px solid rgba(184,212,240,0.08)' }}>
                    {getQrImageUrl(form.qrImagePath) && (
                      <img src={getQrImageUrl(form.qrImagePath)!} alt="Verification QR" className="w-32 h-32 rounded-sm" />
                    )}
                    <p className="nav-label text-[0.48rem]" style={{ color: 'rgba(184,212,240,0.45)' }}>
                      QR encodes public verification URL
                    </p>
                  </div>
                )}

                {/* QR regenerate button — visible once archive has been saved (verificationId exists).
                    If no archive record yet, prompt the admin to save first. */}
                {form.verificationId ? (
                  <motion.button type="button" whileTap={{ scale: 0.98 }}
                    disabled={regeneratingQr}
                    onClick={() => void handleRegenerateQr()}
                    className="mt-3 nav-label text-[0.5rem] px-3 py-2 rounded-sm flex items-center gap-2 disabled:opacity-50"
                    style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, border: '1px solid rgba(201,168,76,0.2)' }}>
                    {regeneratingQr ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    REGENERATE QR
                  </motion.button>
                ) : (
                  <p className="mt-3 nav-label text-[0.48rem] px-3 py-2 rounded-sm"
                    style={{ background: 'rgba(201,168,76,0.05)', color: 'rgba(201,168,76,0.5)', border: '1px solid rgba(201,168,76,0.12)' }}>
                    Save the archive record first — a verification ID and QR code will be generated automatically on first save.
                  </p>
                )}
              </section>

              {error && (
                <p className="nav-label text-[0.55rem] px-3 py-2 rounded-sm"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>{error}</p>
              )}
              {success && (
                <p className="nav-label text-[0.55rem] px-3 py-2 rounded-sm flex items-center gap-2"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                  <Check size={12} /> {success}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-sm nav-label text-[0.55rem]"
                  style={{ border: '1px solid rgba(184,212,240,0.15)', color: 'rgba(184,212,240,0.5)' }}>
                  CANCEL
                </motion.button>
                <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.98 }}
                  className="btn-gold flex-1 py-3 rounded-sm text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : mode === 'finish' ? <Award size={14} /> : <Save size={14} />}
                  {mode === 'finish' ? 'FINISH INTERNSHIP' : 'SAVE ARCHIVE'}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, readOnly }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; readOnly?: boolean
}) {
  return (
    <div>
      <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">{label.toUpperCase()}</label>
      <input type={type} className="uris-input w-full" value={value} required={required} readOnly={readOnly}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">{label.toUpperCase()}</label>
      <textarea className="uris-input resize-none w-full" rows={3} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
