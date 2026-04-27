"""
test_batches.py
===============
Integration tests for the unified batch-drying engine.

Covers
------
- Batch lifecycle  : start → active → end
- Duplicate guard  : second start on same dryer → 409
- Manual control   : POST /api/device/{id} while batch is running
- Schedule queue   : add local schedule → stages executed in order
- Rule engine      : add local rule → rule fires when sensor crosses threshold
- Rule toggle      : disable rule → no firing; re-enable → fires again
- Queue management : remove a pending schedule entry

Prerequisites
-------------
Database must be reachable with the default connection (localhost:3307, root /
rootpassword, DADN).  tables.sql + seeds.sql must be loaded.

Run
---
    cd backend
    pytest test_batches.py -v

Sensor data is generated inside the tests by writing directly to `sensor_logs`.
No real Adafruit IO connection is used (see conftest.py).
"""

import time
import pytest

from fastapi.testclient import TestClient
from unittest.mock import patch

# -- application imports (conftest.py already patched Adafruit_IO) -----------
from main import app
import src.device_manager as device_manager
from src.db import get_db, insert_sensor_log

# ── HTTP client ──────────────────────────────────────────────────────────────
http = TestClient(app)

# ── Unique device IDs so tests don't collide with seeded data ────────────────
SENSOR_ID = "ts-sensor-temp-001"   # category='sensor'
CTRL_ID   = "ts-ctrl-fan-001"      # category='controller'

# ── Shared IDs populated by module-scoped fixture ───────────────────────────
_ids: dict = {}

# ── Timing constants ─────────────────────────────────────────────────────────
POLL = 3          # POLL_INTERVAL in batches/router.py
MARGIN = 1.5      # extra wait to absorb scheduling jitter


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Module-scoped DB fixture: create then tear-down all test data          ║
# ╚══════════════════════════════════════════════════════════════════════════╝

