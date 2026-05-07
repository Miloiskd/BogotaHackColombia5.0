"""
Script principal para ejecutar el bot
"""
import logging
from telegram_bot.bot import main

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    main()
