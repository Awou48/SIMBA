from datetime import date

from app.api.v1.user.logs import age_in_months
from app.services.nutrition_calc import calculate_akg_fulfillment, find_akg_bracket
from tests.conftest import auth


def test_age_in_months():
    assert age_in_months(date(2024, 1, 15), date(2024, 1, 14)) == 0
    assert age_in_months(date(2024, 1, 15), date(2024, 2, 14)) == 0
    assert age_in_months(date(2024, 1, 15), date(2024, 2, 15)) == 1
    assert age_in_months(date(2022, 6, 1), date(2024, 9, 1)) == 27


def test_akg_brackets_cover_toddler_range():
    assert find_akg_bracket(3)["label"] == "0-5 bulan"
    assert find_akg_bracket(11)["label"] == "6-11 bulan"
    assert find_akg_bracket(12)["label"] == "1-3 tahun"
    assert find_akg_bracket(47)["label"] == "1-3 tahun"
    assert find_akg_bracket(48)["label"] == "4-6 tahun"
    assert find_akg_bracket(90) is None


def test_fulfillment_percentages():
    out = calculate_akg_fulfillment(27, total_protein=10, total_energy=675)
    assert out["target_protein"] == 20
    assert out["target_energy"] == 1350
    assert out["protein_fulfillment_percent"] == 50.0
    assert out["energy_fulfillment_percent"] == 50.0


def test_analyze_uses_child_birth_date_not_payload_age(client, parent_token, child):
    r = client.post(
        f"/api/v1/user/nutrition/{child['id']}/analyze",
        json={"age_in_months": 3, "total_protein": 10, "total_energy": 675},
        headers=auth(parent_token),
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["age_in_months"] == 12
    assert data["age_bracket_found"] == "1-3 tahun"
    assert data["protein_fulfillment_percent"] == 50.0


def test_analyze_requires_ownership(client, child, other_parent_token):
    r = client.post(
        f"/api/v1/user/nutrition/{child['id']}/analyze",
        json={"total_protein": 10, "total_energy": 675},
        headers=auth(other_parent_token),
    )
    assert r.status_code == 404
