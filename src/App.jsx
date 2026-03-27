import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Today from './pages/Today'
import Meds from './pages/Meds'
import Log from './pages/Log'
import Trends from './pages/Trends'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

const navItems = [
  { to: '/',         label: '💊', title: 'Today'    },
  { to: '/meds',     label: '🗂️', title: 'Meds'     },
  { to: '/log',      label: '📝', title: 'Log'       },
  { to: '/trends',   label: '📈', title: 'Trends'    },
  { to: '/chat',     label: '🤖', title: 'Chat'      },
  { to: '/settings', label: '⚙️', title: 'Settings'  },
]

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/"         element={<Today />}    />
            <Route path="/meds"     element={<Meds />}     />
            <Route path="/log"      element={<Log />}      />
            <Route path="/trends"   element={<Trends />}   />
            <Route path="/chat"     element={<Chat />}     />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Bottom nav */}
        <nav style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          borderTop: '1px solid #e5e7eb',
          padding: '8px 0',
          background: '#fff',
          position: 'sticky',
          bottom: 0,
        }}>
          {navItems.map(({ to, label, title }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '11px',
                color: isActive ? '#6366f1' : '#6b7280',
                textDecoration: 'none',
                fontWeight: isActive ? '600' : '400',
                gap: '2px',
              })}
            >
              <span style={{ fontSize: '22px' }}>{label}</span>
              {title}
            </NavLink>
          ))}
        </nav>

      </div>
    </BrowserRouter>
  )
}