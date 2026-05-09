import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileSearch, ShieldCheck, Map, Zap, Network, Send } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import ContractsPage from './pages/ContractsPage'
import AuditsPage from './pages/AuditsPage'
import MapPage from './pages/MapPage'
import RelationshipMapPage from './pages/RelationshipMapPage'
import LandingPage from './pages/LandingPage'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio', end: true },
  { to: '/contratos',  icon: FileSearch,      label: 'Contratos' },
  { to: '/auditados',  icon: ShieldCheck,     label: 'Auditorías' },
  { to: '/mapa',       icon: Map,             label: 'Mapa de Riesgo' },
  { to: '/relaciones', icon: Network,         label: 'Mapa Relaciones' },
]

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#13131f] flex flex-col z-30 border-r border-white/5">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Oculus" className="w-9 h-9 object-contain" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide leading-none">OCULUS</p>
            <p className="text-indigo-400 text-[10px] font-medium tracking-widest mt-0.5">AUDITOR</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-white/20 px-3 mb-2">Módulos</p>
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/25'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/5 space-y-2">
        <a
          href="https://t.me/nononse_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sky-300 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
        >
          <Send size={15} />
          <span>Bot de Telegram</span>
        </a>
        <div className="flex items-center gap-2 px-3">
          <Zap size={11} className="text-indigo-400" />
          <span className="text-[10px] text-white/25 font-medium">Equipo SOCADE</span>
        </div>
      </div>
    </aside>
  )
}

function AppShell() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  if (isLanding) return <LandingPage />

  return (
    <div className="flex min-h-screen bg-[#f5f4f9]">
      <Sidebar />
      <main className="ml-[220px] flex-1 min-w-0 min-h-screen">
        <Routes>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/contratos"  element={<ContractsPage />} />
          <Route path="/auditados"  element={<AuditsPage />} />
          <Route path="/mapa"       element={<MapPage />} />
          <Route path="/relaciones" element={<RelationshipMapPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={
          <div className="flex min-h-screen bg-[#f5f4f9]">
            <Sidebar />
            <main className="ml-[220px] flex-1 min-w-0 min-h-screen">
              <Routes>
                <Route path="/dashboard"  element={<Dashboard />} />
                <Route path="/contratos"  element={<ContractsPage />} />
                <Route path="/auditados"  element={<AuditsPage />} />
                <Route path="/mapa"       element={<MapPage />} />
                <Route path="/relaciones" element={<RelationshipMapPage />} />
              </Routes>
            </main>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}