def _preclean() -> None:
    """Remove any test-data rows left over from a previously aborted run."""
    conn = get_db()
    cur  = conn.cursor()
    try:
        # Find test dryer by name
        cur.execute("SELECT id FROM dryers WHERE name = 'ts-dryer'")
        row = cur.fetchone()
        dryer_id = row[0] if row else None

        if dryer_id:
            cur.execute("DELETE FROM system_logs WHERE dryer_id = %s", (dryer_id,))
            cur.execute(
                "DELETE bsq FROM batch_schedule_queue bsq"
                " JOIN batches b ON b.id = bsq.batch_id WHERE b.dryer_id = %s",
                (dryer_id,),
            )
            cur.execute(
                "DELETE brs FROM batch_rule_set brs"
                " JOIN batches b ON b.id = brs.batch_id WHERE b.dryer_id = %s",
                (dryer_id,),
            )
            cur.execute("DELETE FROM batches WHERE dryer_id = %s", (dryer_id,))

        # local rules / schedules
        cur.execute(
            "DELETE lrdm FROM local_rule_device_mapping lrdm"
            " JOIN local_rules lr ON lr.id = lrdm.local_rule_id"
            " WHERE lr.name = 'ts-local-rule'"
        )
        cur.execute("DELETE FROM local_rules WHERE name = 'ts-local-rule'")
        cur.execute(
            "DELETE lsdm FROM local_schedule_device_mapping lsdm"
            " JOIN local_schedules ls ON ls.id = lsdm.local_schedule_id"
            " WHERE ls.name = 'ts-local-schedule'"
        )
        cur.execute("DELETE FROM local_schedules WHERE name = 'ts-local-schedule'")

        # rules
        cur.execute("SELECT id FROM rules WHERE name = 'ts-rule'")
        row = cur.fetchone()
        if row:
            rule_id = row[0]
            cur.execute(
                "DELETE ra FROM rule_actions ra"
                " JOIN value_pairs vp ON vp.id = ra.value_pair_id"
                " WHERE vp.rule_id = %s",
                (rule_id,),
            )
            cur.execute(
                "DELETE c FROM conditions c"
                " JOIN value_pairs vp ON vp.id = c.value_pair_id"
                " WHERE vp.rule_id = %s",
                (rule_id,),
            )
            cur.execute("DELETE FROM value_pairs WHERE rule_id = %s", (rule_id,))
            cur.execute(
                "DELETE FROM rule_virtual_devices WHERE rule_id = %s", (rule_id,)
            )
            cur.execute("DELETE FROM rules WHERE id = %s", (rule_id,))

        # schedules
        cur.execute("SELECT id FROM schedules WHERE name = 'ts-schedule'")
        row = cur.fetchone()
        if row:
            sched_id = row[0]
            cur.execute(
                "DELETE sa FROM schedule_actions sa"
                " JOIN stages s ON s.id = sa.stage_id"
                " WHERE s.schedule_id = %s",
                (sched_id,),
            )
            cur.execute("DELETE FROM stages WHERE schedule_id = %s", (sched_id,))
            cur.execute(
                "DELETE FROM schedule_virtual_devices WHERE schedule_id = %s",
                (sched_id,),
            )
            cur.execute("DELETE FROM schedules WHERE id = %s", (sched_id,))

        cur.execute(
            "DELETE FROM sensor_logs WHERE device_id IN (%s, %s)",
            (SENSOR_ID, CTRL_ID),
        )
        cur.execute(
            "DELETE FROM devices WHERE id IN (%s, %s)", (SENSOR_ID, CTRL_ID)
        )

        if dryer_id:
            cur.execute("DELETE FROM dryers WHERE id = %s", (dryer_id,))

        cur.execute("SELECT id FROM areas WHERE name = 'ts-area'")
        row = cur.fetchone()
        if row:
            cur.execute("DELETE FROM areas WHERE id = %s", (row[0],))

        cur.execute("SELECT id FROM crops WHERE name = 'ts-crop'")
        row = cur.fetchone()
        if row:
            cur.execute("DELETE FROM crops WHERE id = %s", (row[0],))

        cur.execute(
            "DELETE FROM device_types WHERE name IN (%s, %s)",
            ("ts-type-sensor", "ts-type-ctrl"),
        )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def _preclean() -> None:
    """Remove any test-data rows left over from a previously aborted run."""
    conn = get_db()
    cur  = conn.cursor()
    try:
        # Find test dryer by name
        cur.execute("SELECT id FROM dryers WHERE name = 'ts-dryer'")
        row = cur.fetchone()
        dryer_id = row[0] if row else None

        if dryer_id:
            cur.execute("DELETE FROM system_logs WHERE dryer_id = %s", (dryer_id,))
            cur.execute(
                "DELETE bsq FROM batch_schedule_queue bsq"
                " JOIN batches b ON b.id = bsq.batch_id WHERE b.dryer_id = %s",
                (dryer_id,),
            )
            cur.execute(
                "DELETE brs FROM batch_rule_set brs"
                " JOIN batches b ON b.id = brs.batch_id WHERE b.dryer_id = %s",
                (dryer_id,),
            )
            cur.execute("DELETE FROM batches WHERE dryer_id = %s", (dryer_id,))

        # local rules / schedules
        cur.execute(
            "DELETE lrdm FROM local_rule_device_mapping lrdm"
            " JOIN local_rules lr ON lr.id = lrdm.local_rule_id"
            " WHERE lr.name = 'ts-local-rule'"
        )
        cur.execute("DELETE FROM local_rules WHERE name = 'ts-local-rule'")
        cur.execute(
            "DELETE lsdm FROM local_schedule_device_mapping lsdm"
            " JOIN local_schedules ls ON ls.id = lsdm.local_schedule_id"
            " WHERE ls.name = 'ts-local-schedule'"
        )
        cur.execute("DELETE FROM local_schedules WHERE name = 'ts-local-schedule'")

        # rules
        cur.execute("SELECT id FROM rules WHERE name = 'ts-rule'")
        row = cur.fetchone()
        if row:
            rule_id = row[0]
            cur.execute(
                "DELETE ra FROM rule_actions ra"
                " JOIN value_pairs vp ON vp.id = ra.value_pair_id"
                " WHERE vp.rule_id = %s",
                (rule_id,),
            )
            cur.execute(
                "DELETE c FROM conditions c"
                " JOIN value_pairs vp ON vp.id = c.value_pair_id"
                " WHERE vp.rule_id = %s",
                (rule_id,),
            )
            cur.execute("DELETE FROM value_pairs WHERE rule_id = %s", (rule_id,))
            cur.execute(
                "DELETE FROM rule_virtual_devices WHERE rule_id = %s", (rule_id,)
            )
            cur.execute("DELETE FROM rules WHERE id = %s", (rule_id,))

        # schedules
        cur.execute("SELECT id FROM schedules WHERE name = 'ts-schedule'")
        row = cur.fetchone()
        if row:
            sched_id = row[0]
            cur.execute(
                "DELETE sa FROM schedule_actions sa"
                " JOIN stages s ON s.id = sa.stage_id"
                " WHERE s.schedule_id = %s",
                (sched_id,),
            )
            cur.execute("DELETE FROM stages WHERE schedule_id = %s", (sched_id,))
            cur.execute(
                "DELETE FROM schedule_virtual_devices WHERE schedule_id = %s",
                (sched_id,),
            )
            cur.execute("DELETE FROM schedules WHERE id = %s", (sched_id,))

        cur.execute(
            "DELETE FROM sensor_logs WHERE device_id IN (%s, %s)",
            (SENSOR_ID, CTRL_ID),
        )
        cur.execute(
            "DELETE FROM devices WHERE id IN (%s, %s)", (SENSOR_ID, CTRL_ID)
        )

        if dryer_id:
            cur.execute("DELETE FROM dryers WHERE id = %s", (dryer_id,))

        cur.execute("SELECT id FROM areas WHERE name = 'ts-area'")
        row = cur.fetchone()
        if row:
            cur.execute("DELETE FROM areas WHERE id = %s", (row[0],))

        cur.execute("SELECT id FROM crops WHERE name = 'ts-crop'")
        row = cur.fetchone()
        if row:
            cur.execute("DELETE FROM crops WHERE id = %s", (row[0],))

        cur.execute(
            "DELETE FROM device_types WHERE name IN (%s, %s)",
            ("ts-type-sensor", "ts-type-ctrl"),
        )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


