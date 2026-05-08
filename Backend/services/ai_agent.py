import json
import logging
import re
from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session
from services.gpt_service import GPTService
from models import Contract, Audit, Alert

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un auditor experto en contratacion publica colombiana especializado en detectar senales de opacidad, corrupcion y malas practicas en contratos del SECOP II.
Tu tarea es analizar el contrato proporcionado y:
1. Asignar un score de riesgo GPT entre 0 y 60 puntos
2. Identificar senales de alerta adicionales no cubiertas por las reglas automaticas
3. Generar un resumen ejecutivo del contrato (3-4 oraciones)
4. Generar un analisis detallado por categorias (modalidad, valor, objeto, proveedor, tiempo)
5. Generar conclusiones y recomendaciones (3-4 oraciones)

Responde UNICAMENTE en JSON con esta estructura exacta:
{
  "score_gpt": <numero 0-60>,
  "resumen_ejecutivo": "<texto>",
  "analisis_detallado": "<texto>",
  "conclusiones": "<texto>",
  "alertas_adicionales": [
    {
      "categoria": "<categoria>",
      "titulo": "<titulo>",
      "descripcion": "<descripcion>",
      "severidad": "<alta|media|baja>",
      "puntos": <numero>
    }
  ]
}

Criterios para el score GPT (0-60):
- 0-15: Contrato transparente, justificaciones solidas, objeto claro
- 16-35: Senales menores de opacidad, requiere seguimiento
- 36-60: Multiples senales graves, posible irregularidad"""


def _safe_float(val) -> float:
    if val is None:
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _safe_int(val) -> int:
    if val is None:
        return 0
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0


def _normalize(val) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() in ("no definido", "no definido", "", "none", "n/a"):
        return None
    return s


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        d = str(date_str).strip()
        return datetime.strptime(d[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def apply_automatic_rules(contract: dict) -> tuple:
    alerts = []
    total_points = 0
    score_cap = 40

    modalidad = _normalize(contract.get("modalidad_de_contratacion", ""))
    valor = _safe_float(contract.get("valor_del_contrato"))
    dias_adic = _safe_int(contract.get("dias_adicionados"))
    pago_adelantado = _normalize(contract.get("habilita_pago_adelantado"))
    objeto = _normalize(contract.get("objeto_del_contrato", ""))
    es_pyme = _normalize(contract.get("es_pyme"))
    justificacion = _normalize(contract.get("justificacion_modalidad", ""))
    fecha_firma = _parse_date(contract.get("fecha_de_firma"))
    fecha_inicio = _parse_date(contract.get("fecha_de_inicio"))

    if modalidad and "directa" in modalidad.lower():
        alerts.append({
            "categoria": "modalidad", "tipo": "automatica",
            "titulo": "Contratacion directa sin proceso competitivo",
            "descripcion": f"El contrato fue adjudicado mediante {modalidad}, sin pasar por un proceso de licitacion competitiva.",
            "severidad": "alta", "puntos": 15,
        })
        total_points += 15

    if dias_adic > 0:
        alerts.append({
            "categoria": "tiempo", "tipo": "automatica",
            "titulo": "Contrato con dias adicionados",
            "descripcion": f"El contrato tiene {dias_adic} dias adicionados, lo que podria indicar una modificacion irregular del plazo original.",
            "severidad": "media", "puntos": 10,
        })
        total_points += 10

    if pago_adelantado and pago_adelantado.lower() == "si":
        alerts.append({
            "categoria": "pago", "tipo": "automatica",
            "titulo": "Habilita pago adelantado",
            "descripcion": "El contrato habilita pago adelantado, lo que implica riesgo de anticipo sin garantia suficiente.",
            "severidad": "alta", "puntos": 8,
        })
        total_points += 8

    if objeto and len(objeto.split()) < 25:
        alerts.append({
            "categoria": "objeto", "tipo": "automatica",
            "titulo": "Objeto del contrato con descripcion escasa",
            "descripcion": f"El objeto del contrato tiene solo {len(objeto.split())} palabras, lo que indica opacidad en la descripcion del proposito contractual.",
            "severidad": "alta", "puntos": 10,
        })
        total_points += 10

    if valor > 1_000_000_000 and modalidad and "directa" in modalidad.lower():
        alerts.append({
            "categoria": "valor", "tipo": "automatica",
            "titulo": "Contrato de alto valor adjudicado sin licitacion",
            "descripcion": f"Contrato por ${valor:,.0f} COP adjudicado mediante {modalidad}, sin pasar por licitacion publica.",
            "severidad": "alta", "puntos": 15,
        })
        total_points += 15

    if valor > 500_000_000 and modalidad and "minima cuantia" in modalidad.lower():
        alerts.append({
            "categoria": "valor", "tipo": "automatica",
            "titulo": "Valor elevado para modalidad de minima cuantia",
            "descripcion": f"El contrato por ${valor:,.0f} COP supera lo esperado para contratacion por minima cuantia.",
            "severidad": "media", "puntos": 8,
        })
        total_points += 8

    if es_pyme and es_pyme.lower() == "no" and modalidad and "directa" in modalidad.lower():
        alerts.append({
            "categoria": "proveedor", "tipo": "automatica",
            "titulo": "Proveedor grande adjudicado por contratacion directa",
            "descripcion": "El proveedor adjudicado no es PYME y fue seleccionado sin proceso competitivo.",
            "severidad": "baja", "puntos": 5,
        })
        total_points += 5

    if justificacion and "servicios profesionales" in justificacion.lower() and valor > 100_000_000:
        alerts.append({
            "categoria": "modalidad", "tipo": "automatica",
            "titulo": "Justificacion generica de servicios profesionales en monto alto",
            "descripcion": f"Se justifica como servicios profesionales pero el monto de ${valor:,.0f} COP es elevado para este tipo de contratacion.",
            "severidad": "media", "puntos": 7,
        })
        total_points += 7

    if fecha_inicio and fecha_firma and fecha_inicio < fecha_firma:
        alerts.append({
            "categoria": "tiempo", "tipo": "automatica",
            "titulo": "Contrato inicio antes de ser firmado",
            "descripcion": f"La fecha de inicio ({fecha_inicio}) es anterior a la fecha de firma ({fecha_firma}), lo cual es una irregularidad grave.",
            "severidad": "alta", "puntos": 12,
        })
        total_points += 12

    if fecha_inicio and fecha_firma:
        try:
            duracion = (fecha_firma - fecha_inicio).days
            if duracion < 15 and valor > 50_000_000:
                alerts.append({
                    "categoria": "tiempo", "tipo": "automatica",
                    "titulo": "Duracion sospechosamente corta para el valor contratado",
                    "descripcion": f"Duracion de {duracion} dias para un contrato de ${valor:,.0f} COP.",
                    "severidad": "media", "puntos": 6,
                })
                total_points += 6
        except Exception:
            pass

    return alerts, min(total_points, score_cap)


def analyze_with_gpt(contract: dict, automatic_alerts: list) -> dict:
    gpt_service = GPTService()
    contract_json = json.dumps(contract, ensure_ascii=False, default=str)
    alerts_json = json.dumps(automatic_alerts, ensure_ascii=False, default=str)

    user_message = f"""Contrato a analizar:
{contract_json}

