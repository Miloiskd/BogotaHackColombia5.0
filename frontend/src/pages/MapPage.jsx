import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { MapPin, AlertTriangle, BarChart3, ChevronRight, TrendingUp } from 'lucide-react'
import { getDepartmentStats } from '../services/api'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json'
const COLOMBIA_CENTER = [74, 4.5]
const ZOOM = 4.5

function getColor(intensity) {
  if (intensity === null || intensity === undefined) return '#e4e4f0'
  if (intensity >= 0.6) return '#ef4444'
  if (intensity >= 0.3) return '#f59e0b'
  return '#10b981'
}

function getBorder(intensity) {
  if (intensity === null || intensity === undefined) return '#d0d0e0'
  if (intensity >= 0.6) return '#dc2626'
  if (intensity >= 0.3) return '#d97706'
  return '#059669'
}

function RiskPill({ nivel }) {
  const c = {
    alto:  'bg-red-100 text-red-700',
    medio: 'bg-amber-100 text-amber-700',
    bajo:  'bg-emerald-100 text-emerald-700',
  }[nivel] || 'bg-slate-100 text-slate-600'
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${c}`}>{nivel}</span>
}

export default function MapPage() {
  const [stats, setStats]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [hovered, setHovered]   = useState(null)
  const [statsMap, setStatsMap] = useState({})

  useEffect(() => {
    getDepartmentStats()
      .then(data => {
        const map = {}
        data.forEach(s => { map[s.departamento.toLowerCase()] = s })
        setStatsMap(map)
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalAudits = stats.reduce((sum, s) => sum + s.total_auditados, 0)
  const highRisk    = stats.reduce((sum, s) => sum + s.alto_riesgo, 0)
  const topDepts    = [...stats].sort((a, b) => b.alto_riesgo - a.alto_riesgo).slice(0, 8)

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-52 bg-slate-200 rounded-xl" />
          <div className="h-4 w-72 bg-slate-100 rounded-xl" />
          <div className="bg-white rounded-2xl border border-[#e4e4f0] w-full h-[420px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 animate-up">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Análisis Geográfico</p>
        <h1 className="text-2xl font-bold text-[#0f0f23] tracking-tight">Mapa de Riesgo Nacional</h1>
        <p className="text-sm text-slate-500 mt-1">
          {totalAudits.toLocaleString()} auditorías · {highRisk.toLocaleString()} contratos de alto riesgo detectados
        </p>
      </div>

      {/* Map + Top depts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 animate-up" style={{ animationDelay: '50ms' }}>
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e4e4f0] overflow-hidden">
          <div className="flex items-center gap-5 px-5 pt-4 pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nivel de riesgo</span>
            {[
              { color: '#ef4444', label: 'Alto (≥60%)' },
              { color: '#f59e0b', label: 'Medio (30–60%)' },
              { color: '#10b981', label: 'Bajo (<30%)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: COLOMBIA_CENTER, scale: ZOOM * 80 }}
            style={{ width: '100%', height: '420px' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies
                  .filter(g => g.id === '170')
                  .map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#e4e4f0"
                      stroke="#d0d0e0"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover:   { outline: 'none', fill: '#eef2ff' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
              }
            </Geographies>
          </ComposableMap>
        </div>

        {/* Top critical departments */}
        <div className="bg-white rounded-2xl border border-[#e4e4f0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} className="text-red-500" />
            <h3 className="font-semibold text-[#0f0f23] text-sm">Departamentos Críticos</h3>
          </div>
          <div className="space-y-2">
            {topDepts.length === 0 ? (
              <p className="text-slate-300 text-xs text-center py-8">Sin datos disponibles</p>
            ) : (
              topDepts.map((s, i) => {
                const intensity = s.color_intensity ?? 0
                const color = getColor(intensity)
                return (
                  <div
                    key={s.departamento}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-[#f0eef8] hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer transition-all group"
                    onMouseEnter={() => setHovered(s.departamento)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className="text-xs font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{s.departamento}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] text-red-600 font-semibold">{s.alto_riesgo} alto</span>
                        <span className="text-[10px] text-slate-400">{s.total_auditados} aud.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: color + '20', color }}
                      >
                        {Math.round(intensity * 100)}
                      </div>
                      <ChevronRight size={12} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Department grid */}
      <div className="bg-white rounded-2xl border border-[#e4e4f0] p-5 mb-5 animate-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={15} className="text-indigo-500" />
          <h3 className="font-semibold text-[#0f0f23] text-sm">Resumen por Departamento</h3>
          <span className="ml-auto text-xs text-slate-400">{stats.length} departamentos</span>
        </div>
        {stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <TrendingUp size={24} className="text-slate-200" />
            <p className="text-slate-300 text-xs">Sin datos de departamentos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {stats.map(s => {
              const intensity   = s.color_intensity ?? null
              const color       = getColor(intensity)
              const borderColor = getBorder(intensity)
              return (
                <div
                  key={s.departamento}
                  className="rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ borderColor: borderColor + '40', backgroundColor: color + '08' }}
                  onMouseEnter={() => setHovered(s.departamento)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] font-semibold text-slate-700 truncate">{s.departamento}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold" style={{ color }}>{s.total_auditados}</span>
                    <span className="text-[9px] text-slate-400">aud.</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-[9px] font-semibold">
                    <span style={{ color: '#ef4444' }}>{s.alto_riesgo}↑</span>
                    <span style={{ color: '#f59e0b' }}>{s.medio_riesgo}~</span>
                    <span style={{ color: '#10b981' }}>{s.bajo_riesgo}↓</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (() => {
        const key = hovered.toLowerCase()
        const s   = statsMap[key]
        if (!s) return null
        const intensity = s.color_intensity ?? null
        const color     = getColor(intensity)
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-[#e4e4f0] px-6 py-4 w-72 animate-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <h3 className="font-bold text-[#0f0f23] text-sm">{s.departamento}</h3>
              {intensity !== null && (
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: color + '20', color }}
                >
                  {Math.round(intensity * 100)}/100
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'auditorías',  value: s.total_auditados, cls: 'border-[#e4e4f0] bg-[#f8f7fc]',     valCls: 'text-slate-800' },
                { label: 'alto riesgo', value: s.alto_riesgo,    cls: 'border-red-100 bg-red-50',           valCls: 'text-red-600' },
                { label: 'medio riesgo',value: s.medio_riesgo,   cls: 'border-amber-100 bg-amber-50',       valCls: 'text-amber-600' },
                { label: 'bajo riesgo', value: s.bajo_riesgo,    cls: 'border-emerald-100 bg-emerald-50',   valCls: 'text-emerald-600' },
              ].map(({ label, value, cls, valCls }) => (
                <div key={label} className={`rounded-xl p-3 text-center border ${cls}`}>
                  <div className={`text-xl font-bold ${valCls}`}>{value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#f0eef8] flex justify-between text-xs">
              <span className="text-slate-400">Score promedio</span>
              <span className="font-bold text-[#0f0f23]">{s.score_promedio ?? 'N/A'}</span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
