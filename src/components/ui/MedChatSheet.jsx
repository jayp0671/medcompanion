// src/components/ui/MedChatSheet.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { askMedQuestion } from '../../lib/ai'
import { buildContextForMed, buildContextAllMeds } from '../../lib/med_context'
import { KEYS, store } from '../../lib/db'

export default function MedChatSheet({ open, onClose, medName = null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [allMeds, setAllMeds] = useState([])
  const [schedules, setSchedules] = useState([])
  const [doseLogs, setDoseLogs] = useState([])
  const [symptomLogs, setSymptomLogs] = useState([])
  const [target, setTarget] = useState(medName || 'All meds')

  const inputRef = useRef(null)
  const scrollRef = useRef(null)

  // Load data once when opened
  useEffect(() => {
    if (!open) return
    ;(async () => {
      setError(null)
      try {
        const meds = (await store.get(KEYS.meds)) || []
        setAllMeds(meds)
        setSchedules((await store.get(KEYS.schedules)) || [])
        setDoseLogs((await store.get(KEYS.doseLogs)) || [])
        setSymptomLogs((await store.get(KEYS.symptomLogs)) || [])
        setMessages([{ role:'assistant', content: greeting(medName) }])
        setTarget(medName || 'All meds')
      } catch (e) {
        setError('Could not load local data.')
      }
    })()
  }, [open, medName])

  // Build/refresh context when target changes
  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      try {
        if (target === 'All meds') {
          const ctx = await buildContextAllMeds()
          setContext(ctx)
        } else {
          const med = allMeds.find(m => m.name === target)
          if (!med) throw new Error('Medication not found')
          const ctx = await buildContextForMed({
            med,
            schedules,
            doseLogs,
            symptomLogs,
          })
          setContext(ctx)
        }
      } catch (e) {
        setError('Could not build medication context.')
      } finally {
        setLoading(false)
      }
    })()
  }, [open, target, allMeds, schedules, doseLogs, symptomLogs])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  if (!open) return null

  const ask = async (q) => {
    if (!q.trim()) return
    setMessages(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const reply = await askMedQuestion({ question: q, context })
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. This is not medical advice.' }])
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-[var(--bg)] border-l border-white/10 flex flex-col">
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Medication Q&A</div>
            <select
              className="text-sm bg-transparent border border-white/20 rounded-lg px-2 py-1 outline-none focus:border-[var(--accent)]"
              value={target}
              onChange={e => setTarget(e.target.value)}
            >
              <option className="bg-[var(--bg)]">All meds</option>
              {allMeds.map(m => (
                <option key={m.id} className="bg-[var(--bg)]" value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15" onClick={onClose}>Close</button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`max-w-[85%] rounded-2xl border px-3 py-2 text-sm ${m.role==='user'
              ? 'ml-auto bg-white/10 border-white/20'
              : 'mr-auto bg-[var(--card)] border-white/10'
            }`}>
              {m.content}
            </div>
          ))}
          {loading && <div className="text-xs text-[color:var(--muted)]">Thinking…</div>}
          {error && <div className="text-xs text-[color:var(--bad)]">{error}</div>}
          {!loading && !error && messages.length === 1 && (
            <div className="text-xs text-[color:var(--muted)]">
              Try: “What happens if I miss a dose?”, “Can I drink alcohol with this?”, “Common side effects?”
            </div>
          )}
        </div>

        <form
          className="p-3 border-t border-white/10 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); ask(inputRef.current.value) }}
        >
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder={`Ask about ${target.toLowerCase()}`}
          />
          <button className="px-3 py-2 rounded-xl bg-[var(--accent)] text-black font-medium hover:opacity-90">Ask</button>
        </form>
      </div>
    </div>
  )
}

function greeting(medName) {
  if (medName) return `Ask me about ${medName}. I’ll answer using FDA info and your schedule. This is not medical advice.`
  return `Ask about any of your medications. I’ll use FDA info and your schedule. This is not medical advice.`
}
