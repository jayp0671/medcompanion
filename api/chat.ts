import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message, context } = req.body || {}
  if (!message) return res.status(400).json({ error: 'message required' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'server not configured' })

  const system = [
    'Use only the provided context.',
    'If unknown, say so.',
    'Do not give medical advice.',
    'Suggest contacting a clinician for urgent issues.'
  ].join(' ')

  const payload = {
    contents: [
      { role: 'user', parts: [{ text: `${system}\n\nContext:\n${context}\n\nQuestion:\n${message}` }] }
    ]
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  )

  if (!resp.ok) {
    const err = await resp.text()
    return res.status(502).json({ error: 'gemini_error', detail: err })
  }

  const data = await resp.json()
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate an answer.'
  return res.status(200).json({ reply })
}
