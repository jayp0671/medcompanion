import { useEffect, useState } from 'react'
import { KEYS, store, initDefaults } from '../lib/db'
import { Medication, Schedule } from '../lib/models'

const ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export default function Settings() {
  const [settings, setSettings] = useState({
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    use24h: false,
    notify: false,
    aiEnabled: false,
    theme: 'dark',
  })
  const [busy, setBusy] = useState(false)

  // Load saved settings on mount
  useEffect(() => {
    ;(async () => {
      await initDefaults()
      const saved = await store.get(KEYS.settings)
      setSettings(prev => ({
        ...prev,
        ...saved,
        tz: saved?.tz || prev.tz,
        theme: saved?.theme || prev.theme,
      }))
    })()
  }, [])

  // Apply theme on change
  useEffect(() => {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const themeToUse =
      settings.theme === 'system' ? (sysDark ? 'dark' : 'light') : settings.theme
    document.documentElement.setAttribute('data-theme', themeToUse)
  }, [settings.theme])

  async function save(next) {
    setSettings(next)
    await store.set(KEYS.settings, next)
  }

  async function loadDemoData() {
    setBusy(true)
    try {
      const meds = [
        Medication({ name: 'Metformin', dose: '500', unit: 'mg' }),
        Medication({ name: 'Lisinopril', dose: '10', unit: 'mg' }),
        Medication({ name: 'Vitamin D3', dose: '1000', unit: 'IU' }),
        Medication({ name: 'Atorvastatin', dose: '20', unit: 'mg' }),
      ]
      const schedules = [
        Schedule({ medId: meds[0].id, times: ['08:00', '20:00'] }),
        Schedule({ medId: meds[1].id, times: ['09:00'] }),
        Schedule({ medId: meds[2].id, times: ['12:00'] }),
        Schedule({ medId: meds[3].id, times: ['21:00'] }),
      ]

      const now = new Date()
      const days = 7
      const toISO = (baseDate, hhmm) => {
        const [h, m] = hhmm.split(':').map(Number)
        const d = new Date(baseDate)
        d.setHours(h, m, 0, 0)
        return d.toISOString()
      }

      const doseLogs = []
      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now)
        day.setDate(now.getDate() - i)
        day.setHours(0, 0, 0, 0)
        for (const s of schedules) {
          for (const t of s.times) {
            const plannedISO = toISO(day, t)
            const isWeekend = [0, 6].includes(day.getDay())
            const skip = isWeekend && (t === '21:00' || t === '20:00') && Math.random() < 0.6
            doseLogs.push({
              id: Math.random().toString(36).slice(2, 10),
              medId: s.medId,
              plannedISO,
              tsTaken: skip
                ? null
                : new Date(new Date(plannedISO).getTime() + 5 * 60 * 1000).toISOString(),
              status: skip ? 'skipped' : 'taken',
              onTime: !skip,
            })
          }
        }
      }

      const symptoms = []
      const samples = [
        { text: 'Mild headache and dizziness after breakfast.', severity: 3 },
        { text: 'Felt very tired and nauseous before taking meds.', severity: 4 },
        { text: 'Energy level good, no issues.', severity: 1 },
        { text: 'Muscle aches after evening dose.', severity: 3 },
        { text: 'Slept poorly, a bit anxious.', severity: 2 },
      ]
      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now)
        day.setDate(now.getDate() - i)
        day.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0)
        const pick = samples[Math.floor(Math.random() * samples.length)]
        symptoms.push({
          id: Math.random().toString(36).slice(2, 10),
          dateISO: day.toISOString(),
          text: pick.text,
          severity: pick.severity,
          tags: [],
          nlp: null,
        })
      }

      await store.set(KEYS.meds, meds)
      await store.set(KEYS.schedules, schedules)
      await store.set(KEYS.doseLogs, doseLogs)
      await store.set(KEYS.symptomLogs, symptoms)
      await store.set('snoozes', {})

      alert('Demo data loaded! Check Today, Log, and Trends.')
    } finally {
      setBusy(false)
    }
  }

  async function clearAll() {
    if (!confirm('Delete ALL local data? This cannot be undone.')) return
    setBusy(true)
    try {
      await store.set(KEYS.meds, [])
      await store.set(KEYS.schedules, [])
      await store.set(KEYS.doseLogs, [])
      await store.set(KEYS.symptomLogs, [])
      await store.set(KEYS.vitalsLogs, [])
      await store.set('snoozes', {})
      alert('All data cleared.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-2xl border border-white/15 bg-white/5 p-4 grid gap-4 max-w-xl">
        {/* Time zone */}
        <div className="grid gap-2">
          <label className="text-sm text-[#a8b3c7]">Time zone</label>
          <select
            className="bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[#8ab4ff]"
            value={settings.tz}
            onChange={e => save({ ...settings, tz: e.target.value })}
          >
            {ZONES.map(z => (
              <option key={z} value={z} className="bg-[#0b0f14]">
                {z}
              </option>
            ))}
          </select>
          <div className="text-xs text-[#a8b3c7]">
            (Pick how times are displayed. Inputs still use your computer’s clock.)
          </div>
        </div>

        {/* 24h clock */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!settings.use24h}
            onChange={e => save({ ...settings, use24h: e.target.checked })}
          />
          Use 24-hour time
        </label>

        {/* Notifications */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!settings.notify}
            onChange={e => save({ ...settings, notify: e.target.checked })}
          />
          Enable notifications
        </label>

        {/* Theme */}
        <div className="grid gap-2">
          <label className="text-sm text-[color:var(--muted)]">Theme</label>
          <select
            className="input"
            value={settings.theme || 'dark'}
            onChange={e => {
              const next = { ...settings, theme: e.target.value }
              save(next)
            }}
          >
            <option value="dark" className="bg-[var(--bg)]">Dark</option>
            <option value="light" className="bg-[var(--bg)]">Light</option>
            <option value="system" className="bg-[var(--bg)]">System</option>
          </select>
          <div className="text-xs text-[color:var(--muted)]">
            Switch between light and dark. System follows your OS setting.
          </div>
        </div>

        {/* AI toggle */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!settings.aiEnabled}
            onChange={e => save({ ...settings, aiEnabled: e.target.checked })}
          />
          Enable AI features
        </label>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/5 p-4 grid gap-3 max-w-xl">
        <div className="font-medium">Data utilities</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-[#8ab4ff] text-black font-medium hover:opacity-90 disabled:opacity-50"
            disabled={busy}
            onClick={loadDemoData}
          >
            Load demo data
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 disabled:opacity-50"
            disabled={busy}
            onClick={clearAll}
          >
            Clear all data
          </button>
        </div>
        <div className="text-xs text-[#a8b3c7]">Demo data seeds 7 days of doses and symptoms.</div>
      </div>
    </div>
  )
}
