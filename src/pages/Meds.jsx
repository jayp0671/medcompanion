import { useEffect, useState } from 'react'
import { KEYS, store, initDefaults } from '../lib/db'
import { Medication, Schedule, newId } from '../lib/models'
import MedInfoSheet from '../components/ui/MedInfoSheet'
import MedChatSheet from '../components/ui/MedChatSheet'

export default function Meds() {
  const [meds, setMeds] = useState([])
  const [schedules, setSchedules] = useState([])
  const [draft, setDraft] = useState(Medication())
  const [time, setTime] = useState('08:00')
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoMed, setInfoMed] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMed, setChatMed] = useState(null)

  useEffect(() => { (async () => {
    await initDefaults()
    setMeds(await store.get(KEYS.meds))
    setSchedules(await store.get(KEYS.schedules))
  })() }, [])

  async function saveMeds(next) { setMeds(next); await store.set(KEYS.meds, next) }
  async function saveSchedules(next) { setSchedules(next); await store.set(KEYS.schedules, next) }

  async function addMed() {
    const m = { ...draft, id: newId() }
    await saveMeds([...meds, m])
    setDraft(Medication())
  }

  async function addSchedule(medId) {
    const s = Schedule({ medId, times: [time] })
    await saveSchedules([...schedules, s])
  }

  async function removeScheduleTime(medId, t) {
    const next = schedules.map(s =>
      s.medId !== medId ? s : { ...s, times: s.times.filter(x => x !== t) }
    ).filter(s => s.times.length > 0)
    await saveSchedules(next)
  }

  async function deleteMed(medId) {
    await saveMeds(meds.filter(m => m.id !== medId))
    await saveSchedules(schedules.filter(s => s.medId !== medId))
  }

  function openExplain(name) {
    setInfoMed(name)
    setInfoOpen(true)
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Medications</h1>

      <div className="rounded-2xl border border-white/15 bg-white/5 p-4 grid gap-3">
        <div className="grid gap-2">
          <label className="text-sm text-[#a8b3c7]">Name</label>
          <input
            className="bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[#8ab4ff]"
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Metformin"
          />
        </div>
        <div className="flex gap-2">
          <div className="grid gap-2 grow">
            <label className="text-sm text-[#a8b3c7]">Dose</label>
            <input
              className="bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[#8ab4ff]"
              value={draft.dose}
              onChange={e => setDraft({ ...draft, dose: e.target.value })}
              placeholder="500"
            />
          </div>
          <div className="grid gap-2 w-40">
            <label className="text-sm text-[#a8b3c7]">Unit</label>
            <input
              className="bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[#8ab4ff]"
              value={draft.unit}
              onChange={e => setDraft({ ...draft, unit: e.target.value })}
              placeholder="mg"
            />
          </div>
        </div>
        <button
          className="px-3 py-2 rounded-xl bg-[#8ab4ff] text-black font-medium hover:opacity-90 w-fit"
          onClick={addMed}
        >
          Add medication
        </button>
      </div>

      <div className="grid gap-3">
        {meds.map(m => {
          const times = schedules.filter(s => s.medId === m.id).flatMap(s => s.times)
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-white/15 bg-white/5 p-4 grid gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {m.name} {m.dose}{m.unit}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-sm hover:bg-white/15"
                    onClick={() => openExplain(m.name)}
                  >
                    Explain
                  </button>
                  <button
                    className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-sm hover:bg-white/15"
                    onClick={() => deleteMed(m.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="grid gap-2">
                  <label className="text-sm text-[#a8b3c7]">Add time</label>
                  <input
                    type="time"
                    className="bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-[#8ab4ff]"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </div>
                <button
                  className="px-3 py-2 rounded-xl bg-[#8ab4ff] text-black font-medium hover:opacity-90"
                  onClick={() => addSchedule(m.id)}
                >
                  Add schedule
                </button>
              </div>

              <div className="text-sm text-[#a8b3c7] flex flex-wrap gap-2">
                {times.length
                  ? times.map(t => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/10 border border-white/20"
                      >
                        {t}
                        <button
                          className="text-xs opacity-80 hover:opacity-100"
                          onClick={() => removeScheduleTime(m.id, t)}
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  : 'No times yet'}
              </div>
            </div>
          )
        })}
      </div>

      {/* AI medication explanation panel */}
      <MedInfoSheet
        open={infoOpen}
        medName={infoMed}
        onClose={() => setInfoOpen(false)}
      />

      {/* Medication chatbot panel */}
      <MedChatSheet
        open={chatOpen}
        medName={chatMed}
        onClose={() => setChatOpen(false)}
      />
    </div>
  )
}
