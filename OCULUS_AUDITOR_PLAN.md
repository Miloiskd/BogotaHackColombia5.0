# 🇨🇴 GoblA Auditor — Plan de Implementación Completo

> Agente de IA para Detección de Opacidad en Contratos Públicos SECOP II  
> Stack: FastAPI + React + Tailwind + SQLite + OpenAI + Telegram  
> Entorno: Local (demo en máquina del equipo)

---

## 📁 Estructura de Directorios

```
gobla-auditor/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── routers/
│   │   ├── contracts.py
│   │   ├── audit.py
│   │   ├── reports.py
│   │   ├── infographic.py
│   │   └── map.py
│   ├── services/
│   │   ├── secop_api.py
│   │   ├── ai_agent.py
│   │   ├── pdf_generator.py
│   │   ├── infographic_generator.py
│   │   └── email_service.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ContractTable/
│   │   │   │   ├── ContractTable.jsx
│   │   │   │   ├── ContractFilters.jsx
│   │   │   │   └── ContractRow.jsx
│   │   │   ├── AuditPanel/
│   │   │   │   ├── AuditPanel.jsx
│   │   │   │   ├── ScoreGauge.jsx
│   │   │   │   ├── AlertCard.jsx
│   │   │   │   └── ActionButtons.jsx
│   │   │   ├── ColombiaMap/
│   │   │   │   └── ColombiaMap.jsx
│   │   │   ├── PDFViewer/
│   │   │   │   └── PDFViewer.jsx
│   │   │   ├── InfographicModal/
│   │   │   │   └── InfographicModal.jsx
│   │   │   └── Navbar/
│   │   │       └── Navbar.jsx
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   │   ├── useContracts.js
│   │   │   └── useAudit.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
├── bot/
│   ├── telegram_bot.py
│   ├── handlers/
│   │   ├── text_handler.py
│   │   ├── audio_handler.py
│   │   └── preference_handler.py
│   ├── services/
│   │   ├── gpt_intent.py
│   │   └── tts_service.py
│   └── requirements.txt
├── .env
└── README.md
```

---

## 🔐 Variables de Entorno

Crear archivo `.env` en la raíz del proyecto y en `/backend/.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Telegram
TELEGRAM_BOT_TOKEN=...

# imgbb
IMGBB_API_KEY=...

# Resend (email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev

# SECOP API
SECOP_BASE_URL=https://www.datos.gov.co/resource/jbjy-vk9h.json
SECOP_APP_TOKEN=           # Opcional — obtener en datos.gov.co para mayor rate limit

# Base de datos
DATABASE_URL=sqlite:///./gobla.db

# PDF storage
PDF_OUTPUT_DIR=./pdfs

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🗄️ FASE 1 — Base de Datos (SQLite + SQLAlchemy)

### `backend/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gobla.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### `backend/models.py`

Crear los siguientes modelos SQLAlchemy:

**Tabla `contracts`** — Cache de contratos traídos de SECOP II:
```
id_contrato             TEXT PRIMARY KEY
nombre_entidad          TEXT
nit_entidad             TEXT
departamento            TEXT
ciudad                  TEXT
localizacion            TEXT
orden                   TEXT
sector                  TEXT
descripcion_del_proceso TEXT
objeto_del_contrato     TEXT
tipo_de_contrato        TEXT
modalidad_de_contratacion TEXT
justificacion_modalidad TEXT
fecha_de_firma          TEXT
fecha_de_inicio         TEXT
fecha_de_fin            TEXT
valor_del_contrato      REAL
dias_adicionados        INTEGER
habilita_pago_adelantado TEXT
proveedor_adjudicado    TEXT
documento_proveedor     TEXT
es_pyme                 TEXT
estado_contrato         TEXT
urlproceso              TEXT
raw_json                TEXT   -- JSON completo del contrato serializado
fetched_at              DATETIME DEFAULT NOW
```

**Tabla `audits`** — Resultados de auditorías:
```
id                      INTEGER PRIMARY KEY AUTOINCREMENT
id_contrato             TEXT FOREIGN KEY → contracts.id_contrato
score_total             INTEGER          -- 0 a 100
score_reglas            INTEGER          -- 0 a 40 (reglas automáticas)
score_gpt               INTEGER          -- 0 a 60 (análisis GPT)
nivel_riesgo            TEXT             -- "bajo" | "medio" | "alto"
resumen_ejecutivo       TEXT             -- Párrafo generado por GPT
analisis_detallado      TEXT             -- Análisis completo por GPT
conclusiones            TEXT             -- Recomendaciones GPT
auditado_at             DATETIME DEFAULT NOW
```

