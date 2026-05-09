import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Audit, Alert, Contract
from services.ai_agent import audit_contract

router = APIRouter()
logger = logging.getLogger(__name__)


class AuditRequest(BaseModel):
    force: bool = False


@router.post("/seed-defaults")
async def seed_default_audits(
    count: int = Query(5, ge=1, le=20),
    force: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Descarga y audita automáticamente los contratos de mayor valor con contratación directa."""
    from config import get_settings
    from services.secop_api import fetch_contracts

    settings = get_settings()
    result = await fetch_contracts(
        page=1,
        page_size=count,
        modalidad="Contratacion directa",
        orden_campo="valor_del_contrato",
        orden_dir="DESC",
        app_token=settings.SECOP_APP_TOKEN or None,
    )

    _VALID_COLS = {c.name for c in Contract.__table__.columns}
    seeded = []

    for c in result.get("contracts", []):
        cid = c.get("id_contrato")
        if not cid:
            continue

        raw = dict(c)
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

        audit_result = audit_contract(raw, db, force=force)
        if audit_result:
            seeded.append({
                "id_contrato": cid,
                "score_total": audit_result["audit"]["score_total"],
                "nivel_riesgo": audit_result["audit"]["nivel_riesgo"],
                "nombre_entidad": raw.get("nombre_entidad", ""),
                "valor_del_contrato": raw.get("valor_del_contrato"),
            })
            logger.info(f"Seeded audit: {cid} → {audit_result['audit']['nivel_riesgo']}")

    return {"seeded": len(seeded), "contracts": seeded}


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
        from config import get_settings
        from services.secop_api import fetch_contract_by_id
        settings = get_settings()
        raw = await fetch_contract_by_id(id_contrato, app_token=settings.SECOP_APP_TOKEN or None)
        if not raw:
            raise HTTPException(status_code=404, detail="Contrato no encontrado en SECOP")
        _VALID_COLS = {c.name for c in Contract.__table__.columns}
        c_data = {k: v for k, v in raw.items() if k in _VALID_COLS}
        c_data["raw_json"] = json.dumps(raw, ensure_ascii=False)
        db.add(Contract(**c_data))
        db.commit()
        contract = db.query(Contract).filter(Contract.id_contrato == id_contrato).first()

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


@router.get("/relationships")
async def get_relationship_data(db: Session = Depends(get_db)):
    """Grafo entidad–proveedor para el Mapa de Relaciones."""
    rows = (
        db.query(Audit, Contract)
        .join(Contract, Audit.id_contrato == Contract.id_contrato)
        .all()
    )

    entities: dict = {}
    providers: dict = {}
    raw_links: list = []

    for audit, contract in rows:
        ent_key = contract.nit_entidad or f"name_{contract.nombre_entidad}"
        riesgo  = audit.nivel_riesgo or "bajo"
        valor   = float(contract.valor_del_contrato or 0)

        if ent_key not in entities:
            entities[ent_key] = {
                "id": f"ent_{ent_key}",
                "type": "entidad",
                "label": contract.nombre_entidad or ent_key,
                "nit": contract.nit_entidad,
                "departamento": contract.departamento,
                "sector": contract.sector,
                "contratos": [],
                "total_valor": 0.0,
                "risk_count": {"alto": 0, "medio": 0, "bajo": 0},
                "es_anomalia": False,
                "es_hub": False,
                "hub_entidades": 0,
            }
        e = entities[ent_key]
        e["contratos"].append(contract.id_contrato)
        e["total_valor"] += valor
        e["risk_count"][riesgo] = e["risk_count"].get(riesgo, 0) + 1

        prov_key = (
            contract.documento_proveedor
            or (f"name_{contract.proveedor_adjudicado}" if contract.proveedor_adjudicado else None)
        )
        if prov_key:
            if prov_key not in providers:
                providers[prov_key] = {
                    "id": f"prov_{prov_key}",
                    "type": "proveedor",
                    "label": contract.proveedor_adjudicado or prov_key,
                    "nit": contract.documento_proveedor,
                    "es_pyme": contract.es_pyme,
                    "contratos": [],
                    "total_valor": 0.0,
                    "risk_count": {"alto": 0, "medio": 0, "bajo": 0},
                    "es_anomalia": False,
                    "es_hub": False,
                    "hub_entidades": 0,
                }
            p = providers[prov_key]
            p["contratos"].append(contract.id_contrato)
            p["total_valor"] += valor
            p["risk_count"][riesgo] = p["risk_count"].get(riesgo, 0) + 1

            raw_links.append({
                "source": f"ent_{ent_key}",
                "target": f"prov_{prov_key}",
                "contract_id": contract.id_contrato,
                "risk": riesgo,
                "score": audit.score_total,
                "valor": valor,
                "modalidad": contract.modalidad_de_contratacion,
            })

    # Anomaly flag: entity or provider with 2+ alto-risk contracts
    for node in list(entities.values()) + list(providers.values()):
        node["es_anomalia"] = node["risk_count"].get("alto", 0) >= 2

    # Hub flag: provider contracted by 2+ different entities
    prov_ents: dict = {}
    for lk in raw_links:
        prov_ents.setdefault(lk["target"], set()).add(lk["source"])
    for prov_id, ent_set in prov_ents.items():
        if len(ent_set) >= 2:
            for p in providers.values():
                if p["id"] == prov_id:
                    p["es_hub"] = True
                    p["hub_entidades"] = len(ent_set)

    nodes = list(entities.values()) + list(providers.values())
    return {
        "nodes": nodes,
        "links": raw_links,
        "stats": {
            "total_entidades": len(entities),
            "total_proveedores": len(providers),
            "total_contratos": len(raw_links),
            "alto_riesgo": sum(1 for lk in raw_links if lk["risk"] == "alto"),
        },
    }


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
