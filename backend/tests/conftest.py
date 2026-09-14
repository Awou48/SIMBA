"""Shared fixtures: an isolated in-memory SQLite database per test and a TestClient."""
import os
import sys
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Make `app` and `main` importable when pytest is run from backend/ or the repo root.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

# Keep tests independent of Postgres: env vars beat backend/.env in pydantic-settings,
# so the module-level engine (and main.py's create_all) point at a throwaway SQLite DB.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-bytes-long")

from app.core.security import get_password_hash  # noqa: E402
from app.db import models  # noqa: E402
from app.db.database import Base, get_db  # noqa: E402
from main import app  # noqa: E402

PARENT = {"email": "parent@example.com", "password": "secret123"}
OTHER_PARENT = {"email": "other@example.com", "password": "secret123"}
ADMIN = {"email": "admin@example.com", "password": "adminpass123", "name": "Admin"}


@pytest.fixture()
def engine():
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite ignores foreign keys unless asked; match Postgres behaviour.
    @event.listens_for(eng, "connect")
    def _enable_fk(dbapi_conn, _record):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(bind=eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(engine):
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _login(client, url, email, password):
    r = client.post(url, data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def parent_token(client):
    r = client.post("/api/v1/user/auth/register", json=PARENT)
    assert r.status_code == 201, r.text
    return _login(client, "/api/v1/user/auth/login", **PARENT)


@pytest.fixture()
def other_parent_token(client):
    r = client.post("/api/v1/user/auth/register", json=OTHER_PARENT)
    assert r.status_code == 201, r.text
    return _login(client, "/api/v1/user/auth/login", **OTHER_PARENT)


@pytest.fixture()
def superadmin_token(client, db):
    db.add(
        models.AdminUser(
            email=ADMIN["email"],
            name=ADMIN["name"],
            hashed_password=get_password_hash(ADMIN["password"]),
            is_superadmin=1,
        )
    )
    db.commit()
    return _login(client, "/api/v1/admin/auth/login", ADMIN["email"], ADMIN["password"])


@pytest.fixture()
def admin_token(client, db):
    db.add(
        models.AdminUser(
            email="plain@example.com",
            name="Plain Admin",
            hashed_password=get_password_hash("plainpass123"),
            is_superadmin=0,
        )
    )
    db.commit()
    return _login(client, "/api/v1/admin/auth/login", "plain@example.com", "plainpass123")


@pytest.fixture()
def child(client, parent_token):
    """A boy born exactly 365 days before today (so 'today' maps to WHO day 365)."""
    birth = date.fromordinal(date.today().toordinal() - 365)
    r = client.post(
        "/api/v1/user/children/",
        json={"name": "Budi", "gender": "male", "birth_date": birth.isoformat()},
        headers=auth(parent_token),
    )
    assert r.status_code == 201, r.text
    return r.json()