**Tabla `alerts`** — Señales de alerta detectadas:
```
id                      INTEGER PRIMARY KEY AUTOINCREMENT
id_contrato             TEXT FOREIGN KEY → contracts.id_contrato
tipo                    TEXT  -- "automatica" | "gpt"
categoria               TEXT  -- "modalidad" | "valor" | "objeto" | "tiempo" | "proveedor" | "pago"
titulo                  TEXT  -- Ej: "Contratación directa sin licitación"
descripcion             TEXT  -- Explicación detallada de la alerta
severidad               TEXT  -- "alta" | "media" | "baja"
puntos                  INTEGER -- Puntos que aportó al score
```

**Tabla `infographics`** — Infografías generadas:
```
id                      INTEGER PRIMARY KEY AUTOINCREMENT
id_contrato             TEXT FOREIGN KEY → contracts.id_contrato
imgbb_url               TEXT             -- URL pública en imgbb
imgbb_delete_url        TEXT
generated_at            DATETIME DEFAULT NOW
```

**Tabla `reports`** — PDFs generados:
```
id                      INTEGER PRIMARY KEY AUTOINCREMENT
id_contrato             TEXT FOREIGN KEY → contracts.id_contrato
file_path               TEXT             -- Ruta local del PDF
generated_at            DATETIME DEFAULT NOW
```

**Tabla `telegram_users`** — Preferencias del bot:
```
chat_id                 TEXT PRIMARY KEY
username                TEXT
response_format         TEXT DEFAULT "texto"  -- "texto" | "audio"
created_at              DATETIME DEFAULT NOW
updated_at              DATETIME DEFAULT NOW
```

Al final de `models.py` llamar `Base.metadata.create_all(bind=engine)` para crear las tablas automáticamente.

---

## 🌐 FASE 2 — Backend FastAPI

### `backend/requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
httpx==0.27.0
openai==1.30.0
reportlab==4.2.0
matplotlib==3.9.0
pillow==10.3.0
requests==2.32.0
resend==2.0.0
python-dotenv==1.0.1
python-multipart==0.0.9
aiofiles==23.2.1
```

### `backend/config.py`

Cargar todas las variables de entorno con `python-dotenv`. Exponer como atributos de una clase `Settings`. Usar `lru_cache` para singleton.

### `backend/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import contracts, audit, reports, infographic, map
import os

