import os
import sys
import logging
from io import BytesIO
from openai import OpenAI
from telegram import Update
from telegram.ext import ContextTypes
from handlers.text_handler import process_message_text

logger = logging.getLogger(__name__)


async def audio_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("Audio recibido, procesando...")

    try:
        audio_obj = update.message.voice or update.message.audio
        if not audio_obj:
            await update.message.reply_text("No se pudo procesar el audio.")
            return

        await update.message.reply_text("⏳ Procesando audio...")

        file_obj = await context.bot.get_file(audio_obj.file_id)
        audio_bytes = await file_obj.download_as_bytearray()

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            await update.message.reply_text("OPENAI_API_KEY no configurada.")
            return

        client = OpenAI(api_key=api_key)
        transcript = ""

        try:
            audio_file = BytesIO(audio_bytes)
            audio_file.name = "audio.ogg"
            result = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
            transcript = result.text
        except Exception as e1:
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_ogg(BytesIO(audio_bytes))
                wav_buffer = BytesIO()
                audio.export(wav_buffer, format="wav")
                wav_buffer.seek(0)
                wav_buffer.name = "audio.wav"
                result = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=wav_buffer,
                )
                transcript = result.text
            except Exception as e2:
                logger.error(f"Whisper error: {e2}")
                await update.message.reply_text(f"No se pudo transcribir el audio: {str(e2)[:100]}")
                return

        if not transcript:
            await update.message.reply_text("No se detectó texto en el audio.")
            return

        await update.message.reply_text(f"🎙️ Entendí: {transcript[:200]}")

        # Procesa el texto transcrito sin modificar el objeto Message
        await process_message_text(transcript, update, context)

    except Exception as e:
        logger.error(f"Error en audio_handler: {e}")
        await update.message.reply_text(f"Error procesando audio: {str(e)[:100]}")
