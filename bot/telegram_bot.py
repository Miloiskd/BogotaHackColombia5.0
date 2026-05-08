import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from handlers.text_handler import text_message_handler
from handlers.audio_handler import audio_message_handler
from handlers.preference_handler import start_handler, help_handler, format_callback

load_dotenv()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

logging.basicConfig(
    level=logging.INFO,
    format="%(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("oculus-bot")


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await text_message_handler(update, context)


async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await audio_message_handler(update, context)


def main():
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN no configurado en .env")
        return

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("ayuda", help_handler))
    app.add_handler(CommandHandler("help", help_handler))
    app.add_handler(CallbackQueryHandler(format_callback, pattern="^format_"))
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_audio))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    logger.info("Oculus Auditor Bot iniciado")
    app.run_polling()


if __name__ == "__main__":
    main()
