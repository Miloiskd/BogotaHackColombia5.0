import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ShieldAlert, AlertTriangle, MapPin, ArrowRight, TrendingUp, ShieldCheck, Shield } from 'lucide-react'
import { getAllAudits } from '../services/api'

function riskColor(nivel) {
  return { alto: '#ef4444', medio: '#f59e0b', bajo: '#10b981' }[nivel] || '#94a3b8'
}

function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const c = {
    indigo: { bg: 'bg-indigo-50', iconCls: 'text-indigo-600', border: 'border-indigo-100/80', num: 'text-indigo-700' },
    violet: { bg: 'bg-violet-50', iconCls: 'text-violet-600', border: 'border-violet-100/80', num: 'text-violet-700' },
    red:    { bg: 'bg-red-50',    iconCls: 'text-red-600',    border: 'border-red-100/80',    num: 'text-red-600' },
    emerald:{ bg: 'bg-emerald-50',iconCls: 'text-emerald-600',border: 'border-emerald-100/80',num: 'text-emerald-600' },
  }[color] || { bg: 'bg-slate-50', iconCls: 'text-slate-600', border: 'border-slate-100', num: 'text-slate-700' }

  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 animate-up`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
        <Icon size={19} className={c.iconCls} />
      </div>
      <p className={`text-3xl font-bold mb-1 ${c.num}`}>{value}</p>
      <p className="text-xs text-slate-500 leading-relaxed">{label}</p>
    </div>
  )
}

function RiskBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const c = {
    red:    { bar: 'bg-red-500',    text: 'text-red-600' },
    amber:  { bar: 'bg-amber-500',  text: 'text-amber-600' },
    emerald:{ bar: 'bg-emerald-500',text: 'text-emerald-600' },
  }[color] || { bar: 'bg-slate-400', text: 'text-slate-600' }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className={`text-xs font-bold ${c.text}`}>
          {count} <span className="text-slate-400 font-normal text-[11px]">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function QuickCard({ icon: Icon, title, desc, action, onClick, color }) {
  const c = {
    indigo: { icon: 'bg-indigo-100 text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200', border: 'hover:border-indigo-200 hover:shadow-indigo-50' },
    violet: { icon: 'bg-violet-100 text-violet-600', btn: 'bg-violet-600 hover:bg-violet-700 shadow-violet-200', border: 'hover:border-violet-200 hover:shadow-violet-50' },
    emerald:{ icon: 'bg-emerald-100 text-emerald-600',btn:'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',border:'hover:border-emerald-200 hover:shadow-emerald-50' },
  }[color] || {}
  return (
    <div
      className={`bg-white rounded-2xl border border-[#e4e4f0] ${c.border} p-5 transition-all hover:shadow-lg cursor-pointer group`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
        <Icon size={19} />
      </div>
      <h3 className="text-sm font-semibold text-[#0f0f23] mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">{desc}</p>
      <button className={`${c.btn} text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm`}>
        {action} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllAudits()
      .then(data => { setAudits(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const highRisk  = audits.filter(a => a.nivel_riesgo === 'alto').length
  const medRisk   = audits.filter(a => a.nivel_riesgo === 'medio').length
  const lowRisk   = audits.filter(a => a.nivel_riesgo === 'bajo').length
  const recentAudits = [...audits].slice(-6).reverse()

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Page header */}
      <div className="mb-8 animate-up">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Panel de Control</p>
        <h1 className="text-2xl font-bold text-[#0f0f23] tracking-tight">Resumen del Sistema</h1>
        <p className="text-sm text-slate-500 mt-1">Monitoreo de contratos públicos colombianos — SECOP II</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText}    label="Contratos en base de datos" value="+100.000"                                        color="indigo"  delay={0} />
        <StatCard icon={ShieldAlert} label="Contratos auditados"         value={loading ? '—' : audits.length}                   color="violet"  delay={50} />
        <StatCard icon={AlertTriangle}label="Detectados de alto riesgo"  value={loading ? '—' : highRisk}                        color="red"     delay={100} />
        <StatCard icon={MapPin}      label="Departamentos de Colombia"    value="33"                                                color="emerald" delay={150} />
      </div>

      {/* Risk distribution + Recent audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-2xl border border-[#e4e4f0] p-5 animate-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold text-[#0f0f23] mb-0.5">Distribución de Riesgo</h2>
          <p className="text-xs text-slate-400 mb-5">Basado en {audits.length} auditorías</p>
          {audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 gap-2">
              <TrendingUp size={28} className="text-slate-200" />
              <p className="text-slate-300 text-xs">Sin auditorías todavía</p>
            </div>
          ) : (
            <div className="space-y-4">
              <RiskBar label="Alto riesgo"  count={highRisk} total={audits.length} color="red" />
              <RiskBar label="Medio riesgo" count={medRisk}  total={audits.length} color="amber" />
              <RiskBar label="Bajo riesgo"  count={lowRisk}  total={audits.length} color="emerald" />
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e4e4f0] p-5 animate-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#0f0f23]">Auditorías Recientes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimas analizadas por el motor IA</p>
            </div>
            <button
              onClick={() => navigate('/auditados')}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-28">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              </div>
            ) : recentAudits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 gap-2">
                <ShieldCheck size={28} className="text-slate-200" />
                <p className="text-slate-300 text-xs">Aún no hay auditorías</p>
              </div>
            ) : (
              recentAudits.map(a => (
                <div
                  key={a.id_contrato}
                  onClick={() => navigate('/auditados')}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f7fc] border border-[#eeedf5] hover:border-indigo-200 hover:bg-indigo-50/40 transition-all cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: riskColor(a.nivel_riesgo) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate font-mono">{a.id_contrato}</p>
                    {a.resumen_ejecutivo && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-relaxed">
                        {a.resumen_ejecutivo.substring(0, 70)}…
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: riskColor(a.nivel_riesgo) }}>{a.score_total}</p>
                    <p className="text-[10px] text-slate-400">pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard
          icon={FileText}
          title="Explorar Contratos"
          desc="Busca y filtra entre todos los contratos del SECOP II. Selecciona uno para auditarlo con IA."
          action="Ir a Contratos"
          onClick={() => navigate('/contratos')}
          color="indigo"
        />
        <QuickCard
          icon={Shield}
          title="Ver Auditorías"
          desc="Revisa todos los análisis de riesgo realizados, sus scores y alertas detectadas."
          action="Ver Auditorías"
          onClick={() => navigate('/auditados')}
          color="violet"
        />
        <QuickCard
          icon={MapPin}
          title="Mapa de Riesgo"
          desc="Visualización geográfica del nivel de riesgo por departamento en Colombia."
          action="Abrir Mapa"
          onClick={() => navigate('/mapa')}
          color="emerald"
        />
      </div>
    </div>
  )
}
