from datetime import date, timedelta

from tests.conftest import auth

TODAY = date.today().isoformat()


def url(child, suffix=""):
    return f"/api/v1/user/child/{child['id']}{suffix}"


def ids(alerts):
    return {a["id"] for a in alerts}


def test_alerts_for_fresh_child(client, parent_token, child):
    r = client.get(url(child, "/alerts"), headers=auth(parent_token))
    assert r.status_code == 200, r.text
    got = ids(r.json())
    assert {"growth-none", "nutrition-none", "immun-overdue"} <= got
    assert "immun-due" in got
    sev = [a["severity"] for a in r.json()]
    assert sev == sorted(sev, key={"high": 0, "medium": 1, "low": 2}.get)


def test_alerts_flag_stunting_and_low_intake(client, parent_token, child, db):
    from app.db import models
    h = auth(parent_token)
    client.post(url(child, "/measurements"), json={"weight_kg": 9.6, "height_cm": 66.0, "date_logged": TODAY}, headers=h)
    food = models.FoodItem(name="Bubur", category="Carbs", energy=100, protein=2, carbs=20, fat=1, safe=True)
    db.add(food)
    db.commit()
    db.refresh(food)
    client.post(url(child, "/meals"), json={"food_id": food.id, "meal_type": "Breakfast", "date": TODAY}, headers=h)

    got = {a["id"]: a for a in client.get(url(child, "/alerts"), headers=h).json()}
    assert "growth-stunting" in got and got["growth-stunting"]["severity"] == "high"
    assert "growth-ok" not in got
    assert "growth-none" not in got
    assert got["nutrition-energy"]["severity"] == "high"
    assert "nutrition-protein" in got
    assert "nutrition-today" not in got
    assert "nutrition-none" not in got


def test_alerts_stale_measurement_and_good_growth(client, parent_token, child):
    h = auth(parent_token)
    old = (date.today() - timedelta(days=45)).isoformat()
    client.post(url(child, "/measurements"), json={"weight_kg": 8.6, "height_cm": 71.0, "date_logged": old}, headers=h)
    got = ids(client.get(url(child, "/alerts"), headers=h).json())
    assert "growth-stale" in got
    assert "growth-ok" in got


def test_alerts_require_ownership(client, child, other_parent_token):
    assert client.get(url(child, "/alerts"), headers=auth(other_parent_token)).status_code == 404
    assert client.get(url(child, "/alerts")).status_code == 401


def test_report_json(client, parent_token, child):
    h = auth(parent_token)
    earlier = (date.fromisoformat(child["birth_date"]) + timedelta(days=182)).isoformat()
    client.post(url(child, "/measurements"), json={"weight_kg": 7.9, "height_cm": 67.6, "date_logged": earlier}, headers=h)
    client.post(url(child, "/measurements"), json={"weight_kg": 9.6, "height_cm": 75.7, "date_logged": TODAY}, headers=h)

    r = client.get(url(child, "/report"), headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["child"]["name"] == "Budi" and body["child"]["age_in_months"] == 12
    assert len(body["measurements"]) == 2
    assert body["latest"]["weight_kg"] == 9.6
    assert body["change_since_first"]["weight_kg"] == 1.7
    assert body["change_since_first"]["height_cm"] == 8.1
    assert body["status"]["stunting"] == "Normal"
    assert body["nutrition_7d"]["days_logged"] == 0
    assert body["immunization"]["total"] == 20
    assert isinstance(body["alerts"], list)


def test_report_pdf(client, parent_token, child):
    h = auth(parent_token)
    client.post(url(child, "/measurements"), json={"weight_kg": 9.6, "height_cm": 75.7, "date_logged": TODAY}, headers=h)
    r = client.get(url(child, "/report.pdf"), headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert "simba-report-budi" in r.headers["content-disposition"]
    assert r.content[:5] == b"%PDF-"
    assert len(r.content) > 2000


def test_report_pdf_for_child_without_data(client, parent_token, child):
    r = client.get(url(child, "/report.pdf"), headers=auth(parent_token))
    assert r.status_code == 200 and r.content[:5] == b"%PDF-"


def test_update_child_region(client, parent_token, child, other_parent_token):
    r = client.put(f"/api/v1/user/children/{child['id']}", json={"region": "Tangerang Selatan"}, headers=auth(parent_token))
    assert r.status_code == 200 and r.json()["region"] == "Tangerang Selatan" and r.json()["name"] == "Budi"
    assert client.put(f"/api/v1/user/children/{child['id']}", json={"region": "X"}, headers=auth(other_parent_token)).status_code == 404

    r = client.post("/api/v1/user/children/", json={"name": "Ani", "gender": "female", "birth_date": "2025-01-01", "region": "Kota Tangerang"}, headers=auth(parent_token))
    assert r.status_code == 201 and r.json()["region"] == "Kota Tangerang"


def test_regional_stats_use_latest_measurement_per_child(client, parent_token, admin_token, child):
    h = auth(parent_token)
    client.put(f"/api/v1/user/children/{child['id']}", json={"region": "Tangerang Selatan"}, headers=h)
    old = (date.today() - timedelta(days=60)).isoformat()
    client.post(url(child, "/measurements"), json={"weight_kg": 9.0, "height_cm": 66.0, "date_logged": old}, headers=h)
    client.post(url(child, "/measurements"), json={"weight_kg": 9.6, "height_cm": 75.7, "date_logged": TODAY}, headers=h)

    ani = client.post("/api/v1/user/children/", json={"name": "Ani", "gender": "female", "birth_date": (date.today() - timedelta(days=365)).isoformat(), "region": "Kota Tangerang"}, headers=h).json()
    client.post(f"/api/v1/user/child/{ani['id']}/measurements", json={"weight_kg": 8.9, "height_cm": 64.0, "date_logged": TODAY}, headers=h)
    client.post("/api/v1/user/children/", json={"name": "Cici", "gender": "female", "birth_date": "2025-06-01"}, headers=h)

    a = auth(admin_token)
    overall = client.get("/api/v1/admin/dashboard/stunting-stats", headers=a).json()
    assert overall["total_children"] == 3
    assert overall["children_measured"] == 2
    assert overall["total_measurements"] == 3
    assert overall["stunted_cases"] == 1
    assert overall["stunting_rate"] == 0.5

    tangsel = client.get("/api/v1/admin/dashboard/stunting-stats?region=Tangerang%20Selatan", headers=a).json()
    assert tangsel["stunted_cases"] == 0 and tangsel["children_measured"] == 1

    rows = client.get("/api/v1/admin/dashboard/regions", headers=a).json()
    assert [r["region_name"] for r in rows] == ["Kota Tangerang", "Tangerang Selatan", "Unspecified"]
    assert rows[0]["stunting_rate"] == 1.0
    assert rows[2]["total_children"] == 1 and rows[2]["children_measured"] == 0
