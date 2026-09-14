from datetime import date, timedelta

from app.services.zscore_calc import (
    analyze_stunting,
    analyze_weight,
    classify_stunting,
    classify_weight,
    lms_value_at_z,
)
from tests.conftest import auth

# WHO medians for a boy at 365 days: length 75.7 cm, weight 9.6 kg.
TODAY = date.today().isoformat()
MEDIAN_BOY_1Y = {"weight_kg": 9.6, "height_cm": 75.7, "date_logged": TODAY}


def measurements_url(child):
    return f"/api/v1/user/child/{child['id']}/measurements"


# --- pure service functions -------------------------------------------------

def test_zscore_at_median_is_zero():
    assert abs(analyze_stunting("male", 365, 75.7)["z_score"]) < 0.1
    assert abs(analyze_weight("male", 365, 9.6)["z_score"]) < 0.1


def test_zscore_out_of_range_age_and_bad_values():
    assert "error" in analyze_stunting("female", 5000, 80)
    assert "error" in analyze_weight("female", 100, 0)
    assert "error" in analyze_weight("unknown", 100, 5)


def test_lms_inverse_roundtrip():
    from app.services.zscore_calc import calculate_zscore
    l, m, s = 0.35, 9.6, 0.11
    value = lms_value_at_z(-2.0, l, m, s)
    assert abs(calculate_zscore(value, l, m, s) - (-2.0)) < 1e-9


def test_classification_thresholds():
    assert classify_stunting(-3.5).startswith("Sangat Pendek")
    assert classify_stunting(-2.5).startswith("Pendek")
    assert classify_stunting(0) == "Normal"
    assert classify_stunting(3.5) == "Tinggi"
    assert classify_weight(-2.5).startswith("Berat Badan Kurang")
    assert classify_weight(0.5) == "Berat Badan Normal"
    assert classify_weight(1.5) == "Risiko Berat Badan Lebih"


# --- HTTP layer --------------------------------------------------------------

def test_log_measurement_requires_auth(client, child):
    assert client.post(measurements_url(child), json=MEDIAN_BOY_1Y).status_code == 401


def test_log_measurement_for_someone_elses_child_is_404(client, child, other_parent_token):
    r = client.post(measurements_url(child), json=MEDIAN_BOY_1Y, headers=auth(other_parent_token))
    assert r.status_code == 404
    r = client.get(measurements_url(child), headers=auth(other_parent_token))
    assert r.status_code == 404


def test_log_measurement_returns_zscores_and_persists_date(client, parent_token, child):
    r = client.post(measurements_url(child), json=MEDIAN_BOY_1Y, headers=auth(parent_token))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["age_in_days"] == 365
    assert abs(body["wfa_zscore"]) < 0.1
    assert abs(body["lhfa_zscore"]) < 0.1
    assert body["stunting_status"] == "Normal"
    assert body["weight_status"] == "Berat Badan Normal"
    assert body["date_logged"].startswith(TODAY)


def test_measurement_accepts_datetime_string_from_mobile_ui(client, parent_token, child):
    payload = {**MEDIAN_BOY_1Y, "date_logged": f"{TODAY}T00:00:00"}
    r = client.post(measurements_url(child), json=payload, headers=auth(parent_token))
    assert r.status_code == 201, r.text
    assert r.json()["age_in_days"] == 365


def test_measurement_rejects_future_and_pre_birth_dates(client, parent_token, child):
    future = (date.today() + timedelta(days=1)).isoformat()
    r = client.post(measurements_url(child), json={**MEDIAN_BOY_1Y, "date_logged": future}, headers=auth(parent_token))
    assert r.status_code == 400
    before_birth = (date.fromisoformat(child["birth_date"]) - timedelta(days=1)).isoformat()
    r = client.post(measurements_url(child), json={**MEDIAN_BOY_1Y, "date_logged": before_birth}, headers=auth(parent_token))
    assert r.status_code == 400


def test_measurement_rejects_non_positive_values(client, parent_token, child):
    r = client.post(measurements_url(child), json={**MEDIAN_BOY_1Y, "weight_kg": 0}, headers=auth(parent_token))
    assert r.status_code == 422


def test_history_is_sorted_by_date(client, parent_token, child):
    birth = date.fromisoformat(child["birth_date"])
    later = {**MEDIAN_BOY_1Y}
    earlier = {"weight_kg": 7.9, "height_cm": 67.6, "date_logged": (birth + timedelta(days=182)).isoformat()}
    client.post(measurements_url(child), json=later, headers=auth(parent_token))
    client.post(measurements_url(child), json=earlier, headers=auth(parent_token))

    r = client.get(measurements_url(child), headers=auth(parent_token))
    assert r.status_code == 200
    rows = r.json()
    assert [row["age_in_days"] for row in rows] == [182, 365]
    assert all("stunting_status" in row and "weight_status" in row for row in rows)


def test_stunted_child_is_flagged(client, parent_token, child):
    r = client.post(measurements_url(child), json={**MEDIAN_BOY_1Y, "height_cm": 70.0}, headers=auth(parent_token))
    assert r.status_code == 201
    assert -3.0 <= r.json()["lhfa_zscore"] < -2.0
    assert r.json()["stunting_status"] == "Pendek (Stunted)"

    r = client.post(measurements_url(child), json={**MEDIAN_BOY_1Y, "height_cm": 66.0}, headers=auth(parent_token))
    assert r.json()["lhfa_zscore"] < -3.0
    assert r.json()["stunting_status"].startswith("Sangat Pendek")
