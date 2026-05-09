import { CheckCircle2 } from 'lucide-react'

function fmtMoney(val) {
  if (!val) return '—'
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}B`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}MM`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

function fmtDate(val) {
  if (!val) return '—'
  const s = String(val)
  if (s.length >= 10) {
    const [y, m, d] = s.substring(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  return s
}

function StatusBadge({ status }) {
  const s = status || 'N/D'
  const map = {
    'Activo':    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Cerrado':   'bg-slate-50 text-slate-500 border-slate-200',
    'Terminado': 'bg-red-50 text-red-600 border-red-200',
    'Suspendido':'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${map[s] || map['Cerrado']}`}>
      {s}
    </span>
  )
}

function ModalidadBadge({ modalidad }) {
  const m = modalidad || ''
  const lc = m.toLowerCase()
  const cls = lc.includes('directa')
    ? 'bg-red-50 text-red-700'
    : lc.includes('licitacion')
    ? 'bg-emerald-50 text-emerald-700'
    : lc.includes('minima')
    ? 'bg-amber-50 text-amber-700'
    : 'bg-indigo-50 text-indigo-700'
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${cls} max-w-[140px] truncate block`}>
      {m || 'N/D'}
    </span>
  )
}

export default function ContractRow({ contract, isSelected, onClick }) {
  return (
    <tr
      onClick={() => onClick(contract)}
      className={`cursor-pointer transition-all border-b border-[#f0eef8] last:border-0 ${
        isSelected
          ? 'bg-indigo-50/70 border-l-[3px] border-l-indigo-500'
          : 'hover:bg-[#f8f7fc]'
      }`}
    >
      <td className="px-4 py-3 max-w-0">
        <p className="text-sm font-semibold text-[#0f0f23] truncate leading-tight">
          {contract.nombre_entidad || 'N/D'}
        </p>
        <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
          {contract.id_contrato}
          {contract.fecha_de_firma && (
            <span className="text-slate-300"> · {fmtDate(contract.fecha_de_firma)}</span>
          )}
        </p>
      </td>
      <td className="px-4 py-3 max-w-0">
        <p className="text-xs text-slate-500 truncate leading-relaxed">
          {contract.descripcion_del_proceso || contract.objeto_del_contrato || '—'}
        </p>
      </td>
      <td className="px-4 py-3 max-w-0">
        <ModalidadBadge modalidad={contract.modalidad_de_contratacion} />
      </td>
      <td className="px-4 py-3 text-sm font-bold text-[#0f0f23] text-right">
        {fmtMoney(contract.valor_del_contrato)}
      </td>
      <td className="px-4 py-3 max-w-0">
        <p className="text-xs text-slate-500 truncate">{contract.departamento || '—'}</p>
      </td>
      <td className="px-4 py-3 max-w-0">
        <StatusBadge status={contract.estado_contrato} />
      </td>
      <td className="px-2 py-3 text-center">
        {contract._has_audit
          ? <CheckCircle2 size={16} className="text-indigo-500 inline-block" />
          : <span className="w-4 h-4 rounded-full border-2 border-slate-200 inline-block" />
        }
      </td>
    </tr>
  )
}