@pytest.fixture(scope="module", autouse=True)
def _db_test_data():
    """
    Create all test data before the module runs, clean up afterwards.

    Isolation: every entity name/ID is unique to this test module so the
    fixture can coexist with the analytics test data.

    Schema note
    -----------
    There is NO separate `virtual_devices` table in this project.
    `schedule_virtual_devices` (schedule_id, name, device_type_id) and
    `rule_virtual_devices` (rule_id, name, device_type_id) are standalone
    lookup tables that act as "virtual device slots" for a schedule/rule.
    """
    # ── Pre-cleanup: remove any leftovers from a previous failed run ─────────
    _preclean()

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    try:
        # ── device_types ─────────────────────────────────────────────────────
        cur.execute(
            "INSERT INTO device_types (name, unit, category) VALUES (%s, %s, %s)",
            ("ts-type-sensor", "°C", "sensor"),
        )
        sensor_type_id = cur.lastrowid

        cur.execute(
            "INSERT INTO device_types (name, unit, category) VALUES (%s, %s, %s)",
            ("ts-type-ctrl", "%", "controller"),
        )
        ctrl_type_id = cur.lastrowid

        # ── area + dryer ──────────────────────────────────────────────────────
        cur.execute("INSERT INTO areas (name) VALUES (%s)", ("ts-area",))
        area_id = cur.lastrowid

        cur.execute(
            "INSERT INTO dryers (name, area_id, capacity) VALUES (%s, %s, %s)",
            ("ts-dryer", area_id, 50.0),
        )
        dryer_id = cur.lastrowid

        # ── devices ───────────────────────────────────────────────────────────
        cur.execute(
            "INSERT INTO devices (id, name, type_id, dryer_id, install_date)"
            " VALUES (%s, %s, %s, %s, CURDATE())",
            (SENSOR_ID, "ts-temp-sensor", sensor_type_id, dryer_id),
        )
        cur.execute(
            "INSERT INTO devices (id, name, type_id, dryer_id, install_date)"
            " VALUES (%s, %s, %s, %s, CURDATE())",
            (CTRL_ID, "ts-fan-ctrl", ctrl_type_id, dryer_id),
        )

        # ── crop ──────────────────────────────────────────────────────────────
        cur.execute("INSERT INTO crops (name) VALUES (%s)", ("ts-crop",))
        crop_id = cur.lastrowid

        # ── schedule (2 stages) ───────────────────────────────────────────────
        cur.execute(
            "INSERT INTO schedules (name, crop_id) VALUES (%s, %s)",
            ("ts-schedule", crop_id),
        )
        schedule_id = cur.lastrowid

        # schedule_virtual_devices: (schedule_id, name, device_type_id)
        # — one "fan" virtual slot for this schedule
        cur.execute(
            "INSERT INTO schedule_virtual_devices (schedule_id, name, device_type_id)"
            " VALUES (%s, %s, %s)",
            (schedule_id, "ts-svd-fan", ctrl_type_id),
        )
        svd_fan = cur.lastrowid

        # Stage A: start_offset=0 → sets fan to 80
        cur.execute(
            "INSERT INTO stages (schedule_id, name, start_offset) VALUES (%s, %s, %s)",
            (schedule_id, "ts-stage-A", 0),
        )
        stage_a = cur.lastrowid
        cur.execute(
            "INSERT INTO schedule_actions (stage_id, schedule_virtual_device_id, value)"
            " VALUES (%s, %s, %s)",
            (stage_a, svd_fan, 80.0),
        )

        # Stage B: start_offset=2 → sets fan to 40
        cur.execute(
            "INSERT INTO stages (schedule_id, name, start_offset) VALUES (%s, %s, %s)",
            (schedule_id, "ts-stage-B", 2),
        )
        stage_b = cur.lastrowid
        cur.execute(
            "INSERT INTO schedule_actions (stage_id, schedule_virtual_device_id, value)"
            " VALUES (%s, %s, %s)",
            (stage_b, svd_fan, 40.0),
        )

        # ── local schedule ────────────────────────────────────────────────────
        cur.execute(
            "INSERT INTO local_schedules (dryer_id, schedule_id, name)"
            " VALUES (%s, %s, %s)",
            (dryer_id, schedule_id, "ts-local-schedule"),
        )
        local_sched_id = cur.lastrowid

        cur.execute(
            "INSERT INTO local_schedule_device_mapping"
            " (local_schedule_id, schedule_virtual_device_id, device_id)"
            " VALUES (%s, %s, %s)",
            (local_sched_id, svd_fan, CTRL_ID),
        )

        # ── rule: Temperature > 40 → Fan = 1.0 ───────────────────────────────
        cur.execute(
            "INSERT INTO rules (name, crop_id) VALUES (%s, %s)",
            ("ts-rule", crop_id),
        )
        rule_id = cur.lastrowid

        # rule_virtual_devices: (rule_id, name, device_type_id)
        cur.execute(
            "INSERT INTO rule_virtual_devices (rule_id, name, device_type_id)"
            " VALUES (%s, %s, %s)",
            (rule_id, "ts-rvd-temp", sensor_type_id),
        )
        rvd_temp = cur.lastrowid

        cur.execute(
            "INSERT INTO rule_virtual_devices (rule_id, name, device_type_id)"
            " VALUES (%s, %s, %s)",
            (rule_id, "ts-rvd-fan", ctrl_type_id),
        )
        rvd_fan = cur.lastrowid

        cur.execute(
            "INSERT INTO value_pairs (rule_id, name) VALUES (%s, %s)",
            (rule_id, "ts-pair-high-temp"),
        )
        pair_id = cur.lastrowid

        # Condition: Temperature > 40
        cur.execute(
            "INSERT INTO conditions"
            " (value_pair_id, rule_virtual_device_id, operator, compare_value)"
            " VALUES (%s, %s, %s, %s)",
            (pair_id, rvd_temp, ">", 40.0),
        )

        # Action: Fan = 1.0
        cur.execute(
            "INSERT INTO rule_actions (value_pair_id, rule_virtual_device_id, value)"
            " VALUES (%s, %s, %s)",
            (pair_id, rvd_fan, 1.0),
        )

        # ── local rule ────────────────────────────────────────────────────────
        cur.execute(
            "INSERT INTO local_rules (dryer_id, rule_id, name)"
            " VALUES (%s, %s, %s)",
            (dryer_id, rule_id, "ts-local-rule"),
        )
        local_rule_id = cur.lastrowid

        cur.execute(
            "INSERT INTO local_rule_device_mapping"
            " (local_rule_id, rule_virtual_device_id, device_id)"
            " VALUES (%s, %s, %s)",
            (local_rule_id, rvd_temp, SENSOR_ID),
        )
        cur.execute(
            "INSERT INTO local_rule_device_mapping"
            " (local_rule_id, rule_virtual_device_id, device_id)"
            " VALUES (%s, %s, %s)",
            (local_rule_id, rvd_fan, CTRL_ID),
        )

        conn.commit()

        # Expose IDs for tests
        _ids.update(
            area_id=area_id,
            dryer_id=dryer_id,
            crop_id=crop_id,
            sensor_type_id=sensor_type_id,
            ctrl_type_id=ctrl_type_id,
            schedule_id=schedule_id,
            rule_id=rule_id,
            local_sched_id=local_sched_id,
            local_rule_id=local_rule_id,
        )

    finally:
        cur.close()
        conn.close()

    # -- sync device_manager so SENSOR_ID / CTRL_ID appear in _clients --------
    device_manager.sync_clients()

    yield  # ── tests run here ──────────────────────────────────────────────

    # ── Cleanup ───────────────────────────────────────────────────────────────
    conn2 = get_db()
    cur2  = conn2.cursor()
    try:
        # Batch sub-tables first (FK → batches)
        cur2.execute(
            "DELETE bsq FROM batch_schedule_queue bsq"
            " JOIN batches b ON b.id = bsq.batch_id"
            " WHERE b.dryer_id = %s",
            (dryer_id,),
        )
        cur2.execute(
            "DELETE brs FROM batch_rule_set brs"
            " JOIN batches b ON b.id = brs.batch_id"
            " WHERE b.dryer_id = %s",
            (dryer_id,),
        )
        cur2.execute("DELETE FROM batches WHERE dryer_id = %s", (dryer_id,))

        # Local rule/schedule mappings + instances
        cur2.execute(
            "DELETE FROM local_rule_device_mapping WHERE local_rule_id = %s",
            (local_rule_id,),
        )
        cur2.execute("DELETE FROM local_rules WHERE id = %s", (local_rule_id,))
        cur2.execute(
            "DELETE FROM local_schedule_device_mapping WHERE local_schedule_id = %s",
            (local_sched_id,),
        )
        cur2.execute("DELETE FROM local_schedules WHERE id = %s", (local_sched_id,))

        # Rule internals
        cur2.execute(
            "DELETE ra FROM rule_actions ra"
            " JOIN value_pairs vp ON vp.id = ra.value_pair_id"
            " WHERE vp.rule_id = %s",
            (rule_id,),
        )
        cur2.execute(
            "DELETE c FROM conditions c"
            " JOIN value_pairs vp ON vp.id = c.value_pair_id"
            " WHERE vp.rule_id = %s",
            (rule_id,),
        )
        cur2.execute("DELETE FROM value_pairs WHERE rule_id = %s", (rule_id,))
        cur2.execute(
            "DELETE FROM rule_virtual_devices WHERE rule_id = %s", (rule_id,)
        )
        cur2.execute("DELETE FROM rules WHERE id = %s", (rule_id,))

        # Schedule internals
        cur2.execute(
            "DELETE sa FROM schedule_actions sa"
            " JOIN stages s ON s.id = sa.stage_id"
            " WHERE s.schedule_id = %s",
            (schedule_id,),
        )
        cur2.execute(
            "DELETE FROM stages WHERE schedule_id = %s", (schedule_id,)
        )
        cur2.execute(
            "DELETE FROM schedule_virtual_devices WHERE schedule_id = %s",
            (schedule_id,),
        )
        cur2.execute("DELETE FROM schedules WHERE id = %s", (schedule_id,))

        # Devices, dryer, area, crop, device_types
        cur2.execute(
            "DELETE FROM sensor_logs WHERE device_id IN (%s, %s)",
            (SENSOR_ID, CTRL_ID),
        )
        cur2.execute(
            "DELETE FROM devices WHERE id IN (%s, %s)", (SENSOR_ID, CTRL_ID)
        )
        cur2.execute("DELETE FROM system_logs WHERE dryer_id = %s", (dryer_id,))
        cur2.execute("DELETE FROM dryers WHERE id = %s", (dryer_id,))
        cur2.execute("DELETE FROM areas WHERE id = %s", (area_id,))
        cur2.execute("DELETE FROM crops WHERE id = %s", (crop_id,))
        cur2.execute(
            "DELETE FROM device_types WHERE id IN (%s, %s)",
            (sensor_type_id, ctrl_type_id),
        )
        conn2.commit()
    finally:
        cur2.close()
        conn2.close()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Auth fixture                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝

