import asyncio
import hashlib
import json
import logging
import os
import time
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger(__name__)

_CACHE: dict = {}
_CACHE_TTL = 300  # 5 minutes


def _cache_key(params: dict) -> str:
    return hashlib.md5(json.dumps(sorted(params.items()), ensure_ascii=False).encode()).hexdigest()


def _cache_get(key: str):
    entry = _CACHE.get(key)
    if entry and time.time() - entry[0] < _CACHE_TTL:
        return entry[1]
    return None


def _cache_set(key: str, value):
    _CACHE[key] = (time.time(), value)

# Endpoint público estándar de Socrata (no requiere autenticación)
BASE_URL = "https://www.datos.gov.co/resource/jbjy-vk9h.json"

# Campo interno -> campo real de la API
_F2A = {
    "localizacion": "localizaci_n",
    "justificacion_modalidad": "justificacion_modalidad_de",
    "fecha_de_inicio": "fecha_de_inicio_del_contrato",
    "fecha_de_fin": "fecha_de_fin_del_contrato",
}
_A2F = {v: k for k, v in _F2A.items()}
_EXCLUDE = {":id", ":version", ":created_at", ":updated_at"}


def _api(field: str) -> str:
    return _F2A.get(field, field)


def _map_contract(raw: dict) -> dict:
    mapped = {}
    for k, v in raw.items():
        if k in _EXCLUDE:
            continue
        internal = _A2F.get(k, k)
        if k == "urlproceso" and isinstance(v, dict):
            val = v.get("url", str(v))
        elif k == "valor_del_contrato":
            try:
                val = float(v)
            except (ValueError, TypeError):
                val = v
        elif k == "dias_adicionados":
            try:
                val = int(v)
            except (ValueError, TypeError):
                val = 0
        else:
            val = v
        mapped[internal] = val
    return mapped


def _get_token() -> str:
    return os.getenv("SECOP_APP_TOKEN", "")


def _build_where(
    departamento: Optional[str] = None,
    ciudad: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    valor_min: Optional[float] = None,
    valor_max: Optional[float] = None,
    modalidad: Optional[str] = None,
    sector: Optional[str] = None,
    nombre_entidad: Optional[str] = None,
    estado_contrato: Optional[str] = None,
) -> str:
    parts = []
    if departamento:
        e = departamento.replace("'", "''")
        parts.append(f"departamento='{e}'")
    if ciudad:
        e = ciudad.replace("'", "''")
        parts.append(f"ciudad='{e}'")
    if fecha_inicio:
        parts.append(f"fecha_de_firma >= '{fecha_inicio}'")
    if fecha_fin:
        parts.append(f"fecha_de_firma <= '{fecha_fin}'")
    if valor_min is not None:
        parts.append(f"valor_del_contrato >= {valor_min}")
    if valor_max is not None:
        parts.append(f"valor_del_contrato <= {valor_max}")
    if modalidad:
        e = modalidad.replace("'", "''")
        parts.append(f"modalidad_de_contratacion='{e}'")
    if sector:
        e = sector.replace("'", "''")
        parts.append(f"sector='{e}'")
    if nombre_entidad:
        e = nombre_entidad.replace("'", "''")
        parts.append(f"upper(nombre_entidad) like upper('%{e}%')")
    if estado_contrato:
        e = estado_contrato.replace("'", "''")
        parts.append(f"estado_contrato='{e}'")
    return " AND ".join(parts) if parts else ""


async def _get_query(params: dict, token: str = "") -> list:
    key = _cache_key({**params, "__token__": bool(token)})
    cached = _cache_get(key)
    if cached is not None:
        return cached
    headers = {"Accept": "application/json"}
    if token:
        headers["X-App-Token"] = token
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(BASE_URL, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        result = data if isinstance(data, list) else []
    _cache_set(key, result)
    return result


async def _fetch_count(where: str, token: str) -> int:
    try:
        params: dict = {"$select": "count(*) as total"}
        if where:
            params["$where"] = where
        data = await _get_query(params, token)
        if data:
            return int(data[0].get("total", 0))
    except Exception as e:
        logger.warning(f"Count query failed: {e}")
    return 0


async def fetch_contracts(
    page: int = 1,
    page_size: int = 20,
    departamento: Optional[str] = None,
    ciudad: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    valor_min: Optional[float] = None,
    valor_max: Optional[float] = None,
    modalidad: Optional[str] = None,
    sector: Optional[str] = None,
    nombre_entidad: Optional[str] = None,
    estado_contrato: Optional[str] = None,
    orden_campo: str = "fecha_de_firma",
    orden_dir: str = "DESC",
    app_token: Optional[str] = None,
) -> dict:
    token = app_token or _get_token()
    where = _build_where(
        departamento=departamento, ciudad=ciudad,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
        valor_min=valor_min, valor_max=valor_max,
        modalidad=modalidad, sector=sector,
        nombre_entidad=nombre_entidad, estado_contrato=estado_contrato,
    )

    api_field = _api(orden_campo)
    params: dict = {
        "$limit": page_size,
        "$offset": (page - 1) * page_size,
        "$order": f"{api_field} {orden_dir}",
    }
    if where:
        params["$where"] = where

    if where:
        raw, total = await asyncio.gather(
            _get_query(params, token),
            _fetch_count(where, token),
        )
    else:
        raw = await _get_query(params, token)
        total = 100000

    contracts = [_map_contract(r) for r in raw]

    return {
        "contracts": contracts,
        "total": total,
        "page": page,
        "pages": max(1, min((total + page_size - 1) // page_size, 100)),
    }


async def fetch_contract_by_id(
    id_contrato: str,
    app_token: Optional[str] = None,
) -> Optional[dict]:
    token = app_token or _get_token()
    esc = id_contrato.replace("'", "''")
    params = {
        "$where": f"id_contrato='{esc}'",
        "$limit": 1,
    }
    raw = await _get_query(params, token)
    if raw:
        return _map_contract(raw[0])
    return None


async def fetch_filter_options(app_token: Optional[str] = None) -> dict:
    token = app_token or _get_token()

    async def _get_values(field: str) -> list:
        try:
            params = {
                "$select": field,
                "$group": field,
                "$order": field,
                "$limit": 50,
            }
            raw = await _get_query(params, token)
            return sorted({str(r[field]) for r in raw if r.get(field)})
        except Exception as e:
            logger.warning(f"Error fetching {field}: {e}")
            return []

    deptos = await _get_values("departamento")
    mods = await _get_values("modalidad_de_contratacion")
    secs = await _get_values("sector")

    return {
        "departamentos": deptos or [
            "Antioquia", "Bogota D.C.", "Valle del Cauca", "Cundinamarca",
            "Atlantico", "Santander", "Bolivar", "Norte de Santander",
            "Boyaca", "Tolima", "Narino", "Huila", "Cauca", "Caldas",
            "Cordoba", "Meta", "Magdalena", "Cesar", "Risaralda",
        ],
        "modalidades": mods or [
            "Contratacion directa", "Licitacion Publica",
            "Seleccion Abreviada", "Minima Cuantia",
            "Concurso de Meritos", "Regimen Especial",
        ],
        "sectores": secs or [
            "Salud", "Educacion", "Defensa", "Transporte",
            "Infraestructura", "Tecnologia", "Agricultura",
            "Minas y Energia", "Ambiente", "Cultura",
        ],
    }
