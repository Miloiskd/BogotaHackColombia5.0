import io
import os
import logging
import textwrap
from datetime import datetime
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Wedge, FancyBboxPatch
import matplotlib.patheffects as pe
import numpy as np
import requests

logger = logging.getLogger(__name__)

GREEN = "#22c55e"
YELLOW = "#eab308"
RED = "#ef4444"
BG = "#0f172a"
CARD_BG = "#1e293b"
TEXT_COLOR = "#f8fafc"
TEXT_MUTED = "#94a3b8"
WHITE = "#ffffff"


def _fmt_money(v) -> str:
    try:
        val = float(v)
        if val >= 1_000_000_000:
            return f"${val/1_000_000_000:.1f}MM COP"
        elif val >= 1_000_000:
            return f"${val/1_000_000:.1f}M COP"
        else:
            return f"${val:,.0f} COP"
    except (ValueError, TypeError):
        return str(v)


def _score_color(score: int) -> str:
    if score <= 30:
        return GREEN
    elif score <= 60:
        return YELLOW
    else:
        return RED


def _draw_gauge(ax, score: int, cx=0.0, cy=0.0, radius=1.0):
    color = _score_color(score)
    start_angle = 180
    end_angle = 180 - (score / 100 * 180)

    bg_arc = Arc((cx, cy), radius * 2, radius * 2, angle=0,
                 theta1=0, theta2=180, color="#334155", lw=18, zorder=1)
    ax.add_patch(bg_arc)

    fg_arc = Arc((cx, cy), radius * 2, radius * 2, angle=0,
                 theta1=end_angle, theta2=180, color=color, lw=18, zorder=2)
    ax.add_patch(fg_arc)

    ax.text(cx, cy - 0.35, str(score), fontsize=40, fontweight="bold",
            color=color, ha="center", va="center", zorder=3,
            path_effects=[pe.withStroke(linewidth=2, foreground=BG)])

    nivel = "BAJO" if score <= 30 else "MEDIO" if score <= 60 else "ALTO"
    ax.text(cx, cy - 0.75, f"RIESGO {nivel}", fontsize=11, color=TEXT_MUTED,
            ha="center", va="center", zorder=3)

    ax.set_xlim(-1.3, 1.3)
    ax.set_ylim(-0.3, 1.6)
    ax.set_aspect("equal")
    ax.axis("off")


def _draw_card(ax, x, y, w, h, title, value, icon=""):
    rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05",
                          facecolor=CARD_BG, edgecolor="#334155", linewidth=0.5,
                          zorder=1)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h - 0.15, title, fontsize=7, color=TEXT_MUTED,
            ha="center", va="top", zorder=2)
    ax.text(x + w/2, y + 0.1, value, fontsize=9, fontweight="bold",
            color=WHITE, ha="center", va="center", zorder=2)


