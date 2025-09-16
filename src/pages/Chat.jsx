// src/pages/Chat.jsx
import { useEffect, useRef, useState } from 'react'
import { KEYS, store } from '../lib/db'
import { askMedQuestion } from '../lib/ai'
import { buildContextForMed, buildContextAllMeds } from '../lib/med_context'

export default function Chat() {
  const [allMeds, setAllMeds] = useState([])
  const [schedules, setSchedules] = useState([])
  const [doseLogs, setDoseLogs] = useState([])
  const [symptomLogs, setSymptomLogs] = useState([])
  const [target, setTarget] = useState('All meds')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting(null) }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const inputRef = useRef(null)
  const scrollRef = useRef(null)

  // Load local data once
  useEffect(() => {
    (async () => {
      try {
        const meds = (await store.get(KEYS.meds)) || []
        const sched = (await store.get(KEYS.schedules)) || []
        const doses = (await store.get(KEYS.doseLogs)) || []
        const symptoms = (await store.get(KEYS.symptomLogs)) || []
        setAllMeds(meds)
        setSchedules(sched)
        setDoseLogs(doses)
        setSymptomLogs(symptoms)
        const first = meds.length === 1 ? meds[0].name : null
        setTarget(first || 'All meds')
        setMessages([{ role: 'assistant', content: greeting(first) }])
      } catch {
        setError('Could not load your local data.')
      }
    })()
  }, [])

  // Build/refresh LLM context
  useEffect(() => {
    (async () => {
      try {
        setError(null)
        setLoading(true)
        if (target === 'All meds') {
          const ctx = await buildContextAllMeds()
          setContext(ctx)
        } else {
          const med = allMeds.find(m => m.name === target)
          const ctx = await buildContextForMed({ med, schedules, doseLogs, symptomLogs })
          setContext(ctx)
        }
      } catch {
        setError('Could not build chat context.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, JSON.stringify(allMeds), JSON.stringify(schedules), JSON.stringify(doseLogs), JSON.stringify(symptomLogs)])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  async function handleSend(e) {
  e?.preventDefault?.()
  const q = inputRef.current?.value || ''
  if (!q.trim()) return

  setMessages(m => [...m, { role: 'user', content: q }])
  setLoading(true)
  try {
    const reply = await askMedQuestion({
      question: q,
      context,                 // your compact snapshot string
      history: messages.slice(-8) // pass short chat history
    })
    setMessages(m => [...m, { role: 'assistant', content: reply }])
  } catch {
    setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Not medical advice.' }])
  } finally {
    setLoading(false)
    if (inputRef.current) inputRef.current.value = ''
  }
}

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[color:var(--muted)]">Target</label>
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
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/5 overflow-hidden">
        <div ref={scrollRef} className="h-[56vh] overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl border px-3 py-2 text-sm ${
              m.role === 'user'
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

        <form className="p-3 border-t border-white/10 flex gap-2" onSubmit={handleSend}>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder={`Ask about ${target.toLowerCase()}`}
          />
          <button className="px-3 py-2 rounded-xl bg-[var(--accent)] text-black font-medium hover:opacity-90" disabled={loading}>
            Send
          </button>
        </form>
      </div>

      <p className="text-xs text-[color:var(--muted)]">
        Not medical advice. For urgent issues, contact a clinician or emergency services.
      </p>
    </div>
  )
}

function greeting(medName) {
  if (medName) return `Ask me about ${medName}. I’ll answer using FDA info and your schedule. This is not medical advice.`
  return `Ask about any of your medications. I’ll use FDA info and your schedule. This is not medical advice.`
}
