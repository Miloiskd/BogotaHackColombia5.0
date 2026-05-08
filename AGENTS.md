# Oculus Auditor - Documentación de Proyecto

## Resumen Ejecutivo

**Oculus Auditor** es un sistema de auditoría de contratos públicos colombianos del SECOP II. Detecta señales de opacidad, corrupción y malas prácticas usando un sistema híbrido de puntuación de riesgo (0-100):

- **Reglas automáticas (0-40 pts):** 9 reglas codificadas (contratación directa, valores >1B COP, objetos <25 palabras, etc.)
- **Análisis GPT-4o (0-60 pts):** Evalúa coherencia narrativa, consistencia valor-modalidad, riesgos semánticos

## Estructura del Proyecto

```
BogotaHackColombia5.0/
├── Backend/                    # FastAPI application (:8000)
│   ├── main.py                 # Entry point, CORS, middleware
│   ├── config.py               # Settings desde .env
│   ├── database.py            # SQLAlchemy (sqlite:///./oculus.db)
│   ├── models.py              # 6 tablas ORM
│   ├── requirements.txt
│   ├── routers/               # Endpoints API
│   │   ├── contracts.py       # GET /api/contracts
│   │   ├── audit.py          # POST/GET /api/audit/{id}
│   │   ├── reports.py        # PDF generation y email
│   │   ├── infographic.py    # Infografía PNG → imgbb
│   │   └── map.py            # Stats por departamento
│   └── services/
│       ├── secop_api.py       # Cliente API SECOP II (datos.gov.co)
│       ├── ai_agent.py       # Motor de auditoría híbrido
│       ├── pdf_generator.py   # ReportLab PDF
│       ├── infographic_generator.py  # Matplotlib → PNG
│       ├── email_service.py   # Resend API
│       └── gpt_service.py     # OpenAI TTS/Whisper
├── bot/                        # Bot de Telegram (proceso separado)
│   ├── telegram_bot.py        # Entry point
│   ├── requirements.txt
│   ├── handlers/
│   │   ├── text_handler.py   # Procesamiento de texto
│   │   ├── audio_handler.py  # Mensajes de voz (Whisper)
│   │   └── preference_handler.py  # /start, /ayuda, toggles
│   └── services/
│       ├── gpt_intent.py     # GPT-4o function calling
│       └── tts_service.py     # OpenAI TTS
├── frontend/                   # React + Vite (puerto 5173)
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx           # Router (Dashboard + MapPage)
│       ├── services/api.js   # Cliente Axios
│       ├── pages/
│       │   ├── Dashboard.jsx  # Panel principal
│       │   └── MapPage.jsx   # Mapa de Colombia
│       └── components/
│           ├── ContractTable/  # Tabla + filtros
│           ├── AuditPanel/    # Score gauge + alertas
│           ├── PDFViewer/
│           └── InfographicModal/
├── oculus.db                  # SQLite database
├── .env                       # Variables de entorno
└── OCULUS_AUDITOR_PLAN.md    # Plan de implementación completo
```

## Variables de Entorno Requeridas

```env
# OpenAI (GPT-4o, Whisper, TTS)
OPENAI_API_KEY=sk-...

# Telegram
TELEGRAM_BOT_TOKEN=...

#ImgBB (alojamiento de imágenes)
IMGBB_API_KEY=...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev

# SECOP API (opcional, para mayor rate limit)
SECOP_BASE_URL=https://www.datos.gov.co/resource/jbjy-vk9h.json
SECOP_APP_TOKEN=

# Database (default)
DATABASE_URL=sqlite:///./oculus.db

# Rutas
PDF_OUTPUT_DIR=./pdfs

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

## API Endpoints

### Contratos (`/api/contracts`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/contracts` | Lista con filtros y paginación |
| GET | `/api/contracts/filters/options` | Departamentos/modalidades/sectores únicos |
| GET | `/api/contracts/{id_contrato}` | Un contrato (+ auditoría si existe) |

### Auditoría (`/api/audit`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/audit/{id_contrato}` | Ejecuta u obtiene auditoría (`{"force": bool}`) |
| GET | `/api/audit/{id_contrato}` | Obtiene auditoría + alertas |
| GET | `/api/audit` | Lista todas las auditorías |

### Reportes (`/api/reports`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/reports/{id_contrato}/generate` | Genera PDF |
| GET | `/api/reports/{id_contrato}` | Verifica si PDF existe |
| POST | `/api/reports/{id_contrato}/email` | Envía PDF por email |

### Infografía (`/api/infographic`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/infographic/{id_contrato}` | Genera u obtiene existente |
| GET | `/api/infographic/{id_contrato}` | Verifica si existe |

