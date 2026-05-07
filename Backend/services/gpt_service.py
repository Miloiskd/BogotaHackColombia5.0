"""
Módulo para conectar con OpenAI GPT (Text-to-Speech)
Genera audio a partir de texto usando el modelo TTS de OpenAI
"""
import os
import logging
from io import BytesIO
from pathlib import Path
from openai import OpenAI

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class GPTService:
    """
    Clase para manejar la conexión con OpenAI TTS
    """
    
    def __init__(self, api_key: str = OPENAI_API_KEY):
        """
        Inicializar el cliente de OpenAI
        
        Args:
            api_key: Clave API de OpenAI
        """
        if not api_key:
            raise ValueError("OPENAI_API_KEY no está configurado en el archivo .env")
        
        self.client = OpenAI(api_key=api_key)
        logger.info("OpenAI TTS Service inicializado")
    
    def text_to_speech(self, text: str, output_path: str = "output_audio.mp3", 
                       voice: str = "alloy", speed: float = 1.0) -> str:
        """
        Convertir texto a audio usando OpenAI TTS
        
        Args:
            text: Texto a convertir
            output_path: Ruta del archivo de salida
            voice: Voz a usar (alloy, echo, fable, onyx, nova, shimmer)
            speed: Velocidad del audio (0.25 - 4.0)
        
        Returns:
            Ruta del archivo generado
        """
        try:
            logger.info(f"Generando audio para: {text[:50]}...")
            
            # Validar que el texto no sea vacío
            if not text or len(text.strip()) == 0:
                raise ValueError("El texto no puede estar vacío")
            
            # Validar velocidad
            if not (0.25 <= speed <= 4.0):
                speed = 1.0
                logger.warning(f"Velocidad ajustada a 1.0 (válido: 0.25-4.0)")
            
            # Generar audio
            response = self.client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text,
                speed=speed
            )
            
            # Guardar archivo
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            response.stream_to_file(output_path)
            
            logger.info(f"Audio generado: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Error generando audio: {e}")
            raise
    
    def audio_to_text(self, audio_file) -> str:
        """
        Convertir audio a texto usando OpenAI Whisper
        
        Args:
            audio_file: Archivo de audio (objeto file-like)
        
        Returns:
            Texto transcrito
        """
        try:
            logger.info("Transcribiendo audio con Whisper...")
            
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            
            text = transcript.text
            logger.info(f"Transcripción: {text[:50]}...")
            return text
        
        except Exception as e:
            logger.error(f"Error transcribiendo audio: {e}")
            raise
    
    def audio_to_text_bytes(self, audio_bytes) -> str:
        """
        Convertir audio (desde bytes) a texto usando Whisper
        Soporta OGG, MP3, WAV, etc.
        
        Args:
            audio_bytes: Bytes del archivo de audio
        
        Returns:
            Texto transcrito
        """
        try:
            logger.info(f"Transcribiendo audio: {len(audio_bytes)} bytes")
            
            try:
                logger.info("Intentando OGG directo...")
                audio_file = BytesIO(audio_bytes)
                audio_file.name = "audio.ogg"
                
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
                
                text = transcript.text
                logger.info(f"✓ Transcripción (OGG): {text}")
                return text
            
            except Exception as e:
                logger.warning(f"OGG falló: {str(e)[:50]}")
            
            try:
                logger.info("Intentando conversión OGG->WAV...")
                from pydub import AudioSegment
                
                audio = AudioSegment.from_ogg(BytesIO(audio_bytes))
                wav_buffer = BytesIO()
                audio.export(wav_buffer, format="wav")
                wav_buffer.seek(0)
                wav_buffer.name = "audio.wav"
                
                logger.info("WAV convertido, enviando a Whisper...")
                
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=wav_buffer
                )
                
                text = transcript.text
                logger.info(f"✓ Transcripción (WAV): {text}")
                return text
            
            except ImportError as e:
                logger.error(f"pydub no disponible: {e}")
            except Exception as e:
                logger.warning(f"WAV falló: {str(e)[:50]}")
            
            # Intentar convertir OGG a MP3
            try:
                logger.info("Intentando conversión OGG->MP3...")
                from pydub import AudioSegment
                
                audio = AudioSegment.from_ogg(BytesIO(audio_bytes))
                mp3_buffer = BytesIO()
                audio.export(mp3_buffer, format="mp3", bitrate="192k")
                mp3_buffer.seek(0)
                mp3_buffer.name = "audio.mp3"
                
                logger.info("MP3 convertido, enviando a Whisper...")
                
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=mp3_buffer
                )
                
                text = transcript.text
                logger.info(f"✓ Transcripción (MP3): {text}")
                return text
            
            except Exception as e:
                logger.warning(f"MP3 falló: {str(e)[:50]}")
            
            logger.error("Todas las estrategias fallaron")
            raise Exception("No se pudo transcribir el audio. Instala ffmpeg.")
        
        except Exception as e:
            logger.error(f"Error transcribiendo: {e}", exc_info=True)
            raise
    
    def get_available_voices(self) -> list:
        """
        Obtener lista de voces disponibles
        
        Returns:
            Lista de voces disponibles
        """
        return ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
    
    def chat_with_gpt(self, message: str, system_message: str = None) -> str:
        """
        Enviar mensaje a ChatGPT y obtener respuesta
        
        Args:
            message: Mensaje del usuario
            system_message: Instrucciones del sistema (opcional)
        
        Returns:
            Respuesta de ChatGPT
        """
        try:
            logger.info(f"Enviando mensaje a ChatGPT: {message[:50]}...")
            
            messages = []
            if system_message:
                messages.append({
                    "role": "system",
                    "content": system_message
                })
            
            messages.append({
                "role": "user",
                "content": message
            })
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content
            logger.info(f"✓ Respuesta: {answer[:50]}...")
            return answer
        
        except Exception as e:
            logger.error(f"Error en ChatGPT: {e}")
            raise
    
    def text_to_speech_from_gpt(self, user_message: str, voice: str = "alloy", 
                                speed: float = 1.0, system_message: str = None) -> str:
        """
        Obtener respuesta de ChatGPT y convertirla a audio en un solo paso
        
        Args:
            user_message: Pregunta/mensaje del usuario
            voice: Voz para el audio
            speed: Velocidad del audio
            system_message: Instrucciones del sistema
        
        Returns:
            Ruta del archivo de audio
        """
        try:
            # Obtener respuesta de ChatGPT
            gpt_response = self.chat_with_gpt(user_message, system_message)
            
            # Convertir a audio
            output_path = "gpt_response_audio.mp3"
            audio_path = self.text_to_speech(
                gpt_response, 
                output_path=output_path,
                voice=voice, 
                speed=speed
            )
            
            return audio_path
        
        except Exception as e:
            logger.error(f"Error en proceso completo: {e}")
            raise