def generate_infographic(contract: dict, audit_data: dict) -> bytes:
    fig = plt.figure(figsize=(12, 8), facecolor=BG)
    gs = fig.add_gridspec(3, 3, height_ratios=[0.8, 2.5, 1.8],
                          hspace=0.3, wspace=0.25,
                          left=0.04, right=0.96, top=0.95, bottom=0.04)

    ax_header = fig.add_subplot(gs[0, :])
    ax_header.set_facecolor(BG)
    ax_header.axis("off")
    ax_header.text(0.02, 0.5, "OCULUS", fontsize=22, fontweight="bold",
                   color=WHITE, va="center",
                   fontfamily="monospace",
                   path_effects=[pe.withStroke(linewidth=1, foreground=WHITE)])
    ax_header.text(0.22, 0.5, "AUDITOR", fontsize=22, fontweight="light",
                   color=TEXT_MUTED, va="center", fontfamily="monospace")
    entidad = contract.get("nombre_entidad", "Entidad")
    if len(entidad) > 50:
        entidad = entidad[:47] + "..."
    ax_header.text(0.98, 0.7, entidad, fontsize=9, color=TEXT_MUTED,
                   ha="right", va="center")
    ax_header.text(0.98, 0.3, contract.get("id_contrato", ""), fontsize=7,
                   color=TEXT_MUTED, ha="right", va="center",
                   fontfamily="monospace")
    ax_header.plot([0.02, 0.96], [0.02, 0.02], color="#334155", lw=0.5,
                   transform=ax_header.transAxes)

    score = audit_data.get("audit", {}).get("score_total", 0)
    ax_gauge = fig.add_subplot(gs[1, 0])
    ax_gauge.set_facecolor(BG)
    _draw_gauge(ax_gauge, score)

    ax_cards = fig.add_subplot(gs[1, 1:])
    ax_cards.set_facecolor(BG)
    ax_cards.set_xlim(0, 6)
    ax_cards.set_ylim(0, 6)
    ax_cards.axis("off")

    cards = [
        ("VALOR", _fmt_money(contract.get("valor_del_contrato"))),
        ("MODALIDAD", contract.get("modalidad_de_contratacion", "N/D")),
        ("TIPO", contract.get("tipo_de_contrato", "N/D")),
        ("DEPARTAMENTO", contract.get("departamento", "N/D")),
        ("PROVEEDOR", contract.get("proveedor_adjudicado", "N/D")[:30]),
        ("FECHA FIRMA", str(contract.get("fecha_de_firma", "N/D"))[:10]),
    ]

    for i, (title, val) in enumerate(cards):
        row = i // 2
        col = i % 2
        _draw_card(ax_cards, col * 3.05, 5.2 - row * 2.6, 2.8, 2.2, title, val)

    ax_alerts = fig.add_subplot(gs[2, :2])
    ax_alerts.set_facecolor(BG)
    ax_alerts.set_xlim(0, 10)
    ax_alerts.set_ylim(0, 10)
    ax_alerts.axis("off")
    ax_alerts.text(0.5, 9.5, "ALERTAS DETECTADAS", fontsize=11,
                   fontweight="bold", color=WHITE, va="top")

    alerts = audit_data.get("alerts", [])
    alerts_sorted = sorted(alerts, key=lambda a: a.get("puntos", 0), reverse=True)
    max_display = 8

    severity_icons = {"alta": "!", "media": "~", "baja": "-"}
    severity_colors = {"alta": RED, "media": YELLOW, "baja": "#3b82f6"}

    for i, alert in enumerate(alerts_sorted[:max_display]):
        y_bottom = 8.5 - i * 1.0
        sev = alert.get("severidad", "media")
        color = severity_colors.get(sev, TEXT_MUTED)
        icon = severity_icons.get(sev, "-")

        ax_alerts.text(0.3, y_bottom, icon, fontsize=14, fontweight="bold",
                       color=color, ha="center", va="center")
        titulo = alert.get("titulo", "")
        if len(titulo) > 45:
            titulo = titulo[:42] + "..."
        ax_alerts.text(0.7, y_bottom + 0.25, titulo, fontsize=8,
                       fontweight="bold", color=WHITE, va="center")
        ax_alerts.text(0.7, y_bottom - 0.25,
                       f"{alert.get('categoria', '').upper()}  |  {sev.upper()}  |  {alert.get('puntos', 0)} pts",
                       fontsize=6, color=TEXT_MUTED, va="center")

    ax_resumen = fig.add_subplot(gs[2, 2])
    ax_resumen.set_facecolor(CARD_BG)
    ax_resumen.set_xlim(0, 10)
    ax_resumen.set_ylim(0, 10)
    ax_resumen.axis("off")
    ax_resumen.text(0.5, 9.5, "RESUMEN", fontsize=10, fontweight="bold",
                    color=WHITE, va="top")
    resumen = audit_data.get("audit", {}).get("resumen_ejecutivo", "")
    wrapped = textwrap.fill(resumen, width=38)
    ax_resumen.text(0.5, 8.5, wrapped, fontsize=7, color=TEXT_MUTED,
                    va="top", linespacing=1.5)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor=BG, edgecolor="none",
                bbox_inches="tight", pad_inches=0.3)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def upload_to_imgbb(image_bytes: bytes, api_key: str) -> dict:
    url = "https://api.imgbb.com/1/upload"
    files = {"image": ("infographic.png", image_bytes, "image/png")}
    data = {"key": api_key}
    try:
        resp = requests.post(url, files=files, data=data, timeout=30)
        result = resp.json()
        if result.get("success"):
            return {
                "imgbb_url": result["data"]["url"],
                "imgbb_delete_url": result["data"].get("delete_url", ""),
            }
        logger.error(f"imgbb upload failed: {result}")
        return {}
    except Exception as e:
        logger.error(f"imgbb upload error: {e}")
        return {}


def get_or_generate_infographic(contract: dict, audit_data: dict,
                                api_key: str, db_session) -> str:
    id_contrato = contract.get("id_contrato")

    from models import Infographic
    existing = db_session.query(Infographic).filter(
        Infographic.id_contrato == id_contrato
    ).first()
    if existing:
        return existing.imgbb_url

    png_bytes = generate_infographic(contract, audit_data)
    if not api_key:
        logger.warning("IMGBB_API_KEY not configured, saving locally")
        return ""

    result = upload_to_imgbb(png_bytes, api_key)
    if result:
        infographic = Infographic(
            id_contrato=id_contrato,
            imgbb_url=result["imgbb_url"],
            imgbb_delete_url=result.get("imgbb_delete_url", ""),
        )
        db_session.add(infographic)
        db_session.commit()
        return result["imgbb_url"]

    return ""
