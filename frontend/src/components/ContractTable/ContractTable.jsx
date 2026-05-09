import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import ContractRow from './ContractRow'

export default function ContractTable({ contracts = [], loading, page, pages, total, selectedId, onSelect, onPageChange }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e4e4f0] overflow-hidden animate-up" style={{ animationDelay: '80ms' }}>
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={22} className="animate-spin text-indigo-500" />
          <span className="text-sm text-slate-400">Cargando contratos…</span>
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">No se encontraron contratos</p>
          <p className="text-slate-300 text-xs mt-1">Ajusta los filtros e intenta de nuevo</p>
        </div>
      ) : (
        <>
          <div>
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[26%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#f0eef8] bg-[#f8f7fc]">
                  {[
                    { label: 'Entidad / ID', align: 'text-left' },
                    { label: 'Objeto', align: 'text-left' },
                    { label: 'Modalidad', align: 'text-left' },
                    { label: 'Valor', align: 'text-right' },
                    { label: 'Depto.', align: 'text-left' },
                    { label: 'Estado', align: 'text-left' },
                    { label: '✓', align: 'text-center' },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 ${align}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <ContractRow
                    key={c.id_contrato}
                    contract={c}
                    isSelected={selectedId === c.id_contrato}
                    onClick={onSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-[#f0eef8] bg-[#f8f7fc]/50">
            <span className="text-xs text-slate-400">
              Página <span className="font-semibold text-slate-600">{page}</span> de{' '}
              <span className="font-semibold text-slate-600">{pages}</span>
              {' · '}
              <span className="font-semibold text-slate-600">{total.toLocaleString()}</span> resultados
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-700 w-8 text-center">{page}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= pages}
                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
