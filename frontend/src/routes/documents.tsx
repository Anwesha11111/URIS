import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, File, Loader2, AlertTriangle, Check } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import api from '../services/api'
import { useAuthStore, selectToken } from '../store/authStore'
import { extractErrorMessage } from '../services/error'

interface DocumentSubmission {
  id: string
  internId: string
  fileName: string
  fileUrl: string
  submissionDay: 'MONDAY' | 'THURSDAY'
  submittedAt: string
}

export default function DocumentsPage() {
  const token = useAuthStore(selectToken)
  const nav = useNavigate()

  const [documents, setDocuments] = useState<DocumentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedDay, setSelectedDay] = useState<'MONDAY' | 'THURSDAY'>('MONDAY')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (!token) {
      nav('/login')
      return
    }
    loadDocuments()
  }, [token, nav])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const res = await api.get('/documents/my-submissions')
      setDocuments(res.data || [])
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load documents'))
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('submissionDay', selectedDay)

    try {
      setUploading(true)
      setError('')
      await api.post('/documents/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccess('Document submitted successfully')
      setSelectedFile(null)
      await loadDocuments()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit document'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">DOCUMENTATION</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Submit Documents</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm text-ice/40 mt-3">
              Submit your documents every Monday and Thursday
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Upload Form */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="lg:col-span-1 glass-card rounded-sm p-6">
              <p className="nav-label text-[0.6rem] text-gold/60 mb-4">UPLOAD DOCUMENT</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="nav-label text-[0.55rem] text-gold/40">SUBMISSION DAY</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value as 'MONDAY' | 'THURSDAY')}
                    className="uris-input w-full"
                  >
                    <option value="MONDAY">Monday</option>
                    <option value="THURSDAY">Thursday</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="nav-label text-[0.55rem] text-gold/40">SELECT FILE</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="uris-input w-full"
                  />
                  {selectedFile && (
                    <p className="text-[0.55rem] text-gold/60">Selected: {selectedFile.name}</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 py-2 px-3 rounded-sm bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={14} className="text-red-400" />
                    <p className="text-[0.55rem] text-red-400/70">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 py-2 px-3 rounded-sm bg-signal/10 border border-signal/20">
                    <Check size={14} className="text-signal" />
                    <p className="text-[0.55rem] text-signal/70">{success}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="btn-gold w-full py-2 rounded-sm text-[0.6rem] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      UPLOADING...
                    </>
                  ) : (
                    <>
                      <Upload size={12} />
                      SUBMIT DOCUMENT
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Submissions List */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="lg:col-span-2 glass-card rounded-sm p-6">
              <p className="nav-label text-[0.6rem] text-gold/60 mb-4">MY SUBMISSIONS ({documents.length})</p>

              {loading ? (
                <p className="text-sm text-ice/40">Loading documents...</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-ice/40">No documents submitted yet</p>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between rounded-sm border border-gold/10 bg-navy-900/40 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gold/10 text-gold">
                          <File size={18} />
                        </div>
                        <div>
                          <p className="font-body font-semibold text-ice">{doc.fileName}</p>
                          <p className="text-[0.55rem] text-ice/40">{doc.submissionDay} • {new Date(doc.submittedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline px-3 py-1.5 rounded-sm text-[0.55rem]"
                      >
                        VIEW
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