Alertas detectadas por reglas automaticas:
{alerts_json}

Analiza este contrato y responde UNICAMENTE con el JSON solicitado."""

    try:
        response = gpt_service.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        result = json.loads(raw)
        return result
    except Exception as e:
        logger.error(f"GPT analysis failed: {e}")
        return {
            "score_gpt": 0,
            "resumen_ejecutivo": "No se pudo completar el analisis con IA.",
            "analisis_detallado": f"Error: {str(e)}",
            "conclusiones": "Reintentar auditoria.",
            "alertas_adicionales": [],
        }


def audit_contract(contract_data: dict, db: Session, force: bool = False):
    id_contrato = contract_data.get("id_contrato")
    if not id_contrato:
        return None

    if not force:
        existing = db.query(Audit).filter(Audit.id_contrato == id_contrato).first()
        if existing:
            alerts = db.query(Alert).filter(Alert.id_contrato == id_contrato).all()
            return {
                "audit": {
                    "id": existing.id,
                    "id_contrato": existing.id_contrato,
                    "score_total": existing.score_total,
                    "score_reglas": existing.score_reglas,
                    "score_gpt": existing.score_gpt,
                    "nivel_riesgo": existing.nivel_riesgo,
                    "resumen_ejecutivo": existing.resumen_ejecutivo,
                    "analisis_detallado": existing.analisis_detallado,
                    "conclusiones": existing.conclusiones,
                    "auditado_at": str(existing.auditado_at),
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

    auto_alerts, score_reglas = apply_automatic_rules(contract_data)
    gpt_result = analyze_with_gpt(contract_data, auto_alerts)

    score_gpt = int(gpt_result.get("score_gpt", 0))
    score_total = min(100, score_reglas + score_gpt)

    if score_total <= 30:
        nivel_riesgo = "bajo"
    elif score_total <= 60:
        nivel_riesgo = "medio"
    else:
        nivel_riesgo = "alto"

    db.query(Audit).filter(Audit.id_contrato == id_contrato).delete()
    db.query(Alert).filter(Alert.id_contrato == id_contrato).delete()

    audit = Audit(
        id_contrato=id_contrato,
        score_total=score_total,
        score_reglas=score_reglas,
        score_gpt=score_gpt,
        nivel_riesgo=nivel_riesgo,
        resumen_ejecutivo=gpt_result.get("resumen_ejecutivo", ""),
        analisis_detallado=gpt_result.get("analisis_detallado", ""),
        conclusiones=gpt_result.get("conclusiones", ""),
        auditado_at=datetime.utcnow(),
    )
    db.add(audit)

    for a in auto_alerts:
        db.add(Alert(
            id_contrato=id_contrato,
            tipo=a["tipo"],
            categoria=a["categoria"],
            titulo=a["titulo"],
            descripcion=a["descripcion"],
            severidad=a["severidad"],
            puntos=a["puntos"],
        ))

    for a in gpt_result.get("alertas_adicionales", []):
        db.add(Alert(
            id_contrato=id_contrato,
            tipo="gpt",
            categoria=a.get("categoria", ""),
            titulo=a.get("titulo", ""),
            descripcion=a.get("descripcion", ""),
            severidad=a.get("severidad", "media"),
            puntos=a.get("puntos", 0),
        ))

    db.commit()
    db.refresh(audit)

    all_alerts = db.query(Alert).filter(Alert.id_contrato == id_contrato).all()

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
            for a in all_alerts
        ],
    }