app = FastAPI(title="GoblA Auditor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir PDFs generados como archivos estáticos
os.makedirs("pdfs", exist_ok=True)
app.mount("/pdfs", StaticFiles(directory="pdfs"), name="pdfs")

app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(infographic.router, prefix="/api/infographic", tags=["infographic"])
app.include_router(map.router, prefix="/api/map", tags=["map"])
```

---

### `backend/services/secop_api.py`

Función `fetch_contracts(page, page_size, filters)`:
- Construir query SoQL para la API de Socrata: `https://www.datos.gov.co/resource/jbjy-vk9h.json`
- Parámetros soportados:
  - `$limit` = page_size (default 20)
  - `$offset` = (page - 1) * page_size
  - `$order` = campo de ordenamiento + dirección
  - `$where` = cláusula SoQL con los filtros:
    - `departamento = 'Antioquia'`
    - `fecha_de_firma >= '2024-01-01'`
    - `valor_del_contrato >= 1000000`
    - `modalidad_de_contratacion = 'Contratación directa'`
    - `upper(nombre_entidad) like upper('%SALUD%')`
- Header `X-App-Token` con `SECOP_APP_TOKEN` si está disponible
- Retornar lista de contratos + total count (usando `$select=count(*) as total` en query separada)
- Guardar/actualizar contratos en tabla `contracts` (upsert por `id_contrato`)

Función `fetch_contract_by_id(id_contrato)`:
- Buscar primero en SQLite. Si existe y `fetched_at` < 24h, retornar de cache
- Si no, llamar API con `$where=id_contrato='CO1.PCCNTR.XXXXX'`

---

### `backend/routers/contracts.py`

```
GET /api/contracts
  Query params:
    page (int, default=1)
    page_size (int, default=20)
    departamento (str, optional)
    ciudad (str, optional)
    fecha_inicio (date, optional)
    fecha_fin (date, optional)
    valor_min (float, optional)
    valor_max (float, optional)
    modalidad (str, optional)
    sector (str, optional)
    nombre_entidad (str, optional)
    estado_contrato (str, optional)
    orden_campo (str, default="fecha_de_firma")
    orden_dir (str, default="DESC")
  Response: { contracts: [...], total: int, page: int, pages: int }

GET /api/contracts/{id_contrato}
  Response: contrato completo + audit si existe (null si no)

GET /api/contracts/filters/options
  Response: listas únicas de departamentos, modalidades, sectores
  (para poblar dropdowns del frontend — traer de SQLite si hay cache, si no de API)
```

---

### `backend/services/ai_agent.py`

Esta es la pieza central del sistema. Implementar la lógica híbrida:

**Paso 1 — Reglas automáticas `apply_automatic_rules(contract)`:**

Evaluar las siguientes señales y retornar lista de alertas + puntos:

| Condición | Título Alerta | Severidad | Puntos |
|---|---|---|---|
| `modalidad_de_contratacion` contiene "directa" | Contratación directa sin proceso competitivo | alta | 15 |
| `int(dias_adicionados) > 0` | Contrato con días adicionados (posible modificación irregular) | media | 10 |
| `habilita_pago_adelantado == "Si"` | Habilita pago adelantado — riesgo de anticipo sin garantía | alta | 8 |
| `len(objeto_del_contrato.split()) < 25` | Objeto del contrato con descripción muy escasa (opacidad) | alta | 10 |
| `float(valor_del_contrato) > 1_000_000_000` y modalidad directa | Contrato de alto valor adjudicado sin licitación | alta | 15 |
| `float(valor_del_contrato) > 500_000_000` y modalidad "mínima cuantía" | Valor elevado para modalidad de mínima cuantía | media | 8 |
| `es_pyme == "No"` y modalidad directa | Proveedor grande adjudicado por contratación directa | baja | 5 |
| `justificacion_modalidad` contiene "servicios profesionales" y valor > 100M | Justificación genérica de servicios profesionales en monto alto | media | 7 |
| `fecha_de_inicio < fecha_de_firma` | Contrato inició antes de ser firmado | alta | 12 |
| `duracion_contrato < 15 días` y valor > 50M | Duración sospechosamente corta para el valor contratado | media | 6 |

**Paso 2 — Análisis GPT `analyze_with_gpt(contract, automatic_alerts)`:**

Llamar a `gpt-4o` con el siguiente system prompt:

```
Eres un auditor experto en contratación pública colombiana especializado en detectar 
señales de opacidad, corrupción y malas prácticas en contratos del SECOP II.
Tu tarea es analizar el contrato proporcionado y:
1. Asignar un score de riesgo GPT entre 0 y 60 puntos
2. Identificar señales de alerta adicionales no cubiertas por las reglas automáticas
3. Generar un resumen ejecutivo del contrato (3-4 oraciones)
4. Generar un análisis detallado por categorías (modalidad, valor, objeto, proveedor, tiempo)
5. Generar conclusiones y recomendaciones (3-4 oraciones)

Responde ÚNICAMENTE en JSON con esta estructura exacta:
{
  "score_gpt": <número 0-60>,
  "resumen_ejecutivo": "<texto>",
  "analisis_detallado": "<texto>",
  "conclusiones": "<texto>",
  "alertas_adicionales": [
    {
      "categoria": "<categoria>",
      "titulo": "<titulo>",
      "descripcion": "<descripcion>",
      "severidad": "<alta|media|baja>",
      "puntos": <número>
    }
  ]
}

Criterios para el score GPT (0-60):
- 0-15: Contrato transparente, justificaciones sólidas, objeto claro
- 16-35: Señales menores de opacidad, requiere seguimiento
- 36-60: Múltiples señales graves, posible irregularidad
```

El user message incluirá el JSON completo del contrato + las alertas automáticas ya detectadas.

**Paso 3 — Consolidar y guardar:**
- `score_total = min(100, score_reglas + score_gpt)`
- `nivel_riesgo`: bajo (0-30), medio (31-60), alto (61-100)
- Guardar en tablas `audits` y `alerts`
- Retornar resultado completo

**Función pública `audit_contract(id_contrato, db, force=False)`:**
- Si existe auditoría en DB y `force=False`, retornar la guardada
- Si no existe o `force=True`, ejecutar pasos 1, 2 y 3

---

### `backend/routers/audit.py`

```
POST /api/audit/{id_contrato}
  Body: { force: bool = false }
  Response: AuditResult completo con alertas

GET /api/audit/{id_contrato}
  Response: AuditResult si existe, 404 si no

GET /api/audit/
  Response: lista de todas las auditorías guardadas (para el mapa y dashboard)
```

---

### `backend/services/infographic_generator.py`

Generar PNG con `matplotlib` y `Pillow`. La infografía debe tener estas secciones:

**Layout (1200x800px, fondo oscuro estilo dashboard):**

1. **Header** — Logo "GoblA Auditor", nombre de la entidad, número de contrato
2. **Gauge circular grande** (centro-izquierda) — Score de 0 a 100 con colores:
   - Verde (#22c55e) para 0-30
   - Amarillo (#eab308) para 31-60
   - Rojo (#ef4444) para 61-100
   - Usar `matplotlib` patches/arcs para dibujar el arco del gauge
3. **Datos clave** (centro-derecha) — Cards con:
   - Valor del contrato (formateado en pesos colombianos)
   - Modalidad de contratación
   - Tipo de contrato
   - Departamento / Ciudad
   - Proveedor adjudicado
   - Fecha de firma
4. **Alertas detectadas** (parte inferior izquierda) — Barras horizontales por categoría con íconos de severidad (⚠️ alta, 🔶 media, 🔵 baja)
5. **Texto narrativo** (parte inferior derecha) — El `resumen_ejecutivo` de GPT en caja de texto
6. **Footer** — "Generado por GoblA Auditor | Datos: SECOP II"

Después de generar el PNG en memoria con `io.BytesIO`:
- Subir a imgbb usando su API: `POST https://api.imgbb.com/1/upload`
- Guardar `url` y `delete_url` en tabla `infographics`
- Retornar la URL pública

**Función pública `get_or_generate_infographic(id_contrato, db)`:**
- Verificar si ya existe en tabla `infographics` → retornar URL guardada
- Si no existe → generar, subir, guardar y retornar

---

### `backend/services/pdf_generator.py`

Usar `reportlab` para generar el PDF con las siguientes secciones fijas:

**Sección 1 — Portada:**
- Logo GoblA Auditor (grande, centrado)
- Título: "INFORME DE AUDITORÍA DE CONTRATO PÚBLICO"
- Nombre de la entidad contratante
- Número de contrato (`id_contrato`)
- Nivel de riesgo con color semáforo (ALTO / MEDIO / BAJO)
- Fecha de generación del reporte
- Línea separadora decorativa

**Sección 2 — Resumen Ejecutivo:**
- Recuadro con fondo gris claro
- Texto del `resumen_ejecutivo` generado por GPT
- Mini-tabla con: Valor, Modalidad, Tipo de Contrato, Proveedor, Departamento

**Sección 3 — Score de Riesgo:**
- Score total (número grande con color)
- Desglose: Score por Reglas Automáticas + Score GPT
- Barra de progreso visual coloreada
- Tabla: nivel de riesgo, interpretación, acción recomendada

**Sección 4 — Señales de Alerta Detectadas:**
- Tabla con columnas: Categoría | Título | Severidad | Descripción | Puntos
- Filas con color de fondo según severidad (rojo claro / amarillo claro / azul claro)
- Separadas en dos grupos: "Alertas Automáticas" y "Alertas por Análisis IA"

**Sección 5 — Análisis Detallado por Categoría:**
- Subtítulos por categoría: Modalidad, Valor, Objeto, Proveedor, Tiempos
- Texto del `analisis_detallado` de GPT formateado en párrafos

**Sección 6 — Conclusiones y Recomendaciones:**
- Texto del campo `conclusiones` de GPT
- Recuadro de "Próximos pasos sugeridos"

**Sección 7 — Ficha Técnica del Contrato:**
- Tabla completa con todos los campos relevantes del contrato en dos columnas
- Incluir URL del proceso SECOP como link

Guardar PDF en `pdfs/{id_contrato}.pdf`. Registrar en tabla `reports`.

---

### `backend/routers/reports.py`

```
POST /api/reports/{id_contrato}/generate
  Genera el PDF (o retorna el path si ya existe)
  Response: { file_path, url, generated_at }

GET /api/reports/{id_contrato}
  Response: { exists: bool, url: string | null, generated_at }

POST /api/reports/{id_contrato}/email
  Body: { email: string }
  Enviar PDF por correo con Resend
  Response: { success: bool, message_id }
```

### `backend/services/email_service.py`

Usar SDK de Resend (`import resend`). El correo debe incluir:
- Asunto: `GoblA Auditor — Reporte de Auditoría: {id_contrato}`
- Cuerpo HTML con resumen del score y nivel de riesgo
- PDF adjunto como attachment (leer el archivo como bytes y adjuntar con `content` en base64)

---

### `backend/routers/infographic.py`

```
POST /api/infographic/{id_contrato}
  Genera o retorna infografía existente
  Response: { imgbb_url, generated_at }

GET /api/infographic/{id_contrato}
  Response: { exists: bool, imgbb_url: string | null }
```

---

### `backend/routers/map.py`

```
GET /api/map/departments
  Response: lista de objetos {
    departamento: string,
    total_auditados: int,
    alto_riesgo: int,
    medio_riesgo: int,
    bajo_riesgo: int,
    score_promedio: float,
    color_intensity: float  -- 0.0 (verde) a 1.0 (rojo), calculado como alto_riesgo/total_auditados
  }
  Fuente: query agregada sobre tabla audits JOIN contracts
```

---

## 🎨 FASE 3 — Frontend React + Tailwind

### Instalación y configuración

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install axios react-simple-maps react-tooltip recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### `frontend/src/services/api.js`

Crear instancia de Axios con `baseURL = import.meta.env.VITE_API_BASE_URL`.
Exportar funciones:
- `getContracts(params)` → GET /api/contracts
- `getContract(id)` → GET /api/contracts/{id}
- `getFilterOptions()` → GET /api/contracts/filters/options
- `auditContract(id, force)` → POST /api/audit/{id}
- `getAudit(id)` → GET /api/audit/{id}
- `getAllAudits()` → GET /api/audit/
- `generateInfographic(id)` → POST /api/infographic/{id}
- `generateReport(id)` → POST /api/reports/{id}/generate
- `getReport(id)` → GET /api/reports/{id}
- `sendReportByEmail(id, email)` → POST /api/reports/{id}/email
- `getDepartmentStats()` → GET /api/map/departments

---

### `frontend/src/pages/Dashboard.jsx`

Layout de dos columnas:
- **Columna principal (70%):** `<ContractFilters />` encima de `<ContractTable />`
- **Columna lateral (30%):** `<ColombiaMap />`

Cuando el usuario selecciona un contrato en la tabla:
- Abrir `<AuditPanel />` como panel deslizante desde la derecha (drawer)
- El drawer muestra los datos del contrato y el panel de auditoría

Estado global necesario (usar `useState` + prop drilling o `useContext`):
- `selectedContract` — contrato seleccionado actualmente
- `auditData` — resultado de auditoría del contrato seleccionado
- `departmentFilter` — departamento seleccionado desde el mapa

---

### `frontend/src/components/ContractFilters/ContractFilters.jsx`

Barra de filtros con los siguientes controles (todos opcionales, en una fila horizontal con scroll):

| Campo | Tipo | Placeholder |
|---|---|---|
| Departamento | Select (opciones de API) | Todos los departamentos |
| Ciudad | Text input | Buscar ciudad... |
| Fecha inicio | Date picker | Desde |
| Fecha fin | Date picker | Hasta |
| Valor mínimo | Number input | Valor mínimo COP |
| Valor máximo | Number input | Valor máximo COP |
| Modalidad | Select | Todas las modalidades |
| Sector | Select | Todos los sectores |
| Entidad | Text input | Buscar entidad... |
| Estado | Select | Todos los estados |
| Ordenar por | Select | Fecha de firma, Valor, Entidad |
| Dirección | Toggle ASC/DESC | |

Botón "Limpiar filtros" que resetea todos.
Al cambiar cualquier filtro → llamar `onFilterChange(filters)` con debounce de 400ms.

---

### `frontend/src/components/ContractTable/ContractTable.jsx`

Tabla con las siguientes columnas visibles:

| Columna | Campo | Formato |
|---|---|---|
| Entidad | `nombre_entidad` | Truncar a 35 chars con tooltip |
| Contrato | `id_contrato` | Badge azul, monospace |
| Objeto | `descripcion_del_proceso` | Truncar a 60 chars con tooltip |
| Modalidad | `modalidad_de_contratacion` | Badge coloreado |
| Valor | `valor_del_contrato` | Formato pesos colombianos ($ X.XXX.XXX) |
| Departamento | `departamento` | |
| Fecha firma | `fecha_de_firma` | DD/MM/YYYY |
| Estado | `estado_contrato` | Badge (verde=Activo, gris=Cerrado, rojo=Terminado) |
| Auditado | — | Ícono ✅ si tiene auditoría guardada, ⬜ si no |

Funcionalidades:
- Click en fila → seleccionar contrato y abrir AuditPanel
- Fila resaltada con fondo diferente al estar seleccionada
- Paginación en la parte inferior: botones Anterior / Siguiente + indicador "Página X de Y (Z contratos)"
- Loading skeleton mientras carga
- Mensaje "No se encontraron contratos" si array vacío

---

### `frontend/src/components/AuditPanel/AuditPanel.jsx`

Drawer deslizante desde la derecha (ancho 480px en desktop). Secciones:

**Header del drawer:**
- Nombre de la entidad
- ID del contrato con link a SECOP (abre en nueva pestaña)
- Botón X para cerrar

**Sección "Datos del Contrato":**
- Grid 2 columnas con: Valor, Modalidad, Tipo, Proveedor, Departamento, Fecha firma, Estado
- Objeto del contrato en caja expandible

**Sección "Auditoría de Riesgo":**
Si no hay auditoría aún:
- Botón grande "🔍 Auditar este contrato" (color azul primario)
- Al hacer click → loading spinner → mostrar resultado

Si ya hay auditoría:
- `<ScoreGauge score={audit.score_total} nivel={audit.nivel_riesgo} />`
- Lista de `<AlertCard />` para cada alerta
- Texto del resumen ejecutivo
- Botón "Re-auditar" (secundario, pequeño)

**Sección "Acciones":**
Solo visible si ya existe auditoría:
- `📄 Generar/Ver PDF` — abre `<PDFViewer />`
- `🖼️ Ver Infografía` — abre `<InfographicModal />`
- `📧 Enviar por email` — abre modal con input de email

---

### `frontend/src/components/AuditPanel/ScoreGauge.jsx`

Gauge semicircular usando SVG puro:
- Arco de fondo (gris claro)
- Arco de color proporcional al score (verde/amarillo/rojo)
- Número grande en el centro con el score
- Etiqueta del nivel de riesgo debajo
- Animación suave al aparecer (transición CSS de 1 segundo)

Colores:
- 0-30: `#22c55e` (verde)
- 31-60: `#eab308` (amarillo)
- 61-100: `#ef4444` (rojo)

---

### `frontend/src/components/AuditPanel/AlertCard.jsx`

Tarjeta compacta por cada alerta con:
- Ícono de severidad: 🔴 alta / 🟡 media / 🔵 baja
- Título de la alerta en negrita
- Descripción expandible (truncada, botón "ver más")
- Categoría como badge (modalidad / valor / objeto / proveedor / tiempo / pago)
- Puntos aportados al score (pequeño, a la derecha)

---

### `frontend/src/components/ColombiaMap/ColombiaMap.jsx`

Usar `react-simple-maps` con GeoJSON de departamentos de Colombia.

Descargar el GeoJSON de: `https://raw.githubusercontent.com/miguel-mx/colombia-geojson/main/colombia-departamentos.json`  
(O usar cualquier GeoJSON oficial de departamentos colombianos con el campo `NOMBRE_DPT`)

Lógica de color por departamento:
```javascript
// Para cada departamento, calcular color basado en color_intensity (0.0 verde → 1.0 rojo)
// Si no tiene contratos auditados → color gris claro (#e5e7eb)
// Si color_intensity < 0.3 → tonos verdes (#bbf7d0 → #16a34a)
// Si 0.3 ≤ color_intensity < 0.6 → tonos amarillos (#fef08a → #ca8a04)
// Si color_intensity ≥ 0.6 → tonos rojos (#fecaca → #dc2626)
// Usar interpolación lineal dentro de cada rango
```

Interactividad:
- Hover: tooltip con nombre del depto + stats (X auditados, Y alto riesgo)
- Click: emitir evento `onDepartmentClick(departamento)` que filtra la tabla
- Departamento seleccionado: borde más grueso y opacidad diferente

Leyenda debajo del mapa: Verde = Bajo riesgo / Amarillo = Riesgo medio / Rojo = Alto riesgo / Gris = Sin auditorías

---

### `frontend/src/components/PDFViewer/PDFViewer.jsx`

Modal fullscreen con:
- `<iframe src={pdfUrl} />` ocupando el 90% del modal
- Botón "⬇️ Descargar PDF" (link directo al archivo)
- Botón "📧 Enviar por correo" (abre sub-modal con input de email)
- Botón X para cerrar

Si el PDF no ha sido generado aún:
- Mostrar botón "Generar reporte PDF"
- Loading mientras genera

---

### `frontend/src/components/InfographicModal/InfographicModal.jsx`

Modal con:
- Imagen de la infografía (`<img src={imgbbUrl} />`) con ancho completo
- Botón "⬇️ Descargar imagen"
- Botón X para cerrar

Si la infografía no existe aún:
- Botón "Generar infografía"
- Loading con mensaje "Generando infografía con IA..."

---

## 🤖 FASE 4 — Bot de Telegram

### `bot/requirements.txt`

```
python-telegram-bot==21.3
openai==1.30.0
httpx==0.27.0
sqlalchemy==2.0.30
python-dotenv==1.0.1
aiofiles==23.2.1
```

### Arquitectura del bot

El bot corre como proceso independiente (no dentro de FastAPI). Se comunica con el backend a través de llamadas HTTP internas (`http://localhost:8000/api/...`).

Para las preferencias de usuario usa directamente la tabla `telegram_users` de SQLite (la misma DB compartida con el backend).

### `bot/telegram_bot.py`

Configurar `Application` con `ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()`.

Handlers a registrar:
- `CommandHandler("start", start_handler)`
- `CommandHandler("ayuda", help_handler)`
- `MessageHandler(filters.TEXT & ~filters.COMMAND, text_message_handler)`
- `MessageHandler(filters.VOICE | filters.AUDIO, audio_message_handler)`

### `bot/handlers/text_handler.py`

Flujo de `text_message_handler(update, context)`:

1. Obtener `chat_id` y `text` del mensaje
2. Verificar/crear usuario en `telegram_users`
3. Llamar `process_natural_language(text, chat_id)` → obtiene `intent + params`
4. Ejecutar la acción correspondiente → obtener respuesta
5. Según `response_format` del usuario:
   - "texto" → `update.message.reply_text(respuesta)`
   - "audio" → generar audio con OpenAI TTS → `update.message.reply_voice(audio_bytes)`

### `bot/handlers/audio_handler.py`

Flujo de `audio_message_handler(update, context)`:

1. Descargar el archivo de voz: `await update.message.voice.get_file()` → `await file.download_as_bytearray()`
2. Convertir a formato compatible (ogg → bytes)
3. Llamar Whisper API: `openai.audio.transcriptions.create(model="whisper-1", file=audio_bytes)`
4. Obtener texto transcrito
5. Pasar el texto a `text_message_handler` con el mismo `update` y `context`

### `bot/services/gpt_intent.py`

Función `process_natural_language(text, chat_id)` usando GPT-4o con **function calling**.

Definir las siguientes funciones (tools) para que GPT seleccione:

```json
[
  {
    "name": "buscar_contratos",
    "description": "Busca contratos en SECOP II con filtros opcionales",
    "parameters": {
      "departamento": "string (opcional)",
      "ciudad": "string (opcional)", 
      "valor_min": "number (opcional)",
      "valor_max": "number (opcional)",
      "modalidad": "string (opcional)",
      "entidad": "string (opcional)",
      "fecha_inicio": "string YYYY-MM-DD (opcional)",
      "fecha_fin": "string YYYY-MM-DD (opcional)",
      "limite": "number (default 5, max 10)"
    }
  },
  {
    "name": "auditar_contrato",
    "description": "Realiza o consulta la auditoría de riesgo de un contrato específico",
    "parameters": {
      "id_contrato": "string (requerido)"
    }
  },
  {
    "name": "obtener_infografia",
    "description": "Genera o retorna la infografía de riesgo de un contrato",
    "parameters": {
      "id_contrato": "string (requerido)"
    }
  },
  {
    "name": "contratos_alto_riesgo",
    "description": "Obtiene contratos auditados con alto score de riesgo, opcionalmente por región",
    "parameters": {
      "departamento": "string (opcional)",
      "limite": "number (default 5)"
    }
  },
  {
    "name": "cambiar_preferencia",
    "description": "Cambia la preferencia de respuesta del usuario entre texto y audio",
    "parameters": {
      "formato": "texto | audio"
    }
  }
]
```

System prompt para el intent: 
> "Eres el asistente del sistema GoblA Auditor, que analiza contratos públicos colombianos del SECOP II. Interpreta el mensaje del usuario y determina qué función ejecutar con qué parámetros. Siempre responde con una function call."

Después de obtener el resultado de la función (llamada al backend), hacer una segunda llamada a GPT-4o para generar la **respuesta en español natural** basada en los datos obtenidos.

### `bot/services/tts_service.py`

Función `text_to_speech(text)`:
- Llamar `openai.audio.speech.create(model="tts-1", voice="nova", input=text)`
- Retornar bytes del audio MP3
- Limitar texto a 4096 caracteres (límite de TTS)
- Si el texto es muy largo, resumir con GPT antes de convertir a audio

### `bot/handlers/preference_handler.py`

Al `/start`:
1. Registrar usuario en `telegram_users` si no existe
2. Enviar mensaje de bienvenida con botones inline:
   - `[📝 Respuestas en texto]` `[🔊 Respuestas en audio]`
3. Al hacer click en botón → actualizar `response_format` en DB → confirmar

Mensajes de ejemplo para el bot (incluir en `/ayuda`):
```
🔍 Buscar contratos:
"¿Qué contratos hay en Antioquia del sector salud?"
"Muéstrame contratos de más de 500 millones en Bogotá"

📊 Auditorías:
"Audita el contrato CO1.PCCNTR.1738303"
"¿Cuál es el score de riesgo del contrato X?"

🖼️ Infografías:
"Dame la infografía del contrato CO1.PCCNTR.1738303"

⚠️ Contratos de riesgo:
"¿Cuáles son los contratos de mayor riesgo en Valle del Cauca?"
"Muéstrame contratos sospechosos de este mes"
```

---

## 🎯 FASE 5 — Criterios de Score de Riesgo (Resumen)

### Tabla completa de reglas automáticas (0-40 puntos):

| # | Condición | Campo evaluado | Severidad | Puntos |
|---|---|---|---|---|
| 1 | Modalidad = Contratación Directa | `modalidad_de_contratacion` | Alta | 15 |
| 2 | Días adicionados > 0 | `dias_adicionados` | Media | 10 |
| 3 | Pago adelantado habilitado | `habilita_pago_adelantado` | Alta | 8 |
| 4 | Objeto < 25 palabras | `objeto_del_contrato` | Alta | 10 |
| 5 | Valor > 1.000M + modalidad directa | `valor_del_contrato` + `modalidad` | Alta | 15 |
| 6 | Valor > 500M + mínima cuantía | `valor_del_contrato` + `modalidad` | Media | 8 |
| 7 | Proveedor no PYME + contratación directa | `es_pyme` + `modalidad` | Baja | 5 |
| 8 | Justificación genérica "servicios profesionales" + alto valor | `justificacion_modalidad` | Media | 7 |
| 9 | Inicio antes de firma | `fecha_de_inicio` < `fecha_de_firma` | Alta | 12 |

Los puntos se **suman** (no se duplican), con tope máximo de 40 para las reglas automáticas.

### Score GPT (0-60 puntos):
El modelo evalúa: coherencia narrativa del objeto, consistencia valor-modalidad, riesgos semánticos en la descripción, patrones de adjudicación, y señales contextuales no estructuradas.

### Clasificación final:
| Rango | Nivel | Color | Acción sugerida |
|---|---|---|---|
| 0 – 30 | 🟢 BAJO | Verde | Monitoreo rutinario |
| 31 – 60 | 🟡 MEDIO | Amarillo | Revisión por supervisor |
| 61 – 100 | 🔴 ALTO | Rojo | Investigación prioritaria |

---

## 🚀 FASE 6 — Ejecución Local (Demo)

### Pasos para levantar el sistema:

```bash
# 1. Clonar e instalar dependencias
cd backend
pip install -r requirements.txt

cd ../frontend
npm install

cd ../bot
pip install -r requirements.txt

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con las API keys

# 3. Levantar backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 4. Levantar frontend
cd frontend
npm run dev  # → http://localhost:5173

# 5. Levantar bot de Telegram
cd bot
python telegram_bot.py
```

### Verificación de que todo funciona:
- [ ] `GET http://localhost:8000/api/contracts?page=1` retorna 20 contratos
- [ ] Seleccionar un contrato y hacer click en "Auditar" → recibir score
- [ ] El mapa de Colombia colorea departamentos con auditorías
- [ ] Generar PDF → visualizar en iframe
- [ ] Generar infografía → imagen aparece en modal
- [ ] Bot de Telegram responde a "busca contratos en Antioquia"
- [ ] Bot procesa nota de voz y responde en audio (si preferencia = audio)

---

## 📦 Dependencias Externas y Servicios Requeridos

| Servicio | Propósito | Obtener en |
|---|---|---|
| OpenAI API Key | GPT-4o (auditoría + bot) + Whisper (STT) + TTS | platform.openai.com |
| Telegram Bot Token | Bot de Telegram | @BotFather en Telegram |
| imgbb API Key | Almacenar infografías como imágenes públicas | api.imgbb.com |
| Resend API Key | Envío de PDFs por correo | resend.com |
| SECOP App Token | Aumentar rate limit de la API (opcional) | datos.gov.co/profile |

---

## 📝 Notas de Implementación

1. **Persistencia primero**: Antes de llamar a cualquier API externa (OpenAI, imgbb), verificar siempre si el resultado ya existe en SQLite.

2. **Manejo de errores**: Todos los endpoints deben retornar errores descriptivos en JSON `{ "error": "...", "detail": "..." }` y el frontend debe mostrarlos como notificaciones toast.

3. **Formato de valores monetarios**: Los valores de la API vienen como string (ej: `"17897916"`). Siempre parsear a float/int en el backend antes de evaluar reglas.

4. **Campos opcionales**: Muchos campos pueden venir como `"No Definido"` o `"No definido"`. Normalizar a `None` en el backend.

5. **GeoJSON del mapa**: El campo `departamento` en la API puede tener nombres como `"Distrito Capital de Bogotá"`. Crear un diccionario de mapeo entre nombres de la API y nombres del GeoJSON.

6. **Rate limiting SECOP**: Sin app token, el límite es ~1000 requests/hora. Usar cache en SQLite agresivamente.

7. **PDFs**: Guardar en carpeta `backend/pdfs/`. El backend los sirve como archivos estáticos en `/pdfs/{id_contrato}.pdf`.

8. **Bot y DB compartida**: El bot usa la misma `gobla.db`. Usar la misma `SessionLocal` de SQLAlchemy con `check_same_thread=False`.
```
