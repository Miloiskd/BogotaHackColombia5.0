import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import contracts, audit, reports, infographic, map, users

logger = logging.getLogger(__name__)


SEED_CONTRACT_IDS = [
    "CO1.PCCNTR.743469",   # Bogotá  – contratación directa $1.7T + 578 días adicionados
    "CO1.PCCNTR.239801",   # Bogotá  – contratación directa $13B  + 4260 días adicionados
    "CO1.PCCNTR.3658601",  # Chocó   – $393B + 1055 días adicionados
    "CO1.PCCNTR.5538186",  # Bogotá  – contratación directa $745B + 365 días
    "CO1.PCCNTR.2377638",  # La Guajira – objeto "No definido" + pago adelantado
    "CO1.PCCNTR.7861232",  # Cesar   – objeto "No definido" + pago adelantado
    "CO1.PCCNTR.7171517",  # Antioquia  – contratación directa $587B + 153 días
    "CO1.PCCNTR.3858419",  # Cesar   – $607B + 150 días
    "CO1.PCCNTR.7356309",  # Magdalena  – contratación directa $30B + 181 días
    "CO1.PCCNTR.692724",   # Bogotá  – obra policía $178B + pago adelantado
    "CO1.PCCNTR.7030628",  # Caldas  – $124B + pago adelantado + 101 días
    "CO1.PCCNTR.3950507",  # Caldas  – cable aéreo $103B + pago adelantado + 228 días
]


async def _auto_seed():
    """En el primer arranque, audita automáticamente los contratos de interés."""
    try:
        from database import SessionLocal
        from models import Audit as AuditModel, Contract
        from services.secop_api import fetch_contract_by_id
        from services.ai_agent import audit_contract
        from config import get_settings

        db = SessionLocal()
        try:
            already = {
                row.id_contrato
                for row in db.query(AuditModel.id_contrato).all()
            }
            pending = [cid for cid in SEED_CONTRACT_IDS if cid not in already]
            if not pending:
                logger.info("Auto-seed omitido: todos los contratos ya están auditados.")
                return

            logger.info(f"Auto-seed: auditando {len(pending)} contratos...")
            settings = get_settings()
            _VALID_COLS = {c.name for c in Contract.__table__.columns}

            for cid in pending:
                try:
                    raw = await fetch_contract_by_id(cid, app_token=settings.SECOP_APP_TOKEN or None)
                    if not raw:
                        logger.warning(f"Auto-seed: contrato {cid} no encontrado en SECOP, omitido.")
                        continue

                    c_data = {k: v for k, v in raw.items() if k in _VALID_COLS}
                    c_data["raw_json"] = json.dumps(raw, ensure_ascii=False)

                    existing = db.query(Contract).filter(Contract.id_contrato == cid).first()
                    if existing:
                        for k, v in c_data.items():
                            if k != "id_contrato":
                                setattr(existing, k, v)
                        existing.fetched_at = datetime.utcnow()
                    else:
                        db.add(Contract(**c_data))
                    db.commit()

                    audit_contract(raw, db, force=False)
                    logger.info(f"Auto-seed: auditado {cid}")
                except Exception as e:
                    logger.error(f"Auto-seed: error en {cid}: {e}")

            logger.info("Auto-seed completado.")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Auto-seed falló: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_auto_seed())
    yield


app = FastAPI(title="Oculus Auditor API", version="1.0.0", lifespan=lifespan)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_pdf_dir = os.getenv("PDF_OUTPUT_DIR", "./pdfs")
os.makedirs(_pdf_dir, exist_ok=True)
app.mount("/pdfs", StaticFiles(directory=_pdf_dir), name="pdfs")

app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(infographic.router, prefix="/api/infographic", tags=["infographic"])
app.include_router(map.router, prefix="/api/map", tags=["map"])
app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.get("/")
async def root():
    return {"name": "Oculus Auditor API", "version": "1.0.0", "status": "running"}
