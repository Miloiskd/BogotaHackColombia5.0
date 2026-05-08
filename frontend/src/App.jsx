import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, FileSearch, ShieldCheck, Map, Eye, Zap } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import ContractsPage from './pages/ContractsPage'
import AuditsPage from './pages/AuditsPage'
import MapPage from './pages/MapPage'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', end: true },
  { to: '/contratos', icon: FileSearch, label: 'Contratos' },
  { to: '/auditados', icon: ShieldCheck, label: 'Auditorías' },
  { to: '/mapa', icon: Map, label: 'Mapa de Riesgo' },
]

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#13131f] flex flex-col z-30 border-r border-white/5">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Eye size={18} className="text-white" />
          </div>
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

      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Zap size={11} className="text-indigo-400" />
          <span className="text-[10px] text-white/25 font-medium">BogotáHack Colombia 5.0</span>
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#f5f4f9]">
        <Sidebar />
        <main className="ml-[220px] flex-1 min-w-0 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contratos" element={<ContractsPage />} />
            <Route path="/auditados" element={<AuditsPage />} />
            <Route path="/mapa" element={<MapPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
