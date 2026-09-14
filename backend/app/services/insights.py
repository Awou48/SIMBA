"""Derived, read-only views over a child's data: early-warning alerts and the growth report.

Everything here is computed on request from measurements, meals, milestone
answers and immunization records — nothing is stored.
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.db import models
from app.services.immunization import NATIONAL_SCHEDULE, dose_status
from app.services.nutrition_calc import daily_targets
from app.services.zscore_calc import bmi, classify_stunting, classify_wasting, classify_weight

MEASUREMENT_STALE_DAYS = 30


def age_in_months(birth_date: date, on: date | None = None) -> int:
    on = on or date.today()
    months = (on.year - birth_date.year) * 12 + (on.month - birth_date.month)
    if on.day < birth_date.day:
        months -= 1
    return max(months, 0)


def _alert(id_: str, category: str, severity: str, title: str, description: str, on: date, path: str) -> dict:
    return {
        "id": id_,
        "category": category,
        "severity": severity,
        "title": title,
        "description": description,
        "date": on,
        "action_path": path,
    }


# ---------------------------------------------------------------------------
# Building blocks shared by alerts and the report
# ---------------------------------------------------------------------------


def latest_measurement(child: models.Child, db: Session) -> models.MeasurementLog | None:
    return (
        db.query(models.MeasurementLog)
        .filter(models.MeasurementLog.child_id == child.id)
        .order_by(models.MeasurementLog.date_logged.desc(), models.MeasurementLog.id.desc())
        .first()
    )


def nutrition_last_days(child: models.Child, db: Session, days: int = 7) -> dict:
    """Average intake over the days that have at least one meal logged in the window."""
    since = date.today() - timedelta(days=days - 1)
    meals = (
        db.query(models.MealLog)
        .filter(models.MealLog.child_id == child.id, models.MealLog.date >= since)
        .all()
    )
    by_day: dict[date, dict] = {}
    for m in meals:
        d = by_day.setdefault(m.date, {"energy": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0})
        d["energy"] += m.energy
        d["protein"] += m.protein
        d["carbs"] += m.carbs
        d["fat"] += m.fat
    n = len(by_day)
    avg = {k: round(sum(d[k] for d in by_day.values()) / n, 1) if n else 0.0 for k in ("energy", "protein", "carbs", "fat")}
    targets = daily_targets(age_in_months(child.birth_date))
    pct = None
    if targets and n:
        pct = {k: round(avg[k] / targets[k] * 100, 1) if targets[k] else 0.0 for k in avg}
    return {
        "window_days": days,
        "days_logged": n,
        "logged_today": date.today() in by_day,
        "average": avg,
        "targets": {k: targets[k] for k in ("energy", "protein", "carbs", "fat")} if targets else None,
        "fulfillment_percent": pct,
    }


def milestone_progress(child: models.Child, db: Session) -> dict:
    months = age_in_months(child.birth_date)
    items = (
        db.query(models.Milestone)
        .filter(models.Milestone.active.is_(True), models.Milestone.min_months <= months, models.Milestone.max_months > months)
        .all()
    )
    answers = {
        a.milestone_id: a.achieved
        for a in db.query(models.MilestoneAnswer).filter(models.MilestoneAnswer.child_id == child.id).all()
    }
    total = len(items)
    answered = sum(1 for m in items if m.id in answers)
    achieved = sum(1 for m in items if answers.get(m.id))
    interpretation = None
    if total and answered == total:
        ratio = achieved / total
        interpretation = "Sesuai" if ratio >= 0.9 else "Meragukan" if ratio >= 0.7 else "Penyimpangan"
    return {
        "age_label": items[0].age_label if items else None,
        "total": total,
        "answered": answered,
        "achieved": achieved,
        "interpretation": interpretation,
    }


def immunization_progress(child: models.Child, db: Session) -> dict:
    given = {
        e.vaccine_code: e.date
        for e in db.query(models.HealthEvent)
        .filter(models.HealthEvent.child_id == child.id, models.HealthEvent.vaccine_code.isnot(None), models.HealthEvent.done.is_(True))
        .all()
    }
    statuses = [dose_status(d, child.birth_date, given.get(d.code)) for d in NATIONAL_SCHEDULE]
    counts = {k: sum(1 for s in statuses if s["status"] == k) for k in ("given", "due", "overdue", "upcoming")}
    order = {"overdue": 0, "due": 1, "upcoming": 2}
    pending = [s for s in statuses if s["status"] != "given"]
    next_dose = min(pending, key=lambda s: (order[s["status"]], s["due_date"])) if pending else None
    return {**counts, "total": len(statuses), "next_dose": next_dose, "overdue_names": [s["name"] for s in statuses if s["status"] == "overdue"]}


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


def build_alerts(child: models.Child, db: Session) -> list[dict]:
    today = date.today()
    name = child.name
    alerts: list[dict] = []

    # --- Growth ---------------------------------------------------------------
    latest = latest_measurement(child, db)
    if latest is None:
        alerts.append(_alert("growth-none", "Growth", "medium", "No measurements yet",
                             f"Log {name}'s weight and height to start WHO growth monitoring.", today, "/growth"))
    else:
        logged = latest.date_logged.date()
        if latest.lhfa_zscore < -2:
            sev = "high"
            alerts.append(_alert("growth-stunting", "Growth", sev, "Height-for-age below -2 SD",
                                 f"{name}'s latest height-for-age z-score is {latest.lhfa_zscore} ({classify_stunting(latest.lhfa_zscore)}). Please consult a Posyandu/Puskesmas health worker.",
                                 logged, "/growth"))
        if latest.wfa_zscore < -2:
            alerts.append(_alert("growth-underweight", "Growth", "high", "Weight-for-age below -2 SD",
                                 f"{name}'s weight-for-age z-score is {latest.wfa_zscore} ({classify_weight(latest.wfa_zscore)}). Review daily intake and seek advice.",
                                 logged, "/food-diary"))
        if latest.wfh_zscore is not None and latest.wfh_zscore < -2:
            alerts.append(_alert("growth-wasting", "Growth", "high", "Possible wasting",
                                 f"Weight-for-height z-score is {latest.wfh_zscore} ({classify_wasting(latest.wfh_zscore)}). Acute undernutrition needs prompt attention.",
                                 logged, "/growth"))
        elif latest.wfh_zscore is not None and latest.wfh_zscore > 2:
            alerts.append(_alert("growth-overweight", "Growth", "medium", "Weight-for-height above +2 SD",
                                 f"Weight-for-height z-score is {latest.wfh_zscore} ({classify_wasting(latest.wfh_zscore)}). Consider reviewing snacks and sugary drinks.",
                                 logged, "/food-diary"))
        if (today - logged).days > MEASUREMENT_STALE_DAYS:
            alerts.append(_alert("growth-stale", "Growth", "medium", "Time for a new measurement",
                                 f"{name} was last measured {(today - logged).days} days ago. Monthly measurements keep the growth curve accurate.",
                                 today, "/growth"))
        if not any(a["category"] == "Growth" and a["severity"] == "high" for a in alerts):
            alerts.append(_alert("growth-ok", "Growth", "low", "Growth on track",
                                 f"{name}'s latest measurement ({latest.weight_kg} kg, {latest.height_cm} cm) is within the WHO normal range. Keep it up!",
                                 logged, "/growth"))

    # --- Nutrition --------------------------------------------------------------
    nut = nutrition_last_days(child, db)
    if nut["days_logged"] == 0:
        alerts.append(_alert("nutrition-none", "Nutrition", "low", "Start the food diary",
                             f"No meals logged for {name} in the last 7 days. Logging meals unlocks AKG comparisons.", today, "/food-diary"))
    else:
        pct = nut["fulfillment_percent"] or {}
        if pct.get("energy", 100) < 70:
            alerts.append(_alert("nutrition-energy", "Nutrition", "high" if pct["energy"] < 50 else "medium", "Energy intake below target",
                                 f"Average intake over {nut['days_logged']} logged day(s) is {nut['average']['energy']:.0f} kcal — {pct['energy']:.0f}% of the {nut['targets']['energy']:.0f} kcal AKG target.",
                                 today, "/food-diary"))
        if pct.get("protein", 100) < 70:
            alerts.append(_alert("nutrition-protein", "Nutrition", "medium", "Low protein intake",
                                 f"Average protein is {nut['average']['protein']:.1f} g/day — {pct['protein']:.0f}% of the {nut['targets']['protein']:.0f} g target. Add eggs, tempe, fish or milk.",
                                 today, "/food-diary"))
        if not nut["logged_today"]:
            alerts.append(_alert("nutrition-today", "Nutrition", "low", "No meals logged today",
                                 f"Remember to log what {name} eats today.", today, "/food-diary"))

    # --- Development --------------------------------------------------------------
    ms = milestone_progress(child, db)
    if ms["total"]:
        if ms["interpretation"] in ("Meragukan", "Penyimpangan"):
            alerts.append(_alert("dev-result", "Development", "high", f"KPSP result: {ms['interpretation']}",
                                 f"{name} achieved {ms['achieved']}/{ms['total']} milestones for {ms['age_label']}. "
                                 + ("Stimulate and re-check in 2 weeks." if ms["interpretation"] == "Meragukan" else "Please see a health worker for a full assessment."),
                                 today, "/milestones"))
        elif ms["answered"] < ms["total"]:
            alerts.append(_alert("dev-pending", "Development", "medium", "Milestone check due",
                                 f"{ms['total'] - ms['answered']} KPSP question(s) for {ms['age_label']} are still unanswered.", today, "/milestones"))

    # --- Immunization -----------------------------------------------------------
    im = immunization_progress(child, db)
    if im["overdue"]:
        names = ", ".join(im["overdue_names"][:3]) + ("…" if len(im["overdue_names"]) > 3 else "")
        alerts.append(_alert("immun-overdue", "Immunization", "high", f"{im['overdue']} vaccine dose(s) overdue",
                             f"Overdue: {names}. Visit Posyandu/Puskesmas for catch-up doses.", today, "/immunization"))
    if im["due"]:
        alerts.append(_alert("immun-due", "Immunization", "medium", f"{im['due']} vaccine dose(s) due now",
                             "These doses are within their recommended window.", today, "/immunization"))
    nd = im["next_dose"]
    if nd and nd["status"] == "upcoming" and (nd["due_date"] - today).days <= 14:
        alerts.append(_alert("immun-upcoming", "Immunization", "low", f"{nd['name']} coming up",
                             f"Due on {nd['due_date'].strftime('%d %b %Y')}. Bring the immunization card.", today, "/immunization"))

    severity_rank = {"high": 0, "medium": 1, "low": 2}
    return sorted(alerts, key=lambda a: (severity_rank[a["severity"]], a["date"]), reverse=False)


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


def build_report(child: models.Child, db: Session) -> dict:
    rows = (
        db.query(models.MeasurementLog)
        .filter(models.MeasurementLog.child_id == child.id)
        .order_by(models.MeasurementLog.date_logged, models.MeasurementLog.id)
        .all()
    )
    series = [
        {
            "date": r.date_logged.date(),
            "age_in_days": r.age_in_days,
            "weight_kg": r.weight_kg,
            "height_cm": r.height_cm,
            "bmi": bmi(r.weight_kg, r.height_cm),
            "wfa_zscore": r.wfa_zscore,
            "lhfa_zscore": r.lhfa_zscore,
            "wfh_zscore": r.wfh_zscore,
            "bfa_zscore": r.bfa_zscore,
        }
        for r in rows
    ]
    latest = series[-1] if series else None
    first = series[0] if series else None
    change = None
    if latest and first and latest is not first:
        change = {
            "days": (latest["date"] - first["date"]).days,
            "weight_kg": round(latest["weight_kg"] - first["weight_kg"], 2),
            "height_cm": round(latest["height_cm"] - first["height_cm"], 1),
            "bmi": round(latest["bmi"] - first["bmi"], 2),
        }
    status = None
    if latest:
        status = {
            "stunting": classify_stunting(latest["lhfa_zscore"]),
            "weight": classify_weight(latest["wfa_zscore"]),
            "wasting": classify_wasting(latest["wfh_zscore"]) if latest["wfh_zscore"] is not None else None,
            "bmi": classify_wasting(latest["bfa_zscore"]) if latest["bfa_zscore"] is not None else None,
        }
    return {
        "generated_on": date.today(),
        "child": {
            "id": child.id,
            "name": child.name,
            "gender": child.gender,
            "birth_date": child.birth_date,
            "age_in_months": age_in_months(child.birth_date),
            "region": getattr(child, "region", None),
        },
        "measurements": series,
        "latest": latest,
        "change_since_first": change,
        "status": status,
        "nutrition_7d": nutrition_last_days(child, db),
        "milestones": milestone_progress(child, db),
        "immunization": immunization_progress(child, db),
        "alerts": build_alerts(child, db),
    }
