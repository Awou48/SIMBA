from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings
from tests.conftest import PARENT, auth


def test_register_parent_with_json_body(client):
    r = client.post("/api/v1/user/auth/register", json=PARENT)
    assert r.status_code == 201
    assert r.json()["email"] == PARENT["email"]


def test_register_rejects_query_params(client):
    r = client.post(f"/api/v1/user/auth/register?email={PARENT['email']}&password=x")
    assert r.status_code == 422


def test_register_duplicate_email(client):
    assert client.post("/api/v1/user/auth/register", json=PARENT).status_code == 201
    r = client.post("/api/v1/user/auth/register", json=PARENT)
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"]


def test_register_validates_email_and_password(client):
    assert client.post("/api/v1/user/auth/register", json={"email": "nope", "password": "secret123"}).status_code == 422
    assert client.post("/api/v1/user/auth/register", json={"email": "a@b.com", "password": "123"}).status_code == 422


def test_login_bad_password(client):
    client.post("/api/v1/user/auth/register", json=PARENT)
    r = client.post("/api/v1/user/auth/login", data={"username": PARENT["email"], "password": "wrong"})
    assert r.status_code == 401


def test_parent_token_expires_in_a_week(parent_token):
    payload = jwt.decode(parent_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["role"] == "parent"
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    expected = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    assert abs((exp - expected).total_seconds()) < 60
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES >= 60 * 24


def test_protected_route_rejects_garbage_token(client):
    r = client.get("/api/v1/user/children/", headers=auth("not-a-jwt"))
    assert r.status_code == 401


def test_parent_token_rejected_on_admin_routes(client, parent_token):
    r = client.get("/api/v1/admin/foods", headers=auth(parent_token))
    assert r.status_code == 401
