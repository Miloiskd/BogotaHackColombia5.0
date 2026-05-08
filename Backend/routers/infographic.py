import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Contract, Audit, Alert, Infographic
from services.infographic_generator import get_or_generate_infographic
from config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{id_contrato}")
async def generate_infographic(
    id_contrato: str,
    db: Session = Depends(get_db),
):
    existing = db.query(Infographic).filter(
        Infographic.id_contrato == id_contrato
    ).first()
    if existing:
        return {
            "imgbb_url": existing.imgbb_url,
            "generated_at": str(existing.generated_at),
        }

    contract = db.query(Contract).filter(
        Contract.id_contrato == id_contrato
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    audit = db.query(Audit).filter(
        Audit.id_contrato == id_contrato
    ).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Auditoria no encontrada. Ejecuta /api/audit/{id_contrato} primero")

    alerts = db.query(Alert).filter(
        Alert.id_contrato == id_contrato
    ).all()

    contract_data = {
        "id_contrato": contract.id_contrato,
        "nombre_entidad": contract.nombre_entidad,
        "departamento": contract.departamento,
        "fecha_de_firma": contract.fecha_de_firma,
        "modalidad_de_contratacion": contract.modalidad_de_contratacion,
        "tipo_de_contrato": contract.tipo_de_contrato,
        "proveedor_adjudicado": contract.proveedor_adjudicado,
        "valor_del_contrato": contract.valor_del_contrato,
    }

    audit_data = {
        "audit": {
            "score_total": audit.score_total,
            "score_reglas": audit.score_reglas,
            "score_gpt": audit.score_gpt,
            "nivel_riesgo": audit.nivel_riesgo,
            "resumen_ejecutivo": audit.resumen_ejecutivo,
        },
        "alerts": [
            {
                "categoria": a.categoria,
                "titulo": a.titulo,
                "descripcion": a.descripcion,
                "severidad": a.severidad,
                "puntos": a.puntos,
            }
            for a in alerts
        ],
    }

    settings = get_settings()
    url = get_or_generate_infographic(
        contract_data, audit_data, settings.IMGBB_API_KEY, db
    )

    if not url:
        raise HTTPException(status_code=500, detail="Error generando infografia (verifica IMGBB_API_KEY)")

    return {"imgbb_url": url, "generated_at": str(audit.auditado_at)}


@router.get("/{id_contrato}")
async def get_infographic(
    id_contrato: str,
    db: Session = Depends(get_db),
):
    existing = db.query(Infographic).filter(
        Infographic.id_contrato == id_contrato
    ).first()

    if not existing:
        return {"exists": False, "imgbb_url": None}

    return {
        "exists": True,
        "imgbb_url": existing.imgbb_url,
        "generated_at": str(existing.generated_at),
    }
