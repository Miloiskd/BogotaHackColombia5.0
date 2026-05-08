import { X, ExternalLink, RefreshCw, FileDown, Sparkles, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { generateReport, generateInfographic, getReport, getInfographic, sendReportByEmail } from '../../services/api'
import ScoreGauge from './ScoreGauge'
import AlertCard from './AlertCard'
import PDFViewer from '../PDFViewer/PDFViewer'
import InfographicModal from '../InfographicModal/InfographicModal'

function fmtMoney(val) {
  if (!val) return '—'
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}B`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}MM`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

function Field({ label, value, truncate }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 block mb-0.5">{label}</span>
      <span className={`text-xs font-medium text-slate-700 ${truncate ? 'block truncate' : ''}`}>{value || '—'}</span>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
          : 'bg-[#f8f7fc] border-[#e4e4f0] hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'
      }`}
    >
      <Icon size={13} /> <span>{label}</span>
    </button>
  )
}

export default function AuditPanel({ contract, auditData, loading, onClose, onAudit, onReaudit }) {
  const [showPDF, setPdfOpen]             = useState(false)
  const [pdfUrl, setPdfUrl]               = useState(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [showImg, setImgOpen]             = useState(false)
  const [imgbbUrl, setImgbbUrl]           = useState(null)
  const [imgGenerating, setImgGenerating] = useState(false)
  const [showEmail, setEmailOpen]         = useState(false)
  const [email, setEmail]                 = useState('')
  const [sending, setSending]             = useState(false)

  useEffect(() => {
    setPdfUrl(null)
    setImgbbUrl(null)
    setPdfOpen(false)
    setImgOpen(false)
    setEmailOpen(false)
  }, [contract?.id_contrato])

  if (!contract) return null

  const audit     = auditData?.audit
  const alerts    = auditData?.alerts || []
  const isAudited = !!audit

  const handleGeneratePDF = async () => {
    setPdfOpen(true)
    setPdfGenerating(true)
    try {
      const existing = await getReport(contract.id_contrato)
      if (existing.exists) { setPdfUrl(existing.url); setPdfGenerating(false); return }
    } catch {}
    try {
      const data = await generateReport(contract.id_contrato)
      setPdfUrl(data.url)
    } catch {}
    setPdfGenerating(false)
  }

  const handleGenerateInfographic = async () => {
    setImgOpen(true)
    setImgGenerating(true)
    try {
      const existing = await getInfographic(contract.id_contrato)
      if (existing.exists) { setImgbbUrl(existing.imgbb_url); setImgGenerating(false); return }
    } catch {}
    try {
      const data = await generateInfographic(contract.id_contrato)
      setImgbbUrl(data.imgbb_url)
    } catch {}
    setImgGenerating(false)
  }

  const handleSendEmail = async () => {
    if (!email) return
    setSending(true)
    try {
      await sendReportByEmail(contract.id_contrato, email)
      alert('Reporte enviado correctamente')
      setEmailOpen(false)
      setEmail('')
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message))
    }
    setSending(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/25 z-40 fade-backdrop" onClick={onClose} />

      {/* Panel — overflow-y-auto on the whole container so everything scrolls */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-[92vw] bg-white z-50 overflow-y-auto slide-right shadow-2xl shadow-black/10">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-[#f0eef8] px-5 py-4 flex items-start justify-between z-10">
          <div className="min-w-0 mr-4">
            <p className="text-sm font-bold text-[#0f0f23] truncate">{contract.nombre_entidad || 'Entidad'}</p>
            <a
              href={`https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=${contract.id_contrato}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-indigo-500 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 mt-0.5 transition-colors"
            >
              {contract.id_contrato} <ExternalLink size={10} />
            </a>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-all shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Contract details */}
          <div className="bg-[#f8f7fc] rounded-2xl p-4 border border-[#eeedf5]">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos del Contrato</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Valor"        value={fmtMoney(contract.valor_del_contrato)} />
              <Field label="Modalidad"    value={contract.modalidad_de_contratacion} />
              <Field label="Tipo"         value={contract.tipo_de_contrato} />
              <Field label="Proveedor"    value={contract.proveedor_adjudicado} truncate />
              <Field label="Departamento" value={contract.departamento} />
              <Field label="Fecha firma"  value={contract.fecha_de_firma ? String(contract.fecha_de_firma).substring(0, 10) : null} />
              <div className="col-span-2">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 block mb-0.5">Objeto</span>
                <span className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {contract.descripcion_del_proceso || contract.objeto_del_contrato || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit section */}
          <div className="bg-white rounded-2xl p-4 border border-[#e4e4f0]">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Auditoría de Riesgo</h3>

            {!isAudited && !loading && (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm mb-4">Este contrato no ha sido auditado</p>
                <button
                  onClick={() => onAudit(contract.id_contrato)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2 shadow-sm shadow-indigo-200"
                >
                  Analizar con IA
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Analizando con IA…</p>
              </div>
            )}

            {isAudited && !loading && (
              <div className="space-y-4">
                <ScoreGauge
                  score={audit.score_total}
                  nivel={audit.nivel_riesgo}
                  scoreReglas={audit.score_reglas}
                  scoreGpt={audit.score_gpt}
                />
                {audit.resumen_ejecutivo && (
                  <div className="bg-[#f8f7fc] rounded-xl p-3 border border-[#eeedf5]">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Resumen</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{audit.resumen_ejecutivo}</p>
                  </div>
                )}
                <button
                  onClick={() => onReaudit(contract.id_contrato)}
                  className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 transition-colors font-medium"
                >
                  <RefreshCw size={11} /> Re-analizar
                </button>
              </div>
            )}
          </div>

          {/* Alerts */}
          {isAudited && alerts.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#e4e4f0]">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Alertas Detectadas
                <span className="ml-2 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{alerts.length}</span>
              </h3>
              {alerts.map((a, i) => <AlertCard key={a.id || i} alert={a} />)}
            </div>
          )}

          {/* Actions */}
          {isAudited && (
            <div className="bg-white rounded-2xl p-4 border border-[#e4e4f0] space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Exportar / Compartir</h3>
              <div className="flex gap-2">
                <ActionBtn icon={FileDown}  label="PDF"          onClick={handleGeneratePDF} />
                <ActionBtn icon={Sparkles}  label="Infografía IA" onClick={handleGenerateInfographic} />
                <ActionBtn icon={Mail}      label="Email"        onClick={() => setEmailOpen(v => !v)} active={showEmail} />
              </div>
              {showEmail && (
                <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </div>

      {showPDF && (
        <PDFViewer
          pdfUrl={pdfUrl}
          onClose={() => setPdfOpen(false)}
          onGenerate={handleGeneratePDF}
          generating={pdfGenerating}
        />
      )}
      {showImg && (
        <InfographicModal
          imgbbUrl={imgbbUrl}
          onClose={() => setImgOpen(false)}
          onGenerate={handleGenerateInfographic}
          generating={imgGenerating}
        />
      )}
    </>
  )
}
