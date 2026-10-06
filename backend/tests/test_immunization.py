from datetime import date, timedelta

from app.services.immunization import NATIONAL_SCHEDULE, add_months, dose_status, SCHEDULE_BY_CODE
from tests.conftest import auth


def url(child, suffix=""):
    return f"/api/v1/user/child/{child['id']}{suffix}"


def test_add_months_clamps_day():
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert add_months(date(2024, 1, 31), 1) == date(2024, 2, 29)
    assert add_months(date(2025, 11, 15), 3) == date(2026, 2, 15)
    assert add_months(date(2025, 6, 1), 18) == date(2026, 12, 1)


def test_dose_status_transitions():
    birth = date(2026, 1, 1)
    dpt1 = SCHEDULE_BY_CODE["DPT1"]
    assert dose_status(dpt1, birth, None, today=date(2026, 2, 15))["status"] == "upcoming"
    assert dose_status(dpt1, birth, None, today=date(2026, 3, 1))["status"] == "due"
    assert dose_status(dpt1, birth, None, today=date(2026, 3, 25))["status"] == "due"
    assert dose_status(dpt1, birth, None, today=date(2026, 4, 2))["status"] == "overdue"
    assert dose_status(dpt1, birth, date(2026, 3, 3), today=date(2026, 9, 1))["status"] == "given"
    assert dose_status(dpt1, birth, None)["due_date"] == date(2026, 3, 1)


def test_schedule_codes_unique_and_sorted():
    codes = [d.code for d in NATIONAL_SCHEDULE]
    assert len(codes) == len(set(codes))
    assert [d.due_months for d in NATIONAL_SCHEDULE] == sorted(d.due_months for d in NATIONAL_SCHEDULE)


def test_immunization_summary_for_one_year_old(client, parent_token, child):
    r = client.get(url(child, "/immunizations"), headers=auth(parent_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["schedule"]) == len(NATIONAL_SCHEDULE)
    assert body["given"] == 0
    statuses = {s["code"]: s["status"] for s in body["schedule"]}
    assert statuses["HB0"] == "overdue"
    assert statuses["MR1"] == "overdue"
    assert statuses["PCV3"] == "due"
    assert statuses["MR2"] == "upcoming"
    assert body["next_dose"]["code"] == "HB0"


def test_mark_and_unmark_dose(client, parent_token, child, other_parent_token):
    h = auth(parent_token)
    r = client.post(url(child, "/immunizations/hb0/given"), json={"given_on": child["birth_date"]}, headers=h)
    assert r.status_code == 200, r.text
    hb0 = next(s for s in r.json()["schedule"] if s["code"] == "HB0")
    assert hb0["status"] == "given" and hb0["given_on"] == child["birth_date"] and hb0["event_id"]
    assert r.json()["given"] == 1

    r = client.post(url(child, "/immunizations/HB0/given"), json={"notes": "Posyandu"}, headers=h)
    assert r.json()["given"] == 1
    events = client.get(url(child, "/events"), headers=h).json()
    assert len(events) == 1 and events[0]["vaccine_code"] == "HB0" and events[0]["notes"] == "Posyandu"

    assert client.post(url(child, "/immunizations/XYZ/given"), json={}, headers=h).status_code == 404
    future = (date.today() + timedelta(days=1)).isoformat()
    assert client.post(url(child, "/immunizations/BCG/given"), json={"given_on": future}, headers=h).status_code == 400
    assert client.post(url(child, "/immunizations/BCG/given"), json={}, headers=auth(other_parent_token)).status_code == 404

    r = client.delete(url(child, "/immunizations/HB0/given"), headers=h)
    assert r.status_code == 200 and r.json()["given"] == 0
    assert client.delete(url(child, "/immunizations/HB0/given"), headers=h).status_code == 404


def test_events_crud_and_month_filter(client, parent_token, child, other_parent_token):
    h = auth(parent_token)
    payload = {"title": "General checkup", "event_type": "Doctor Visit", "date": "2026-05-18", "time": "14:30", "notes": "Routine"}
    r = client.post(url(child, "/events"), json=payload, headers=h)
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    client.post(url(child, "/events"), json={"title": "Blood test", "event_type": "Checkup", "date": "2026-06-07"}, headers=h)

    assert client.post(url(child, "/events"), json={**payload, "time": "25:00"}, headers=h).status_code == 422
    assert client.post(url(child, "/events"), json={**payload, "event_type": "Party"}, headers=h).status_code == 422

    assert [e["title"] for e in client.get(url(child, "/events?month=2026-05"), headers=h).json()] == ["General checkup"]
    assert len(client.get(url(child, "/events"), headers=h).json()) == 2
    assert client.get(url(child, "/events?month=2026-13"), headers=h).status_code == 422

    r = client.put(url(child, f"/events/{eid}"), json={"done": True}, headers=h)
    assert r.status_code == 200 and r.json()["done"] is True and r.json()["title"] == "General checkup"

    assert client.get(url(child, "/events"), headers=auth(other_parent_token)).status_code == 404
    assert client.delete(url(child, f"/events/{eid}"), headers=auth(other_parent_token)).status_code == 404
    assert client.delete(url(child, f"/events/{eid}"), headers=h).status_code == 204
    assert client.delete(url(child, f"/events/{eid}"), headers=h).status_code == 404
