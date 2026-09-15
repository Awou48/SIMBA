from datetime import date, timedelta

import pytest

from app.core.security import get_password_hash  # noqa: F401  (keeps fixture imports uniform)
from app.db import models
from tests.conftest import auth

TODAY = date.today().isoformat()


@pytest.fixture()
def foods(db):
    rows = [
        models.FoodItem(name="Nasi Tim Ayam", category="Main Course", energy=150, protein=8, carbs=22, fat=3, safe=True),
        models.FoodItem(name="Pisang Kepok", category="Fruit", energy=116, protein=1, carbs=31, fat=0, safe=True),
        models.FoodItem(name="Kerupuk Udang", category="Snack", energy=369, protein=6, carbs=61, fat=11, safe=False),
    ]
    db.add_all(rows)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


def meals_url(child, suffix=""):
    return f"/api/v1/user/child/{child['id']}/meals{suffix}"


def test_food_search_requires_auth_and_filters(client, parent_token, foods):
    assert client.get("/api/v1/user/foods?q=nasi").status_code == 401

    r = client.get("/api/v1/user/foods?q=nasi", headers=auth(parent_token))
    assert r.status_code == 200
    assert [f["name"] for f in r.json()] == ["Nasi Tim Ayam"]

    names = [f["name"] for f in client.get("/api/v1/user/foods", headers=auth(parent_token)).json()]
    assert names[-1] == "Kerupuk Udang"

    assert len(client.get("/api/v1/user/foods?category=Fruit", headers=auth(parent_token)).json()) == 1

    r = client.get("/api/v1/user/foods?q=ayam%20tim", headers=auth(parent_token))
    assert [f["name"] for f in r.json()] == ["Nasi Tim Ayam"]
    assert client.get("/api/v1/user/foods?q=ayam%20pisang", headers=auth(parent_token)).json() == []


def test_log_meal_snapshots_nutrients_scaled_by_servings(client, parent_token, child, foods):
    payload = {"food_id": foods[0].id, "meal_type": "Lunch", "date": TODAY, "servings": 1.5}
    r = client.post(meals_url(child), json=payload, headers=auth(parent_token))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["food_name"] == "Nasi Tim Ayam"
    assert body["energy"] == 225.0
    assert body["protein"] == 12.0
    assert body["carbs"] == 33.0
    assert body["fat"] == 4.5
    assert body["meal_type"] == "Lunch"


def test_log_meal_validation(client, parent_token, child, foods):
    h = auth(parent_token)
    base = {"food_id": foods[0].id, "meal_type": "Lunch", "date": TODAY, "servings": 1}
    assert client.post(meals_url(child), json={**base, "meal_type": "Brunch"}, headers=h).status_code == 422
    assert client.post(meals_url(child), json={**base, "servings": 0}, headers=h).status_code == 422
    assert client.post(meals_url(child), json={**base, "food_id": 99999}, headers=h).status_code == 404
    future = (date.today() + timedelta(days=1)).isoformat()
    assert client.post(meals_url(child), json={**base, "date": future}, headers=h).status_code == 400


def test_meals_require_ownership(client, child, other_parent_token, foods):
    payload = {"food_id": foods[0].id, "meal_type": "Lunch", "date": TODAY}
    assert client.post(meals_url(child), json=payload, headers=auth(other_parent_token)).status_code == 404
    assert client.get(meals_url(child), headers=auth(other_parent_token)).status_code == 404
    assert client.get(meals_url(child)).status_code == 401


def test_daily_summary_totals_and_akg(client, parent_token, child, foods):
    h = auth(parent_token)
    client.post(meals_url(child), json={"food_id": foods[0].id, "meal_type": "Breakfast", "date": TODAY, "servings": 2}, headers=h)
    client.post(meals_url(child), json={"food_id": foods[1].id, "meal_type": "Snack", "date": TODAY}, headers=h)
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    client.post(meals_url(child), json={"food_id": foods[2].id, "meal_type": "Dinner", "date": yesterday}, headers=h)

    r = client.get(meals_url(child), headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["date"] == TODAY
    assert body["age_in_months"] == 12
    assert [m["meal_type"] for m in body["meals"]] == ["Breakfast", "Snack"]
    assert body["totals"] == {"energy": 416.0, "protein": 17.0, "carbs": 75.0, "fat": 6.0}
    assert body["akg_bracket"] == "1-3 tahun"
    assert body["targets"]["energy"] == 1350
    assert body["fulfillment_percent"]["protein"] == 85.0
    assert body["fulfillment_percent"]["energy"] == round(416 / 1350 * 100, 1)

    r = client.get(meals_url(child) + f"?date={yesterday}", headers=h)
    assert [m["food_name"] for m in r.json()["meals"]] == ["Kerupuk Udang"]


def test_delete_meal(client, parent_token, child, other_parent_token, foods):
    h = auth(parent_token)
    meal = client.post(meals_url(child), json={"food_id": foods[0].id, "meal_type": "Lunch", "date": TODAY}, headers=h).json()

    assert client.delete(meals_url(child, f"/{meal['id']}"), headers=auth(other_parent_token)).status_code == 404
    assert client.delete(meals_url(child, f"/{meal['id']}"), headers=h).status_code == 204
    assert client.delete(meals_url(child, f"/{meal['id']}"), headers=h).status_code == 404
    assert client.get(meals_url(child), headers=h).json()["meals"] == []


def test_meal_history_survives_food_deletion(client, parent_token, child, admin_token, foods):
    h = auth(parent_token)
    meal = client.post(meals_url(child), json={"food_id": foods[1].id, "meal_type": "Snack", "date": TODAY}, headers=h).json()
    assert client.delete(f"/api/v1/admin/foods/{foods[1].id}", headers=auth(admin_token)).status_code == 200

    body = client.get(meals_url(child), headers=h).json()
    assert body["meals"][0]["id"] == meal["id"]
    assert body["meals"][0]["food_name"] == "Pisang Kepok"
    assert body["meals"][0]["food_id"] is None
    assert body["totals"]["energy"] == 116.0