### Mapa (`/api/map`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/map/departments` | Stats agregados por departamento |

## Modelos de Base de Datos (SQLite: `oculus.db`)

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `contracts` | Cache SECOP II | `id_contrato` (PK), `nombre_entidad`, `departamento`, `valor_del_contrato`, `modalidad_de_contratacion`, `raw_json`, `fetched_at` |
| `audits` | Resultados auditoría | `id_contrato` (FK), `score_total`, `score_reglas`, `score_gpt`, `nivel_riesgo`, `resumen_ejecutivo`, `analisis_detallado`, `conclusiones` |
| `alerts` | Señales de alerta | `id_contrato` (FK), `tipo` ("automatica"/"gpt"), `categoria`, `titulo`, `severidad`, `puntos` |
| `infographics` | URLs imgbb | `id_contrato` (FK), `imgbb_url`, `imgbb_delete_url` |
| `reports` | Rutas PDF | `id_contrato` (FK), `file_path` |
| `telegram_users` | Preferencias usuarios bot | `chat_id` (PK), `response_format` ("texto"/"audio") |

## Cómo Levantar los Servicios

### Backend (FastAPI)
```bash
.venv\Scripts\python.exe Backend/main.py
# Servidor en http://localhost:8000
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
# Servidor en http://localhost:5173
```

### Bot de Telegram
```bash
.venv\Scripts\python.exe bot/telegram_bot.py
# El bot corre en polling, sin timeout
```

## Problemas Conocidos y Soluciones

### 1. SQLAlchemy + Python 3.13
**Problema:** Error `TypeError: Can't replace canonical symbol for '__firstlineno__'` con SQLAlchemy 2.0.30 en Python 3.13.

**Solución:** Actualizar a SQLAlchemy >= 2.0.35
```bash
.venv\Scripts\pip.exe install "sqlalchemy>=2.0.35" --upgrade
```

### 2. Import en text_handler.py
**Problema:** `ModuleNotFoundError: No module named 'services.gpt_intent'` al correr desde raíz.

**Solución:** El archivo `bot/handlers/text_handler.py` tiene estos sys.path.insert al inicio:
```python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "Backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
```
El orden importa: primero Backend (para database.py, models.py), luego bot/ (para services/).

## Comunicación entre Componentes

```
┌─────────────────────┐      HTTP       ┌─────────────────────┐
│   FRONTEND (5173)   │ ─────────────── │   BACKEND (8000)    │
│   React + Vite      │  axios          │   FastAPI           │
└─────────────────────┘                 └────────┬────────────┘
                                                 │
                                          ┌──────▼────────────┐
                                          │    SECOP II API     │
                                          │   datos.gov.co      │
                                          └─────────────────────┘

┌─────────────────────┐     HTTP        ┌─────────────────────┐
│  TELEGRAM BOT       │ ─────────────── │   BACKEND (8000)    │
│  (proceso separado) │  httpx          │   (mismo SQLite DB) │
└─────────────────────┘                 └─────────────────────┘
```

- **Frontend** conecta directo al Backend por HTTP
- **Bot de Telegram** también conecta al Backend por HTTP para ejecutar auditorías/búsquedas
- **Backend** conecta a SECOP II (datos.gov.co) para datos crudos
- **Backend** conecta a OpenAI (GPT-4o, Whisper, TTS)
- **Backend** conecta a ImgBB para subir infografías
- **Backend** conecta a Resend para emails

## Niveles de Riesgo

| Score | Nivel | Color |
|-------|-------|-------|
| 0-30 | Bajo | Verde |
| 31-60 | Medio | Amarillo |
| 61-100 | Alto | Rojo |

## Comandos Git Recientes

```bash
# Estado actual
git status

# Últimos commits
git log --oneline -5
# 57644b0 Bot Telegram
# f9aff32 FIRTS COMMIT

# Ram actual
git branch
# * main
```

## Fixes Aplicados Durante el Desarrollo

1. **SQLAlchemy 2.0.30 → 2.0.49** para compatibilidad con Python 3.13
2. **sys.path en text_handler.py** para permitir imports relativos desde cualquier directorio
3. **Bot movido de Backend/telegram_bot/ a bot/** (directorio raíz) - ver archivos eliminados/creados en git status

## Pendientes / TODOs

1. README.md está corrupto o en binario (no se puede leer)
2. Migración de git incompleta (archivos de Backend/telegram_bot/ borrados pero bot/ sin trackear)
3. Rate limiting de SECOP API sin App Token (~1000 reqs/hora)
4. Frontend usa VITE_API_BASE_URL en tiempo de build, no runtime
5. La base de datos SQLite es compartida entre backend y bot (`check_same_thread=False`)