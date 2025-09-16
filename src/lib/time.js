export function toLocalISO(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
export function dosesForDate(schedules, date = new Date()) {
  const wd = new Date(date).getDay()
  return schedules.flatMap(s => {
    const ok = s.days.type === 'daily' || s.days.byWeekday?.includes(wd)
    if (!ok) return []
    return s.times.map(t => ({ scheduleId: s.id, medId: s.medId, plannedISO: toLocalISO(date, t) }))
  })
}
