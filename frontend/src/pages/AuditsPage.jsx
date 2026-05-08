import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { getAllAudits } from '../services/api'

function riskCfg(nivel) {
  return {
    alto:  { color: '#ef4444', bg: 'bg-red-50',     border: 'border-red-100',     badge: 'bg-red-100 text-red-700',         icon: ShieldAlert },
    medio: { color: '#f59e0b', bg: 'bg-amber-50',   border: 'border-amber-100',   badge: 'bg-amber-100 text-amber-700',     icon: Shield },
    bajo:  { color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
  }[nivel] || { color: '#94a3b8', bg: 'bg-slate-50', border: 'border-slate-100', badge: 'bg-slate-100 text-slate-600', icon: Shield }
}

function ScoreCircle({ score, nivel }) {
  const { color } = riskCfg(nivel)
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0"
      style={{ backgroundColor: color + '15', color, border: `2px solid ${color}35` }}
    >
      {score}
    </div>
  )
}

const FILTER_TABS = [
  { key: 'todos',  label: 'Todos' },
  { key: 'alto',   label: 'Alto riesgo' },
  { key: 'medio',  label: 'Medio riesgo' },
  { key: 'bajo',   label: 'Bajo riesgo' },
]

export default function AuditsPage() {
  const [audits, setAudits]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('todos')
  const [search, setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getAllAudits()
      .then(data => { setAudits(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const counts = {
    todos: audits.length,
    alto:  audits.filter(a => a.nivel_riesgo === 'alto').length,
    medio: audits.filter(a => a.nivel_riesgo === 'medio').length,
    bajo:  audits.filter(a => a.nivel_riesgo === 'bajo').length,
  }

  const filtered = audits
    .filter(a => filter === 'todos' || a.nivel_riesgo === filter)
    .filter(a => !search || a.id_contrato.toLowerCase().includes(search.toLowerCase()) || (a.resumen_ejecutivo || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8">
      <div className="mb-6 animate-up">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Motor Híbrido IA</p>
        <h1 className="text-2xl font-bold text-[#0f0f23] tracking-tight">Auditorías Realizadas</h1>
        <p className="text-sm text-slate-500 mt-1">
          {audits.length} contratos analizados · Reglas automáticas + GPT-4o
        </p>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-5 animate-up" style={{ animationDelay: '50ms' }}>
        <div className="flex gap-1.5">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-[#e4e4f0] text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[10px] ${filter === key ? 'opacity-70' : 'text-slate-400'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID o resumen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white border border-[#e4e4f0] text-xs text-slate-700 placeholder-slate-400 rounded-xl pl-8 pr-4 py-2 w-64 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#e4e4f0] flex items-center justify-center h-48 gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-sm text-slate-400">Cargando auditorías…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e4e4f0] flex flex-col items-center justify-center h-48 gap-2">
          <ShieldCheck size={32} className="text-slate-200" />
          <p className="text-slate-400 text-sm">No hay auditorías en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((audit, idx) => {
            const cfg = riskCfg(audit.nivel_riesgo)
            const isExpanded = expanded === audit.id_contrato
            return (
              <div
                key={audit.id_contrato}
                className={`bg-white rounded-2xl border overflow-hidden transition-all animate-up ${
                  isExpanded ? 'border-indigo-200 shadow-md shadow-indigo-50' : 'border-[#e4e4f0] hover:border-indigo-100'
                }`}
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              >
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : audit.id_contrato)}
                >
                  <ScoreCircle score={audit.score_total} nivel={audit.nivel_riesgo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-semibold text-slate-600">{audit.id_contrato}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.badge}`}>
                        {audit.nivel_riesgo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
                      {audit.resumen_ejecutivo || 'Sin resumen disponible'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">Reglas</p>
                      <p className="text-sm font-bold text-slate-700">{audit.score_reglas}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">IA</p>
                      <p className="text-sm font-bold text-slate-700">{audit.score_gpt}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    {isExpanded
                      ? <ChevronUp size={15} className="text-indigo-400" />
                      : <ChevronDown size={15} className="text-slate-300" />
                    }
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#f0eef8]">
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {audit.resumen_ejecutivo && (
                        <div className="p-4 bg-[#f8f7fc] rounded-xl border border-[#eeedf5]">
                          <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">Resumen Ejecutivo</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{audit.resumen_ejecutivo}</p>
                        </div>
                      )}
                      {audit.conclusiones && (
                        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                          <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-2">Conclusiones</p>
                          <p className="text-xs text-indigo-700 leading-relaxed">{audit.conclusiones}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
