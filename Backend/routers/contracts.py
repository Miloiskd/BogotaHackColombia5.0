import json
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Contract, Audit
from services.secop_api import fetch_contracts, fetch_contract_by_id, fetch_filter_options
from config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


_VALID_COLS = {c.name for c in Contract.__table__.columns}


def _save_contract(c: dict, db: Session):
    raw = c.pop("raw_json_raw", c)
    c.pop("_has_audit", None)
    cid = c.get("id_contrato")
    if not cid:
        return
    c["raw_json"] = json.dumps(raw, ensure_ascii=False)

    filtered = {k: v for k, v in c.items() if k in _VALID_COLS}

    existing = db.query(Contract).filter(Contract.id_contrato == cid).first()
    if existing:
        for k, v in filtered.items():
            if k != "id_contrato":
                setattr(existing, k, v)
        existing.fetched_at = datetime.utcnow()
    else:
        db.add(Contract(**filtered))
    db.commit()


def _serialize(db_contract, audit=None):
    return {
        "id_contrato": db_contract.id_contrato,
        "nombre_entidad": db_contract.nombre_entidad,
        "nit_entidad": db_contract.nit_entidad,
        "departamento": db_contract.departamento,
        "ciudad": db_contract.ciudad,
        "localizacion": db_contract.localizacion,
        "orden": db_contract.orden,
        "sector": db_contract.sector,
        "descripcion_del_proceso": db_contract.descripcion_del_proceso,
        "objeto_del_contrato": db_contract.objeto_del_contrato,
        "tipo_de_contrato": db_contract.tipo_de_contrato,
        "modalidad_de_contratacion": db_contract.modalidad_de_contratacion,
        "justificacion_modalidad": db_contract.justificacion_modalidad,
        "fecha_de_firma": db_contract.fecha_de_firma,
        "fecha_de_inicio": db_contract.fecha_de_inicio,
        "fecha_de_fin": db_contract.fecha_de_fin,
        "valor_del_contrato": db_contract.valor_del_contrato,
        "dias_adicionados": db_contract.dias_adicionados,
        "habilita_pago_adelantado": db_contract.habilita_pago_adelantado,
        "proveedor_adjudicado": db_contract.proveedor_adjudicado,
        "documento_proveedor": db_contract.documento_proveedor,
        "es_pyme": db_contract.es_pyme,
        "estado_contrato": db_contract.estado_contrato,
        "urlproceso": db_contract.urlproceso,
        "_has_audit": audit is not None,
    }


@router.get("")
async def list_contracts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    departamento: Optional[str] = None,
    ciudad: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    valor_min: Optional[float] = None,
    valor_max: Optional[float] = None,
    modalidad: Optional[str] = None,
    sector: Optional[str] = None,
    nombre_entidad: Optional[str] = None,
    estado_contrato: Optional[str] = None,
    orden_campo: str = Query("fecha_de_firma"),
    orden_dir: str = Query("DESC"),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    result = await fetch_contracts(
        page=page, page_size=page_size,
        departamento=departamento, ciudad=ciudad,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
        valor_min=valor_min, valor_max=valor_max,
        modalidad=modalidad, sector=sector,
        nombre_entidad=nombre_entidad,
        estado_contrato=estado_contrato,
        orden_campo=orden_campo, orden_dir=orden_dir,
        app_token=settings.SECOP_APP_TOKEN or None,
    )

    enriched = []
    for c in result["contracts"]:
        c.pop("raw_json_raw", None)
        c.pop("raw_json", None)
        c["_has_audit"] = False
        enriched.append(c)

    return {
        "contracts": enriched,
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"],
    }


@router.get("/filters/options")
async def filter_options(db: Session = Depends(get_db)):
    settings = get_settings()
    try:
        return await fetch_filter_options(app_token=settings.SECOP_APP_TOKEN or None)
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        return {"departamentos": [], "modalidades": [], "sectores": []}


@router.get("/{id_contrato}")
async def get_contract(id_contrato: str, db: Session = Depends(get_db)):
    existing = db.query(Contract).filter(Contract.id_contrato == id_contrato).first()

    if existing and existing.fetched_at:
        audit = db.query(Audit).filter(Audit.id_contrato == id_contrato).first()
        return {"contract": _serialize(existing, audit), "audit": None}

    settings = get_settings()
    contract_data = await fetch_contract_by_id(
        id_contrato, app_token=settings.SECOP_APP_TOKEN or None,
    )
    if not contract_data:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    _save_contract(contract_data, db)
    audit = db.query(Audit).filter(Audit.id_contrato == contract_data.get("id_contrato")).first()

    contract_data.pop("raw_json_raw", None)
    contract_data.pop("raw_json", None)

    return {"contract": contract_data, "audit": None}
