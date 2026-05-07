"""
Bot de Telegram - Base con Audio (recibir y enviar)
"""
import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from services.gpt_service import GPTService

load_dotenv()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

logging.basicConfig(
    level=logging.INFO,
    format='%(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    gpt_service = GPTService()
except ValueError:
    gpt_service = None
    logger.warning("OPENAI_API_KEY no configurado. Audio deshabilitado.")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /start"""
    message = (
        "Hola!\n\n"
        "Que puedo hacer:\n"
        "Recibir audios y transcribir\n"
        "Responder con ChatGPT\n"
        "Convertir respuesta a audio\n\n"
        "Comandos:\n"
        "/start - Este mensaje\n"
        "/help - Ayuda\n"
        "/audio <texto> - Convertir texto a audio\n"
        "/gpt <pregunta> - Pregunta a ChatGPT\n"
        "/gpt_audio <pregunta> - ChatGPT + Audio\n\n"
        "O simplemente envia un audio"
    )
    await update.message.reply_text(message)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /help"""
    message = (
        "Ayuda Completa\n\n"
        "ENVIAR AUDIO DESDE TELEGRAM:\n"
        "1. Presiona el + (clip)\n"
        "2. Selecciona un audio\n"
        "3. El bot lo transcribe, responde con GPT y envía audio\n\n"
        "COMANDOS DE TEXTO:\n"
        "/audio <texto> - Convertir texto a audio\n"
        "/gpt <pregunta> - Respuesta de texto\n"
        "/gpt_audio <pregunta> - Texto + Audio\n\n"
        "VOCES DISPONIBLES:\n"
        "alloy, echo, fable, onyx, nova, shimmer"
    )
    await update.message.reply_text(message)


async def audio_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /audio <texto>"""
    if not gpt_service:
        await update.message.reply_text("ERROR: Servicio de audio deshabilitado. Configura OPENAI_API_KEY")
        return
    
    if not context.args:
        await update.message.reply_text("Uso: /audio <tu texto aquí>")
        return
    
    texto = " ".join(context.args)
    
    try:
        await update.message.reply_text("CARGANDO: Generando audio...")
        
        # Generar audio
        audio_path = gpt_service.text_to_speech(
            text=texto,
            output_path="temp_audio.mp3",
            voice="nova"
        )
        
        # Enviar audio
        with open(audio_path, "rb") as audio_file:
            await update.message.reply_audio(audio_file, caption=f"Texto: {texto[:100]}")
        
        logger.info(f"LISTO: Audio generado para: {texto[:50]}")
    
    except Exception as e:
        logger.error(f"Error generando audio: {e}")
        await update.message.reply_text(f"ERROR: {str(e)}")


async def gpt_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /gpt <pregunta> - Solo respuesta de texto"""
    if not gpt_service:
        await update.message.reply_text("ERROR: Servicio de GPT deshabilitado. Configura OPENAI_API_KEY")
        return
    
    if not context.args:
        await update.message.reply_text("Uso: /gpt <tu pregunta>")
        return
    
    pregunta = " ".join(context.args)
    
    try:
        await update.message.reply_text("CARGANDO: Consultando ChatGPT...")
        
        respuesta = gpt_service.chat_with_gpt(pregunta)
        
        # Dividir si es muy largo
        if len(respuesta) > 4096:
            for i in range(0, len(respuesta), 4096):
                await update.message.reply_text(respuesta[i:i+4096])
        else:
            await update.message.reply_text(respuesta)
        
        logger.info(f"LISTO: GPT respondio: {respuesta[:50]}")
    
    except Exception as e:
        logger.error(f"Error en GPT: {e}")
        await update.message.reply_text(f"ERROR: {str(e)}")


async def gpt_audio_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /gpt_audio <pregunta> - GPT + Audio"""
    if not gpt_service:
        await update.message.reply_text("ERROR: Servicio deshabilitado. Configura OPENAI_API_KEY")
        return
    
    if not context.args:
        await update.message.reply_text("Uso: /gpt_audio <tu pregunta>")
        return
    
    pregunta = " ".join(context.args)
    
    try:
        await update.message.reply_text("CARGANDO: Consultando ChatGPT y generando audio...")
        
        # Obtener respuesta de GPT
        respuesta = gpt_service.chat_with_gpt(pregunta)
        
        # Generar audio de la respuesta
        audio_path = gpt_service.text_to_speech(
            text=respuesta[:1000],
            output_path="gpt_response_audio.mp3",
            voice="nova"
        )
        
        # Enviar primero el texto (sin markdown para evitar errores)
        if len(respuesta) > 4096:
            for i in range(0, len(respuesta), 4096):
                await update.message.reply_text(respuesta[i:i+4096])
        else:
            await update.message.reply_text(respuesta)
        
        # Luego enviar el audio
        with open(audio_path, "rb") as audio_file:
            await update.message.reply_audio(audio_file, caption="Respuesta de GPT en audio")
        
        logger.info(f"LISTO: GPT + Audio completado")
    
    except Exception as e:
        logger.error(f"Error: {e}")
        await update.message.reply_text(f"ERROR: {str(e)[:150]}")


async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibir audio O voz y responder"""
    logger.info("▶ Audio recibido, procesando...")
    
    try:
        # Detectar si es audio o voz
        if update.message.audio:
            audio_obj = update.message.audio
        elif update.message.voice:
            audio_obj = update.message.voice
        else:
            logger.error("No es audio ni voice!")
            return
        
        # Confirmar recepción
        await update.message.reply_text("⏳ Procesando...")
        
        # Verificar que GPT service existe
        if not gpt_service:
            logger.error("GPT Service no inicializado")
            await update.message.reply_text("ERROR: OPENAI_API_KEY no configurado")
            return
        
        logger.info(f"📥 Descargando audio...")
        file_obj = await context.bot.get_file(audio_obj.file_id)
        audio_bytes = await file_obj.download_as_bytearray()
        logger.info(f"✓ Audio descargado ({len(audio_bytes)} bytes)")
        
        # Transcribir
        logger.info("📢 Transcribiendo con Whisper...")
        try:
            transcript = gpt_service.audio_to_text_bytes(audio_bytes)
            logger.info(f"✓ Texto: {transcript[:60]}")
            await update.message.reply_text(f"📝 Entendí: {transcript}")
        except Exception as e:
            logger.error(f"Error transcribiendo: {e}")
            await update.message.reply_text(f"❌ Error: {str(e)[:80]}")
            return
        
        # ChatGPT
        logger.info("🤖 Consultando ChatGPT...")
        try:
            respuesta = gpt_service.chat_with_gpt(transcript)
            logger.info(f"✓ Respuesta: {respuesta[:60]}")
        except Exception as e:
            logger.error(f"Error ChatGPT: {e}")
            await update.message.reply_text(f"❌ Error: {str(e)[:80]}")
            return
        
        # Enviar respuesta texto
        if len(respuesta) > 4096:
            chunks = [respuesta[i:i+4096] for i in range(0, len(respuesta), 4096)]
            for chunk in chunks:
                await update.message.reply_text(chunk)
        else:
            await update.message.reply_text(respuesta)
        
        # Generar y enviar audio
        logger.info("🎵 Generando audio...")
        try:
            resp_short = respuesta[:500]
            audio_path = gpt_service.text_to_speech(resp_short, output_path="output.mp3", voice="nova")
            logger.info(f"✓ Audio listo")
            
            with open(audio_path, "rb") as af:
                await update.message.reply_audio(af)
            
            logger.info("✓ COMPLETADO")
        except Exception as e:
            logger.error(f"Error generando audio: {e}")
            await update.message.reply_text(f"❌ Error: {str(e)[:80]}")
            return
    
    except Exception as e:
        logger.error(f"Error crítico: {e}", exc_info=True)
        try:
            await update.message.reply_text(f"❌ Error: {str(e)[:80]}")
        except:
            pass


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manejar mensajes de texto normales"""
    await update.message.reply_text(f"Recibiste: {update.message.text}\n\nUsa /help para ver comandos disponibles")


def main():
    """Función principal para iniciar el bot"""
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Agregar manejadores de comandos
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("audio", audio_command))
    app.add_handler(CommandHandler("gpt", gpt_command))
    app.add_handler(CommandHandler("gpt_audio", gpt_audio_command))
    
    app.add_handler(MessageHandler(filters.AUDIO | filters.VOICE, handle_audio))
    
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("INICIADO: Bot iniciado con funciones de audio y GPT")
    logger.info("LISTO: Puedes enviar audios directamente al bot")
    app.run_polling()


if __name__ == "__main__":
    main()
