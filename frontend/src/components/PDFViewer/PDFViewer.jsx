import { X, Download, FileText } from 'lucide-react'

export default function PDFViewer({ pdfUrl, onClose, onGenerate, generating }) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[#e4e4f0]">
        <h3 className="text-sm font-semibold text-[#0f0f23] flex items-center gap-2">
          <FileText size={16} className="text-indigo-500" /> Reporte PDF
        </h3>
        <div className="flex items-center gap-4">
          {pdfUrl && (
            <a
              href={pdfUrl}
              download
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Download size={13} /> Descargar
            </a>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>
      </div>

      {generating ? (
        <div className="flex-1 flex items-center justify-center bg-[#f8f7fc]">
          <div className="text-center">
            <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium">Generando reporte PDF…</p>
            <p className="text-slate-400 text-xs mt-1">Esto puede tomar unos segundos</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <iframe src={pdfUrl} className="flex-1 w-full border-0 bg-white" title="PDF" />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#f8f7fc]">
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
