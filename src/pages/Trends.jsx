import { useEffect, useState, useMemo } from 'react'
import { KEYS, store, initDefaults } from '../lib/db'
import PDFSummary from '../components/PDFSummary'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Trends() {
  const [symptoms, setSymptoms] = useState([])
  const [doses, setDoses] = useState([])

  useEffect(() => { (async () => {
    await initDefaults()
    setSymptoms(await store.get(KEYS.symptomLogs))
    setDoses(await store.get(KEYS.doseLogs))
  })() }, [])

  const data = symptoms.slice().reverse().map(s => ({
    date: new Date(s.dateISO).toLocaleDateString(),
    severity: s.severity,
  }))

  const cutoff = Date.now() - 30*24*60*60*1000
  const last30Doses = doses.filter(d => new Date(d.plannedISO).getTime() >= cutoff)
  const last30Symptoms = symptoms.filter(s => new Date(s.dateISO).getTime() >= cutoff)

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Trends</h1>
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" />
            <YAxis domain={[1,5]} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="severity" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <PDFSummary doses={last30Doses} symptoms={last30Symptoms} />
    </div>
  )
}
