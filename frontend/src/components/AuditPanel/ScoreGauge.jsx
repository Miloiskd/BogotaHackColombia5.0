export default function ScoreGauge({ score = 0, nivel = 'bajo', scoreReglas = 0, scoreGpt = 0 }) {
  const radius   = 60
  const stroke   = 8
  const nr       = radius - stroke / 2
  const circ     = nr * Math.PI
  const progress = Math.min(score / 100, 1)
  const offset   = circ - progress * circ

  const palette = {
    bajo:  { fg: '#10b981', bg: '#d1fae5', text: 'text-emerald-600', label: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    medio: { fg: '#f59e0b', bg: '#fef3c7', text: 'text-amber-600',   label: 'bg-amber-50 text-amber-700 border-amber-200' },
    alto:  { fg: '#ef4444', bg: '#fee2e2', text: 'text-red-600',      label: 'bg-red-50 text-red-700 border-red-200' },
  }
  const c = palette[nivel] || palette.bajo

  return (
    <div className="flex flex-col items-center py-3">
      <svg height={radius * 2 + 16} width={radius * 2 + 16} className="overflow-visible">
        <defs>
          <linearGradient id={`gauge-${nivel}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c.fg} stopOpacity="0.7" />
            <stop offset="100%" stopColor={c.fg} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g transform={`translate(${radius + 8}, ${radius + 8})`}>
          {/* Track */}
          <path
            d={`M ${-nr} 0 A ${nr} ${nr} 0 0 1 ${nr} 0`}
            fill="none"
            stroke="#f0eef8"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Progress */}
          <path
            d={`M ${-nr} 0 A ${nr} ${nr} 0 0 1 ${nr} 0`}
            fill="none"
            stroke={`url(#gauge-${nivel})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
            filter="url(#glow)"
          />
          {/* Score text */}
          <text x="0" y="4"  textAnchor="middle" fill={c.fg}      fontSize="28" fontWeight="800" fontFamily="Inter, sans-serif">{score}</text>
          <text x="0" y="18" textAnchor="middle" fill="#94a3b8" fontSize="9"  fontWeight="600" fontFamily="Inter, sans-serif">de 100</text>
        </g>
      </svg>

      <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border -mt-1 ${c.label}`}>
        Riesgo {nivel}
      </span>

      <div className="flex gap-5 mt-3">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Reglas</p>
          <p className="text-base font-bold text-slate-700 mt-0.5">{scoreReglas}</p>
        </div>
        <div className="w-px bg-slate-100" />
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">IA</p>
          <p className="text-base font-bold text-slate-700 mt-0.5">{scoreGpt}</p>
        </div>
      </div>
    </div>
  )
}
