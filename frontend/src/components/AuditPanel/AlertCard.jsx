import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'

const SEV_CONFIG = {
  alta:  { icon: AlertTriangle, bg: 'bg-red-50',    border: 'border-red-100',    iconCls: 'text-red-500',    badge: 'bg-red-100 text-red-700',    pts: 'text-red-500' },
  media: { icon: AlertCircle,   bg: 'bg-amber-50',  border: 'border-amber-100',  iconCls: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700', pts: 'text-amber-500' },
  baja:  { icon: Info,          bg: 'bg-indigo-50', border: 'border-indigo-100', iconCls: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700',pts: 'text-indigo-500' },
}

export default function AlertCard({ alert }) {
  const [expanded, setExpanded] = useState(false)
  const cfg  = SEV_CONFIG[alert.severidad] || SEV_CONFIG.baja
  const Icon = cfg.icon

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl overflow-hidden mb-2 animate-in`}>
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <Icon size={14} className={`${cfg.iconCls} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-800 flex-1 min-w-0 truncate">{alert.titulo}</span>
            <span className={`text-[10px] font-bold shrink-0 ${cfg.pts}`}>+{alert.puntos} pts</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-400 bg-white/70 px-1.5 py-0.5 rounded-md">
              {alert.categoria}
            </span>
            <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-md ${cfg.badge}`}>
              {alert.severidad}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp size={12} className="text-slate-400 shrink-0 mt-0.5" /> : <ChevronDown size={12} className="text-slate-400 shrink-0 mt-0.5" />}
      </div>

      {expanded && alert.descripcion && (
        <div className="px-3 pb-3 border-t border-white/60">
          <p className="text-[11px] text-slate-600 leading-relaxed mt-2">{alert.descripcion}</p>
        </div>
      )}
    </div>
  )
}
