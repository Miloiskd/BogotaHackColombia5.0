import logging
import os
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger(__name__)

API_URL = "https://www.datos.gov.co/api/v3/views/jbjy-vk9h/query.json"

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
        parts.append(f"upper(nombre_entidad) LIKE upper('%{e}%')")
    if estado_contrato:
        e = estado_contrato.replace("'", "''")
        parts.append(f"estado_contrato='{e}'")
    return " AND ".join(parts) if parts else ""


def _build_soql(
    where: str,
    orden_campo: str = "fecha_de_firma",
    orden_dir: str = "DESC",
) -> str:
    api_field = _api(orden_campo)
    parts = ["SELECT *"]
    if where:
        parts.append(f"WHERE {where}")
    parts.append(f"ORDER BY `{api_field}` {orden_dir}")
    return " ".join(parts)


async def _post_query(
    soql: str,
    page: int = 1,
    page_size: int = 20,
    token: str = "",
) -> list:
    body = {
        "query": soql,
        "page": {"pageNumber": page, "pageSize": page_size},
    }
    headers = {
        "Content-Type": "application/json",
        "X-App-Token": token,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(API_URL, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []


async def _fetch_count(where: str, token: str) -> int:
    try:
        soql = "SELECT count(*) AS total"
        if where:
            soql += f" WHERE {where}"
        body = {
            "query": soql,
            "page": {"pageNumber": 1, "pageSize": 1},
        }
        headers = {"Content-Type": "application/json", "X-App-Token": token}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(API_URL, json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and data:
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

    soql = _build_soql(where, orden_campo, orden_dir)

    raw = await _post_query(soql, page, page_size, token)
    contracts = [_map_contract(r) for r in raw]

    total = 0
    if where:
        total = await _fetch_count(where, token)
    else:
        total = 100000

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
    raw = await _post_query(
        f"SELECT * WHERE id_contrato='{esc}'",
        page=1, page_size=1, token=token,
    )
    if raw:
        return _map_contract(raw[0])
    return None


async def fetch_filter_options(app_token: Optional[str] = None) -> dict:
    token = app_token or _get_token()

    async def _get_values(field: str) -> list:
        try:
            raw = await _post_query(
                f"SELECT `{field}` GROUP BY `{field}` ORDER BY `{field}` LIMIT 50",
                page=1, page_size=50, token=token,
            )
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
