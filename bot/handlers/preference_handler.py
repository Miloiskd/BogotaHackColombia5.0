import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from sqlalchemy.orm import Session
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "Backend"))
from database import SessionLocal
from models import TelegramUser

logger = logging.getLogger(__name__)


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    username = update.effective_user.username or update.effective_user.first_name or ""

    db = SessionLocal()
    try:
        user = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
        if not user:
            user = TelegramUser(chat_id=chat_id, username=username, response_format="texto")
            db.add(user)
            db.commit()

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
            "\u26a0\ufe0f *Contratos de riesgo:*\n"
            "_\"Cuales son los contratos de mayor riesgo en Valle del Cauca?\"_\n"
            "_\"Muestrame contratos sospechosos\"_\n\n"
            "Selecciona tu formato de respuesta preferido:",
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    finally:
        db.close()


async def format_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    chat_id = str(update.effective_chat.id)
    new_format = "texto" if query.data == "format_texto" else "audio"

    db = SessionLocal()
    try:
        user = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
        if user:
            user.response_format = new_format
            db.commit()

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
    finally:
        db.close()


async def formato_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)

    db = SessionLocal()
    try:
        user = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
        current = user.response_format if user else "texto"
    finally:
        db.close()

    texto_label = "\u2705 Texto (actual)" if current == "texto" else "\U0001F4DD Texto"
    audio_label = "\u2705 Audio (actual)" if current == "audio" else "\U0001F50A Audio"

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
        "\u26a0\ufe0f *Contratos de riesgo:*\n"
        "\"Cuales son los contratos de mayor riesgo en Valle del Cauca?\"\n"
        "\"Muestrame contratos sospechosos de este mes\"\n\n"
        "\U0001f6e0 *Comandos:*\n"
        "/start - Iniciar el bot\n"
        "/formato - Cambiar formato de respuesta (texto o audio)\n"
        "/ayuda - Mostrar esta ayuda",
        parse_mode="Markdown",
    )
