import { X, FileText, ExternalLink } from 'lucide-react'

const HEADER_H = 36

export default function PDFViewer({ pdfUrl, onClose, onGenerate, generating }) {
  const bodyStyle = { height: `calc(100vh - ${HEADER_H}px)` }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      {/* Compact header */}
      <div
        style={{ height: HEADER_H }}
        className="shrink-0 flex items-center justify-between px-4 bg-white border-b border-[#e4e4f0]"
      >
        <h3 className="text-xs font-semibold text-[#0f0f23] flex items-center gap-1.5">
          <FileText size={13} className="text-indigo-500" /> Reporte PDF
        </h3>
        <div className="flex items-center gap-1">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en pestaña nueva"
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all"
            >
              <ExternalLink size={12} /> Abrir en pestaña
            </a>
          )}
          <button
            onClick={onClose}
            title="Cerrar"
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-all ml-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {generating ? (
        <div style={bodyStyle} className="flex items-center justify-center bg-[#f8f7fc]">
          <div className="text-center">
            <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium">Generando reporte PDF…</p>
            <p className="text-slate-400 text-xs mt-1">Esto puede tomar unos segundos</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <iframe src={pdfUrl} style={bodyStyle} className="w-full border-0 bg-white" title="PDF" />
      ) : (
        <div style={bodyStyle} className="flex items-center justify-center bg-[#f8f7fc]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-indigo-400" />
            </div>
            <p className="text-slate-600 text-sm font-semibold mb-1">El reporte no existe aún</p>
            <p className="text-slate-400 text-xs mb-5">Se generará un PDF completo del análisis de riesgo</p>
            <button
              onClick={onGenerate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
            >
              Generar reporte PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
