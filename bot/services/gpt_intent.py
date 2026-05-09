import os
import sys
import json
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_contratos",
            "description": "Busca contratos en SECOP II con filtros opcionales",
            "parameters": {
                "type": "object",
                "properties": {
                    "departamento": {"type": "string", "description": "Departamento de Colombia"},
                    "ciudad": {"type": "string", "description": "Ciudad"},
                    "valor_min": {"type": "number", "description": "Valor minimo del contrato en COP"},
                    "valor_max": {"type": "number", "description": "Valor maximo del contrato en COP"},
                    "modalidad": {"type": "string", "description": "Modalidad de contratacion"},
                    "entidad": {"type": "string", "description": "Nombre de la entidad"},
                    "fecha_inicio": {"type": "string", "description": "Fecha inicio YYYY-MM-DD"},
                    "fecha_fin": {"type": "string", "description": "Fecha fin YYYY-MM-DD"},
                    "limite": {"type": "number", "description": "Cantidad maxima de resultados, default 5, max 10"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "auditar_contrato",
            "description": "Realiza o consulta la auditoria de riesgo de un contrato especifico",
            "parameters": {
                "type": "object",
                "properties": {
                    "id_contrato": {"type": "string", "description": "ID del contrato (ej: CO1.PCCNTR.XXXXX)"},
                },
                "required": ["id_contrato"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_infografia",
            "description": "Genera o retorna la infografia de riesgo de un contrato",
            "parameters": {
                "type": "object",
                "properties": {
                    "id_contrato": {"type": "string", "description": "ID del contrato"},
                },
                "required": ["id_contrato"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "contratos_alto_riesgo",
            "description": "Obtiene contratos auditados con alto score de riesgo, opcionalmente por region",
            "parameters": {
                "type": "object",
                "properties": {
                    "departamento": {"type": "string", "description": "Departamento de Colombia"},
                    "limite": {"type": "number", "description": "Cantidad maxima, default 5"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_auditorias",
            "description": "Lista TODOS los contratos que ya han sido auditados, con su departamento, entidad, valor y nivel de riesgo. Usar cuando el usuario pregunta qué contratos ha auditado, de qué región/departamento/lugar son los auditados, o quiere un resumen de todas las auditorías.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nivel_riesgo": {
                        "type": "string",
                        "enum": ["todos", "alto", "medio", "bajo"],
                        "description": "Filtrar por nivel de riesgo. Usar 'todos' o no enviarlo para traer todos.",
                    },
                    "limite": {"type": "number", "description": "Cantidad maxima de resultados, default 10"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cambiar_preferencia",
            "description": "Cambia la preferencia de respuesta del usuario entre texto y audio",
            "parameters": {
                "type": "object",
                "properties": {
                    "formato": {"type": "string", "enum": ["texto", "audio"]},
                },
                "required": ["formato"],
            },
        },
    },
]

SYSTEM_PROMPT = """Eres el asistente del sistema Oculus Auditor, que analiza contratos publicos colombianos del SECOP II.
Interpreta el mensaje del usuario y determina que funcion ejecutar con que parametros.
Siempre responde con una function call apropiada.

Reglas de enrutamiento:
- Si el usuario pide BUSCAR contratos en SECOP (nuevos, de un lugar, por valor), usa buscar_contratos.
- Si pide AUDITAR o ANALIZAR un contrato especifico con su ID, usa auditar_contrato.
- Si pide una infografia o imagen de riesgo de un contrato especifico, usa obtener_infografia.
- Si pregunta exclusivamente por contratos de ALTO RIESGO (los mas sospechosos), usa contratos_alto_riesgo.
- Si pregunta QUE contratos ya fueron auditados, de QUE REGION/DEPARTAMENTO/LUGAR son los auditados, o quiere ver el historial de auditorias, usa listar_auditorias.
- Si pide cambiar entre texto y audio, usa cambiar_preferencia.

Para nombres de departamentos, usa la forma corta: "Antioquia", "Valle", "Valle del Cauca", "Bogota", "Cundinamarca", etc.

Ejemplos:
- "de que departamento son los contratos auditados" → listar_auditorias
- "que contratos has auditado" → listar_auditorias
- "muestra todos los auditados" → listar_auditorias
- "contratos de alto riesgo en Bogota" → contratos_alto_riesgo con departamento=Bogota
- "busca contratos en Antioquia" → buscar_contratos con departamento=Antioquia"""


def process_natural_language(text: str) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"intent": "error", "message": "OPENAI_API_KEY no configurada"}

    client = OpenAI(api_key=api_key)

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.1,
            max_tokens=500,
        )

        msg = response.choices[0].message

        if msg.tool_calls and len(msg.tool_calls) > 0:
            tool_call = msg.tool_calls[0]
            func_name = tool_call.function.name
            func_args = json.loads(tool_call.function.arguments)
            return {"intent": func_name, "params": func_args}

        return {"intent": "unknown", "message": msg.content or "No entendi tu mensaje"}

    except Exception as e:
        logger.error(f"Error en gpt_intent: {e}")
        return {"intent": "error", "message": str(e)}


def generate_response(original_text: str, intent_result: dict, func_result: dict, prefer_audio: bool = False) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return json.dumps(func_result, indent=2, ensure_ascii=False)

    client = OpenAI(api_key=api_key)

    if prefer_audio:
        prompt = f"""El usuario pregunto: "{original_text}"

El sistema obtuvo este resultado:
{json.dumps(func_result, indent=2, ensure_ascii=False)}

Responde en espanol en 2 o 3 oraciones cortas y directas, como si fuera un mensaje de voz.
Sin formato markdown, sin listas, sin asteriscos. Solo las cifras y datos clave que el usuario pidio.
Si hay varios items (contratos, auditorias), menciona solo los datos mas importantes de cada uno en una sola frase cada uno."""
        max_tokens = 200
    else:
        prompt = f"""El usuario pregunto: "{original_text}"

El sistema ejecuto la funcion {intent_result.get('intent')} y obtuvo este resultado:

{json.dumps(func_result, indent=2, ensure_ascii=False)}

Genera una respuesta natural en espanol, util y directa, basada en estos datos.
Si es una lista de contratos, resumelos en formato legible mencionando entidad, valor, modalidad y departamento.
Si es una auditoria, menciona el score total, nivel de riesgo y las alertas principales.
Si es una infografia, indica que se genero la imagen y da el enlace.
Se conciso pero informativo."""
        max_tokens = 600

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generando respuesta: {e}")
        return str(func_result)
