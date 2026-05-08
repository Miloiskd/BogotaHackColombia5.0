import os
import logging
from io import BytesIO
from openai import OpenAI

logger = logging.getLogger(__name__)


def text_to_speech(text: str) -> bytes:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY no configurada")

    if len(text) > 4000:
        text = text[:4000] + "..."

    client = OpenAI(api_key=api_key)

    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=text,
        )

        audio_bytes = BytesIO()
        for chunk in response.iter_bytes():
            audio_bytes.write(chunk)
        audio_bytes.seek(0)
        return audio_bytes.getvalue()

    except Exception as e:
        logger.error(f"Error TTS: {e}")
        raise
