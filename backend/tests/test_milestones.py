import pytest
from sqlalchemy.orm import sessionmaker

import seed_db
from app.api.v1.user.milestones import interpret_kpsp
from tests.conftest import auth


@pytest.fixture()
def seeded_milestones(engine):
    db = sessionmaker(bind=engine)()
    try:
        assert seed_db.seed_milestones(db) == 20
        assert seed_db.seed_milestones(db) == 0
    finally:
        db.close()


def url(child, suffix=""):
    return f"/api/v1/user/child/{child['id']}/milestones{suffix}"


def test_parse_age_label():
    assert seed_db._parse_age_label("0 - 6 Months") == (0, 6)
    assert seed_db._parse_age_label("12 - 24 Months") == (12, 24)
    assert seed_db._parse_age_label("2 - 3 Years") == (24, 36)


def test_interpret_kpsp():
    assert interpret_kpsp(5, 5).startswith("Sesuai")
    assert interpret_kpsp(4, 5).startswith("Meragukan")
    assert interpret_kpsp(3, 5).startswith("Penyimpangan")


def test_checklist_for_child_age_bracket(client, parent_token, child, seeded_milestones):
    r = client.get(url(child), headers=auth(parent_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["age_in_months"] == 12
    assert body["age_label"] == "12 - 24 bulan"
    assert body["total"] == 5
    assert body["answered"] == 0
    assert body["interpretation"] is None
    assert all(i["achieved"] is None for i in body["items"])

    r = client.get(url(child, "?bracket_months=30"), headers=auth(parent_token))
    assert r.json()["age_label"] == "24 - 36 bulan"
    assert r.json()["total"] == 5


def test_answer_and_interpretation(client, parent_token, child, seeded_milestones):
    h = auth(parent_token)
    items = client.get(url(child, "?bracket_months=30"), headers=h).json()["items"]

    for i, item in enumerate(items):
        r = client.put(url(child, f"/{item['id']}"), json={"achieved": i < 4}, headers=h)
        assert r.status_code == 200, r.text
    body = r.json()
    assert body["answered"] == 5 and body["achieved"] == 4
    assert body["interpretation"].startswith("Meragukan")

    r = client.put(url(child, f"/{items[4]['id']}"), json={"achieved": True}, headers=h)
    assert r.json()["achieved"] == 5
    assert r.json()["interpretation"].startswith("Sesuai")
    assert r.json()["items"][4]["answered_on"] is not None


def test_milestones_require_ownership(client, child, other_parent_token, seeded_milestones):
    assert client.get(url(child)).status_code == 401
    assert client.get(url(child), headers=auth(other_parent_token)).status_code == 404
    assert client.put(url(child, "/1"), json={"achieved": True}, headers=auth(other_parent_token)).status_code == 404


def test_answer_unknown_milestone(client, parent_token, child, seeded_milestones):
    assert client.put(url(child, "/9999"), json={"achieved": True}, headers=auth(parent_token)).status_code == 404


def test_admin_milestone_crud(client, admin_token, parent_token, child, seeded_milestones):
    h = auth(admin_token)
    assert client.get("/api/v1/admin/milestones").status_code == 401
    assert len(client.get("/api/v1/admin/milestones", headers=h).json()) == 20

    payload = {"min_months": 36, "max_months": 48, "age_label": "3 - 4 Years", "domain": "Kemandirian",
               "question": "Memakai baju sendiri", "expected": "Ya", "active": True, "sort_order": 0}
    r = client.post("/api/v1/admin/milestones", json=payload, headers=h)
    assert r.status_code == 201, r.text
    mid = r.json()["id"]

    assert client.post("/api/v1/admin/milestones", json={**payload, "max_months": 10}, headers=h).status_code == 422

    r = client.put(f"/api/v1/admin/milestones/{mid}", json={**payload, "active": False}, headers=h)
    assert r.status_code == 200 and r.json()["active"] is False

    r = client.get(url(child, "?bracket_months=40"), headers=auth(parent_token))
    assert r.json()["total"] == 0

    assert client.delete(f"/api/v1/admin/milestones/{mid}", headers=h).status_code == 204
    assert client.delete(f"/api/v1/admin/milestones/{mid}", headers=h).status_code == 404
