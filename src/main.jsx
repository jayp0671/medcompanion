// src/main.jsx (or src/index.jsx)
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import './index.css'
import Today from './pages/Today.jsx'
import Meds from './pages/Meds.jsx'
import Log from './pages/Log.jsx'
import Trends from './pages/Trends.jsx'
import Settings from './pages/Settings.jsx'
import Chat from './pages/Chat.jsx'

function Shell() {
  const base = 'px-3 py-2 rounded-xl text-sm border border-transparent hover:bg-white/10'
  const active = 'bg-white/10 border-white/20 text-[color:var(--fg)]'

  return (
    <div className="min-h-screen bg-[#0b0f14] text-[#e8eef7]">
      <header
        className="sticky top-0 z-10 backdrop-blur bg-[color:var(--bg)]/80 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
          <NavLink to="/" className="text-lg font-semibold">
            MedCompanion
          </NavLink>
          <nav className="flex gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            <NavLink to="/" className={({ isActive }) => (isActive ? `${base} ${active}` : base)}>
              Today
            </NavLink>
            <NavLink to="/meds" className={({ isActive }) => (isActive ? `${base} ${active}` : base)}>
              Meds
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => (isActive ? `${base} ${active}` : base)}>
              Chat
            </NavLink>
            <NavLink to="/log" className={({ isActive }) => (isActive ? `${base} ${active}` : base)}>
              Log
            </NavLink>
            <NavLink to="/trends" className={({ isActive }) => (isActive ? `${base} ${active}` : base)}>
              Trends
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? `${base} ${active}` : base)}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/chat" element={<Chat />} />
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
