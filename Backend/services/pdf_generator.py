import os
import logging
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import (
    HexColor, black, white, grey, lightgrey, darkgrey
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)

logger = logging.getLogger(__name__)

GREEN = HexColor("#22c55e")
YELLOW = HexColor("#eab308")
RED = HexColor("#ef4444")
DARK_BG = HexColor("#1e293b")
CARD_BG = HexColor("#f1f5f9")
LIGHT_RED = HexColor("#fee2e2")
LIGHT_YELLOW = HexColor("#fef9c3")
LIGHT_BLUE = HexColor("#dbeafe")
PRIMARY = HexColor("#2563eb")


def _fmt_money(val) -> str:
    try:
        v = float(val)
        return f"${v:,.0f} COP"
    except (ValueError, TypeError):
        return str(val)


def _fmt_date(val) -> str:
    if not val:
        return "N/D"
    try:
        d = str(val)[:10]
        parsed = datetime.strptime(d, "%Y-%m-%d")
        return parsed.strftime("%d/%m/%Y")
    except ValueError:
        return str(val)


def generate_pdf(contract: dict, audit_data: dict, output_dir: str = "./pdfs") -> str:
    id_contrato = contract.get("id_contrato", "unknown")
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{id_contrato}.pdf")

    doc = SimpleDocTemplate(
        file_path, pagesize=A4,
        topMargin=2*cm, bottomMargin=2*cm,
        leftMargin=2*cm, rightMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "CoverTitle", parent=styles["Title"],
        fontSize=22, textColor=black, alignment=TA_CENTER,
        spaceAfter=12, spaceBefore=40,
    ))
    styles.add(ParagraphStyle(
        "SectionTitle", parent=styles["Heading2"],
        fontSize=14, textColor=PRIMARY, spaceBefore=20, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        "BodyText2", parent=styles["BodyText"],
        fontSize=9, leading=13, alignment=TA_JUSTIFY, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "CardText", parent=styles["Normal"],
        fontSize=9, leading=12,
    ))
    styles.add(ParagraphStyle(
        "TableHeader", parent=styles["Normal"],
        fontSize=8, textColor=white, alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        "TableCell", parent=styles["Normal"],
        fontSize=8, leading=10,
    ))

    story = []

    risk_color = GREEN
    audit = audit_data.get("audit", {})
    nivel = audit.get("nivel_riesgo", "bajo").lower()
    if nivel == "medio":
        risk_color = YELLOW
    elif nivel == "alto":
        risk_color = RED

    story.append(Spacer(1, 80))
    story.append(Paragraph("OCULUS", styles["Title"]))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="60%", thickness=2, color=PRIMARY))
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "INFORME DE AUDITORIA DE CONTRATO PUBLICO",
        styles["CoverTitle"],
    ))
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        f"<b>Entidad:</b> {contract.get('nombre_entidad', 'N/D')}",
        styles["CardText"],
    ))
    story.append(Paragraph(
        f"<b>Contrato:</b> {id_contrato}",
        styles["CardText"],
    ))
    story.append(Spacer(1, 15))

    nivel_label = nivel.upper()
    story.append(Paragraph(
        f'<font size="16" color="{risk_color}"><b>NIVEL DE RIESGO: {nivel_label}</b></font>',
        styles["CardText"],
    ))
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        f"<b>Fecha de generacion:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        styles["CardText"],
    ))
    story.append(PageBreak())

    story.append(Paragraph("1. RESUMEN EJECUTIVO", styles["SectionTitle"]))
    story.append(Paragraph(audit.get("resumen_ejecutivo", "N/D"), styles["BodyText2"]))
    story.append(Spacer(1, 10))

    summary_data = [
        ["Valor", _fmt_money(contract.get("valor_del_contrato"))],
        ["Modalidad", contract.get("modalidad_de_contratacion", "N/D")],
        ["Tipo de Contrato", contract.get("tipo_de_contrato", "N/D")],
        ["Proveedor", contract.get("proveedor_adjudicado", "N/D")],
        ["Departamento", contract.get("departamento", "N/D")],
    ]
    summary_table = Table(summary_data, colWidths=[4*cm, 10*cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), CARD_BG),
        ("BACKGROUND", (1, 0), (1, -1), white),
        ("TEXTCOLOR", (0, 0), (-1, -1), black),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, grey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)
    story.append(PageBreak())

    story.append(Paragraph("2. SCORE DE RIESGO", styles["SectionTitle"]))
    story.append(Paragraph(
        f'<font size="28" color="{risk_color}"><b>{audit.get("score_total", 0)} / 100</b></font>',
        ParagraphStyle("ScoreBig", parent=styles["CardText"], alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 10))

    score_data = [
        ["Componente", "Puntaje", "Maximo"],
        ["Reglas Automaticas", str(audit.get("score_reglas", 0)), "40"],
        ["Analisis GPT (IA)", str(audit.get("score_gpt", 0)), "60"],
        ["TOTAL", str(audit.get("score_total", 0)), "100"],
    ]
    score_table = Table(score_data, colWidths=[6*cm, 4*cm, 4*cm])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 1), (-1, -2), CARD_BG),
        ("BACKGROUND", (0, -1), (-1, -1), DARK_BG),
        ("TEXTCOLOR", (0, -1), (-1, -1), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, grey),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(score_table)
    story.append(PageBreak())

    story.append(Paragraph("3. SENALES DE ALERTA DETECTADAS", styles["SectionTitle"]))

    alerts = audit_data.get("alerts", [])
    auto_alerts = [a for a in alerts if a.get("tipo") == "automatica"]
    gpt_alerts = [a for a in alerts if a.get("tipo") == "gpt"]

    alert_header = ["Categoria", "Titulo", "Severidad", "Puntos"]
    alert_widths = [2.5*cm, 7*cm, 2*cm, 1.5*cm]

    if auto_alerts:
        story.append(Paragraph("<b>Alertas Automaticas</b>", styles["CardText"]))
        story.append(Spacer(1, 5))
        a_data = [alert_header]
        for a in auto_alerts:
            a_data.append([
                a.get("categoria", ""),
                a.get("titulo", ""),
                a.get("severidad", "").upper(),
                str(a.get("puntos", 0)),
            ])
        a_table = Table(a_data, colWidths=alert_widths)
        a_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (2, 1), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, grey),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(a_table)
        story.append(Spacer(1, 15))

    if gpt_alerts:
        story.append(Paragraph("<b>Alertas por Analisis IA</b>", styles["CardText"]))
        story.append(Spacer(1, 5))
        g_data = [alert_header]
        for a in gpt_alerts:
            g_data.append([
                a.get("categoria", ""),
                a.get("titulo", ""),
                a.get("severidad", "").upper(),
                str(a.get("puntos", 0)),
            ])
        g_table = Table(g_data, colWidths=alert_widths)
        g_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (2, 1), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, grey),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(g_table)
    story.append(PageBreak())

    story.append(Paragraph("4. ANALISIS DETALLADO", styles["SectionTitle"]))
    story.append(Paragraph(audit.get("analisis_detallado", "N/D"), styles["BodyText2"]))
    story.append(PageBreak())

    story.append(Paragraph("5. CONCLUSIONES Y RECOMENDACIONES", styles["SectionTitle"]))
    story.append(Paragraph(audit.get("conclusiones", "N/D"), styles["BodyText2"]))
    story.append(PageBreak())

    story.append(Paragraph("6. FICHA TECNICA DEL CONTRATO", styles["SectionTitle"]))
    ficha = [
        ["Campo", "Valor"],
        ["ID Contrato", contract.get("id_contrato", "")],
        ["Entidad", contract.get("nombre_entidad", "")],
        ["NIT Entidad", contract.get("nit_entidad", "")],
        ["Departamento", contract.get("departamento", "")],
        ["Ciudad", contract.get("ciudad", "")],
        ["Sector", contract.get("sector", "")],
        ["Tipo de Contrato", contract.get("tipo_de_contrato", "")],
        ["Modalidad", contract.get("modalidad_de_contratacion", "")],
        ["Justificacion Modalidad", contract.get("justificacion_modalidad", "")],
        ["Objeto", contract.get("objeto_del_contrato", "")],
        ["Valor", _fmt_money(contract.get("valor_del_contrato"))],
        ["Fecha de Firma", _fmt_date(contract.get("fecha_de_firma"))],
        ["Fecha de Inicio", _fmt_date(contract.get("fecha_de_inicio"))],
        ["Fecha de Fin", _fmt_date(contract.get("fecha_de_fin"))],
        ["Dias Adicionados", str(contract.get("dias_adicionados", 0))],
        ["Pago Adelantado", contract.get("habilita_pago_adelantado", "")],
        ["Proveedor", contract.get("proveedor_adjudicado", "")],
        ["Documento Proveedor", contract.get("documento_proveedor", "")],
        ["Es PYME", contract.get("es_pyme", "")],
        ["Estado", contract.get("estado_contrato", "")],
    ]
    ficha_table = Table(ficha, colWidths=[5*cm, 9*cm])
    ficha_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 1), (0, -1), CARD_BG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, grey),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(ficha_table)

    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=1, color=grey))
    story.append(Paragraph(
        f"Generado por Oculus Auditor | Datos: SECOP II | {datetime.now().strftime('%d/%m/%Y')}",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=darkgrey, alignment=TA_CENTER),
    ))

    doc.build(story)
    logger.info(f"PDF generated: {file_path}")
    return file_path
