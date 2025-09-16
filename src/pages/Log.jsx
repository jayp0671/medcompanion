import { useEffect, useState } from 'react'
import { KEYS, store, initDefaults } from '../lib/db'
import { SymptomLog } from '../lib/models'
import { nlpTags } from '../lib/nlp'
import { toCSV, downloadText } from '../lib/export'
import { formatDateTime } from '../lib/format'

function toLocalInputValue(iso) {
  const d = iso ? new Date(iso) : new Date()
  const pad = n => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

export default function Log() {
  const [symptoms, setSymptoms] = useState([])
  const [draft, setDraft] = useState(SymptomLog())
  const [settings, setSettings] = useState({})

  useEffect(() => { (async () => {
    await initDefaults()
    setSymptoms(await store.get(KEYS.symptomLogs))
    setSettings(await store.get(KEYS.settings) || {})
  })() }, [])

  async function addSymptom() {
    const s = { ...draft, id: crypto.randomUUID?.() || String(Date.now()) }
    s.tags = nlpTags(s.text)
    const next = [s, ...symptoms]
    setSymptoms(next)
    await store.set(KEYS.symptomLogs, next)
    setDraft(SymptomLog())
  }

  async function deleteSymptom(id) {
    const next = symptoms.filter(s => s.id !== id)
    setSymptoms(next)
    await store.set(KEYS.symptomLogs, next)
  }

  async function startEdit(id) {
    const s = symptoms.find(x => x.id === id)
    if (!s) return
    setDraft({ ...s }) // move into the form for editing
  }

  async function saveEdit() {
    const next = symptoms.map(s => s.id === draft.id ? { ...draft, tags: nlpTags(draft.text) } : s)
    setSymptoms(next)
    await store.set(KEYS.symptomLogs, next)
    setDraft(SymptomLog())
  }

  const isEditing = symptoms.some(s => s.id === draft.id)

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Log</h1>

      <div className="rounded-2xl border border-white/15 bg-white/5 p-4 grid gap-3">
        <textarea
          className="bg-transparent border border-white/20 rounded-xl px-3 py-2 min-h-24 outline-none focus:border-[#8ab4ff]"
          placeholder="Describe symptoms..."
          value={draft.text}
          onChange={e => setDraft({ ...draft, text: e.target.value })}
        />

        <div className="flex items-center gap-3">
          <label className="text-sm text-[#a8b3c7]">Severity</label>
          <input
            type="range"
            min="1"
            max="5"
            value={draft.severity}
            onChange={e => setDraft({ ...draft, severity: Number(e.target.value) })}
          />
          <span>{draft.severity}</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-[#a8b3c7]">Date/Time</label>
          <input
            type="datetime-local"
            className="bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[#8ab4ff]"
            value={toLocalInputValue(draft.dateISO)}
            onChange={e => setDraft({ ...draft, dateISO: new Date(e.target.value).toISOString() })}
          />
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <button
              className="px-3 py-2 rounded-xl bg-[#8ab4ff] text-black font-medium hover:opacity-90 w-fit"
              onClick={addSymptom}
            >
              Add entry
            </button>
          ) : (
            <>
              <button
                className="px-3 py-2 rounded-xl bg-[#8ab4ff] text-black font-medium hover:opacity-90 w-fit"
                onClick={saveEdit}
              >
                Save changes
              </button>
              <button
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 w-fit"
                onClick={() => setDraft(SymptomLog())}
              >
                Cancel
              </button>
            </>
          )}

          <button
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20"
            onClick={async ()=>{
              const data = await store.get(KEYS.symptomLogs)
              downloadText('symptoms.csv', toCSV(data))
            }}
          >
            Export symptoms CSV
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20"
            onClick={async ()=>{
              const data = await store.get(KEYS.doseLogs)
              downloadText('doses.csv', toCSV(data))
            }}
          >
            Export doses CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {symptoms.map(s => (
          <div key={s.id} className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-sm text-[#a8b3c7]">{formatDateTime(s.dateISO, settings)}</div>
            <div className="mt-1">{s.text || 'No text'}</div>
            <div className="text-sm mt-1">Severity: {s.severity}</div>
            {s.tags?.length ? (
              <div className="text-sm text-[#a8b3c7]">Tags: {s.tags.join(', ')}</div>
            ) : null}
            <div className="mt-2 flex gap-2">
              <button className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-sm" onClick={() => startEdit(s.id)}>Edit</button>
              <button className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-sm" onClick={() => deleteSymptom(s.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
