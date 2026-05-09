import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { AlertTriangle, BarChart3, TrendingUp } from 'lucide-react'
import { getDepartmentStats } from '../services/api'

// Colombia departments GeoJSON — 32 departamentos + Bogotá D.C.
const GEO_URL =
  'https://gist.githubusercontent.com/john-guerra/43c7656821069d00dcbc/raw/' +
  'be6a6e239cd5b5b803c6e7c2ec405b793a9064dd/colombia.geo.json'

// ── Name normalization ────────────────────────────────────────────────────────
// Removes accents, lowercases and collapses spaces so "BOGOTÁ D.C." ≡ "bogota dc"
const norm = s =>
  !s ? '' : s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[.,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// ── Risk color scale ──────────────────────────────────────────────────────────
// intensity = alto_riesgo / total_auditados  (0 → 1)
const COLORS = {
  alto:   { fill: '#ef4444', hover: '#dc2626', light: '#fef2f2', border: '#fecaca', badge: 'bg-red-100 text-red-700' },
  medio:  { fill: '#f59e0b', hover: '#d97706', light: '#fffbeb', border: '#fde68a', badge: 'bg-amber-100 text-amber-700' },
  bajo:   { fill: '#22c55e', hover: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', badge: 'bg-emerald-100 text-emerald-700' },
  nodata: { fill: '#dde0ec', hover: '#c4c8dc', light: '#f8f8fc', border: '#e0e0ec', badge: 'bg-slate-100 text-slate-500' },
}

const riskTier = intensity => {
  if (intensity === null || intensity === undefined) return 'nodata'
  if (intensity >= 0.6) return 'alto'
  if (intensity >= 0.3) return 'medio'
  return 'bajo'
}

const tierLabel = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo', nodata: 'Sin datos' }

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN = n => (n ?? 0).toLocaleString('es-CO')

// ── StatBadge ─────────────────────────────────────────────────────────────────
function StatBadge({ tier }) {
  const { badge } = COLORS[tier]
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge}`}>
      {tierLabel[tier]}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [stats,    setStats]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [statsMap, setStatsMap] = useState({})   // normName → stat object
  const [tooltip,  setTooltip]  = useState(null) // { name, stat, x, y } viewport coords
  const [selected, setSelected] = useState(null) // GeoJSON dept name

  useEffect(() => {
    getDepartmentStats()
      .then(data => {
        const m = {}
        data.forEach(s => { m[norm(s.departamento)] = s })
        setStatsMap(m)
        setStats(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Match GeoJSON name → API stat (exact first, then fuzzy on first significant word)
  const findStat = geoName => {
    const key = norm(geoName)
    if (statsMap[key]) return statsMap[key]
    const first = key.split(' ').find(w => w.length > 3) || key.split(' ')[0]
    for (const k of Object.keys(statsMap)) {
      if (k.startsWith(first) || first.startsWith(k.split(' ')[0])) return statsMap[k]
    }
    return null
  }

  const totalAudits = stats.reduce((s, d) => s + d.total_auditados, 0)
  const highRisk    = stats.reduce((s, d) => s + d.alto_riesgo, 0)
  const topDepts    = [...stats].sort((a, b) => b.alto_riesgo - a.alto_riesgo).slice(0, 10)

  // ── Tooltip handlers ───────────────────────────────────────────────────────
  const onGeoEnter = (e, geoName, stat) =>
    setTooltip({ name: geoName, stat, x: e.clientX, y: e.clientY })
  const onGeoMove  = (e, geoName, stat) =>
    setTooltip({ name: geoName, stat, x: e.clientX, y: e.clientY })
  const onGeoLeave = () => setTooltip(null)

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-52 bg-slate-200 rounded-xl" />
          <div className="h-4 w-72 bg-slate-100 rounded-xl" />
          <div className="h-[760px] bg-white rounded-2xl border border-[#e4e4f0]" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">
          Análisis Geográfico
        </p>
        <h1 className="text-2xl font-bold text-[#0f0f23] tracking-tight">
          Mapa de Riesgo Nacional
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {fmtN(totalAudits)} auditorías · {fmtN(highRisk)} contratos de alto riesgo detectados
        </p>
      </div>

      {/* ── Map + Sidebar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Colombia map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e4e4f0] flex flex-col">

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-4 pb-3 border-b border-[#f0f0f8]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Nivel de riesgo
            </span>
            {[
              { tier: 'alto',   label: 'Alto  (≥ 60 %)' },
              { tier: 'medio',  label: 'Medio  (30 – 59 %)' },
              { tier: 'bajo',   label: 'Bajo  (< 30 %)' },
              { tier: 'nodata', label: 'Sin auditorías' },
            ].map(({ tier, label }) => (
              <span key={tier} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[tier].fill }}
                />
                <span className="text-xs text-slate-500">{label}</span>
              </span>
            ))}
          </div>

          {/* Map canvas */}
          <div className="relative flex-1" style={{ minHeight: 720 }}>
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [-74, 4], scale: 2200 }}
              style={{ width: '100%', height: '100%', minHeight: 720 }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const geoName   = geo.properties.NOMBRE_DPT || geo.properties.name || ''
                    const stat      = findStat(geoName)
                    const intensity = stat?.color_intensity ?? null
                    const tier      = riskTier(intensity)
                    const isSel     = selected === geoName
                    const baseFill  = isSel ? COLORS[tier].hover : COLORS[tier].fill

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={baseFill}
                        stroke="#ffffff"
                        strokeWidth={0.6}
                        style={{
                          default: { outline: 'none' },
                          hover:   { outline: 'none', fill: COLORS[tier].hover, cursor: 'pointer' },
                          pressed: { outline: 'none', fill: COLORS[tier].hover },
                        }}
                        onMouseEnter={e => onGeoEnter(e, geoName, stat)}
                        onMouseMove={e => onGeoMove(e, geoName, stat)}
                        onMouseLeave={onGeoLeave}
                        onClick={() =>
                          setSelected(prev => prev === geoName ? null : geoName)
                        }
                      />
                    )
                  })
                }
              </Geographies>
            </ComposableMap>

            {/* Selected dept info bar (bottom of map) */}
            {selected && (() => {
              const stat = findStat(selected)
              if (!stat) return null
              const tier = riskTier(stat.color_intensity)
              return (
                <div
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm
                             rounded-2xl border shadow-xl px-5 py-3 flex items-center gap-4 z-10"
                  style={{ borderColor: COLORS[tier].border }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[tier].fill }}
                  />
                  <div>
                    <p className="text-xs font-bold text-[#0f0f23]">{stat.departamento}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {stat.total_auditados} auditorías · score prom. {stat.score_promedio}
                    </p>
                  </div>
                  <div className="flex gap-3 text-[11px] font-semibold ml-2">
                    <span className="text-red-600">{stat.alto_riesgo} alto</span>
                    <span className="text-amber-500">{stat.medio_riesgo} medio</span>
                    <span className="text-emerald-600">{stat.bajo_riesgo} bajo</span>
                  </div>
                  <StatBadge tier={tier} />
                  <button
                    className="ml-1 text-slate-300 hover:text-slate-500 text-xs"
                    onClick={() => setSelected(null)}
                  >
                    ✕
                  </button>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Critical departments sidebar */}
        <div className="bg-white rounded-2xl border border-[#e4e4f0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} className="text-red-500" />
            <h3 className="font-semibold text-[#0f0f23] text-sm">Departamentos Críticos</h3>
          </div>

          {topDepts.length === 0 ? (
            <p className="text-slate-300 text-xs text-center py-8">Sin datos disponibles</p>
          ) : (
            <div className="space-y-1.5">
              {topDepts.map((s, i) => {
                const tier  = riskTier(s.color_intensity)
                const color = COLORS[tier].fill
                const pct   = Math.round((s.color_intensity ?? 0) * 100)
                return (
                  <div
                    key={s.departamento}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border
                               border-[#f0eef8] hover:border-indigo-200 hover:bg-indigo-50/40
                               cursor-pointer transition-all"
                    onClick={() =>
                      setSelected(prev => prev === s.departamento ? null : s.departamento)
                    }
                  >
                    <span className="text-xs font-bold text-slate-300 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 truncate leading-snug">
                        {s.departamento}
                      </p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] text-red-600 font-semibold">
                          {s.alto_riesgo} alto
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {s.total_auditados} aud.
                        </span>
                      </div>
                    </div>

                    {/* Risk % circle */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center
                                 text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: color + '22', color }}
                    >
                      {pct}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Department stats grid ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#e4e4f0] p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={15} className="text-indigo-500" />
          <h3 className="font-semibold text-[#0f0f23] text-sm">Resumen por Departamento</h3>
          <span className="ml-auto text-xs text-slate-400">
            {stats.length} departamentos auditados
          </span>
        </div>

        {stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <TrendingUp size={24} className="text-slate-200" />
            <p className="text-slate-300 text-xs">Sin datos de departamentos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {[...stats]
              .sort((a, b) => b.alto_riesgo - a.alto_riesgo)
              .map(s => {
                const tier   = riskTier(s.color_intensity)
                const colors = COLORS[tier]
                return (
                  <div
                    key={s.departamento}
                    className="rounded-xl border p-3 cursor-pointer transition-all
                               hover:shadow-md hover:-translate-y-0.5"
                    style={{
                      borderColor:     colors.border,
                      backgroundColor: colors.light,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: colors.fill }}
                      />
                      <span className="text-[10px] font-semibold text-slate-700 leading-tight truncate">
                        {s.departamento}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-xl font-bold" style={{ color: colors.fill }}>
                        {s.total_auditados}
                      </span>
                      <span className="text-[9px] text-slate-400">aud.</span>
                    </div>
                    <div className="flex gap-2 text-[9px] font-bold">
                      <span style={{ color: COLORS.alto.fill  }}>{s.alto_riesgo}↑</span>
                      <span style={{ color: COLORS.medio.fill }}>{s.medio_riesgo}~</span>
                      <span style={{ color: COLORS.bajo.fill  }}>{s.bajo_riesgo}↓</span>
                    </div>
                    {/* Mini risk bar */}
                    {s.total_auditados > 0 && (
                      <div className="flex gap-0.5 mt-2 h-1 rounded-full overflow-hidden">
                        {s.alto_riesgo > 0 && (
                          <div
                            style={{
                              width: `${(s.alto_riesgo / s.total_auditados) * 100}%`,
                              backgroundColor: COLORS.alto.fill,
                            }}
                          />
                        )}
                        {s.medio_riesgo > 0 && (
                          <div
                            style={{
                              width: `${(s.medio_riesgo / s.total_auditados) * 100}%`,
                              backgroundColor: COLORS.medio.fill,
                            }}
                          />
                        )}
                        {s.bajo_riesgo > 0 && (
                          <div
                            style={{
                              width: `${(s.bajo_riesgo / s.total_auditados) * 100}%`,
                              backgroundColor: COLORS.bajo.fill,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* ── Hover tooltip (fixed = never clipped by overflow-hidden) ─────────── */}
      {tooltip && (
        <div
          className="pointer-events-none select-none bg-white rounded-2xl shadow-2xl
                     border border-[#e4e4f0] px-4 py-3.5"
          style={{
            position: 'fixed',
            left:    tooltip.x + 16,
            top:     tooltip.y + 12,
            zIndex:  9999,
            minWidth: 210,
            maxWidth: 260,
          }}
        >
          <p className="text-sm font-bold text-[#0f0f23] mb-1.5 leading-snug">
            {tooltip.name}
          </p>

          {tooltip.stat ? (() => {
            const { stat } = tooltip
            const tier     = riskTier(stat.color_intensity)
            const color    = COLORS[tier].fill
            const pct      = Math.round((stat.color_intensity ?? 0) * 100)
            return (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <StatBadge tier={tier} />
                  <span className="text-[10px] font-mono font-bold" style={{ color }}>
                    {pct}% alto riesgo
                  </span>
                </div>

                {/* Score bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>Score promedio</span>
                    <span className="font-bold text-slate-600">{stat.score_promedio} / 100</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(stat.score_promedio, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Auditorías',  value: stat.total_auditados, cls: 'text-slate-700'   },
                    { label: 'Alto riesgo', value: stat.alto_riesgo,     cls: 'text-red-600'     },
                    { label: 'Medio',       value: stat.medio_riesgo,    cls: 'text-amber-600'   },
                    { label: 'Bajo',        value: stat.bajo_riesgo,     cls: 'text-emerald-600' },
                  ].map(({ label, value, cls }) => (
                    <div
                      key={label}
                      className="bg-slate-50 rounded-xl px-2.5 py-2 flex flex-col"
                    >
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide">
                        {label}
                      </span>
                      <span className={`text-base font-bold ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })() : (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-slate-400">Sin auditorías registradas</p>
              <p className="text-[9px] text-slate-300">
                Audita contratos de este departamento para ver datos aquí.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
