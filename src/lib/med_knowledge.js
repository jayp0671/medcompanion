// src/lib/med_knowledge.js
export async function fetchNHSPage(name, key) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  const url = `https://api.service.nhs.uk/nhs-website-content/medicines/${slug}`
  const res = await fetch(url, { headers: { apikey: key, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`NHS ${res.status}`)
  return res.json()
}

export function extractNHSSections(doc) {
  const get = slug => {
    const s = doc?.sections?.find(x => x.slug === slug)
    if (!s?.content) return ''
    const tmp = document.createElement('div')
    tmp.innerHTML = s.content
    return tmp.textContent.replace(/\s+/g, ' ').trim()
  }
  return {
    about: get('about'),
    howToTake: get('how-and-when-to-take'),
    sideEffects: get('side-effects'),
    interactions: get('taking-with-other-medicines-and-herbal-supplements'),
    pregnancy: get('pregnancy-breastfeeding'),
    important: get('important'),
  }
}

export function buildMedContext({ name, nhs, userScheduleTimes = [] }) {
  const parts = []
  parts.push(`# Medicine: ${name}`)
  parts.push(`## Official NHS sections`)
  if (nhs.about) parts.push(`About: ${nhs.about}`)
  if (nhs.howToTake) parts.push(`How to take: ${nhs.howToTake}`)
  if (nhs.sideEffects) parts.push(`Side effects: ${nhs.sideEffects}`)
  if (nhs.interactions) parts.push(`Interactions: ${nhs.interactions}`)
  if (nhs.pregnancy) parts.push(`Pregnancy: ${nhs.pregnancy}`)
  if (nhs.important) parts.push(`Important: ${nhs.important}`)
  if (userScheduleTimes.length) {
    parts.push(`## User schedule`)
    parts.push(`Times: ${userScheduleTimes.join(', ')}`)
  }
  parts.push(`## Instructions for assistant
Answer using the context above. If the answer is not in the context, say you do not have that information. Use plain language. Keep it short.`)
  return parts.join('\n\n')
}
