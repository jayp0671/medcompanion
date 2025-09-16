export function newId() { return Math.random().toString(36).slice(2, 10) }

export function Medication(partial = {}) {
  return { id: newId(), name: '', dose: '', unit: '', notes: '', color: '#8ab4ff', ...partial }
}

export function Schedule(partial = {}) {
  return { id: newId(), medId: '', times: ['08:00'], days: { type: 'daily', byWeekday: [] }, ...partial }
}

// status: 'taken' | 'skipped'
export function DoseLog(partial = {}) {
  return { id: newId(), medId: '', plannedISO: '', tsTaken: null, status: 'taken', onTime: null, ...partial }
}

export function SymptomLog(partial = {}) {
  return { id: newId(), dateISO: new Date().toISOString(), text: '', tags: [], severity: 3, nlp: null, ...partial }
}
