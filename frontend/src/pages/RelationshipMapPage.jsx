import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Network, AlertTriangle, Building2, Users, GitBranch, X, RefreshCw, ChevronRight } from 'lucide-react'
import { getRelationshipData, getAudit } from '../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────
const RISK = {
  alto:  { stroke: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Alto',  badge: 'bg-red-100 text-red-700' },
  medio: { stroke: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Medio', badge: 'bg-amber-100 text-amber-700' },
  bajo:  { stroke: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', label: 'Bajo',  badge: 'bg-emerald-100 text-emerald-700' },
}

const COL_W       = 268
const CARD_H      = 76
const CARD_GAP    = 10
const COL_TOP     = 30
const PANEL_W     = 288
const PANEL_GAP   = 16

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = v => {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return `$${Math.round(v / 1e3)}K`
}

const domRisk = rc => {
  if (!rc) return 'bajo'
  if ((rc.alto  || 0) > 0) return 'alto'
  if ((rc.medio || 0) > 0) return 'medio'
  return 'bajo'
}

const riskOrder = r => ({ alto: 0, medio: 1, bajo: 2 }[r] ?? 3)
const sortByRisk = arr => [...arr].sort((a, b) =>
  riskOrder(domRisk(a.risk_count)) - riskOrder(domRisk(b.risk_count))
)

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }) {
  const styles = {
    indigo: ['bg-indigo-50 border-indigo-100', 'text-indigo-600', 'text-indigo-400'],
    cyan:   ['bg-cyan-50 border-cyan-100',     'text-cyan-600',   'text-cyan-400'],
    violet: ['bg-violet-50 border-violet-100', 'text-violet-600', 'text-violet-400'],
    red:    ['bg-red-50 border-red-100',       'text-red-600',    'text-red-400'],
  }[accent]
  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${styles[0]}`}>
      <Icon size={18} className={styles[2]} />
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-widest opacity-60 ${styles[1]}`}>{label}</p>
        <p className={`text-xl font-bold ${styles[1]}`}>{value}</p>
      </div>
    </div>
  )
}

