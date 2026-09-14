from tests.conftest import auth


def test_create_and_list_children(client, parent_token, child):
    r = client.get("/api/v1/user/children/", headers=auth(parent_token))
    assert r.status_code == 200
    assert [c["id"] for c in r.json()] == [child["id"]]
    assert r.json()[0]["gender"] == "male"


def test_get_single_child(client, parent_token, child):
    r = client.get(f"/api/v1/user/children/{child['id']}", headers=auth(parent_token))
    assert r.status_code == 200
    assert r.json()["name"] == "Budi"


def test_gender_must_be_male_or_female(client, parent_token):
    r = client.post(
        "/api/v1/user/children/",
        json={"name": "X", "gender": "boy", "birth_date": "2024-01-01"},
        headers=auth(parent_token),
    )
    assert r.status_code == 422


def test_children_require_auth(client):
    assert client.get("/api/v1/user/children/").status_code == 401


def test_other_parent_cannot_see_child(client, child, other_parent_token):
    r = client.get(f"/api/v1/user/children/{child['id']}", headers=auth(other_parent_token))
    assert r.status_code == 404
    r = client.get("/api/v1/user/children/", headers=auth(other_parent_token))
    assert r.json() == []
