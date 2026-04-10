"""
test_analytics.py
=================
Integration tests for /api/analytics/* endpoints.

Prerequisites
-------------
The DADN database must be pre-loaded in order:
  1. tables.sql
  2. seeds.sql
  3. database/analytics_test_data.sql

Run:
  cd backend
  pytest test_analytics.py -v
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Module-scoped auth fixture: login once, share token across all tests.
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def auth_headers():
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "admin123"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ===========================================================================
# GET /api/analytics/overview
# ===========================================================================
class TestAnalyticsOverview:

    def test_response_keys(self, auth_headers):
        r = client.get("/api/analytics/overview", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        for key in ("summary", "daily_production", "crop_stats"):
            assert key in body, f"Missing top-level key: {key}"

    def test_summary_keys(self, auth_headers):
        r = client.get("/api/analytics/overview", headers=auth_headers)
        s = r.json()["summary"]
        for key in (
            "total_batches", "total_operating_minutes", "avg_batch_minutes",
            "total_energy_kwh", "avg_rating",
            "total_input_kg", "total_output_kg", "yield_rate",
        ):
            assert key in s, f"Missing summary key: {key}"

    def test_no_filter_totals(self, auth_headers):
        """All 8 batches: input=755, output=472, yield=62.5, rating=3.9."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        s = r.json()["summary"]
        assert s["total_batches"] == 8
        assert s["total_input_kg"] == 755.0
        assert s["total_output_kg"] == 472.0
        assert s["yield_rate"] == 62.5        # 472/755*100 = 62.5%
        assert s["avg_rating"] == 3.9         # 31/8 = 3.875 -> 3.9
        assert s["total_operating_minutes"] == 865  # 120+90+150+100+110+80+120+95
        assert s["avg_batch_minutes"] == 108   # round(865/8)

    def test_no_filter_daily_count(self, auth_headers):
        """One batch per calendar day -> 8 daily_production entries."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        assert len(r.json()["daily_production"]) == 8

    def test_no_filter_daily_first_entry(self, auth_headers):
        """2026-03-01: 1 batch, 100 kg in, 65 kg out."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        entry = next(
            d for d in r.json()["daily_production"]
            if d["date"] == "2026-03-01"
        )
        assert entry["batches"] == 1
        assert entry["input_kg"] == 100.0
        assert entry["output_kg"] == 65.0
        assert entry["date_label"] == "01/03"

    def test_no_filter_crop_stats_count(self, auth_headers):
        """4 distinct crops: Xoai, Chuoi, Mit, Dua."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        assert len(r.json()["crop_stats"]) == 4

    def test_crop_xoai(self, auth_headers):
        """Xoai (crop_id=1, from seeds): 3 batches, 320 in, 205 out, yield=64.1."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        xoai = next(c for c in r.json()["crop_stats"] if c["crop_id"] == 1)
        assert xoai["batch_count"] == 3
        assert xoai["input_kg"] == 320.0
        assert xoai["output_kg"] == 205.0
        assert xoai["yield_rate"] == 64.1    # 205/320*100

    def test_crop_chuoi(self, auth_headers):
        """Chuoi (crop_id=2, from seeds): 2 batches, yield=60.0."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        chuoi = next(c for c in r.json()["crop_stats"] if c["crop_id"] == 2)
        assert chuoi["batch_count"] == 2
        assert chuoi["input_kg"] == 150.0
        assert chuoi["output_kg"] == 90.0
        assert chuoi["yield_rate"] == 60.0

    def test_crop_mit(self, auth_headers):
        """Mit (crop_id=3): 2 batches, 175 in, 107 out, yield=61.1."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        mit = next(c for c in r.json()["crop_stats"] if c["crop_id"] == 3)
        assert mit["batch_count"] == 2
        assert mit["input_kg"] == 175.0
        assert mit["output_kg"] == 107.0
        assert mit["yield_rate"] == 61.1    # 107/175*100

    def test_crop_dua(self, auth_headers):
        """Dua (crop_id=4): 1 batch, yield=63.6."""
        r = client.get("/api/analytics/overview", headers=auth_headers)
        dua = next(c for c in r.json()["crop_stats"] if c["crop_id"] == 4)
        assert dua["batch_count"] == 1
        assert dua["yield_rate"] == 63.6    # 70/110*100

    def test_dryer_filter(self, auth_headers):
        """Filter dryer_id=1: batches 1,2,3 -> input=300, yield=64.3, rating=4.0."""
        r = client.get(
            "/api/analytics/overview",
            params={"dryer_id": 1},
            headers=auth_headers,
        )
        assert r.status_code == 200
        s = r.json()["summary"]
        assert s["total_batches"] == 3
        assert s["total_input_kg"] == 300.0
        assert s["total_output_kg"] == 193.0
        assert s["yield_rate"] == 64.3
        assert s["avg_rating"] == 4.0

    def test_dryer_filter_crop_count(self, auth_headers):
        """Dryer 1 has batches for only Xoai and Chuoi -> 2 crop_stats."""
        r = client.get(
            "/api/analytics/overview",
            params={"dryer_id": 1},
            headers=auth_headers,
        )
        assert len(r.json()["crop_stats"]) == 2

    def test_date_filter(self, auth_headers):
        """from=2026-03-01 to=2026-03-03: batches 1(03-01), 2(03-02), 4(03-03)."""
        r = client.get(
            "/api/analytics/overview",
            params={"from_date": "2026-03-01", "to_date": "2026-03-03"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        s = r.json()["summary"]
        assert s["total_batches"] == 3
        assert s["total_input_kg"] == 270.0   # 100+80+90
        assert s["total_output_kg"] == 168.0  # 65+48+55
        assert s["yield_rate"] == 62.2        # 168/270*100

    def test_requires_auth(self):
        r = client.get("/api/analytics/overview")
        assert r.status_code == 401


# ===========================================================================
# GET /api/analytics/dryers
# ===========================================================================
class TestAnalyticsDryers:

    def test_response_keys(self, auth_headers):
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert "dryer_stats" in body
        assert "batch_details" in body

    def test_dryer_stats_count(self, auth_headers):
        """LEFT JOIN -> all 3 dryers are always included."""
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        assert len(r.json()["dryer_stats"]) == 3

    def test_dryer1_stats(self, auth_headers):
        """Dryer 1: batch_count=3, input=300, output=193, hours=6.0, errors=2, rating=4.0."""
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        d = next(d for d in r.json()["dryer_stats"] if d["dryer_id"] == 1)
        assert d["batch_count"] == 3
        assert d["input_kg"] == 300.0
        assert d["output_kg"] == 193.0
        assert d["yield_rate"] == 64.3      # 193/300*100
        assert d["operating_hours"] == 6.0  # 360min/60
        assert d["error_count"] == 2
        assert d["avg_rating"] == 4.0       # (4+3+5)/3

    def test_dryer2_stats(self, auth_headers):
        """Dryer 2: batch_count=3, hours=4.8, errors=1."""
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        d = next(d for d in r.json()["dryer_stats"] if d["dryer_id"] == 2)
        assert d["batch_count"] == 3
        assert d["input_kg"] == 270.0
        assert d["output_kg"] == 167.0
        assert d["operating_hours"] == 4.8  # 290min/60 = 4.833 -> 4.8
        assert d["error_count"] == 1

    def test_dryer3_stats(self, auth_headers):
        """Dryer 3: batch_count=2, hours=3.6, errors=0, rating=3.5."""
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        d = next(d for d in r.json()["dryer_stats"] if d["dryer_id"] == 3)
        assert d["batch_count"] == 2
        assert d["input_kg"] == 185.0
        assert d["output_kg"] == 112.0
        assert d["operating_hours"] == 3.6  # 215min/60 = 3.583 -> 3.6
        assert d["error_count"] == 0
        assert d["avg_rating"] == 3.5       # (4+3)/2

    def test_batch_details_count(self, auth_headers):
        """8 completed batches -> 8 entries in batch_details."""
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        assert len(r.json()["batch_details"]) == 8

    def test_batch_details_ordered_desc(self, auth_headers):
        """ORDER BY start_time DESC -> most recent batch (id=8, 2026-03-08) first."""
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        details = r.json()["batch_details"]
        assert details[0]["start_time"].startswith("2026-03-08")
        assert details[-1]["start_time"].startswith("2026-03-01")

    def test_batch_detail_required_fields(self, auth_headers):
        r = client.get("/api/analytics/dryers", headers=auth_headers)
        b = r.json()["batch_details"][0]
        for key in (
            "batch_id", "dryer_id", "dryer_name", "crop_name",
            "input_weight", "output_weight", "yield_rate",
            "start_time", "duration_minutes", "rating",
        ):
            assert key in b, f"Missing batch_detail key: {key}"

    def test_dryer_filter_restricts_batch_details(self, auth_headers):
        """Filter dryer_id=2 -> batch_details limited to dryer 2's 3 batches."""
        r = client.get(
            "/api/analytics/dryers",
            params={"dryer_id": 2},
            headers=auth_headers,
        )
        details = r.json()["batch_details"]
        assert len(details) == 3
        assert all(d["dryer_id"] == 2 for d in details)

    def test_requires_auth(self):
        r = client.get("/api/analytics/dryers")
        assert r.status_code == 401


# ===========================================================================
# GET /api/analytics/batches/{batch_id}/sensors
# ===========================================================================
class TestBatchSensors:

    def test_batch1_device_count(self, auth_headers):
        """Dryer 1 has 2 devices; only 1 has category=sensor."""
        r = client.get(
            "/api/analytics/batches/1/sensors", headers=auth_headers
        )
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_batch1_device_metadata(self, auth_headers):
        """Sensor device: Temperature Sensor, unit=°C."""
        r = client.get(
            "/api/analytics/batches/1/sensors", headers=auth_headers
        )
        dev = r.json()[0]
        assert dev["device_name"] == "Temp Sensor 1"
        assert dev["device_type"] == "Temperature Sensor"
        assert dev["unit"] == "\u00b0C"   # °C

    def test_batch1_reading_count(self, auth_headers):
        """5 sensor_logs inserted for device "sensor" within batch 1 time range."""
        r = client.get(
            "/api/analytics/batches/1/sensors", headers=auth_headers
        )
        assert len(r.json()[0]["readings"]) == 5

    def test_batch1_reading_values_and_order(self, auth_headers):
        """Readings in ascending time order: 32.5, 55.2, 68.7, 72.1, 61.4."""
        r = client.get(
            "/api/analytics/batches/1/sensors", headers=auth_headers
        )
        values = [rd["value"] for rd in r.json()[0]["readings"]]
        assert values == [32.5, 55.2, 68.7, 72.1, 61.4]

    def test_batch1_readings_date(self, auth_headers):
        """All readings are on 2026-03-01."""
        r = client.get(
            "/api/analytics/batches/1/sensors", headers=auth_headers
        )
        for rd in r.json()[0]["readings"]:
            assert rd["timestamp"].startswith("2026-03-01")

    def test_batch2_device_with_no_readings(self, auth_headers):
        """Batch 2 (dryer 1) has the sensor device but no sensor_logs in its range."""
        r = client.get(
            "/api/analytics/batches/2/sensors", headers=auth_headers
        )
        assert r.status_code == 200
        devices = r.json()
        assert len(devices) == 1
        assert devices[0]["readings"] == []

    def test_nonexistent_batch(self, auth_headers):
        """batch_id=999 does not exist -> returns empty list, not 404."""
        r = client.get(
            "/api/analytics/batches/999/sensors", headers=auth_headers
        )
        assert r.status_code == 200
        assert r.json() == []

    def test_requires_auth(self):
        r = client.get("/api/analytics/batches/1/sensors")
        assert r.status_code == 401
