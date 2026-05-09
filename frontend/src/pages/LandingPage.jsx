import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldAlert, Brain, FileText, Map, TrendingUp, AlertTriangle, Search, ChevronDown, MessageCircle } from 'lucide-react'

const PROBLEMS = [
  {
    icon: TrendingUp,
    stat: '$117 billones',
    label: 'COP contratados anualmente',
    desc: 'Colombia ejecuta más de 117 billones de pesos en contratos públicos cada año a través del SECOP II, con supervisión limitada.',
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-100',
  },
  {
    icon: AlertTriangle,
    stat: '< 5%',
    label: 'de contratos auditados',
    desc: 'Los entes de control no tienen capacidad para revisar manualmente el volumen masivo de contratos que se firman cada día.',
    color: 'text-amber-500',
    bg: 'bg-amber-50 border-amber-100',
  },
  {
    icon: Search,
    stat: '+100.000',
    label: 'contratos activos hoy',
    desc: 'Contratación directa sin competencia, objetos vagos y pagos adelantados son señales de alerta que pasan desapercibidas.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 border-indigo-100',
  },
]

const FEATURES = [
  {
    icon: Brain,
    title: 'Auditoría con IA',
    desc: 'Motor híbrido: reglas automáticas + GPT-4o analiza cada contrato y asigna un score de riesgo de 0 a 100.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-100',
  },
  {
    icon: ShieldAlert,
    title: 'Alertas automáticas',
    desc: 'Detecta contratación directa sospechosa, objetos indefinidos, pagos adelantados e irregularidades en plazos.',
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-100',
  },
  {
    icon: Map,
    title: 'Mapa de riesgo',
    desc: 'Visualización geográfica del nivel de riesgo por departamento e identificación de redes entidad-proveedor.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-100',
  },
  {
    icon: FileText,
    title: 'Reportes PDF',
    desc: 'Genera informes ejecutivos completos con hallazgos, análisis detallado y recomendaciones listas para entes de control.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-100',
  },
  {
    icon: MessageCircle,
    title: 'Bot de Telegram',
    desc: 'Consulta contratos y auditorías por texto o por voz directamente desde Telegram. El bot entiende lenguaje natural y responde también en audio.',
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-100',
  },
]

const HOW_STEPS = [
  { num: '01', title: 'Explora contratos', desc: 'Filtra y busca entre más de 100.000 contratos del SECOP II en tiempo real.' },
  { num: '02', title: 'Audita con IA', desc: 'El motor analiza el contrato con reglas automáticas y GPT-4o en segundos.' },
  { num: '03', title: 'Recibe el score', desc: 'Obtén un score de riesgo 0–100, alertas clasificadas y resumen ejecutivo.' },
  { num: '04', title: 'Actúa', desc: 'Genera el PDF oficial, compártelo por correo o visualízalo en el mapa de riesgo.' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-[#0f0f23] overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Oculus" className="w-9 h-9 object-contain" />
          <div>
            <p className="text-[#0f0f23] font-bold text-sm tracking-wide leading-none">OCULUS</p>
            <p className="text-indigo-500 text-[10px] font-semibold tracking-widest">AUDITOR</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200"
        >
          Explorar sistema <ArrowRight size={15} />
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-indigo-100/60 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <img src="/logo.png" alt="Oculus" className="w-28 h-28 object-contain mx-auto mb-8" />

          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight text-[#0f0f23]">
            La corrupción en<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              contratos públicos
            </span>
            <br />no debería ser invisible
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
            Oculus Auditor analiza contratos del SECOP II con inteligencia artificial,
            detecta señales de riesgo y genera reportes ejecutivos en segundos —
            para que los entes de control puedan actuar antes, no después.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 text-base"
            >
              Explorar el sistema <ArrowRight size={16} />
            </button>
            <button
              onClick={() => document.getElementById('problema').scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-medium px-6 py-3.5 rounded-xl transition-colors text-base"
            >
              Ver el problema <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
          <ChevronDown size={20} className="text-slate-600" />
        </div>
      </section>

      {/* ── EL PROBLEMA ── */}
      <section id="problema" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest text-center mb-3">El Problema</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight text-[#0f0f23]">
            Millones de contratos.<br />Casi ninguno revisado.
          </h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-14 leading-relaxed">
            En Colombia, la contratación pública mueve billones de pesos cada año. La Contraloría y la Procuraduría
            no tienen la capacidad para auditar más del 5% de los contratos vigentes.
            El resultado: irregularidades que nunca se detectan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PROBLEMS.map(({ icon: Icon, stat, label, desc, color, bg }) => (
              <div key={stat} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <p className={`text-3xl font-bold mb-1 ${color}`}>{stat}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LA SOLUCIÓN ── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest text-center mb-3">La Solución</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight text-[#0f0f23]">
            Auditoría inteligente,<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              a escala masiva
            </span>
          </h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-14 leading-relaxed">
            Oculus combina reglas automáticas basadas en el Estatuto de Contratación con el análisis contextual
            de GPT-4o para evaluar cualquier contrato del SECOP II en segundos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex gap-4">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon size={20} className={color} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0f0f23] mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest text-center mb-3">Cómo funciona</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14 tracking-tight text-[#0f0f23]">
            De contrato a informe<br />en cuatro pasos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {HOW_STEPS.map(({ num, title, desc }) => (
              <div key={num} className="flex gap-5 bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                <span className="text-4xl font-bold text-indigo-200 leading-none shrink-0 font-mono">{num}</span>
                <div>
                  <h3 className="font-semibold text-[#0f0f23] mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-50 to-indigo-50">
        <div className="max-w-2xl mx-auto text-center">
          <img src="/logo.png" alt="Oculus" className="w-16 h-16 object-contain mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-[#0f0f23]">
            Más transparencia.<br />Menos impunidad.
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Explora contratos, detecta riesgos y genera reportes ejecutivos.
            La herramienta es gratuita y los datos son públicos.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-10 py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 text-base"
          >
            Entrar al sistema <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-6 px-8 border-t border-slate-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Oculus" className="w-6 h-6 object-contain opacity-50" />
          <span className="text-slate-400 text-xs font-medium">Oculus Auditor · Equipo SOCADE</span>
        </div>
        <span className="text-slate-300 text-xs">Datos: SECOP II · datos.gov.co</span>
      </footer>
    </div>
  )
}
