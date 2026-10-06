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
    VaccineDose("HB0", "Hepatitis B", "dosis 0", 0, 0, "Dalam 24 jam setelah lahir"),
    VaccineDose("BCG", "BCG", "", 1, 1, "Sebelum usia 2 bulan"),
    VaccineDose("OPV1", "Polio tetes (OPV)", "dosis 1", 1),
    VaccineDose("DPT1", "DPT-HB-Hib", "dosis 1", 2),
    VaccineDose("OPV2", "Polio tetes (OPV)", "dosis 2", 2),
    VaccineDose("PCV1", "PCV", "dosis 1", 2),
    VaccineDose("RV1", "Rotavirus", "dosis 1", 2),
    VaccineDose("DPT2", "DPT-HB-Hib", "dosis 2", 3),
    VaccineDose("OPV3", "Polio tetes (OPV)", "dosis 3", 3),
    VaccineDose("PCV2", "PCV", "dosis 2", 3),
    VaccineDose("RV2", "Rotavirus", "dosis 2", 3),
    VaccineDose("DPT3", "DPT-HB-Hib", "dosis 3", 4),
    VaccineDose("OPV4", "Polio tetes (OPV)", "dosis 4", 4),
    VaccineDose("IPV1", "Polio suntik (IPV)", "dosis 1", 4),
    VaccineDose("RV3", "Rotavirus", "dosis 3", 4),
    VaccineDose("IPV2", "Polio suntik (IPV)", "dosis 2", 9),
    VaccineDose("MR1", "Campak-Rubela (MR)", "dosis 1", 9),
    VaccineDose("PCV3", "PCV", "dosis 3", 12),
    VaccineDose("DPT4", "DPT-HB-Hib", "booster", 18, 3),
    VaccineDose("MR2", "Campak-Rubela (MR)", "dosis 2", 18, 3),
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
