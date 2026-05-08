import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    IMGBB_API_KEY: str = os.getenv("IMGBB_API_KEY", "")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    SECOP_BASE_URL: str = os.getenv("SECOP_BASE_URL", "https://www.datos.gov.co/resource/jbjy-vk9h.json")
    SECOP_APP_TOKEN: str = os.getenv("SECOP_APP_TOKEN", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./oculus.db")
    PDF_OUTPUT_DIR: str = os.getenv("PDF_OUTPUT_DIR", "./pdfs")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