// ── AuditReasons ──────────────────────────────────────────────────────────────
function AuditReasons({ loading, detail }) {
  return (
    <div>
      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-2">
        Por qué es este nivel de riesgo
      </p>
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
          <span className="text-xs text-slate-400">Cargando análisis…</span>
        </div>
      )}
      {!loading && detail?.resumen && (
        <p className="text-xs text-slate-600 leading-relaxed mb-3 bg-slate-50 rounded-xl p-3">
          {detail.resumen}
        </p>
      )}
      {!loading && (detail?.alerts?.length > 0) && (
        <div className="space-y-2">
          {detail.alerts.map((alert, i) => {
            const sev = alert.severidad || 'bajo'
            const rc  = RISK[sev] || RISK.bajo
            return (
              <div key={i} className="flex gap-2.5 px-3 py-2.5 rounded-xl border"
                style={{ background: rc.bg, borderColor: rc.border }}>
                <div className="w-1 rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: rc.stroke, minHeight: 14 }} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#0f0f23] leading-snug">{alert.titulo}</p>
                  {alert.descripcion && (
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{alert.descripcion}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: rc.stroke }}>
                      {alert.categoria}
                    </span>
                    {alert.puntos > 0 && (
                      <span className="text-[9px] text-slate-400 ml-auto">+{alert.puntos} pts</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!loading && detail?.alerts?.length === 0 && (
        <p className="text-xs text-slate-400 italic">Sin alertas registradas.</p>
      )}
    </div>
  )
}

// ── NodeCard ──────────────────────────────────────────────────────────────────
function NodeCard({ node, selected, hovNode, nodeDim, setSelected, setHovNode, extraInfo }) {
  const risk  = domRisk(node.risk_count)
  const rc    = RISK[risk]
  const isSel = selected?.type === 'node' && selected.data.id === node.id
  const dim   = nodeDim(node)
  return (
    <div
      style={{
        height: CARD_H,
        borderLeftColor: rc.stroke,
        opacity: dim ? 0.25 : 1,
        boxShadow: isSel
          ? `0 0 0 2px ${rc.stroke}55, 0 4px 20px ${rc.stroke}22`
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      className="flex flex-col justify-center px-4 rounded-2xl border-l-[3px] bg-white border border-[#e8e8f4] cursor-pointer select-none transition-all duration-150 hover:shadow-md hover:border-[#d4d4e8]"
      onClick={e => { e.stopPropagation(); setSelected(isSel ? null : { type: 'node', data: node }) }}
      onMouseEnter={() => setHovNode(node.id)}
      onMouseLeave={() => setHovNode(null)}
    >
      <span className="text-[9.5px] font-bold uppercase tracking-widest mb-0.5" style={{ color: rc.stroke }}>
        {rc.label} riesgo
      </span>
      <p className="text-[13px] font-bold text-[#0f0f23] leading-snug truncate">
        {node.label.length > 30 ? node.label.slice(0, 28) + '…' : node.label}
      </p>
      <p className="text-[10px] text-slate-400 mt-1">
        {node.contratos?.length || 0} contrato{(node.contratos?.length || 0) !== 1 ? 's' : ''}
        {extraInfo}
      </p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RelationshipMapPage() {
  const svgRef = useRef(null)

  const [svgW,         setSvgW]        = useState(600)
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState(null)
  const [nodes,        setNodes]       = useState([])
  const [links,        setLinks]       = useState([])
  const [apiStats,     setApiStats]    = useState({})
  const [selected,     setSelected]    = useState(null)
  const [auditDetail,  setAuditDetail] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [hovNode,      setHovNode]     = useState(null)
  const [hovLink,      setHovLink]     = useState(null)
  const [mousePos,     setMousePos]    = useState({ x: 0, y: 0 })

  const loadData = useCallback(async () => {
    setLoading(true); setError(null); setSelected(null)
    try {
      const data = await getRelationshipData()
      setNodes(data.nodes || []); setLinks(data.links || []); setApiStats(data.stats || {})
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!selected) { setAuditDetail(null); return }

    let contractId = null

    if (selected.type === 'link') {
      contractId = selected.data.contract_id
    } else if (selected.type === 'node') {
      const nodeLinks = links.filter(l =>
        l.source === selected.data.id || l.target === selected.data.id
      )
      const best = nodeLinks
        .filter(l => l.risk === 'alto')
        .sort((a, b) => (b.score || 0) - (a.score || 0))[0]
        || nodeLinks.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
      contractId = best?.contract_id || null
    }

    if (!contractId) { setAuditDetail(null); return }

    setAuditLoading(true)
    setAuditDetail(null)
    getAudit(contractId)
      .then(d => setAuditDetail({
        alerts:   d.alerts || [],
        resumen:  d.audit?.resumen_ejecutivo || null,
        fromId:   contractId,
      }))
      .catch(() => setAuditDetail({ alerts: [], resumen: null, fromId: contractId }))
      .finally(() => setAuditLoading(false))
  }, [selected, links])

  useLayoutEffect(() => {
    if (svgRef.current) setSvgW(svgRef.current.clientWidth)
  })

  // ── Derived layout ─────────────────────────────────────────────────────────
  const entities  = sortByRisk(nodes.filter(n => n.type === 'entidad'))
  const providers = sortByRisk(nodes.filter(n => n.type === 'proveedor'))

  const entIdx  = Object.fromEntries(entities.map((n, i)  => [n.id, i]))
  const provIdx = Object.fromEntries(providers.map((n, i) => [n.id, i]))

  const cardCY = idx => COL_TOP + idx * (CARD_H + CARD_GAP) + CARD_H / 2

  const contentH = Math.max(
    COL_TOP + entities.length  * (CARD_H + CARD_GAP) + 20,
    COL_TOP + providers.length * (CARD_H + CARD_GAP) + 20,
    420,
  )

  const curveX1 = 0
  const curveX2 = svgW

  const maxVal  = links.reduce((m, l) => Math.max(m, l.valor || 0), 1e6)
  const linkSW  = valor => {
    const log  = Math.log10(Math.max(valor || 1, 1e6))
    const logM = Math.log10(Math.max(maxVal, 1e9))
    return 1.5 + ((log - 6) / Math.max(logM - 6, 1)) * 5.5
  }

  const activeId = selected?.type === 'node' ? selected.data.id : null
  const connected = new Set()
  if (activeId) {
    connected.add(activeId)
    links.forEach(l => {
      if (l.source === activeId) connected.add(l.target)
      if (l.target === activeId) connected.add(l.source)
    })
  }

  const linkLit = l => {
    if (selected?.type === 'link') return selected.data.contract_id === l.contract_id
    if (activeId) return l.source === activeId || l.target === activeId
    if (hovNode)  return l.source === hovNode   || l.target === hovNode
    if (hovLink)  return l.contract_id === hovLink
    return true
  }
  const nodeDim = n => {
    if (!activeId && !hovNode) return false
    const focus = activeId || hovNode
    return n.id !== focus && !connected.has(n.id)
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────
  const tooltipNode = hovNode ? nodes.find(n => n.id === hovNode) : null
  const tooltipLink = hovLink ? links.find(l => l.contract_id === hovLink) : null
  const showTooltip = !selected && (tooltipNode || tooltipLink)

  return (
    <div className="flex flex-col bg-[#f5f4f9]" style={{ height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-8 pt-7 pb-5 flex-shrink-0">
        <div className="mb-4">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Análisis de Redes</p>
          <h1 className="text-2xl font-bold text-[#0f0f23] tracking-tight">Mapa de Relaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conexiones entre entidades contratantes y proveedores adjudicados
          </p>
        </div>

        {!loading && !error && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatCard icon={Building2}     label="Entidades"   value={apiStats.total_entidades   || 0} accent="indigo" />
            <StatCard icon={Users}         label="Proveedores" value={apiStats.total_proveedores  || 0} accent="cyan"   />
            <StatCard icon={GitBranch}     label="Contratos"   value={apiStats.total_contratos    || 0} accent="violet" />
            <StatCard icon={AlertTriangle} label="Alto riesgo" value={apiStats.alto_riesgo        || 0} accent="red"    />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            {[['#ef4444','Alto riesgo'],['#f59e0b','Medio riesgo'],['#22c55e','Bajo riesgo']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-[3px] rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
            <span className="text-slate-300">·</span>
            <span>Grosor = valor del contrato</span>
          </div>
          <button onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#e4e4f0] text-slate-500 hover:border-indigo-200 hover:text-indigo-500 transition-all">
            <RefreshCw size={12} /> Recargar
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">

        {loading && (
          <div className="flex items-center justify-center gap-3 h-64">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-slate-400 text-sm">Cargando relaciones…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 h-64">
            <AlertTriangle size={32} className="text-red-400 opacity-50" />
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={loadData}
              className="px-4 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold border border-red-100 hover:bg-red-100 transition-all">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 h-64">
            <Network size={40} className="text-slate-200" />
            <p className="text-slate-400 text-sm">Sin datos de auditorías disponibles</p>
            <p className="text-slate-300 text-xs">Audita contratos primero para generar el mapa</p>
          </div>
        )}

        {!loading && !error && nodes.length > 0 && (
          <div
            className="flex relative"
            style={{ minHeight: contentH }}
            onClick={() => setSelected(null)}
            onMouseMove={e => {
              const r = e.currentTarget.getBoundingClientRect()
              setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top })
            }}
          >
            {/* ── Entity column ── */}
            <div className="flex-shrink-0 relative z-10" style={{ width: COL_W }}>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-0.5">
                Entidades contratantes
              </p>
              <div className="flex flex-col" style={{ gap: CARD_GAP }}>
                {entities.map(node => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    selected={selected}
                    hovNode={hovNode}
                    nodeDim={nodeDim}
                    setSelected={setSelected}
                    setHovNode={setHovNode}
                    extraInfo={node.departamento ? ` · ${node.departamento}` : ''}
                  />
                ))}
              </div>
            </div>

            {/* ── SVG curves ── */}
            <div className="flex-1 relative" style={{ minHeight: contentH }}>
              <svg
                ref={svgRef}
                width="100%"
                height={contentH}
                style={{ display: 'block', overflow: 'visible' }}
              >
                <defs>
                  <pattern id="bipdots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="0.5" cy="0.5" r="0.7" fill="rgba(0,0,0,0.045)" />
                  </pattern>
                </defs>
                <rect x={0} width={svgW} height={contentH} fill="url(#bipdots)" />

                <g style={{ pointerEvents: 'all' }}>
                  {links.map(lk => {
                    const eI = entIdx[lk.source]
                    const pI = provIdx[lk.target]
                    if (eI === undefined || pI === undefined) return null

                    const y1  = cardCY(eI)
                    const y2  = cardCY(pI)
                    const rc  = RISK[lk.risk || 'bajo']
                    const sw  = linkSW(lk.valor)
                    const lit = linkLit(lk)
                    const dim = (selected || hovNode || hovLink) && !lit

                    const cpX = (curveX2 - curveX1) * 0.4
                    const d   = `M${curveX1},${y1} C${curveX1 + cpX},${y1} ${curveX2 - cpX},${y2} ${curveX2},${y2}`
                    const isSel = selected?.type === 'link' && selected.data.contract_id === lk.contract_id

                    return (
                      <g key={lk.contract_id} opacity={dim ? 0.06 : 1}>
                        <path d={d} stroke="transparent" strokeWidth={Math.max(sw + 16, 24)} fill="none"
                          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                          onClick={e => { e.stopPropagation(); setSelected({ type: 'link', data: lk }) }}
                          onMouseEnter={() => setHovLink(lk.contract_id)}
                          onMouseLeave={() => setHovLink(null)}
                        />
                        {lit && (
                          <path d={d} stroke={rc.stroke} strokeWidth={sw + 6} strokeOpacity={0.07}
                            fill="none" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                        )}
                        <path d={d} stroke={rc.stroke} strokeWidth={lit ? sw + 0.5 : sw}
                          strokeOpacity={lit ? 0.85 : 0.5}
                          fill="none" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                        {isSel && lk.score !== undefined && (() => {
                          const mx = (curveX1 + curveX2) / 2
                          const my = (y1 + y2) / 2
                          return (
                            <g style={{ pointerEvents: 'none' }}>
                              <rect x={mx - 24} y={my - 12} width={48} height={23} rx={7}
                                fill="white" stroke={rc.stroke} strokeWidth={1.5}
                                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }} />
                              <text x={mx} y={my} textAnchor="middle" dy="0.35em"
                                fontSize="11" fill={rc.stroke} fontWeight="700">
                                {lk.score} pts
                              </text>
                            </g>
                          )
                        })()}
                      </g>
                    )
                  })}
                </g>
              </svg>
            </div>

            {/* ── Provider column ── */}
            <div className="flex-shrink-0 relative z-10" style={{ width: COL_W }}>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-0.5">
                Proveedores adjudicados
              </p>
              <div className="flex flex-col" style={{ gap: CARD_GAP }}>
                {providers.map(node => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    selected={selected}
                    hovNode={hovNode}
                    nodeDim={nodeDim}
                    setSelected={setSelected}
                    setHovNode={setHovNode}
                    extraInfo={node.es_pyme ? ' · PYME' : ''}
                  />
                ))}
              </div>
            </div>

            {/* ── Detail panel ── */}
            {selected && (
              <div
                className="flex-shrink-0 relative z-10"
                style={{ width: PANEL_W, marginLeft: PANEL_GAP }}
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-white rounded-2xl border border-[#e4e4f0] overflow-hidden sticky top-0">

                  {/* Panel header */}
                  <div className="px-5 py-4 border-b border-[#f0f0f8] flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {selected.type === 'link' ? (
                        <>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                              RISK[selected.data.risk || 'bajo'].badge
                            }`}>
                              {RISK[selected.data.risk || 'bajo'].label} riesgo
                            </span>
                            {selected.data.score !== undefined && (
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                {selected.data.score} pts
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            {selected.data.contract_id}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                              selected.data.type === 'entidad'
                                ? 'bg-indigo-100 text-indigo-600'
                                : 'bg-cyan-100 text-cyan-600'
                            }`}>
                              {selected.data.type === 'entidad' ? 'Entidad' : 'Proveedor'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                              RISK[domRisk(selected.data.risk_count)].badge
                            }`}>
                              {RISK[domRisk(selected.data.risk_count)].label}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-[#0f0f23] leading-snug">{selected.data.label}</p>
                          {selected.data.nit && (
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">NIT {selected.data.nit}</p>
                          )}
                        </>
                      )}
                    </div>
                    <button onClick={() => setSelected(null)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Panel body */}
                  <div className="p-5 space-y-4 max-h-[calc(100vh-340px)] overflow-y-auto">

                    {selected.type === 'link' ? (
                      <>
                        {(() => {
                          const ent  = nodes.find(n => n.id === selected.data.source)
                          const prov = nodes.find(n => n.id === selected.data.target)
                          return (
                            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2">
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Entidad contratante</p>
                                <p className="text-xs font-semibold text-[#0f0f23] leading-snug">
                                  {ent?.label || selected.data.source}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-px bg-slate-200" />
                                <ChevronRight size={11} className="text-slate-300 flex-shrink-0" />
                                <div className="flex-1 h-px bg-slate-200" />
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Proveedor adjudicado</p>
                                <p className="text-xs font-semibold text-[#0f0f23] leading-snug">
                                  {prov?.label || selected.data.target}
                                </p>
                              </div>
                            </div>
                          )
                        })()}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Valor</p>
                            <p className="text-base font-bold text-[#0f0f23] mt-0.5">{fmt(selected.data.valor)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Score IA</p>
                            <p className="text-base font-bold mt-0.5"
                              style={{ color: RISK[selected.data.risk || 'bajo'].stroke }}>
                              {selected.data.score ?? '—'}
                            </p>
                          </div>
                        </div>
                        {selected.data.modalidad && (
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Modalidad</p>
                            <p className="text-xs text-slate-600">{selected.data.modalidad}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                            Por qué es alto riesgo
                          </p>
                          {auditLoading && (
                            <div className="flex items-center gap-2 py-2">
                              <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
                              <span className="text-xs text-slate-400">Cargando análisis…</span>
                            </div>
                          )}
                          {!auditLoading && auditDetail?.resumen && (
                            <p className="text-xs text-slate-600 leading-relaxed mb-3 bg-slate-50 rounded-xl p-3">
                              {auditDetail.resumen}
                            </p>
                          )}
                          {!auditLoading && auditDetail?.alerts?.length > 0 && (
                            <div className="space-y-2">
                              {auditDetail.alerts.map((alert, i) => {
                                const sev = alert.severidad || 'bajo'
                                const rc  = RISK[sev] || RISK.bajo
                                return (
                                  <div key={i} className="flex gap-2.5 px-3 py-2.5 rounded-xl border"
                                    style={{ background: rc.bg, borderColor: rc.border }}>
                                    <div className="w-1 rounded-full flex-shrink-0 mt-0.5"
                                      style={{ background: rc.stroke, minHeight: 14 }} />
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-semibold text-[#0f0f23] leading-snug">
                                        {alert.titulo}
                                      </p>
                                      {alert.descripcion && (
                                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                          {alert.descripcion}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] font-bold uppercase tracking-wider"
                                          style={{ color: rc.stroke }}>
                                          {alert.categoria}
                                        </span>
                                        {alert.puntos > 0 && (
                                          <span className="text-[9px] text-slate-400 ml-auto">
                                            +{alert.puntos} pts
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {!auditLoading && auditDetail?.alerts?.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Sin alertas registradas.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {(selected.data.es_anomalia || selected.data.es_hub) && (
                          <div className={`rounded-xl p-3 border flex items-start gap-2.5 ${
                            selected.data.es_anomalia ? 'bg-red-50 border-red-100' : 'bg-violet-50 border-violet-100'
                          }`}>
                            <AlertTriangle size={13} className={`mt-0.5 flex-shrink-0 ${
                              selected.data.es_anomalia ? 'text-red-500' : 'text-violet-500'
                            }`} />
                            <p className={`text-xs leading-relaxed ${
                              selected.data.es_anomalia ? 'text-red-700' : 'text-violet-700'
                            }`}>
                              {selected.data.es_anomalia
                                ? 'Múltiples contratos de alto riesgo. Requiere revisión prioritaria.'
                                : `Proveedor compartido por ${selected.data.hub_entidades} entidades distintas.`}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Contratos</p>
                            <p className="text-xl font-bold text-[#0f0f23] mt-0.5">{selected.data.contratos?.length || 0}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Valor total</p>
                            <p className="text-base font-bold text-[#0f0f23] mt-0.5">{fmt(selected.data.total_valor)}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Distribución de riesgo</p>
                          <div className="space-y-2">
                            {[['alto','Alto'],['medio','Medio'],['bajo','Bajo']].map(([lvl, lbl]) => {
                              const count = selected.data.risk_count?.[lvl] || 0
                              const total = selected.data.contratos?.length || 1
                              return (
                                <div key={lvl} className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ background: RISK[lvl].stroke }} />
                                  <span className="text-xs text-slate-500 w-10">{lbl}</span>
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full"
                                      style={{ width: `${Math.round(count / total * 100)}%`, background: RISK[lvl].stroke }} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 w-4 text-right">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {(selected.data.departamento || selected.data.sector) && (
                          <div className="space-y-1.5">
                            {selected.data.departamento && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Departamento</span>
                                <span className="font-medium text-slate-700">{selected.data.departamento}</span>
                              </div>
                            )}
                            {selected.data.sector && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Sector</span>
                                <span className="font-medium text-slate-700">{selected.data.sector}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contratos vinculados</p>
                          <div className="space-y-1.5">
                            {(selected.data.contratos || []).slice(0, 8).map(cid => {
                              const lk   = links.find(l => l.contract_id === cid)
                              const risk = lk?.risk || 'bajo'
                              return (
                                <div key={cid}
                                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                                  onClick={() => lk && setSelected({ type: 'link', data: lk })}>
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ background: RISK[risk].stroke }} />
                                  <span className="text-[10px] text-slate-600 flex-1 truncate font-mono">{cid}</span>
                                  {lk?.score !== undefined && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${RISK[risk].badge}`}>
                                      {lk.score}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                            {(selected.data.contratos?.length || 0) > 8 && (
                              <p className="text-[10px] text-slate-400 text-center py-1">
                                +{selected.data.contratos.length - 8} más
                              </p>
                            )}
                          </div>
                        </div>

                        <AuditReasons loading={auditLoading} detail={auditDetail} forNode />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Hover tooltip — absolute within the outer flex div ── */}
            {showTooltip && (
              <div
                className="absolute z-20 pointer-events-none select-none rounded-2xl px-3.5 py-2.5 shadow-xl border"
                style={{
                  left: mousePos.x + 14,
                  top:  Math.max(4, mousePos.y - 52),
                  background: 'white',
                  borderColor: tooltipNode
                    ? `${RISK[domRisk(tooltipNode.risk_count)].stroke}44`
                    : `${RISK[tooltipLink?.risk || 'bajo'].stroke}44`,
                  minWidth: 180,
                  maxWidth: 240,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
              >
                {tooltipNode ? (
                  <>
                    <p className="text-xs font-bold text-[#0f0f23] truncate">{tooltipNode.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {tooltipNode.type === 'entidad' ? 'Entidad contratante' : 'Proveedor adjudicado'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-100">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: RISK[domRisk(tooltipNode.risk_count)].stroke }} />
                      <span className="text-[10px] font-semibold"
                        style={{ color: RISK[domRisk(tooltipNode.risk_count)].stroke }}>
                        Riesgo {domRisk(tooltipNode.risk_count)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">{fmt(tooltipNode.total_valor)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{tooltipLink?.contract_id}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: RISK[tooltipLink?.risk || 'bajo'].stroke }} />
                      <span className="text-[10px] font-semibold"
                        style={{ color: RISK[tooltipLink?.risk || 'bajo'].stroke }}>
                        {RISK[tooltipLink?.risk || 'bajo'].label} riesgo
                      </span>
                      {tooltipLink?.score !== undefined && (
                        <span className="text-[10px] text-slate-400 ml-auto">{tooltipLink.score} pts</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">{fmt(tooltipLink?.valor)}</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
