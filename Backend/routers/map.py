import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case as sa_case
from database import get_db
from models import Contract, Audit

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/departments")
async def get_department_stats(db: Session = Depends(get_db)):
    query = (
        db.query(
            Contract.departamento,
            func.count(Audit.id).label("total_auditados"),
            func.sum(
                sa_case((Audit.nivel_riesgo == "alto", 1), else_=0)
            ).label("alto_riesgo"),
            func.sum(
                sa_case((Audit.nivel_riesgo == "medio", 1), else_=0)
            ).label("medio_riesgo"),
            func.sum(
                sa_case((Audit.nivel_riesgo == "bajo", 1), else_=0)
            ).label("bajo_riesgo"),
            func.avg(Audit.score_total).label("score_promedio"),
        )
        .join(Audit, Contract.id_contrato == Audit.id_contrato)
        .filter(Contract.departamento.isnot(None))
        .group_by(Contract.departamento)
        .all()
    )

    result = []
    for row in query:
        depto = row.departamento
        total = int(row.total_auditados or 0)
        alto = int(row.alto_riesgo or 0)
        medio = int(row.medio_riesgo or 0)
        bajo = int(row.bajo_riesgo or 0)
        score = float(row.score_promedio or 0)

        color_intensity = alto / total if total > 0 else 0.0

        result.append({
            "departamento": depto,
            "total_auditados": total,
            "alto_riesgo": alto,
            "medio_riesgo": medio,
            "bajo_riesgo": bajo,
            "score_promedio": round(score, 1),
            "color_intensity": round(color_intensity, 2),
        })

    return result
