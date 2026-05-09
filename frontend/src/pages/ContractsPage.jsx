import { useState, useEffect, useCallback } from 'react'
import { FileSearch } from 'lucide-react'
import ContractFilters from '../components/ContractTable/ContractFilters'
import ContractTable from '../components/ContractTable/ContractTable'
import AuditPanel from '../components/AuditPanel/AuditPanel'
import { getFilterOptions } from '../services/api'
import { useContracts } from '../hooks/useContracts'
import { useAudit } from '../hooks/useAudit'

export default function ContractsPage() {
  const { contracts, total, page, pages, loading, filters, updateFilters, goToPage, fetchContracts, markAsAudited } = useContracts()
  const { auditData, loading: auditLoading, runAudit, fetchAudit } = useAudit()
  const [selectedContract, setSelectedContract] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [filterOpts, setFilterOpts] = useState({ departamentos: [], modalidades: [], sectores: [] })

  useEffect(() => {
    fetchContracts(1, {})
    getFilterOptions().then(setFilterOpts).catch(() => {})
  }, [fetchContracts])

  const handleSelectContract = useCallback((contract) => {
    setSelectedContract(contract)
    setShowPanel(true)
    fetchAudit(contract.id_contrato).catch(() => {})
  }, [fetchAudit])

  const handleClosePanel = useCallback(() => {
    setShowPanel(false)
    setSelectedContract(null)
  }, [])

  const handleAudit = useCallback(async (idContrato) => {
    const result = await runAudit(idContrato)
    if (result) markAsAudited(idContrato)
    return result
  }, [runAudit, markAsAudited])

  const handleReaudit = useCallback(async (idContrato) => {
    await runAudit(idContrato, true)
  }, [runAudit])

  return (
    <div className="p-8">
      <div className="mb-6 animate-up">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">SECOP II</p>
        <h1 className="text-2xl font-bold text-[#0f0f23] tracking-tight">Explorador de Contratos</h1>
        <p className="text-sm text-slate-500 mt-1">
          {Object.keys(filters).length === 0 ? '+100.000' : total.toLocaleString()} contratos disponibles · Selecciona uno para auditarlo con IA
        </p>
      </div>

      <ContractFilters
        filters={filters}
        onFilterChange={updateFilters}
        departamentos={filterOpts.departamentos}
        modalidades={filterOpts.modalidades}
        sectores={filterOpts.sectores}
      />

      <ContractTable
        contracts={contracts}
        loading={loading}
        page={page}
        pages={pages}
        totalLabel={Object.keys(filters).length === 0 ? '+100.000' : total.toLocaleString()}
        selectedId={selectedContract?.id_contrato}
        onSelect={handleSelectContract}
        onPageChange={goToPage}
      />

      {showPanel && selectedContract && (
        <AuditPanel
          contract={selectedContract}
          auditData={auditData}
          loading={auditLoading}
          onClose={handleClosePanel}
          onAudit={handleAudit}
          onReaudit={handleReaudit}
        />
      )}
    </div>
  )
}
