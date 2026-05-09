import logging
import os
import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")


async def _get_format(chat_id: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{API_BASE}/api/users/{chat_id}")
            r.raise_for_status()
            return r.json().get("response_format", "texto")
    except Exception:
        return "texto"


async def _set_format(chat_id: str, username: str, fmt: str):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(f"{API_BASE}/api/users/{chat_id}", json={"format": fmt, "username": username})
    except Exception as e:
        logger.error(f"Error guardando preferencia: {e}")


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    username = update.effective_user.username or update.effective_user.first_name or ""
    await _set_format(chat_id, username, "texto")

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("\U0001f4dd Respuestas en texto", callback_data="format_texto"),
            InlineKeyboardButton("\U0001f50a Respuestas en audio", callback_data="format_audio"),
        ]
    ])

    await update.message.reply_text(
        "Bienvenido a *Oculus Auditor*\n\n"
        "Soy tu asistente para auditar contratos publicos colombianos del SECOP II.\n\n"
        "Puedes preguntarme cosas como:\n"
        "\U0001f50d *Buscar contratos:*\n"
        "_\"Que contratos hay en Antioquia del sector salud?\"_\n"
        "_\"Muestrame contratos de mas de 500 millones en Bogota\"_\n\n"
        "\U0001f4ca *Auditorias:*\n"
        "_\"Audita el contrato CO1.PCCNTR.1738303\"_\n"
        "_\"Cual es el score de riesgo del contrato X?\"_\n\n"
        "\U0001f5bc *Infografias:*\n"
        "_\"Dame la infografia del contrato CO1.PCCNTR.1738303\"_\n\n"
        "⚠️ *Contratos de riesgo:*\n"
        "_\"Cuales son los contratos de mayor riesgo en Valle del Cauca?\"_\n"
        "_\"Muestrame contratos sospechosos\"_\n\n"
        "Selecciona tu formato de respuesta preferido:",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


async def format_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    chat_id = str(update.effective_chat.id)
    username = update.effective_user.username or update.effective_user.first_name or ""
    new_format = "texto" if query.data == "format_texto" else "audio"

    await _set_format(chat_id, username, new_format)

    if new_format == "audio":
        await query.edit_message_text(
            "Configurado! Ahora recibiras respuestas en audio \U0001f50a\n\n"
            "Escribe /ayuda para ver los comandos disponibles."
        )
    else:
        await query.edit_message_text(
            "Configurado! Ahora recibiras respuestas en texto \U0001f4dd\n\n"
            "Escribe /ayuda para ver los comandos disponibles."
        )


async def formato_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    current = await _get_format(chat_id)

    texto_label = "✅ Texto (actual)" if current == "texto" else "\U0001F4DD Texto"
    audio_label = "✅ Audio (actual)" if current == "audio" else "\U0001F50A Audio"

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(texto_label, callback_data="format_texto"),
            InlineKeyboardButton(audio_label, callback_data="format_audio"),
        ]
    ])

    fmt_label = "audio \U0001F50A" if current == "audio" else "texto \U0001F4DD"
    await update.message.reply_text(
        f"*Formato de respuesta*\n\n"
        f"Formato actual: *{fmt_label}*\n\n"
        f"Selecciona el nuevo formato:",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "*Oculus Auditor - Ayuda*\n\n"
        "\U0001f50d *Buscar contratos:*\n"
        "\"Que contratos hay en Antioquia del sector salud?\"\n"
        "\"Muestrame contratos de mas de 500 millones en Bogota\"\n\n"
        "\U0001f4ca *Auditorias:*\n"
        "\"Audita el contrato CO1.PCCNTR.1738303\"\n"
        "\"Cual es el score de riesgo del contrato X?\"\n\n"
        "\U0001f5bc *Infografias:*\n"
        "\"Dame la infografia del contrato CO1.PCCNTR.1738303\"\n\n"
        "⚠️ *Contratos de riesgo:*\n"
        "\"Cuales son los contratos de mayor riesgo en Valle del Cauca?\"\n"
        "\"Muestrame contratos sospechosos de este mes\"\n\n"
        "\U0001f6e0 *Comandos:*\n"
        "/start - Iniciar el bot\n"
        "/formato - Cambiar formato de respuesta (texto o audio)\n"
        "/ayuda - Mostrar esta ayuda",
        parse_mode="Markdown",
    )
