from sqlalchemy.orm import sessionmaker

import seed_db
from tests.conftest import auth

ARTICLE = {"title": "Tips MPASI pertama", "category": "Nutrition", "author": "Nutr. Dewi", "read_time_min": 4,
           "summary": "Cara memulai MPASI di usia 6 bulan.", "body": "Mulai dengan tekstur halus...", "published": False}


def test_article_crud_and_publish_visibility(client, admin_token, parent_token):
    h = auth(admin_token)
    assert client.get("/api/v1/admin/articles").status_code == 401
    r = client.post("/api/v1/admin/articles", json=ARTICLE, headers=h)
    assert r.status_code == 201, r.text
    aid = r.json()["id"]

    assert client.get("/api/v1/user/articles", headers=auth(parent_token)).json() == []
    assert client.get(f"/api/v1/user/articles/{aid}", headers=auth(parent_token)).status_code == 404

    r = client.put(f"/api/v1/admin/articles/{aid}", json={**ARTICLE, "published": True}, headers=h)
    assert r.status_code == 200 and r.json()["published"] is True

    r = client.get("/api/v1/user/articles", headers=auth(parent_token))
    assert [a["title"] for a in r.json()] == ["Tips MPASI pertama"]
    assert "published" not in r.json()[0]
    assert client.get("/api/v1/user/articles?category=Growth", headers=auth(parent_token)).json() == []
    body = client.get(f"/api/v1/user/articles/{aid}", headers=auth(parent_token)).json()
    assert body["body"].startswith("Mulai")

    assert client.post("/api/v1/admin/articles", json={**ARTICLE, "title": "ab"}, headers=h).status_code == 422
    assert client.delete(f"/api/v1/admin/articles/{aid}", headers=h).status_code == 204
    assert client.delete(f"/api/v1/admin/articles/{aid}", headers=h).status_code == 404
    assert client.get("/api/v1/user/articles").status_code == 401


def test_seed_articles(engine):
    db = sessionmaker(bind=engine)()
    try:
        assert seed_db.seed_articles(db) == len(seed_db.STARTER_ARTICLES) == 4
        assert seed_db.seed_articles(db) == 0
    finally:
        db.close()


def test_admin_growth_standards_endpoint(client, admin_token, engine):
    db = sessionmaker(bind=engine)()
    try:
        seed_db.seed_growth_standards(db)
    finally:
        db.close()
    r = client.get("/api/v1/admin/datasets/growth-standards?metric=lhfa&gender=female", headers=auth(admin_token))
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 61 and rows[0]["age_months"] == 0
    assert abs(rows[12]["p50"] - 74.0) < 0.5
    assert client.get("/api/v1/admin/datasets/growth-standards?metric=nope", headers=auth(admin_token)).status_code == 422


def test_system_summary_admins_and_seed(client, admin_token, superadmin_token, parent_token, child):
    h = auth(admin_token)
    r = client.get("/api/v1/admin/system/summary", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["counts"]["children"] == 1 and body["counts"]["parents"] == 1
    assert body["counts"]["admins"] == 2
    assert body["reference"]["foods"] == 0
    assert body["database"].startswith("sqlite")
    assert body["last_measurement_at"] is None

    admins = client.get("/api/v1/admin/system/admins", headers=h).json()
    assert {a["email"] for a in admins} == {"plain@example.com", "admin@example.com"}
    assert "hashed_password" not in admins[0]

    assert client.post("/api/v1/admin/system/seed", headers=h).status_code == 403
    r = client.post("/api/v1/admin/system/seed", headers=auth(superadmin_token))
    assert r.status_code == 200, r.text
    assert r.json()["foods"] > 1600 and r.json()["articles"] == 4
    assert client.post("/api/v1/admin/system/seed", headers=auth(superadmin_token)).json()["foods"] == 0
    assert client.get("/api/v1/admin/system/summary", headers=h).json()["reference"]["articles"] == 4
