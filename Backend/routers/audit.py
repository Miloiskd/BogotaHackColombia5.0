import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Audit, Alert, Contract
from services.ai_agent import audit_contract
import json

router = APIRouter()
logger = logging.getLogger(__name__)


class AuditRequest(BaseModel):
    force: bool = False


@router.post("/{id_contrato}")
async def run_audit(
    id_contrato: str,
    body: AuditRequest = AuditRequest(),
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(
        Contract.id_contrato == id_contrato
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado en cache. Buscalo primero en /api/contracts/{id_contrato}")

    contract_data = {
        "id_contrato": contract.id_contrato,
        "nombre_entidad": contract.nombre_entidad,
        "nit_entidad": contract.nit_entidad,
        "departamento": contract.departamento,
        "ciudad": contract.ciudad,
        "localizacion": contract.localizacion,
        "orden": contract.orden,
        "sector": contract.sector,
        "descripcion_del_proceso": contract.descripcion_del_proceso,
        "objeto_del_contrato": contract.objeto_del_contrato,
        "tipo_de_contrato": contract.tipo_de_contrato,
        "modalidad_de_contratacion": contract.modalidad_de_contratacion,
        "justificacion_modalidad": contract.justificacion_modalidad,
        "fecha_de_firma": contract.fecha_de_firma,
        "fecha_de_inicio": contract.fecha_de_inicio,
        "fecha_de_fin": contract.fecha_de_fin,
        "valor_del_contrato": contract.valor_del_contrato,
        "dias_adicionados": contract.dias_adicionados,
        "habilita_pago_adelantado": contract.habilita_pago_adelantado,
        "proveedor_adjudicado": contract.proveedor_adjudicado,
        "documento_proveedor": contract.documento_proveedor,
        "es_pyme": contract.es_pyme,
        "estado_contrato": contract.estado_contrato,
        "urlproceso": contract.urlproceso,
        "raw_json": contract.raw_json,
    }

    result = audit_contract(contract_data, db, force=body.force)
    if not result:
        raise HTTPException(status_code=500, detail="Error al auditar el contrato")

    return result


@router.get("/{id_contrato}")
async def get_audit(
    id_contrato: str,
    db: Session = Depends(get_db),
):
    audit = db.query(Audit).filter(
        Audit.id_contrato == id_contrato
    ).first()

    if not audit:
        raise HTTPException(status_code=404, detail="Auditoria no encontrada")

    alerts = db.query(Alert).filter(
        Alert.id_contrato == id_contrato
    ).all()

    return {
        "audit": {
            "id": audit.id,
            "id_contrato": audit.id_contrato,
            "score_total": audit.score_total,
            "score_reglas": audit.score_reglas,
            "score_gpt": audit.score_gpt,
            "nivel_riesgo": audit.nivel_riesgo,
            "resumen_ejecutivo": audit.resumen_ejecutivo,
            "analisis_detallado": audit.analisis_detallado,
            "conclusiones": audit.conclusiones,
            "auditado_at": str(audit.auditado_at),
        },
        "alerts": [
            {
                "id": a.id,
                "tipo": a.tipo,
                "categoria": a.categoria,
                "titulo": a.titulo,
                "descripcion": a.descripcion,
                "severidad": a.severidad,
                "puntos": a.puntos,
            }
            for a in alerts
        ],
    }


@router.get("")
async def list_audits(db: Session = Depends(get_db)):
    audits = db.query(Audit).order_by(Audit.auditado_at.desc()).all()
    return [
        {
            "id": a.id,
            "id_contrato": a.id_contrato,
            "score_total": a.score_total,
            "score_reglas": a.score_reglas,
            "score_gpt": a.score_gpt,
            "nivel_riesgo": a.nivel_riesgo,
            "resumen_ejecutivo": a.resumen_ejecutivo,
            "auditado_at": str(a.auditado_at),
        }
        for a in audits
    ]
