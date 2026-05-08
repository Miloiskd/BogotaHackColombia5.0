import os
import logging
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Report, Audit, Alert, Contract
from services.pdf_generator import generate_pdf
from services.email_service import send_report_email
from config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


class EmailRequest(BaseModel):
    email: str


def _get_contract_and_audit(id_contrato: str, db: Session):
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
        "nit_entidad": contract.nit_entidad,
        "departamento": contract.departamento,
        "ciudad": contract.ciudad,
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
    }

    audit_data = {
        "audit": {
            "id": audit.id,
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

    return contract_data, audit_data, audit


@router.post("/{id_contrato}/generate")
async def generate_report(
    id_contrato: str,
    db: Session = Depends(get_db),
):
    existing = db.query(Report).filter(
        Report.id_contrato == id_contrato
    ).first()

    settings = get_settings()
    output_dir = settings.PDF_OUTPUT_DIR

    if existing and os.path.exists(existing.file_path):
        return {
            "file_path": existing.file_path,
            "url": f"/pdfs/{id_contrato}.pdf",
            "generated_at": str(existing.generated_at),
        }

    contract_data, audit_data, audit = _get_contract_and_audit(id_contrato, db)

    file_path = generate_pdf(contract_data, audit_data, output_dir=output_dir)

    if existing:
        existing.file_path = file_path
    else:
        db.add(Report(
            id_contrato=id_contrato,
            file_path=file_path,
        ))
    db.commit()

    return {
        "file_path": file_path,
        "url": f"/pdfs/{id_contrato}.pdf",
        "generated_at": str(audit.auditado_at),
    }


@router.get("/{id_contrato}")
async def get_report(
    id_contrato: str,
    db: Session = Depends(get_db),
):
    existing = db.query(Report).filter(
        Report.id_contrato == id_contrato
    ).first()

    if not existing:
        return {"exists": False, "url": None, "generated_at": None}

    return {
        "exists": True,
        "url": f"/pdfs/{id_contrato}.pdf",
        "generated_at": str(existing.generated_at),
    }


@router.post("/{id_contrato}/email")
async def email_report(
    id_contrato: str,
    body: EmailRequest,
    db: Session = Depends(get_db),
):
    contract_data, audit_data, audit = _get_contract_and_audit(id_contrato, db)

    settings = get_settings()
    output_dir = settings.PDF_OUTPUT_DIR

    existing = db.query(Report).filter(
        Report.id_contrato == id_contrato
    ).first()

    if existing and os.path.exists(existing.file_path):
        file_path = existing.file_path
    else:
        file_path = generate_pdf(contract_data, audit_data, output_dir=output_dir)

    result = send_report_email(
        to_email=body.email,
        id_contrato=id_contrato,
        pdf_path=file_path,
        score_total=audit.score_total,
        nivel_riesgo=audit.nivel_riesgo,
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Error enviando email"))

    return result
