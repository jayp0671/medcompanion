import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import './index.css'
import Today from './pages/Today.jsx'
import Meds from './pages/Meds.jsx'
import Log from './pages/Log.jsx'
import Trends from './pages/Trends.jsx'
import Settings from './pages/Settings.jsx'

function Shell() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-[#e8eef7]">
      <header className="sticky top-0 z-10 backdrop-blur bg-[color:var(--bg)]/80 border-b" style={{borderColor:'var(--border)'}}>
  <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
    <Link to="/" className="text-lg font-semibold">MedCompanion</Link>
    <nav className="flex gap-3 text-sm" style={{color:'var(--muted)'}}>
      <Link to="/" className="hover:text-[color:var(--fg)]">Today</Link>
      <Link to="/meds" className="hover:text-[color:var(--fg)]">Meds</Link>
      <Link to="/log" className="hover:text-[color:var(--fg)]">Log</Link>
      <Link to="/trends" className="hover:text-[color:var(--fg)]">Trends</Link>
      <Link to="/settings" className="hover:text-[color:var(--fg)]">Settings</Link>
    </nav>
  </div>
</header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/meds" element={<Meds />} />
          <Route path="/log" element={<Log />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Shell />
  </BrowserRouter>
)
