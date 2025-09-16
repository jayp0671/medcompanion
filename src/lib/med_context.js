// src/lib/med_context.js
import { getMedExplanation } from './ai'
import { KEYS, store } from './db'

export async function buildContextForMed({ med, schedules, doseLogs, symptomLogs }) {
  // Fetch structured explanation via OpenFDA (your ai.js)
  let exp = null
  try { exp = await getMedExplanation(med.name) } catch { exp = null }

  // Schedules for this med
  const times = schedules
    .filter(s => s.medId === med.id)
    .flatMap(s => s.times)
    .sort()

  // Recent adherence for this med (last 7 days)
  const now = new Date()
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7)
  const recentDoses = doseLogs
    .filter(d => d.medId === med.id && new Date(d.plannedISO) >= sevenDaysAgo)
    .sort((a,b) => new Date(a.plannedISO) - new Date(b.plannedISO))

  const taken = recentDoses.filter(d => d.status === 'taken').length
  const due = recentDoses.length
  const adherencePct = due ? Math.round((taken / due) * 100) : 100

  // Recent symptoms (last 7d)
  const recentSymptoms = symptomLogs
    .filter(s => new Date(s.dateISO) >= sevenDaysAgo)
    .slice(-10) // keep it tight

  // Build plain-text context
  const parts = []
  parts.push(`# Medication: ${med.name} ${med.dose ?? ''}${med.unit ?? ''}`.trim())
  if (exp) {
    parts.push(`## OpenFDA summary
Class: ${exp.class}
What it does: ${sanitize(exp.whatItDoes)}
How to take: ${sanitize(exp.howToTake)}
Common side effects: ${sanitize(exp.commonSideEffects)}
Cautions: ${sanitize(exp.cautions)}
Interactions: ${sanitize(exp.interactions)}`)
  } else {
    parts.push(`## No OpenFDA summary available for this medication.`)
  }

  parts.push(`## Your schedule for this med
Times: ${times.length ? times.join(', ') : 'none set'}
7-day adherence: ${adherencePct}% (${taken}/${due})`)

  if (recentSymptoms.length) {
    parts.push(`## Recent symptoms (last 7 days)
${recentSymptoms.map(s => `- ${toLocal(s.dateISO)} · Severity ${s.severity}: ${oneLine(s.text)}`).join('\n')}`)
  }

  parts.push(`## Answering rules
- Answer using the context above.
- If the context does not contain the info, say you don’t have that information.
- Keep answers under 120 words.
- Use plain language.
- This is not medical advice.`)

  return parts.join('\n\n')
}

export async function buildContextAllMeds() {
  // Pull everything from local store
  const meds = (await store.get(KEYS.meds)) || []
  const schedules = (await store.get(KEYS.schedules)) || []
  const doseLogs = (await store.get(KEYS.doseLogs)) || []
  const symptomLogs = (await store.get(KEYS.symptomLogs)) || []

  const perMed = []
  for (const m of meds) {
    // Try to enrich each med quickly; ignore failures
    let exp = null
    try { exp = await getMedExplanation(m.name) } catch {}
    const times = schedules.filter(s => s.medId === m.id).flatMap(s => s.times).sort()

    perMed.push(`### ${m.name} ${m.dose ?? ''}${m.unit ?? ''}`.trim())
    if (exp) {
      perMed.push(`Class: ${exp.class}
What it does: ${oneLine(exp.whatItDoes)}
How to take: ${oneLine(exp.howToTake)}`)
    }
    if (times.length) perMed.push(`Times: ${times.join(', ')}`)
  }

  const parts = []
  parts.push(`# User medications overview`)
  parts.push(perMed.join('\n'))
  parts.push(`## Answering rules
- Prefer the specific medication’s details if the user names it.
- If unknown, say you don’t have that information.
- Keep answers under 120 words.
- This is not medical advice.`)

  return parts.join('\n\n')
}

/* utils */
function sanitize(s='') { return String(s).replace(/\s+/g, ' ').trim() }
function oneLine(s='') { return sanitize(s) }
function toLocal(iso) { try { return new Date(iso).toLocaleString() } catch { return iso } }
