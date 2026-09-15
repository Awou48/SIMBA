"""Render the growth report (see insights.build_report) as a one/two-page PDF."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ORANGE = colors.HexColor("#F47B20")
NAVY = colors.HexColor("#2D3047")
GREY = colors.HexColor("#717182")
LIGHT = colors.HexColor("#FFF8EF")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("t", parent=base["Title"], fontSize=20, textColor=NAVY, spaceAfter=2, alignment=0),
        "sub": ParagraphStyle("s", parent=base["Normal"], fontSize=9, textColor=GREY, spaceAfter=10),
        "h2": ParagraphStyle("h", parent=base["Heading2"], fontSize=12, textColor=ORANGE, spaceBefore=10, spaceAfter=4),
        "body": ParagraphStyle("b", parent=base["Normal"], fontSize=9, leading=12, textColor=NAVY),
        "small": ParagraphStyle("sm", parent=base["Normal"], fontSize=7.5, leading=10, textColor=GREY),
    }


def _table(data, col_widths=None, header=True):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    style = [
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    t.setStyle(TableStyle(style))
    return t


def _fmt(value, digits=1, suffix=""):
    if value is None:
        return "-"
    return f"{value:.{digits}f}{suffix}"


def render_report_pdf(report: dict) -> bytes:
    st = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
        title=f"SIMBA Growth Report - {report['child']['name']}", author="SIMBA",
    )
    child = report["child"]
    story = [
        Paragraph("SIMBA Growth &amp; Nutrition Report", st["title"]),
        Paragraph(
            f"{child['name']} · {'Boy' if child['gender'] == 'male' else 'Girl'} · born {child['birth_date']:%d %b %Y} "
            f"({child['age_in_months']} months) · generated {report['generated_on']:%d %b %Y}"
            + (f" · {child['region']}" if child.get("region") else ""),
            st["sub"],
        ),
    ]

    story.append(Paragraph("Latest WHO assessment", st["h2"]))
    latest, status = report["latest"], report["status"]
    if latest:
        story.append(_table([
            ["Indicator", "Value", "z-score", "Status"],
            ["Weight-for-age", _fmt(latest["weight_kg"], 1, " kg"), _fmt(latest["wfa_zscore"], 2), status["weight"]],
            ["Length/height-for-age", _fmt(latest["height_cm"], 1, " cm"), _fmt(latest["lhfa_zscore"], 2), status["stunting"]],
            ["Weight-for-length/height", "", _fmt(latest["wfh_zscore"], 2), status["wasting"] or "-"],
            ["BMI-for-age", _fmt(latest["bmi"], 2), _fmt(latest["bfa_zscore"], 2), status["bmi"] or "-"],
        ], col_widths=[52 * mm, 28 * mm, 22 * mm, 76 * mm]))
        story.append(Paragraph(f"Measured on {latest['date']:%d %b %Y} at {latest['age_in_days']} days old.", st["small"]))
    else:
        story.append(Paragraph("No measurements recorded yet.", st["body"]))

    change = report["change_since_first"]
    if change:
        story.append(Paragraph("Progress since first measurement", st["h2"]))
        story.append(_table([
            ["Period", "Weight", "Height", "BMI"],
            [f"{change['days']} days", f"{change['weight_kg']:+.2f} kg", f"{change['height_cm']:+.1f} cm", f"{change['bmi']:+.2f}"],
        ], col_widths=[40 * mm, 40 * mm, 40 * mm, 40 * mm]))

    if report["measurements"]:
        story.append(Paragraph("Measurement history", st["h2"]))
        rows = [["Date", "Age (days)", "Weight (kg)", "Height (cm)", "BMI", "WFA z", "HFA z", "WFH z"]]
        for m in report["measurements"][-15:]:
            rows.append([
                f"{m['date']:%d %b %Y}", m["age_in_days"], _fmt(m["weight_kg"]), _fmt(m["height_cm"]), _fmt(m["bmi"], 2),
                _fmt(m["wfa_zscore"], 2), _fmt(m["lhfa_zscore"], 2), _fmt(m["wfh_zscore"], 2),
            ])
        story.append(_table(rows, col_widths=[26 * mm, 20 * mm, 22 * mm, 22 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm]))
        if len(report["measurements"]) > 15:
            story.append(Paragraph(f"Showing the latest 15 of {len(report['measurements'])} entries.", st["small"]))

    nut = report["nutrition_7d"]
    story.append(Paragraph("Nutrition (last 7 days)", st["h2"]))
    if nut["days_logged"] == 0:
        story.append(Paragraph("No meals logged in the last 7 days.", st["body"]))
    else:
        rows = [["Nutrient", "Daily average", "AKG target", "Fulfillment"]]
        for key, label, unit in (("energy", "Energy", " kcal"), ("protein", "Protein", " g"), ("carbs", "Carbohydrate", " g"), ("fat", "Fat", " g")):
            target = nut["targets"][key] if nut["targets"] else None
            pct = nut["fulfillment_percent"][key] if nut["fulfillment_percent"] else None
            rows.append([label, _fmt(nut["average"][key], 0 if key == "energy" else 1, unit), _fmt(target, 0, unit), _fmt(pct, 0, " %")])
        story.append(_table(rows, col_widths=[45 * mm, 45 * mm, 45 * mm, 43 * mm]))
        story.append(Paragraph(f"Averaged over {nut['days_logged']} day(s) with logged meals.", st["small"]))

    ms, im = report["milestones"], report["immunization"]
    story.append(Paragraph("Development (KPSP) &amp; immunization", st["h2"]))
    kpsp = (
        f"{ms['achieved']}/{ms['total']} milestones achieved for {ms['age_label']}"
        + (f" - {ms['interpretation']}" if ms["interpretation"] else f" ({ms['total'] - ms['answered']} unanswered)")
        if ms["total"] else "No KPSP questions for this age bracket."
    )
    next_dose = im["next_dose"]
    imm = f"{im['given']}/{im['total']} national schedule doses given - {im['overdue']} overdue, {im['due']} due now"
    if next_dose:
        imm += f". Next: {next_dose['name']} (due {next_dose['due_date']:%d %b %Y})"
    story.append(_table([["KPSP", kpsp], ["Immunization", imm]], col_widths=[35 * mm, 143 * mm], header=False))

    alerts = [a for a in report["alerts"] if a["severity"] != "low"]
    if alerts:
        story.append(Paragraph("Attention points", st["h2"]))
        rows = [["Severity", "Alert", "Detail"]]
        for a in alerts:
            rows.append([a["severity"].upper(), a["title"], Paragraph(a["description"], st["body"])])
        story.append(_table(rows, col_widths=[20 * mm, 45 * mm, 113 * mm]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(
        "Z-scores follow the WHO Child Growth Standards; status categories follow Permenkes No. 2/2020. "
        "This report supports, but does not replace, assessment by a health professional.", st["small"]))

    doc.build(story)
    return buf.getvalue()
