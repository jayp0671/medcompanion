// lib/ai.js
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

  let result = await fetchOpenFDA(name)

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
// Add to src/lib/ai.js
export async function askMedQuestion({ question, context }) {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (key) {
    try {
      return await askWithOpenAI({ question, context, apiKey: key })
    } catch (e) {
      console.debug('[MedInfo] OpenAI failed, falling back', e?.message || e)
      return retrievalFallback({ question, context })
    }
  }
  return retrievalFallback({ question, context })
}

async function askWithOpenAI({ question, context, apiKey }) {
  const messages = [
    { role: 'system', content:
      'You are a careful medical explainer for a personal medication app. Use ONLY the provided context. If missing, say you do not have that information. Keep answers under 120 words. End with: "This is not medical advice."' },
    { role: 'user', content: `CONTEXT:\n${context}\n\nQUESTION:\n${question}` },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages }),
  })
  if (!res.ok) throw new Error(`AI ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || 'I could not generate a response. This is not medical advice.'
}

function retrievalFallback({ question, context }) {
  // tiny keyword search over context → concise slice
  const q = question.toLowerCase()
  const lines = context.split('\n').filter(Boolean)
  const hits = lines
    .map((t,i)=>({i,t,score:scoreLine(t.toLowerCase(),q)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,4)
  const answer = hits.map(h=>lines[h.i]).join(' ')
  if (!answer) return 'I do not have that information in the current medicine context. This is not medical advice.'
  return `${answer}\n\nThis is not medical advice.`
}
function scoreLine(text,q){ let s=0; for(const term of q.split(/\W+/).filter(Boolean)){ if(text.includes(term)) s++ } return s }
