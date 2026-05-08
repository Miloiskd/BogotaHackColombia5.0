from services.tts_service import text_to_speech
from services.gpt_intent import process_natural_language, generate_response
from models import TelegramUser
from database import SessionLocal
import os
import sys
import json
import logging
import httpx
from telegram import Update
from telegram.ext import ContextTypes

sys.path.insert(0, os.path.join(
    os.path.dirname(__file__), "..", "..", "Backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


logger = logging.getLogger(__name__)

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")


async def process_message_text(text: str, update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Procesa el texto de un mensaje (texto directo o audio transcrito)"""
    chat_id = str(update.effective_chat.id)
    logger.info(f"Mensaje recibido de {chat_id}: {text[:80]}")

    intent_result = process_natural_language(text)
    intent = intent_result.get("intent", "unknown")

    if intent == "error":
        await update.message.reply_text(f"Error: {intent_result.get('message', 'Desconocido')}")
        return

    if intent == "unknown":
        await update.message.reply_text(
            intent_result.get(
                "message", "No entendi tu mensaje. Usa /ayuda para ver que puedo hacer.")
        )
        return

    func_result = await execute_function(intent, intent_result.get("params", {}))
    natural_response = generate_response(text, intent_result, func_result)

    db = SessionLocal()
    try:
        user = db.query(TelegramUser).filter(
            TelegramUser.chat_id == chat_id).first()
        prefer_audio = user and user.response_format == "audio"
    finally:
        db.close()

    if prefer_audio:
        try:
            audio_bytes = text_to_speech(natural_response)
            await update.message.reply_voice(audio_bytes, caption="Respuesta de Oculus Auditor")
            await update.message.reply_text(natural_response)
        except Exception as e:
            logger.error(f"Error TTS: {e}")
            await update.message.reply_text(natural_response)
    else:
        if len(natural_response) > 4000:
            for i in range(0, len(natural_response), 4000):
                await update.message.reply_text(natural_response[i:i+4000])
        else:
            await update.message.reply_text(natural_response)


async def text_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler de mensajes de texto"""
    text = update.message.text
    await process_message_text(text, update, context)


async def execute_function(intent: str, params: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if intent == "buscar_contratos":
                limite = min(params.get("limite", 5), 10)
                query_params = {
                    "page": 1,
                    "page_size": limite,
                }
                if params.get("departamento"):
                    query_params["departamento"] = params["departamento"]
                if params.get("ciudad"):
                    query_params["ciudad"] = params["ciudad"]
                if params.get("valor_min"):
                    query_params["valor_min"] = params["valor_min"]
                if params.get("valor_max"):
                    query_params["valor_max"] = params["valor_max"]
                if params.get("modalidad"):
                    query_params["modalidad"] = params["modalidad"]
                if params.get("entidad"):
                    query_params["nombre_entidad"] = params["entidad"]
                if params.get("fecha_inicio"):
                    query_params["fecha_inicio"] = params["fecha_inicio"]
                if params.get("fecha_fin"):
                    query_params["fecha_fin"] = params["fecha_fin"]

                resp = await client.get(f"{API_BASE}/api/contracts", params=query_params)
                resp.raise_for_status()
                data = resp.json()
                return {
                    "total": data.get("total", 0),
                    "contratos": [
                        {
                            "id": c.get("id_contrato"),
                            "entidad": c.get("nombre_entidad"),
                            "modalidad": c.get("modalidad_de_contratacion"),
                            "valor": c.get("valor_del_contrato"),
                            "departamento": c.get("departamento"),
                            "estado": c.get("estado_contrato"),
                            "objeto": c.get("descripcion_del_proceso", "")[:100],
                        }
                        for c in data.get("contracts", [])
                    ],
                }

            elif intent == "auditar_contrato":
                id_contrato = params.get("id_contrato", "")
                canonical = id_contrato.strip().upper().replace(" ", "")

                try:
                    resp = await client.post(f"{API_BASE}/api/audit/{canonical}", json={"force": False})
                    resp.raise_for_status()
                    data = resp.json()
                    audit = data.get("audit", {})
                    alerts = data.get("alerts", [])
                    return {
                        "id_contrato": canonical,
                        "score_total": audit.get("score_total"),
                        "nivel_riesgo": audit.get("nivel_riesgo"),
                        "resumen": audit.get("resumen_ejecutivo"),
                        "alertas": [
                            {"titulo": a["titulo"], "severidad": a["severidad"],
                                "puntos": a["puntos"]}
                            for a in alerts
                        ],
                    }
                except Exception:
                    resp = await client.get(f"{API_BASE}/api/audit/{canonical}")
                    resp.raise_for_status()
                    data = resp.json()
                    audit = data.get("audit", {})
                    alerts = data.get("alerts", [])
                    return {
                        "id_contrato": canonical,
                        "score_total": audit.get("score_total"),
                        "nivel_riesgo": audit.get("nivel_riesgo"),
                        "resumen": audit.get("resumen_ejecutivo"),
                        "alertas": [
                            {"titulo": a["titulo"], "severidad": a["severidad"],
                                "puntos": a["puntos"]}
                            for a in alerts
                        ],
                    }

            elif intent == "obtener_infografia":
                id_contrato = params.get(
                    "id_contrato", "").strip().upper().replace(" ", "")
                resp = await client.post(f"{API_BASE}/api/infographic/{id_contrato}")
                resp.raise_for_status()
                data = resp.json()
                return {"id_contrato": id_contrato, "imgbb_url": data.get("imgbb_url")}

            elif intent == "contratos_alto_riesgo":
                resp = await client.get(f"{API_BASE}/api/audit")
                resp.raise_for_status()
                audits = resp.json()

                high_risk = [a for a in audits if a.get(
                    "nivel_riesgo") == "alto"]
                depto = params.get("departamento", "").strip()
                limite = min(params.get("limite", 5), 10)

                # Enrich ALWAYS with contract data to get departamento, entidad, etc.
                enriched = []
                for a in high_risk:
                    try:
                        c_resp = await client.get(f"{API_BASE}/api/contracts/{a['id_contrato']}")
                        c_resp.raise_for_status()
                        c_data = c_resp.json()
                        contract = c_data.get("contract", {})
                        dept = contract.get("departamento", "")
                        if depto and depto.lower() not in dept.lower():
                            continue
                        enriched.append({
                            "id_contrato": a["id_contrato"],
                            "score_total": a.get("score_total"),
                            "nivel_riesgo": a.get("nivel_riesgo"),
                            "entidad": contract.get("nombre_entidad"),
                            "departamento": dept,
                            "valor": contract.get("valor_del_contrato"),
                            "modalidad": contract.get("modalidad_de_contratacion"),
                        })
                    except Exception:
                        if not depto:
                            enriched.append(a)

                return {
                    "total_alto_riesgo": len(high_risk),
                    "contratos": enriched[:limite],
                }

            elif intent == "listar_auditorias":
                resp = await client.get(f"{API_BASE}/api/audit")
                resp.raise_for_status()
                audits = resp.json()

                nivel = params.get("nivel_riesgo", "").lower()
                if nivel and nivel != "todos":
                    audits = [a for a in audits if a.get(
                        "nivel_riesgo") == nivel]

                limite = min(params.get("limite", 10), 20)

                # Enrich with contract data to get departamento, entidad, etc.
                enriched = []
                for a in audits[:limite]:
                    try:
                        c_resp = await client.get(f"{API_BASE}/api/contracts/{a['id_contrato']}")
                        c_resp.raise_for_status()
                        c_data = c_resp.json()
                        contract = c_data.get("contract", {})
                        enriched.append({
                            "id_contrato": a["id_contrato"],
                            "score_total": a.get("score_total"),
                            "nivel_riesgo": a.get("nivel_riesgo"),
                            "entidad": contract.get("nombre_entidad"),
                            "departamento": contract.get("departamento"),
                            "valor": contract.get("valor_del_contrato"),
                            "modalidad": contract.get("modalidad_de_contratacion"),
                        })
                    except Exception:
                        enriched.append(a)

                return {
                    "total_auditados": len(audits),
                    "contratos": enriched,
                }

            elif intent == "cambiar_preferencia":
                formato = params.get("formato", "texto")
                return {"formato": formato, "mensaje": f"Preferencia cambiada a {formato}"}

            return {"error": f"Funcion desconocida: {intent}"}

    except Exception as e:
        logger.error(f"Error ejecutando {intent}: {e}")
        return {"error": str(e)}
