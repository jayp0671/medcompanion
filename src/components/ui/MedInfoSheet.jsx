import { useEffect, useState } from 'react'
import { getMedExplanation } from '../../lib/ai'

export default function MedInfoSheet({ open, onClose, medName }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !medName) return
    setLoading(true); setError(null)
    getMedExplanation(medName)
      .then(setData)
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [open, medName])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-[var(--bg)] border-l border-white/10 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">About {medName}</div>
          <button className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15" onClick={onClose}>Close</button>
        </div>

        {loading && <div className="text-[color:var(--muted)]">Loading…</div>}
        {error && <div className="text-[color:var(--bad)]">{error}</div>}
        {data && (
          <div className="grid gap-3">
            <InfoRow label="Generic name" value={data.genericName} />
            <InfoRow label="Class" value={data.class} />
            <InfoRow label="What it does" value={data.whatItDoes} />
            <InfoRow label="How to take" value={data.howToTake} />
            <InfoRow label="Common side effects" value={data.commonSideEffects} />
            <InfoRow label="Cautions" value={data.cautions} />
            <InfoRow label="Interactions" value={data.interactions} />
            <div className="text-xs text-[color:var(--muted)]">
              Sources: {Array.isArray(data.sources) ? data.sources.join(', ') : data.sources}
            </div>
            <div className="text-xs text-[color:var(--muted)]">
              This is not medical advice. Consult your clinician for guidance.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-black font-medium"
                onClick={async () => {
                  setLoading(true)
                  const fresh = await getMedExplanation(medName, { refresh: true })
                  setData(fresh); setLoading(false)
                }}
              >
                Refresh
              </button>
              <button className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-[var(--card)] border border-white/10 p-3">
      <div className="text-xs text-[color:var(--muted)]">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
