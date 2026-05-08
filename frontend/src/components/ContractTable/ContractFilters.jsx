import { useState } from 'react'
import { RotateCcw, SlidersHorizontal, ChevronDown } from 'lucide-react'

const baseSelect = "bg-white border border-[#e4e4f0] text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 min-w-[130px] transition-all appearance-none cursor-pointer"
const baseInput  = "bg-white border border-[#e4e4f0] text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-slate-400 transition-all"

function FilterField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</label>
      {children}
    </div>
  )
}

export default function ContractFilters({ filters = {}, onFilterChange, departamentos = [], modalidades = [], sectores = [] }) {
  const [open, setOpen] = useState(true)

  const handleChange = (key, value) => {
    onFilterChange({ [key]: value || undefined })
  }

  const activeCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== 'fecha_de_firma' && v !== 'DESC').length

  return (
    <div className="bg-white rounded-2xl border border-[#e4e4f0] mb-4 overflow-hidden animate-up">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#f8f7fc] transition-colors"
      >
        <SlidersHorizontal size={15} className="text-indigo-500" />
        <span className="text-sm font-semibold text-[#0f0f23]">Filtros</span>
        {activeCount > 0 && (
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {activeCount} activos
          </span>
        )}
        <ChevronDown
          size={15}
          className={`ml-auto text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-[#f0eef8]">
          <div className="flex flex-wrap gap-3 items-end pt-4">
            <FilterField label="Departamento">
              <select value={filters.departamento || ''} onChange={e => handleChange('departamento', e.target.value)} className={baseSelect}>
                <option value="">Todos</option>
                {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FilterField>

            <FilterField label="Ciudad">
              <input type="text" placeholder="Buscar ciudad…" value={filters.ciudad || ''} onChange={e => handleChange('ciudad', e.target.value)} className={`${baseInput} min-w-[130px]`} />
            </FilterField>

            <FilterField label="Modalidad">
              <select value={filters.modalidad || ''} onChange={e => handleChange('modalidad', e.target.value)} className={baseSelect}>
                <option value="">Todas</option>
                {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FilterField>

            <FilterField label="Sector">
              <select value={filters.sector || ''} onChange={e => handleChange('sector', e.target.value)} className={baseSelect}>
                <option value="">Todos</option>
                {sectores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FilterField>

            <FilterField label="Entidad">
              <input type="text" placeholder="Buscar entidad…" value={filters.nombre_entidad || ''} onChange={e => handleChange('nombre_entidad', e.target.value)} className={`${baseInput} min-w-[150px]`} />
            </FilterField>

            <FilterField label="Valor mín.">
              <input type="number" placeholder="Min COP" value={filters.valor_min || ''} onChange={e => handleChange('valor_min', e.target.value)} className={`${baseInput} min-w-[100px]`} />
            </FilterField>

            <FilterField label="Valor máx.">
              <input type="number" placeholder="Max COP" value={filters.valor_max || ''} onChange={e => handleChange('valor_max', e.target.value)} className={`${baseInput} min-w-[100px]`} />
            </FilterField>

            <FilterField label="Estado">
              <select value={filters.estado_contrato || ''} onChange={e => handleChange('estado_contrato', e.target.value)} className={`${baseSelect} min-w-[110px]`}>
                <option value="">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Cerrado">Cerrado</option>
                <option value="Terminado">Terminado</option>
              </select>
            </FilterField>

            <FilterField label="Auditado">
              <select value={filters.auditado || ''} onChange={e => handleChange('auditado', e.target.value)} className={`${baseSelect} min-w-[110px]`}>
                <option value="">Todos</option>
                <option value="si">Auditados</option>
                <option value="no">No auditados</option>
              </select>
            </FilterField>

            <FilterField label="Ordenar por">
              <select
                value={`${filters.orden_campo || 'fecha_de_firma'}:${filters.orden_dir || 'DESC'}`}
                onChange={e => {
                  const [campo, dir] = e.target.value.split(':')
                  onFilterChange({ orden_campo: campo, orden_dir: dir })
                }}
                className={`${baseSelect} min-w-[150px]`}
              >
                <option value="fecha_de_firma:DESC">Fecha firma ↓</option>
                <option value="fecha_de_firma:ASC">Fecha firma ↑</option>
                <option value="valor_del_contrato:DESC">Valor ↓</option>
                <option value="valor_del_contrato:ASC">Valor ↑</option>
                <option value="nombre_entidad:ASC">Entidad A–Z</option>
                <option value="nombre_entidad:DESC">Entidad Z–A</option>
                <option value="departamento:ASC">Departamento A–Z</option>
              </select>
            </FilterField>

            <div className="self-end">
              <button
                onClick={() => onFilterChange({})}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 bg-[#f8f7fc] border border-[#e4e4f0] hover:border-indigo-200 rounded-xl px-3 py-2 transition-all font-medium"
              >
                <RotateCcw size={12} /> Limpiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
