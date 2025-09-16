// src/lib/ai.js
// -----------------------------------------
// OpenFDA fetch + local cache (unchanged API)
// Chat answers via /api/chat (Gemini proxy)
// with retrieval fallback if the proxy fails
// -----------------------------------------

import { store } from './db'

const AI_CACHE_KEY = 'aiMedInfoCache'
const LOG = (...args) => console.debug('[MedInfo]', ...args)

/**
 * getMedExplanation(name, { refresh })
 * - Queries OpenFDA (US, free, JSON)
 * - Caches per medication name
 */
export async function getMedExplanation(name, opts = {}) {
  const cache = (await store.get(AI_CACHE_KEY)) || {}
  if (!opts.refresh && cache[name]) return cache[name]

  const result = await fetchOpenFDA(name)

  cache[name] = result
  await store.set(AI_CACHE_KEY, cache)
  return result
}

/* ---------------- OpenFDA (US) ---------------- */

async function fetchOpenFDA(name) {
  LOG('OpenFDA request for', name)

  const qName = escapeFDA(name)
  const queries = [
    `openfda.generic_name:"${qName}"`,
    `openfda.brand_name:"${qName}"`,
    `openfda.substance_name:"${qName}"`,
    `openfda.active_ingredient:"${qName}"`,
    `description:"${qName}"`,
  ]

  let doc = null
  let lastStatus = null
  let lastBody = null

  for (const q of queries) {
    const url = `https://api.fda.gov/drug/label.json?search=${q}&limit=1`
    const res = await fetch(url)
    lastStatus = `${res.status} ${res.statusText}`
    const body = await res.text()
    lastBody = body.slice(0, 300)

    if (!res.ok) {
      LOG('OpenFDA HTTP', q, lastStatus, lastBody)
      continue
    }

    let data
    try {
      data = JSON.parse(body)
    } catch (e) {
      LOG('OpenFDA JSON parse error', e, lastBody)
      continue
    }

    if (data?.results?.length) {
      doc = data.results[0]
      break
    }
  }

  if (!doc) throw new Error(`No OpenFDA results. Last=${lastStatus}`)

  // OpenFDA fields are arrays of strings; join + shorten
  const pick = (k) => arrToShort(doc?.[k])
  const openfda = doc?.openfda || {}

  const generic =
    arrToShort(openfda.generic_name) ||
    arrToShort(openfda.brand_name) ||
    name

  const cls =
    arrToShort(openfda.pharm_class_pe) ||
    arrToShort(openfda.pharm_class_epc) ||
    'Medication'

  const payload = {
    genericName: generic,
    class: cls,
    whatItDoes:
      pick('indications_and_usage') ||
      pick('purpose') ||
      'Used to treat a specific condition.',
    howToTake:
      pick('dosage_and_administration') ||
      'Take exactly as directed by your clinician.',
    commonSideEffects:
      pick('adverse_reactions') ||
      'Common side effects may include mild stomach upset or headache.',
    cautions:
      pick('warnings') ||
      pick('boxed_warning') ||
      pick('warnings_and_cautions') ||
      'Review warnings and precautions with your clinician.',
    interactions:
      pick('drug_interactions') ||
      'Tell your clinician about all medicines and supplements.',
    sourceUsed: 'OpenFDA',
    sources: ['OpenFDA drug label'],
  }

  // Ensure we actually have some usable content
  const hasContent = ['whatItDoes', 'howToTake', 'commonSideEffects', 'cautions', 'interactions']
    .some(k => payload[k] && payload[k].trim())
  if (!hasContent) throw new Error('OpenFDA: record present but no usable text fields')

  LOG('OpenFDA success for', generic)
  return payload
}

function escapeFDA(s) {
  return String(s).replace(/"/g, '\\"')
}

function arrToShort(v, maxLen = 600) {
  if (!v) return ''
  const text = Array.isArray(v) ? v.join(' ') : String(v)
  return text.replace(/\s+/g, ' ').slice(0, maxLen).trim()
}

/* ---------------- Chat answering ----------------
   askMedQuestion → tries Gemini via /api/chat
   and falls back to local retrieval if it fails
-------------------------------------------------- */

export async function askMedQuestion({ question, context, history = [] }) {
  const q = String(question || '').trim()
  if (!q) return 'Please enter a question. This is not medical advice.'

  try {
    const reply = await askViaProxy({ message: q, context: String(context || ''), history })
    return reply.endsWith('Not medical advice.') ? reply : `${reply}\n\nNot medical advice.`
  } catch (e) {
    console.debug('[MedInfo] /api/chat failed, falling back:', e?.message || e)
    return retrievalFallback({ question: q, context: String(context || '') })
  }
}

async function askViaProxy({ message, context, history }) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history })
  })
  if (!resp.ok) {
    let detail = ''
    try { detail = await resp.text() } catch {}
    throw new Error(`HTTP ${resp.status} ${resp.statusText} ${detail.slice(0, 200)}`)
  }
  const data = await resp.json()
  return (data?.reply || '').trim()
}


/* ---------------- Retrieval fallback ---------------- */

function retrievalFallback({ question, context }) {
  const q = String(question).toLowerCase()
  const lines = String(context || '').split('\n').filter(Boolean)

  const hits = lines
    .map((t, i) => ({ i, t, score: scoreLine(t.toLowerCase(), q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  const answer = hits.map(h => lines[h.i]).join(' ')
  if (!answer) {
    return 'I do not have that information in the current medicine context. This is not medical advice.'
  }
  return `${answer}\n\nThis is not medical advice.`
}

function scoreLine(text, q) {
  let s = 0
  for (const term of q.split(/\W+/).filter(Boolean)) {
    if (text.includes(term)) s++
  }
  return s
}
