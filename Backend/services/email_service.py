import os
import logging
import resend
from config import get_settings

logger = logging.getLogger(__name__)


def send_report_email(
    to_email: str,
    id_contrato: str,
    pdf_path: str,
    score_total: int = 0,
    nivel_riesgo: str = "bajo",
) -> dict:
    settings = get_settings()

    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_"):
        resend.api_key = settings.RESEND_API_KEY
    else:
        logger.error("RESEND_API_KEY not configured")
        return {"success": False, "error": "RESEND_API_KEY not configured"}

    risk_colors = {
        "bajo": "#22c55e",
        "medio": "#eab308",
        "alto": "#ef4444",
    }
    color = risk_colors.get(nivel_riesgo.lower(), "#22c55e")

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #0f172a; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">OCULUS AUDITOR</h1>
    <p style="color: #94a3b8; margin: 8px 0 0;">Reporte de Auditoria de Contrato Publico</p>
    </div>
    <div style="padding: 24px;">
    <h2 style="color: #1e293b;">Contrato: {id_contrato}</h2>
    <div style="text-align: center; margin: 20px 0;">
    <span style="display: inline-block; background: {color}; color: white; padding: 12px 32px; border-radius: 24px; font-size: 20px; font-weight: bold;">
    {score_total} / 100 — {nivel_riesgo.upper()}
    </span>
    </div>
    <p style="color: #475569;">Adjunto encontrara el informe completo en formato PDF con el analisis detallado de la auditoria del contrato {id_contrato}.</p>
    <hr style="border-color: #e2e8f0; margin: 20px 0;">
    <p style="color: #94a3b8; font-size: 12px;">Generado por Oculus Auditor | Datos: SECOP II</p>
    </div>
    </div>
    </body>
    </html>
    """

    with open(pdf_path, "rb") as f:
        pdf_content = f.read()

    try:
        params = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"Oculus Auditor — Reporte de Auditoria: {id_contrato}",
            "html": html_content,
            "attachments": [
                {
                    "filename": f"auditoria_{id_contrato}.pdf",
                    "content": list(pdf_content),
                }
            ],
        }
        response = resend.Emails.send(params)
        logger.info(f"Email sent to {to_email}: {response}")
        return {"success": True, "message_id": response.get("id", "")}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"success": False, "error": str(e)}