@pytest.fixture(scope="module")
def auth():
    r = http.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "admin123"},
    )
    assert r.status_code == 200, f"Login failed: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Per-test device-manager mock                                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝

@pytest.fixture
def device_calls():
    """
    Replace device_manager.set_device_value with a recorder that:
      - captures (feed_id, value) pairs in a list
      - writes the value into sensor_logs so get_latest_db_value sees it

    Also forces is_registered to return True for any feed_id.

    Before yielding, resets SENSOR_ID and CTRL_ID to 0.0 in sensor_logs.
    This is critical because the rule worker skips set_device_value when
    the new value equals the current DB value — stale 1.0 from a previous
    test would suppress the expected call.

    Yields the call-list so individual tests can assert on it.
    """
    # Reset CTRL_ID to 0.0 so the rule engine's "skip same-value" optimisation
    # does not suppress an expected action call.
    # NOTE: SENSOR_ID is intentionally NOT reset here.  Each test injects its
    # own sensor value via _inject_sensor() / insert_sensor_log(), which runs
    # in a different (later) MySQL second than the previous test's injection.
    # Resetting SENSOR_ID here would create a same-second timestamp collision
    # between the 0.0 row and the test's hot-value row, causing ORDER BY
    # timestamp DESC LIMIT 1 to return 0.0 non-deterministically.
    try:
        insert_sensor_log(CTRL_ID, 0.0)
    except Exception:
        pass

    calls: list = []

    def _fake_set(feed_id: str, value: float) -> bool:
        calls.append((feed_id, value))
        try:
            insert_sensor_log(feed_id, value)
        except Exception:
            pass
        return True

    with patch.object(device_manager, "set_device_value", _fake_set), \
         patch.object(device_manager, "is_registered", return_value=True):
        yield calls


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Per-test cleanup: force-end any batch left on the test dryer            ║
# ╚══════════════════════════════════════════════════════════════════════════╝

