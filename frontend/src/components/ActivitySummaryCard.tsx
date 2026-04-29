/**
 * ActivitySummaryCard
 *
 * Displays a 7-day activity summary for the current intern.
 * Uses the same glass-card / nav-label / font-display classes as every
 * other card in the dashboard — no new styles introduced.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Loader2, AlertTriangle } from 'lucide-react'
import { getActivitySummary, type ActivitySummary } from '../services/activity.service'
import { extractErrorMessage } from '../services/error'

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return '#4ade80'
  if (score >= 40) return '#f59e0b'
  return '#f87171'
}

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivitySummaryCard() {
  const [data, setData]       = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setData(await getActivitySummary())
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load activity data.'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card rounded-sm p-6"
    >
      {/* Header — same pattern as every other card */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="nav-label text-[0.55rem] text-gold/40 mb-0.5">7-DAY WINDOW</p>
          <h2 className="font-display text-lg text-frost">Activity Summary</h2>
        </div>
        <Activity size={14} className="text-gold/40" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="text-gold animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 py-4">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <p className="font-body text-sm text-ice/40">{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <>
          {/* Stat row — same 3-column pattern as InternDashboard score rings */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {/* Active hours */}
            <div className="text-center">
              <p className="font-display font-black text-2xl text-signal">
                {data.totalActiveHours.toFixed(1)}
              </p>
              <p className="nav-label text-[0.5rem] text-ice/40 mt-0.5">ACTIVE HRS</p>
            </div>

            {/* Idle hours */}
            <div className="text-center">
              <p className="font-display font-black text-2xl text-ice/50">
                {data.totalIdleHours.toFixed(1)}
              </p>
              <p className="nav-label text-[0.5rem] text-ice/40 mt-0.5">IDLE HRS</p>
            </div>

            {/* Productivity score */}
            <div className="text-center">
              <p className="font-display font-black text-2xl"
                style={{ color: scoreColor(data.productivityScore) }}>
                {data.productivityScore}%
              </p>
              <p className="nav-label text-[0.5rem] text-ice/40 mt-0.5">PRODUCTIVITY</p>
            </div>
          </div>

          {/* Productivity bar */}
          <div className="mb-5">
            <div className="flex justify-between mb-1">
              <span className="nav-label text-[0.5rem] text-gold/40">PRODUCTIVITY SCORE</span>
              <span className="nav-label text-[0.5rem]"
                style={{ color: scoreColor(data.productivityScore) }}>
                {data.productivityScore}%
              </span>
            </div>
            <div className="progress-bar">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.productivityScore}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${scoreColor(data.productivityScore)}55, ${scoreColor(data.productivityScore)})`,
                }}
              />
            </div>
          </div>

          {/* Daily trend bars */}
          <div>
            <p className="nav-label text-[0.5rem] text-gold/40 mb-3">DAILY ACTIVE HOURS</p>
            <div className="flex items-end gap-1.5 h-14">
              {data.dailyBreakdown.map((day, i) => {
                const maxH = Math.max(...data.dailyBreakdown.map(d => d.activeHours), 1)
                const pct  = (day.activeHours / maxH) * 100
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 4)}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.06, ease: 'easeOut' }}
                      title={`${day.date}: ${day.activeHours.toFixed(1)}h active`}
                      className="w-full rounded-sm"
                      style={{
                        background: pct > 60
                          ? 'rgba(74,222,128,0.6)'
                          : pct > 30
                            ? 'rgba(201,168,76,0.5)'
                            : 'rgba(184,212,240,0.15)',
                        minHeight: 3,
                      }}
                    />
                    <span className="nav-label text-[0.45rem] text-ice/25">
                      {shortDay(day.date)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Login count footer */}
          <div className="mt-4 pt-4 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
            <span className="nav-label text-[0.5rem] text-ice/30">LOGINS THIS WEEK</span>
            <span className="font-display font-black text-sm text-gold/70">{data.loginCount}</span>
          </div>
        </>
      )}
    </motion.div>
  )
}
