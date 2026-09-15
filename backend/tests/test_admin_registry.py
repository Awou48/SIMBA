from datetime import date, timedelta

from tests.conftest import auth

TODAY = date.today().isoformat()


def _measure(client, token, child_id, weight, height, day=TODAY):
    r = client.post(f"/api/v1/user/child/{child_id}/measurements", json={"weight_kg": weight, "height_cm": height, "date_logged": day}, headers=auth(token))
    assert r.status_code == 201, r.text


def test_children_registry_list_filters_and_masking(client, parent_token, admin_token, child):
    h = auth(parent_token)
    client.put(f"/api/v1/user/children/{child['id']}", json={"region": "Tangerang Selatan"}, headers=h)
    _measure(client, parent_token, child["id"], 9.6, 70.0)
    ani = client.post("/api/v1/user/children/", json={"name": "Ani", "gender": "female", "birth_date": (date.today() - timedelta(days=365)).isoformat(), "region": "Kota Tangerang"}, headers=h).json()
    _measure(client, parent_token, ani["id"], 8.9, 74.0, (date.today() - timedelta(days=45)).isoformat())
    client.post("/api/v1/user/children/", json={"name": "Cici", "gender": "female", "birth_date": "2025-06-01"}, headers=h)

    a = auth(admin_token)
    assert client.get("/api/v1/admin/children").status_code == 401
    body = client.get("/api/v1/admin/children", headers=a).json()
    assert body["total"] == 3
    by_name = {r["name"]: r for r in body["items"]}
    assert by_name["Budi"]["flags"] == ["stunted"]
    assert by_name["Budi"]["latest"]["stunting_status"] == "Pendek (Stunted)"
    assert by_name["Ani"]["flags"] == ["stale"]
    assert by_name["Cici"]["flags"] == ["no_data"] and by_name["Cici"]["latest"] is None
    assert by_name["Budi"]["parent_email_masked"] == "p***@example.com"
    assert by_name["Budi"]["measurements_count"] == 1

    assert [r["name"] for r in client.get("/api/v1/admin/children?flag=stunted", headers=a).json()["items"]] == ["Budi"]
    assert [r["name"] for r in client.get("/api/v1/admin/children?region=Unspecified", headers=a).json()["items"]] == ["Cici"]
    assert [r["name"] for r in client.get("/api/v1/admin/children?q=an", headers=a).json()["items"]] == ["Ani"]
    page = client.get("/api/v1/admin/children?limit=1&offset=1", headers=a).json()
    assert page["total"] == 3 and len(page["items"]) == 1


def test_child_detail_and_meals_for_admin(client, parent_token, admin_token, child, db):
    from app.db import models
    _measure(client, parent_token, child["id"], 9.6, 75.7)
    food = models.FoodItem(name="Bubur", category="Carbs", energy=100, protein=2, carbs=20, fat=1, safe=True)
    db.add(food); db.commit(); db.refresh(food)
    client.post(f"/api/v1/user/child/{child['id']}/meals", json={"food_id": food.id, "meal_type": "Lunch", "date": TODAY}, headers=auth(parent_token))

    a = auth(admin_token)
    r = client.get(f"/api/v1/admin/children/{child['id']}", headers=a)
    assert r.status_code == 200, r.text
    assert r.json()["child"]["name"] == "Budi"
    assert r.json()["child"]["parent_email_masked"].endswith("@example.com")
    assert r.json()["latest"]["weight_kg"] == 9.6
    assert r.json()["immunization"]["total"] == 20
    assert client.get("/api/v1/admin/children/9999", headers=a).status_code == 404

    pdf = client.get(f"/api/v1/admin/children/{child['id']}/report.pdf", headers=a)
    assert pdf.status_code == 200 and pdf.content[:5] == b"%PDF-"
    meals = client.get(f"/api/v1/admin/children/{child['id']}/meals", headers=a).json()
    assert len(meals) == 1 and meals[0]["food_name"] == "Bubur"


def test_dashboard_overview_and_recent(client, parent_token, admin_token, child):
    h = auth(parent_token)
    _measure(client, parent_token, child["id"], 9.6, 66.0)
    client.post("/api/v1/user/children/", json={"name": "Cici", "gender": "female", "birth_date": "2025-06-01"}, headers=h)

    a = auth(admin_token)
    o = client.get("/api/v1/admin/dashboard/overview", headers=a).json()
    assert o["children_total"] == 2 and o["children_measured"] == 1
    assert o["status"]["stunted"] == 1 and o["status"]["severely_stunted"] == 1 and o["status"]["unmeasured"] == 1
    assert o["stunting_rate"] == 1.0
    assert o["last_30_days"]["measurements"] == 1 and o["last_30_days"]["children_measured"] == 1
    assert o["immunization"]["children_with_overdue"] == 2
    assert o["parents_total"] == 1

    recent = client.get("/api/v1/admin/dashboard/recent-measurements?limit=5", headers=a).json()
    assert len(recent) == 1 and recent[0]["child_name"] == "Budi" and recent[0]["stunting_status"].startswith("Sangat")
    assert client.get("/api/v1/admin/dashboard/overview").status_code == 401
