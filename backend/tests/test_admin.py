from datetime import date

from tests.conftest import auth

FOOD = {"name": "Tempe Goreng", "category": "Protein", "energy": 193, "protein": 14, "carbs": 9, "fat": 11, "safe": True}
AKG_ROWS = {
    "akg_data": [
        {"ageGroup": "0-5 bulan", "gender": "M/F", "energy": "550", "protein": "9", "fat": "31", "carbs": "59"},
        {"ageGroup": "6-11 bulan", "gender": "M/F", "energy": "800", "protein": "15", "fat": "35", "carbs": "105"},
    ]
}


# --- guards ------------------------------------------------------------------

def test_admin_routes_require_token(client):
    assert client.get("/api/v1/admin/foods").status_code == 401
    assert client.get("/api/v1/admin/datasets/akg").status_code == 401
    assert client.get("/api/v1/admin/dashboard/stunting-stats").status_code == 401
    assert client.post("/api/v1/admin/foods", json=FOOD).status_code == 401


def test_admin_register_requires_superadmin(client, admin_token, superadmin_token):
    new_admin = {"email": "new@example.com", "password": "newpass123", "name": "New"}
    assert client.post("/api/v1/admin/auth/register", json=new_admin).status_code == 401
    assert client.post("/api/v1/admin/auth/register", json=new_admin, headers=auth(admin_token)).status_code == 403
    r = client.post("/api/v1/admin/auth/register", json=new_admin, headers=auth(superadmin_token))
    assert r.status_code == 201, r.text
    assert r.json()["is_superadmin"] is False
    assert "hashed_password" not in r.json()


def test_admin_login_and_me(client, superadmin_token):
    r = client.get("/api/v1/admin/auth/me", headers=auth(superadmin_token))
    assert r.status_code == 200
    assert r.json()["is_superadmin"] is True


# --- foods CRUD ---------------------------------------------------------------

def test_food_crud_and_filters(client, admin_token):
    h = auth(admin_token)
    r = client.post("/api/v1/admin/foods", json=FOOD, headers=h)
    assert r.status_code == 201, r.text
    food_id = r.json()["id"]
    client.post("/api/v1/admin/foods", json={**FOOD, "name": "Kerupuk", "category": "Snack", "safe": False}, headers=h)

    assert len(client.get("/api/v1/admin/foods", headers=h).json()) == 2
    assert [f["name"] for f in client.get("/api/v1/admin/foods?q=tempe", headers=h).json()] == ["Tempe Goreng"]
    assert len(client.get("/api/v1/admin/foods?category=Snack", headers=h).json()) == 1
    assert len(client.get("/api/v1/admin/foods?safe_only=true", headers=h).json()) == 1

    r = client.put(f"/api/v1/admin/foods/{food_id}", json={**FOOD, "energy": 200}, headers=h)
    assert r.status_code == 200 and r.json()["energy"] == 200

    assert client.delete(f"/api/v1/admin/foods/{food_id}", headers=h).status_code == 200
    assert client.get(f"/api/v1/admin/foods/{food_id}", headers=h).status_code == 404


def test_food_validation(client, admin_token):
    r = client.post("/api/v1/admin/foods", json={**FOOD, "energy": -1}, headers=auth(admin_token))
    assert r.status_code == 422


# --- AKG ------------------------------------------------------------------------

def test_akg_replace_and_read(client, admin_token):
    h = auth(admin_token)
    r = client.post("/api/v1/admin/datasets/update-akg", json=AKG_ROWS, headers=h)
    assert r.status_code == 200 and r.json()["rows"] == 2
    rows = client.get("/api/v1/admin/datasets/akg", headers=h).json()
    assert [row["ageGroup"] for row in rows] == ["0-5 bulan", "6-11 bulan"]
    assert rows[0]["vitA"] is None

    # Replacing again does not accumulate rows.
    client.post("/api/v1/admin/datasets/update-akg", json=AKG_ROWS, headers=h)
    assert len(client.get("/api/v1/admin/datasets/akg", headers=h).json()) == 2


# --- dashboard ----------------------------------------------------------------

def test_stats_on_empty_database(client, admin_token):
    r = client.get("/api/v1/admin/dashboard/stunting-stats", headers=auth(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total_measurements"] == 0
    assert body["stunted_cases"] == 0
    assert body["stunting_rate"] == 0.0
    assert body["warning"] == "Normal"


def test_stats_count_stunted_cases(client, admin_token, parent_token, child):
    url = f"/api/v1/user/child/{child['id']}/measurements"
    today = date.today().isoformat()
    client.post(url, json={"weight_kg": 9.6, "height_cm": 75.7, "date_logged": today}, headers=auth(parent_token))
    # WHO boy @ 12 mo: -2 SD = 71.0 cm, -3 SD = 68.6 cm
    client.post(url, json={"weight_kg": 9.6, "height_cm": 70.0, "date_logged": today}, headers=auth(parent_token))
    client.post(url, json={"weight_kg": 9.6, "height_cm": 66.0, "date_logged": today}, headers=auth(parent_token))

    body = client.get("/api/v1/admin/dashboard/stunting-stats", headers=auth(admin_token)).json()
    assert body["total_children"] == 1
    assert body["total_measurements"] == 3
    assert body["stunted_cases"] == 2
    assert body["severely_stunted_cases"] == 1
    assert body["stunting_rate"] > 0.2
    assert body["warning"] == "Stunting rate exceeds 20%"