@pytest.fixture(autouse=True)
def _auto_end_batch(auth):
    """After each test end any batch that is still running on the test dryer.

    This prevents a failed test from blocking subsequent tests that need to
    start a new batch on the same dryer (a dryer can only have one active batch).
    """
    yield
    from src.api.batches.router import _active_batches, _ab_lock
    with _ab_lock:
        leaking = [
            bid for bid, s in _active_batches.items()
            if s.dryer_id == _ids.get("dryer_id")
        ]
    for bid in leaking:
        try:
            http.put(f"/api/batches/{bid}/end", json={}, headers=auth)
        except Exception:
            pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _start(auth, *, runtime=60, **extra):
    """Start a batch on the test dryer and return (response_json, batch_id)."""
    body = {"dryer_id": _ids["dryer_id"], "runtime": runtime, **extra}
    r = http.post("/api/batches/start", json=body, headers=auth)
    return r


def _end(auth, batch_id):
    return http.put(f"/api/batches/{batch_id}/end", json={}, headers=auth)


def _wait_for_call(calls: list, feed_id: str, value: float, timeout: float = 10.0) -> bool:
    """Poll until (feed_id, value) appears in `calls` or timeout expires."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if (feed_id, value) in calls:
            return True
        time.sleep(0.2)
    return False


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  1. Batch lifecycle                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class TestBatchLifecycle:

    def test_start_returns_201_with_id(self, auth, device_calls):
        r = _start(auth)
        assert r.status_code == 201, r.text
        body = r.json()
        assert "id" in body
        assert body["status"] == "running"
        assert body["dryer_id"] == _ids["dryer_id"]
        _end(auth, body["id"])

    def test_batch_persisted_in_db(self, auth, device_calls):
        r = _start(auth)
        batch_id = r.json()["id"]

        conn = get_db()
        cur  = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT * FROM batches WHERE id = %s", (batch_id,))
            row = cur.fetchone()
        finally:
            conn.close()

        assert row is not None
        assert row["end_time"] is None, "Batch should not have end_time yet"
        assert row["dryer_id"] == _ids["dryer_id"]
        _end(auth, batch_id)

    def test_end_returns_ended_status(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        r = _end(auth, batch_id)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "ended"

    def test_end_records_output_weight_and_rating(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        http.put(
            f"/api/batches/{batch_id}/end",
            json={"output_weight": 42.5, "rating": 5},
            headers=auth,
        )
        conn = get_db()
        cur  = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT * FROM batches WHERE id = %s", (batch_id,))
            row = cur.fetchone()
        finally:
            conn.close()
        assert row["output_weight"] == 42.5
        assert row["rating"] == 5
        assert row["end_time"] is not None

    def test_duplicate_batch_on_same_dryer_rejected(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        r2 = _start(auth)
        assert r2.status_code == 409, f"Expected 409, got {r2.status_code}: {r2.text}"
        _end(auth, batch_id)

    def test_end_already_ended_batch_is_rejected(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        _end(auth, batch_id)
        r = _end(auth, batch_id)
        assert r.status_code == 400, r.text

    def test_auto_stops_after_runtime(self, auth, device_calls):
        """Batch with runtime=2 should remove itself from active state."""
        r = _start(auth, runtime=2)
        batch_id = r.json()["id"]

        # Give the main thread time to expire
        time.sleep(4 + MARGIN)

        # The batch should no longer be in _active_batches
        from src.api.batches.router import _active_batches
        assert batch_id not in _active_batches, (
            "Batch should have been removed from active state after runtime"
        )

    def test_start_batch_with_crop_and_weight(self, auth, device_calls):
        r = _start(auth, crop_id=_ids["crop_id"], input_weight=75.0)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["crop_id"] == _ids["crop_id"]
        assert data["input_weight"] == 75.0
        _end(auth, data["id"])

    def test_start_batch_invalid_dryer_returns_404(self, auth, device_calls):
        r = http.post(
            "/api/batches/start",
            json={"dryer_id": 999_999},
            headers=auth,
        )
        assert r.status_code == 404


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  2. Manual device control while batch is running                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class TestManualControl:

    def test_set_controller_value_during_batch(self, auth, device_calls):
        """
        POST /api/device/{id} should route through device_manager and
        store the value in sensor_logs while a batch is running.
        """
        batch_id = _start(auth).json()["id"]

        r = http.post(f"/api/device/{CTRL_ID}?value=75.0", headers=auth)
        assert r.status_code == 200, r.text

        # set_device_value must have been called with the right args
        assert (CTRL_ID, 75.0) in device_calls, (
            f"Expected set_device_value({CTRL_ID!r}, 75.0) – got: {device_calls}"
        )
        _end(auth, batch_id)

    def test_manual_set_multiple_values(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]

        for val in [0.0, 50.0, 100.0]:
            http.post(f"/api/device/{CTRL_ID}?value={val}", headers=auth)

        called_vals = [v for fid, v in device_calls if fid == CTRL_ID]
        assert 0.0   in called_vals
        assert 50.0  in called_vals
        assert 100.0 in called_vals
        _end(auth, batch_id)

    def test_manual_control_works_without_active_batch(self, auth, device_calls):
        """Manual control endpoint must work regardless of batch state."""
        r = http.post(f"/api/device/{CTRL_ID}?value=30.0", headers=auth)
        assert r.status_code == 200, r.text

    def test_sensor_log_updated_after_manual_set(self, auth, device_calls):
        """The fake set_device_value writes to sensor_logs; verify it reads back."""
        batch_id = _start(auth).json()["id"]
        http.post(f"/api/device/{CTRL_ID}?value=88.0", headers=auth)

        # The value should be in sensor_logs (device_calls fixture writes it)
        latest = device_manager.get_latest_db_value(CTRL_ID)
        assert latest == 88.0, f"Expected 88.0 got {latest}"
        _end(auth, batch_id)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  3. Schedule queue                                                      ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class TestScheduleQueue:

    def test_add_schedule_returns_added_count(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        r = http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )
        assert r.status_code == 201, r.text
        assert r.json()["added"] == 1
        assert r.json()["batch_id"] == batch_id
        _end(auth, batch_id)

    def test_schedule_queue_visible_in_get(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )
        r = http.get(f"/api/batches/{batch_id}/schedules", headers=auth)
        assert r.status_code == 200, r.text
        entries = r.json()
        assert len(entries) >= 1
        assert entries[0]["local_schedule_id"] == _ids["local_sched_id"]
        _end(auth, batch_id)

    def test_schedule_stage_a_fires_immediately(self, auth, device_calls):
        """
        Stage A has start_offset=0: set fan → 80.0.
        The schedule worker should execute it within a few seconds.
        """
        batch_id = _start(auth, runtime=30).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )

        fired = _wait_for_call(device_calls, CTRL_ID, 80.0, timeout=6.0)
        assert fired, (
            f"Stage A (fan=80) did not fire within timeout. Calls: {device_calls}"
        )
        _end(auth, batch_id)

    def test_schedule_stage_b_fires_after_offset(self, auth, device_calls):
        """
        Stage B has start_offset=2: set fan → 40.0.
        Should fire ~2 seconds after the schedule starts.
        """
        batch_id = _start(auth, runtime=30).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )

        fired = _wait_for_call(device_calls, CTRL_ID, 40.0, timeout=8.0)
        assert fired, (
            f"Stage B (fan=40) did not fire within timeout. Calls: {device_calls}"
        )
        _end(auth, batch_id)

    def test_schedule_stages_fire_in_order(self, auth, device_calls):
        """80.0 must appear in calls before 40.0 (stage A before stage B)."""
        batch_id = _start(auth, runtime=30).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )
        _wait_for_call(device_calls, CTRL_ID, 40.0, timeout=10.0)

        ctrl_vals = [v for fid, v in device_calls if fid == CTRL_ID]
        idx_80 = next((i for i, v in enumerate(ctrl_vals) if v == 80.0), None)
        idx_40 = next((i for i, v in enumerate(ctrl_vals) if v == 40.0), None)
        assert idx_80 is not None, "Stage A (fan=80) never fired"
        assert idx_40 is not None, "Stage B (fan=40) never fired"
        assert idx_80 < idx_40,    "Stage A should fire before Stage B"
        _end(auth, batch_id)

    def test_remove_pending_schedule_entry(self, auth, device_calls):
        """
        After adding a schedule to a running batch, the first entry that is
        still in 'pending' status can be cancelled via DELETE.
        The test adds the schedule twice so that the second entry is
        guaranteed to still be pending (queue is sequential: second runs
        only after first completes).
        """
        batch_id = _start(auth, runtime=120).json()["id"]

        # Add the same local schedule twice — creates two queue entries
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )

        # Allow stage A (offset=0) of the first entry to start running
        time.sleep(0.5)

        entries = http.get(f"/api/batches/{batch_id}/schedules", headers=auth).json()
        pending = [e for e in entries if e["status"] == "pending"]

        if pending:
            eid = pending[0]["id"]
            r = http.delete(f"/api/batches/{batch_id}/schedules/{eid}", headers=auth)
            assert r.status_code == 200, r.text

            conn = get_db()
            cur  = conn.cursor()
            try:
                cur.execute(
                    "SELECT status FROM batch_schedule_queue WHERE id = %s", (eid,)
                )
                row = cur.fetchone()
            finally:
                conn.close()
            assert row[0] == "cancelled"

        _end(auth, batch_id)

    def test_clear_all_schedules(self, auth, device_calls):
        batch_id = _start(auth, runtime=60).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )
        r = http.delete(f"/api/batches/{batch_id}/schedules", headers=auth)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "schedules_cleared"
        _end(auth, batch_id)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  4. Rule engine                                                         ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class TestRuleEngine:

    def _inject_sensor(self, value: float) -> None:
        """Write a fake temperature reading to sensor_logs."""
        insert_sensor_log(SENSOR_ID, value)

    def test_add_rule_returns_added_count(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        r = http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )
        assert r.status_code == 201, r.text
        assert r.json()["added"] == 1
        _end(auth, batch_id)

    def test_rule_set_visible_in_get(self, auth, device_calls):
        batch_id = _start(auth).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )
        r = http.get(f"/api/batches/{batch_id}/rules", headers=auth)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["enabled"] is True
        assert len(body["rules"]) >= 1
        _end(auth, batch_id)

    def test_rule_fires_when_temperature_above_threshold(self, auth, device_calls):
        """
        Condition: temperature > 40.
        Action:    fan = 1.0.

        We inject temperature = 55 *before* starting the rule worker so the
        very first poll sees the elevated value.
        """
        self._inject_sensor(55.0)  # above threshold

        batch_id = _start(auth, runtime=30).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )

        fired = _wait_for_call(device_calls, CTRL_ID, 1.0, timeout=POLL * 2 + MARGIN)
        assert fired, (
            f"Rule (fan=1.0 when temp>40) did not fire. "
            f"Sensor was 55°C. Calls: {device_calls}"
        )
        _end(auth, batch_id)

    def test_rule_does_not_fire_below_threshold(self, auth, device_calls):
        """
        Condition: temperature > 40.
        Sensor: 25°C → condition NOT met → fan must stay at 0 / not be set.
        """
        self._inject_sensor(25.0)  # below threshold

        batch_id = _start(auth, runtime=30).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )

        # Wait two full poll cycles; the rule should NOT fire
        time.sleep(POLL * 2 + MARGIN)

        rule_fires = [v for fid, v in device_calls if fid == CTRL_ID and v == 1.0]
        assert len(rule_fires) == 0, (
            f"Rule should NOT have fired at 25°C but set_device_value was called: {device_calls}"
        )
        _end(auth, batch_id)

    def test_rule_fires_on_mid_batch_sensor_change(self, auth, device_calls):
        """
        Start with cool temperature (rule inactive), then inject hot reading.
        Rule must fire within one poll interval after the hot reading appears.
        """
        self._inject_sensor(20.0)  # start cool — condition NOT met

        batch_id = _start(auth, runtime=60).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )

        # Wait one poll cycle at cool temperature — no firing expected
        time.sleep(POLL + MARGIN)
        assert (CTRL_ID, 1.0) not in device_calls, (
            "Rule fired at cool temperature unexpectedly"
        )

        # Now inject hot temperature
        self._inject_sensor(65.0)

        fired = _wait_for_call(device_calls, CTRL_ID, 1.0, timeout=POLL * 2 + MARGIN)
        assert fired, (
            f"Rule did not fire after temperature rose to 65°C. Calls: {device_calls}"
        )
        _end(auth, batch_id)

    def test_toggle_rule_off_prevents_firing(self, auth, device_calls):
        """
        Toggle rule evaluation OFF → even with hot sensor data the fan stays off.
        """
        self._inject_sensor(70.0)  # above threshold

        batch_id = _start(auth, runtime=60).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )

        # Disable the rule engine
        r = http.put(
            f"/api/batches/{batch_id}/rules/toggle",
            json={"enabled": False},
            headers=auth,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "disabled"

        # Wait for two poll cycles — rule should be silent
        time.sleep(POLL * 2 + MARGIN)

        rule_fires = [(fid, v) for fid, v in device_calls if fid == CTRL_ID and v == 1.0]
        assert rule_fires == [], (
            f"Rule must not fire while disabled. Calls: {device_calls}"
        )
        _end(auth, batch_id)

    def test_toggle_rule_back_on_fires_again(self, auth, device_calls):
        """
        Disable, then re-enable rule → it fires on the next poll.

        Timing note
        -----------
        After toggle-off the old worker sleeps POLL_INTERVAL (3 s) before it
        notices and exits.  After toggle-on a *new* worker thread is spawned
        which also waits POLL_INTERVAL before its first evaluation.
        Total wait: (POLL + MARGIN) + POLL * 2 + MARGIN = ~12 s.
        """
        self._inject_sensor(80.0)

        batch_id = _start(auth, runtime=120).json()["id"]
        try:
            http.post(
                f"/api/batches/{batch_id}/rules",
                json={"local_rule_ids": [_ids["local_rule_id"]]},
                headers=auth,
            )

            # Disable immediately — old worker will exit after POLL_INTERVAL sleep
            http.put(
                f"/api/batches/{batch_id}/rules/toggle",
                json={"enabled": False},
                headers=auth,
            )
            time.sleep(POLL + MARGIN)
            assert (CTRL_ID, 1.0) not in device_calls, "Must not fire while disabled"

            # Re-enable — a new worker starts and fires after its first POLL_INTERVAL
            http.put(
                f"/api/batches/{batch_id}/rules/toggle",
                json={"enabled": True},
                headers=auth,
            )

            fired = _wait_for_call(device_calls, CTRL_ID, 1.0, timeout=POLL * 3 + MARGIN * 2)
            assert fired, (
                f"Rule did not fire after being re-enabled. Calls: {device_calls}"
            )
        finally:
            _end(auth, batch_id)

    def test_remove_rule_from_set(self, auth, device_calls):
        batch_id = _start(auth, runtime=60).json()["id"]
        http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )
        r = http.delete(
            f"/api/batches/{batch_id}/rules/{_ids['local_rule_id']}",
            headers=auth,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "removed"

        # Rule no longer in active set
        body = http.get(f"/api/batches/{batch_id}/rules", headers=auth).json()
        ids_in_set = [item["local_rule_id"] for item in body["rules"]]
        assert _ids["local_rule_id"] not in ids_in_set
        _end(auth, batch_id)

    def test_duplicate_rule_not_added_twice(self, auth, device_calls):
        batch_id = _start(auth, runtime=30).json()["id"]
        for _ in range(2):
            http.post(
                f"/api/batches/{batch_id}/rules",
                json={"local_rule_ids": [_ids["local_rule_id"]]},
                headers=auth,
            )
        body = http.get(f"/api/batches/{batch_id}/rules", headers=auth).json()
        count = sum(1 for r in body["rules"] if r["local_rule_id"] == _ids["local_rule_id"])
        assert count == 1, "Rule must not be duplicated in rule set"
        _end(auth, batch_id)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  5. Combined: schedule + rule active simultaneously                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class TestCombinedScheduleAndRule:

    def test_schedule_and_rule_run_in_same_batch(self, auth, device_calls):
        """
        Both schedule and rule threads run concurrently.
        Schedule: fan → 80 (stage A) then 40 (stage B).
        Rule:     fan → 1 when temperature > 40 (injected at 60°C).
        All three values must appear in device_calls.
        """
        insert_sensor_log(SENSOR_ID, 60.0)  # trigger rule

        batch_id = _start(auth, runtime=30).json()["id"]

        # Add schedule
        http.post(
            f"/api/batches/{batch_id}/schedules",
            json={"local_schedule_ids": [_ids["local_sched_id"]]},
            headers=auth,
        )
        # Add rule
        http.post(
            f"/api/batches/{batch_id}/rules",
            json={"local_rule_ids": [_ids["local_rule_id"]]},
            headers=auth,
        )

        timeout = max(POLL * 2, 8) + MARGIN

        sched_a = _wait_for_call(device_calls, CTRL_ID, 80.0, timeout=timeout)
        sched_b = _wait_for_call(device_calls, CTRL_ID, 40.0, timeout=timeout)
        rule_f  = _wait_for_call(device_calls, CTRL_ID, 1.0,  timeout=timeout)

        _end(auth, batch_id)

        assert sched_a, "Schedule stage A (fan=80) did not fire"
        assert sched_b, "Schedule stage B (fan=40) did not fire"
        assert rule_f,  "Rule (fan=1 at 60°C) did not fire"
