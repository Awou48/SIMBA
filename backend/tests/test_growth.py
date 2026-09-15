from datetime import date, timedelta

from app.services.zscore_calc import (
    analyze_stunting,
    analyze_weight,
    classify_stunting,
    classify_weight,
    lms_value_at_z,
)
from tests.conftest import auth

TODAY = date.today().isoformat()
MEDIAN_BOY_1Y = {"weight_kg": 9.6, "height_cm": 75.7, "date_logged": TODAY}


def measurements_url(child):
    return f"/api/v1/user/child/{child['id']}/measurements"


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


def test_growth_standards_endpoint(client, parent_token, engine):
    from sqlalchemy.orm import sessionmaker
    import seed_db
    db = sessionmaker(bind=engine)()
    try:
        seed_db.seed_growth_standards(db)
    finally:
        db.close()

    assert client.get("/api/v1/user/growth-standards?metric=wfa&gender=male").status_code == 401
    assert client.get("/api/v1/user/growth-standards?metric=bmi&gender=male", headers=auth(parent_token)).status_code == 422

    r = client.get("/api/v1/user/growth-standards?metric=wfa&gender=male", headers=auth(parent_token))
    assert r.status_code == 200, r.text
    points = r.json()
    assert [p["age_months"] for p in points] == list(range(61))
    twelve = points[12]
    assert abs(twelve["p50"] - 9.6) < 0.1
    assert twelve["p3"] < twelve["p15"] < twelve["p50"] < twelve["p85"] < twelve["p97"]


def test_wasting_and_bmi_services():
    from app.services.zscore_calc import analyze_bmi, analyze_wasting, classify_wasting

    assert abs(analyze_wasting("male", 365, 9.6, 75.7)["z_score"]) < 0.1
    assert analyze_wasting("male", 365, 9.6, 75.7)["metric"] == "wfl"
    assert analyze_wasting("male", 900, 12.0, 90.0)["metric"] == "wfh"
    assert analyze_wasting("male", 365, 7.0, 75.7)["status"].startswith("Gizi Buruk")
    assert "error" in analyze_wasting("male", 365, 9.6, 30.0)
    assert abs(analyze_bmi("male", 365, 9.6, 75.7)["z_score"]) < 0.1
    assert analyze_bmi("male", 365, 9.6, 75.7)["bmi"] == 16.75

    assert classify_wasting(1.5).startswith("Berisiko")
    assert classify_wasting(2.5).startswith("Gizi Lebih")
    assert classify_wasting(3.5).startswith("Obesitas")


def test_measurement_includes_wasting_and_bmi(client, parent_token, child):
    r = client.post(measurements_url(child), json=MEDIAN_BOY_1Y, headers=auth(parent_token))
    body = r.json()
    assert abs(body["wfh_zscore"]) < 0.1
    assert abs(body["bfa_zscore"]) < 0.1
    assert body["bmi"] == 16.75
    assert body["wasting_status"] == "Gizi Baik (Normal)"
    assert body["bmi_status"] == "Gizi Baik (Normal)"

    rows = client.get(measurements_url(child), headers=auth(parent_token)).json()
    assert rows[0]["wasting_status"] == "Gizi Baik (Normal)"


def test_measurement_with_height_outside_wfl_range_still_saves(client, parent_token, child):
    r = client.post(measurements_url(child), json={**MEDIAN_BOY_1Y, "height_cm": 44.0}, headers=auth(parent_token))
    assert r.status_code == 201, r.text
    assert r.json()["wfh_zscore"] is None
    assert r.json()["wasting_status"] is None
    assert r.json()["stunting_status"].startswith("Sangat Pendek")


def test_schema_sync_adds_new_nullable_column(engine):
    from sqlalchemy import Column, Float, Table, inspect, text
    from app.db.migrate import add_missing_columns
    from app.db.database import Base

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE measurement_logs DROP COLUMN bfa_zscore"))
    assert "bfa_zscore" not in {c["name"] for c in inspect(engine).get_columns("measurement_logs")}

    added = add_missing_columns(engine)
    assert added == ["measurement_logs.bfa_zscore"]
    assert "bfa_zscore" in {c["name"] for c in inspect(engine).get_columns("measurement_logs")}
    assert add_missing_columns(engine) == []
