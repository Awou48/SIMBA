"""Indonesian routine childhood immunization schedule (Kemenkes 2023 national programme).

Each entry is a single dose. `due_months` is the recommended age; `window_months`
is how long after the due date the dose is still considered "on time" before it
is flagged overdue.
"""
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class VaccineDose:
    code: str
    vaccine: str
    dose: str
    due_months: int
    window_months: int = 1
    note: str = ""

    @property
    def name(self) -> str:
        return f"{self.vaccine} ({self.dose})" if self.dose else self.vaccine


NATIONAL_SCHEDULE: tuple[VaccineDose, ...] = (
    VaccineDose("HB0", "Hepatitis B", "dose 0", 0, 0, "Within 24 hours of birth"),
    VaccineDose("BCG", "BCG", "", 1, 1, "Before 2 months old"),
    VaccineDose("OPV1", "Polio (OPV)", "dose 1", 1),
    VaccineDose("DPT1", "DPT-HB-Hib", "dose 1", 2),
    VaccineDose("OPV2", "Polio (OPV)", "dose 2", 2),
    VaccineDose("PCV1", "PCV", "dose 1", 2),
    VaccineDose("RV1", "Rotavirus", "dose 1", 2),
    VaccineDose("DPT2", "DPT-HB-Hib", "dose 2", 3),
    VaccineDose("OPV3", "Polio (OPV)", "dose 3", 3),
    VaccineDose("PCV2", "PCV", "dose 2", 3),
    VaccineDose("RV2", "Rotavirus", "dose 2", 3),
    VaccineDose("DPT3", "DPT-HB-Hib", "dose 3", 4),
    VaccineDose("OPV4", "Polio (OPV)", "dose 4", 4),
    VaccineDose("IPV1", "Polio (IPV)", "dose 1", 4),
    VaccineDose("RV3", "Rotavirus", "dose 3", 4),
    VaccineDose("IPV2", "Polio (IPV)", "dose 2", 9),
    VaccineDose("MR1", "Measles-Rubella (MR)", "dose 1", 9),
    VaccineDose("PCV3", "PCV", "dose 3", 12),
    VaccineDose("DPT4", "DPT-HB-Hib", "booster", 18, 3),
    VaccineDose("MR2", "Measles-Rubella (MR)", "dose 2", 18, 3),
)

SCHEDULE_BY_CODE = {d.code: d for d in NATIONAL_SCHEDULE}


def add_months(day: date, months: int) -> date:
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    for dd in (day.day, 30, 29, 28):
        try:
            return date(year, month, dd)
        except ValueError:
            continue
    raise AssertionError("unreachable")


def dose_status(dose: VaccineDose, birth_date: date, given_on: date | None, today: date | None = None) -> dict:
    today = today or date.today()
    due = add_months(birth_date, dose.due_months)
    late_after = add_months(due, dose.window_months) if dose.window_months else due + timedelta(days=1)

    if given_on is not None:
        status = "given"
    elif today > late_after:
        status = "overdue"
    elif today >= due:
        status = "due"
    else:
        status = "upcoming"

    return {
        "code": dose.code,
        "name": dose.name,
        "vaccine": dose.vaccine,
        "dose": dose.dose,
        "due_age_months": dose.due_months,
        "due_date": due,
        "late_after": late_after,
        "note": dose.note,
        "status": status,
        "given_on": given_on,
    }
