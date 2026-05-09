import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp, Search,
         FileDown, Sparkles, Mail, Loader2, RefreshCw, ArrowUpDown } from 'lucide-react'
import { getAllAudits, auditContract, generateReport, getReport,
         generateInfographic, getInfographic, sendReportByEmail } from '../services/api'
import PDFViewer from '../components/PDFViewer/PDFViewer'
import InfographicModal from '../components/InfographicModal/InfographicModal'

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

function ActionBtn({ icon: Icon, label, onClick, active, loading: isLoading }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
          : 'bg-[#f8f7fc] border-[#e4e4f0] hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label}
    </button>
  )
}

function AuditActions({ idContrato, onReanalyzed }) {
  const [pdfUrl, setPdfUrl]         = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showPDF, setShowPDF]       = useState(false)

  const [imgUrl, setImgUrl]         = useState(null)
  const [imgLoading, setImgLoading] = useState(false)
  const [showImg, setShowImg]       = useState(false)

  const [showEmail, setShowEmail]   = useState(false)
  const [email, setEmail]           = useState('')
  const [sending, setSending]       = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

  const handlePDF = async () => {
    setShowPDF(true)
    setPdfLoading(true)
    try {
      const existing = await getReport(idContrato)
      if (existing.exists) { setPdfUrl(existing.url); setPdfLoading(false); return }
    } catch {}
    try {
      const data = await generateReport(idContrato)
      setPdfUrl(data.url)
    } catch {}
    setPdfLoading(false)
  }

  const handleInfographic = async () => {
    setShowImg(true)
    setImgLoading(true)
    try {
      const existing = await getInfographic(idContrato)
      if (existing.exists) { setImgUrl(existing.imgbb_url); setImgLoading(false); return }
    } catch {}
    try {
      const data = await generateInfographic(idContrato)
      setImgUrl(data.imgbb_url)
    } catch {}
    setImgLoading(false)
  }

  const handleSendEmail = async () => {
    if (!email) return
    setSending(true)
    try {
      await sendReportByEmail(idContrato, email)
      alert('Reporte enviado correctamente')
      setShowEmail(false)
      setEmail('')
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message))
    }
    setSending(false)
  }

  const handleReanalyze = async () => {
    setReanalyzing(true)
    try {
      const result = await auditContract(idContrato, true)
      if (result && onReanalyzed) onReanalyzed(idContrato, result.audit)
    } catch (err) {
      alert('Error al re-analizar: ' + (err.response?.data?.detail || err.message))
    }
    setReanalyzing(false)
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#f0eef8]">
      <div className="flex flex-wrap gap-2">
        <ActionBtn icon={FileDown}  label="PDF"          onClick={handlePDF}         loading={pdfLoading} />
        <ActionBtn icon={Sparkles}  label="Infografía"   onClick={handleInfographic} loading={imgLoading} />
        <ActionBtn icon={Mail}      label="Email"        onClick={() => setShowEmail(v => !v)} active={showEmail} />
        <ActionBtn icon={RefreshCw} label="Re-analizar"  onClick={handleReanalyze}   loading={reanalyzing} />
      </div>

      {showEmail && (
        <div className="flex gap-2 mt-2.5">
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 bg-white border border-[#e4e4f0] rounded-xl px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <button
            onClick={handleSendEmail}
            disabled={sending || !email}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-semibold transition-colors"
          >
            {sending ? '…' : 'Enviar'}
          </button>
        </div>
      )}

      {showPDF && (
        <PDFViewer pdfUrl={pdfUrl} onClose={() => setShowPDF(false)} onGenerate={handlePDF} generating={pdfLoading} />
      )}
      {showImg && (
        <InfographicModal imgbbUrl={imgUrl} onClose={() => setShowImg(false)} onGenerate={handleInfographic} generating={imgLoading} />
      )}
    </div>
  )
}

const FILTER_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'alto',  label: 'Alto riesgo' },
  { key: 'medio', label: 'Medio riesgo' },
  { key: 'bajo',  label: 'Bajo riesgo' },
]

const SORT_OPTIONS = [
  { key: 'fecha_desc',  label: 'Más recientes' },
  { key: 'score_desc',  label: 'Mayor riesgo' },
  { key: 'score_asc',   label: 'Menor riesgo' },
]

export default function AuditsPage() {
  const [audits, setAudits]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('todos')
  const [sortBy, setSortBy]     = useState('fecha_desc')
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showSort, setShowSort] = useState(false)

  useEffect(() => {
    getAllAudits()
      .then(data => { setAudits(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleReanalyzed = useCallback((idContrato, newAudit) => {
    setAudits(prev => prev.map(a =>
      a.id_contrato === idContrato
        ? { ...a, ...newAudit }
        : a
    ))
  }, [])

  const counts = {
    todos: audits.length,
    alto:  audits.filter(a => a.nivel_riesgo === 'alto').length,
    medio: audits.filter(a => a.nivel_riesgo === 'medio').length,
    bajo:  audits.filter(a => a.nivel_riesgo === 'bajo').length,
  }

  const sortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label || 'Ordenar'

  const filtered = audits
    .filter(a => filter === 'todos' || a.nivel_riesgo === filter)
    .filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        a.id_contrato.toLowerCase().includes(q) ||
        (a.nombre_entidad || '').toLowerCase().includes(q) ||
        (a.resumen_ejecutivo || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'score_desc') return (b.score_total || 0) - (a.score_total || 0)
      if (sortBy === 'score_asc')  return (a.score_total || 0) - (b.score_total || 0)
      return new Date(b.auditado_at) - new Date(a.auditado_at)
    })

  return (
    <div className="p-8">
      <div className="mb-6 animate-up">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Motor Híbrido IA</p>
        <h1 className="text-2xl font-bold text-[#0f0f23] tracking-tight">Auditorías Realizadas</h1>
        <p className="text-sm text-slate-500 mt-1">
          {audits.length} contratos analizados · Reglas automáticas + GPT-4o
        </p>
      </div>

      {/* Filters + Sort + Search */}
      <div className="relative z-10 flex flex-wrap items-center gap-3 mb-5 animate-up" style={{ animationDelay: '50ms' }}>
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

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#e4e4f0] text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-all"
          >
            <ArrowUpDown size={12} /> {sortLabel}
          </button>
          {showSort && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl border border-[#e4e4f0] shadow-lg shadow-black/5 z-20 py-1 min-w-[140px]">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setShowSort(false) }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                    sortBy === key ? 'text-indigo-600 bg-indigo-50/60' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por entidad, ID o resumen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white border border-[#e4e4f0] text-xs text-slate-700 placeholder-slate-400 rounded-xl pl-8 pr-4 py-2 w-72 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
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
                {/* Row header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : audit.id_contrato)}
                >
                  <ScoreCircle score={audit.score_total} nivel={audit.nivel_riesgo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${cfg.badge}`}>
                        {audit.nivel_riesgo}
                      </span>
                      <span className="text-xs font-mono text-slate-400 truncate">{audit.id_contrato}</span>
                    </div>
                    {audit.nombre_entidad && (
                      <p className="text-sm font-semibold text-[#0f0f23] truncate leading-tight mb-0.5">
                        {audit.nombre_entidad}
                      </p>
                    )}
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

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#f0eef8]">
                    {audit.resumen_ejecutivo && (
                      <div className="mt-3 p-4 bg-[#f8f7fc] rounded-xl border border-[#eeedf5]">
                        <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">Resumen Ejecutivo</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{audit.resumen_ejecutivo}</p>
                      </div>
                    )}
                    <AuditActions idContrato={audit.id_contrato} onReanalyzed={handleReanalyzed} />
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
