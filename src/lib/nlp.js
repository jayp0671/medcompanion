const KEYWORDS = {
  headache: ['headache','migraine','head pain'],
  nausea: ['nausea','queasy','vomit'],
  fatigue: ['fatigue','tired','exhausted','sleepy'],
  dizziness: ['dizzy','vertigo','lightheaded'],
  mood: ['sad','anxious','stressed','depressed'],
}
export function nlpTags(text) {
  const t = (text || '').toLowerCase()
  const tags = []
  for (const [tag, words] of Object.entries(KEYWORDS)) {
    if (words.some(w => t.includes(w))) tags.push(tag)
  }
  return tags
}
