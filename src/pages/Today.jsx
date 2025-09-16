import { useEffect, useMemo, useRef, useState } from 'react'
import { KEYS, store, initDefaults } from '../lib/db'
import { dosesForDate } from '../lib/time'
import { riskForDose } from '../lib/risk'
import { ensurePermission, notify } from '../lib/notify'
import { formatTime } from '../lib/format'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import Section from '../components/Section'

export default function Today() {
  const [meds, setMeds] = useState([])
  const [schedules, setSchedules] = useState([])
  const [logs, setLogs] = useState([])
  const [snoozes, setSnoozes] = useState({}) // key -> untilISO
  const [settings, setSettings] = useState({ tz: 'UTC', use24h: false })

  const timersRef = useRef(new Map())   // key -> timeoutId
  const notifiedRef = useRef(new Set()) // keys already notified

  useEffect(() => {
    (async () => {
      await initDefaults()
      setMeds(await store.get(KEYS.meds))
      setSchedules(await store.get(KEYS.schedules))
      setLogs(await store.get(KEYS.doseLogs))
      const sz = (await store.get('snoozes')) || {}
      setSnoozes(sz)
      setSettings(
        (await store.get(KEYS.settings)) ||
          { tz: Intl.DateTimeFormat().resolvedOptions().timeZone, use24h: false }
      )
      await ensurePermission()
    })()
  }, [])

  const doses = useMemo(() => dosesForDate(schedules, new Date()), [schedules])

  function keyOf(d) { return `${d.medId}|${d.plannedISO}` }

  async function takeDose(d) {
    const entry = {
      id: crypto.randomUUID?.() || String(Date.now()),
      medId: d.medId,
      plannedISO: d.plannedISO,
      tsTaken: new Date().toISOString(),
      status: 'taken',
      onTime: true,
    }
    const next = [...logs, entry]
    setLogs(next)
    await store.set(KEYS.doseLogs, next)
    cancelTimer(d)
  }

  async function skipDose(d) {
    const entry = {
      id: crypto.randomUUID?.() || String(Date.now()),
      medId: d.medId,
      plannedISO: d.plannedISO,
      tsTaken: null,
      status: 'skipped',
      onTime: null,
    }
    const next = [...logs, entry]
    setLogs(next)
    await store.set(KEYS.doseLogs, next)
    cancelTimer(d)
  }

  async function snoozeDose(d, minutes = 10) {
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    const k = keyOf(d)
    const next = { ...snoozes, [k]: until }
    setSnoozes(next)
    await store.set('snoozes', next)
    scheduleTimer(d, until) // reschedule for snooze time
  }

  function isTaken(d) {
    return logs.some(l => l.medId === d.medId && l.plannedISO === d.plannedISO && l.status === 'taken')
  }
  function isSkipped(d) {
    return logs.some(l => l.medId === d.medId && l.plannedISO === d.plannedISO && l.status === 'skipped')
  }

  function recentMissesCount(medId) {
    // Treat skips in last 7 days as misses
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return logs.filter(l =>
      l.medId === medId &&
      l.status === 'skipped' &&
      new Date(l.plannedISO).getTime() >= weekAgo
    ).length
  }

  function cancelTimer(d) {
    const k = keyOf(d)
    const t = timersRef.current.get(k)
    if (t) {
      clearTimeout(t)
      timersRef.current.delete(k)
    }
  }

  function scheduleTimer(d, overrideISO) {
    const k = keyOf(d)
    if (timersRef.current.has(k) || notifiedRef.current.has(k)) return
    const fireAt = overrideISO ? new Date(overrideISO).getTime() : new Date(d.plannedISO).getTime()
    const now = Date.now()
    if (fireAt <= now - 60 * 1000) return
    const delay = Math.max(0, fireAt - now)
    if (delay > 24 * 60 * 60 * 1000) return

    const id = setTimeout(() => {
      if (!isTaken(d) && !isSkipped(d)) {
        const med = meds.find(m => m.id === d.medId)
        const timeStr = formatTime(new Date(fireAt).toISOString(), settings)
        notify('Medication reminder', `${med?.name || 'Medication'} at ${timeStr}`)
        notifiedRef.current.add(k)
      }
      timersRef.current.delete(k)
    }, delay)

    timersRef.current.set(k, id)
  }

  // schedule timers for all visible doses or their snoozes
  useEffect(() => {
    const now = Date.now()
    const liveKeys = new Set(doses.map(keyOf))
    // clear obsolete timers
    for (const [k, id] of timersRef.current.entries()) {
      if (!liveKeys.has(k)) { clearTimeout(id); timersRef.current.delete(k) }
    }
    doses.forEach(d => {
      if (isTaken(d) || isSkipped(d)) return
      const k = keyOf(d)
      const until = snoozes[k]
      const targetMs = until ? new Date(until).getTime() : new Date(d.plannedISO).getTime()
      if (targetMs > now) scheduleTimer(d, until)
    })
    return () => {
      for (const id of timersRef.current.values()) clearTimeout(id)
      timersRef.current.clear()
    }
  }, [doses, logs, meds, snoozes, settings])

  return (
    <div className="grid gap-4">
      <Section title="Today">
        <Button
          className="text-sm"
          onClick={async () => {
            const ok = await ensurePermission()
            if (ok) notify('MedCompanion', 'Test notification fired ✅')
          }}
        >
          Test notification
        </Button>
      </Section>

      <div className="grid gap-3">
        {doses.length === 0 && (
          <Card>No doses scheduled today.</Card>
        )}

        {doses.map(d => {
          const med = meds.find(m => m.id === d.medId)
          const taken = isTaken(d)
          const skipped = isSkipped(d)
          const k = keyOf(d)
          const snoozedISO = snoozes[k] || null

          const dtLabel = formatTime(d.plannedISO, settings)
          const snoozeLabel = snoozedISO ? formatTime(snoozedISO, settings) : null

          const baseDate = new Date(d.plannedISO)
          const risk = riskForDose({
            recentMisses: recentMissesCount(d.medId),
            hour: baseDate.getHours(),
            isWeekend: [0, 6].includes(baseDate.getDay()),
          })
          const riskTone = risk >= 0.7 ? 'bad' : risk >= 0.4 ? 'warn' : 'ok'

          return (
            <Card key={k} className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium flex items-center gap-2">
                  {med?.name || 'Medication'} <Badge tone={riskTone}>{risk >= 0.7 ? 'High' : risk >= 0.4 ? 'Med' : 'Low'}</Badge>
                  {taken && <Badge> Taken </Badge>}
                  {skipped && <Badge> Skipped </Badge>}
                  {(!taken && !skipped && snoozeLabel) && <Badge> Snoozed to {snoozeLabel} </Badge>}
                </div>
                <div className="text-sm text-[color:var(--muted)]">Planned {dtLabel}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" disabled={taken || skipped} onClick={() => takeDose(d)}>
                  {taken ? 'Taken' : 'Take'}
                </Button>
                <Button disabled={taken || skipped} onClick={() => snoozeDose(d, 10)} title="Snooze 10 min">
                  Snooze 10m
                </Button>
                <Button variant="danger" disabled={taken || skipped} onClick={() => skipDose(d)}>
                  Skip
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
