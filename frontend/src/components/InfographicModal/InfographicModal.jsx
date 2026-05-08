import { X, Download, Image } from 'lucide-react'

export default function InfographicModal({ imgbbUrl, onClose, onGenerate, generating }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-black/20 flex flex-col animate-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0eef8]">
          <h3 className="text-sm font-semibold text-[#0f0f23] flex items-center gap-2">
            <Image size={16} className="text-indigo-500" /> Infografía de Riesgo
          </h3>
          <div className="flex items-center gap-4">
            {imgbbUrl && (
              <a
                href={imgbbUrl}
                target="_blank"
                rel="noopener noreferrer"
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
          <div className="flex-1 flex items-center justify-center p-20 bg-[#f8f7fc]">
            <div className="text-center">
              <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm font-medium">Generando infografía con IA…</p>
              <p className="text-slate-400 text-xs mt-1">Puede tardar hasta 30 segundos</p>
            </div>
          </div>
        ) : imgbbUrl ? (
          <div className="flex-1 overflow-auto p-6 bg-[#f8f7fc] flex items-center justify-center">
            <img src={imgbbUrl} alt="Infografía" className="max-w-full max-h-[70vh] rounded-xl shadow-lg" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 bg-[#f8f7fc]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <Image size={28} className="text-indigo-400" />
              </div>
              <p className="text-slate-600 text-sm font-semibold mb-1">La infografía no existe aún</p>
              <p className="text-slate-400 text-xs mb-5">Se generará una imagen visual del análisis de riesgo</p>
              <button
                onClick={onGenerate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
              >
                Generar infografía
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
