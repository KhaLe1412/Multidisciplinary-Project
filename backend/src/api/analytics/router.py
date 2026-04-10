from typing import Optional
from fastapi import APIRouter, Depends
from src.auth import get_current_user
from src.db import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ─── Overview ─────────────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    dryer_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)

        where_clauses = ["b.end_time IS NOT NULL"]
        params: list = []
        if from_date:
            where_clauses.append("DATE(b.start_time) >= %s")
            params.append(from_date)
        if to_date:
            where_clauses.append("DATE(b.start_time) <= %s")
            params.append(to_date)
        if dryer_id:
            where_clauses.append("b.dryer_id = %s")
            params.append(dryer_id)
        where_sql = " AND ".join(where_clauses)

        # Summary row
        cur.execute(
            f"""
            SELECT
                COUNT(b.id)  AS total_batches,
                COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)), 0) AS total_minutes,
                COALESCE(SUM(b.input_weight),  0) AS total_input_kg,
                COALESCE(SUM(b.output_weight), 0) AS total_output_kg,
                COALESCE(AVG(b.rating),        0) AS avg_rating
            FROM batches b
            WHERE {where_sql}
            """,
            params,
        )
        s = cur.fetchone()
        total_minutes = float(s["total_minutes"] or 0)
        total_input   = float(s["total_input_kg"]  or 0)
        total_output  = float(s["total_output_kg"] or 0)

        # Estimate energy: sum of device power_status (W) × total operating hours / 1000
        if dryer_id:
            cur.execute(
                "SELECT COALESCE(SUM(power_status), 0) AS total_power FROM devices WHERE dryer_id = %s",
                (dryer_id,),
            )
        else:
            cur.execute(
                "SELECT COALESCE(SUM(power_status), 0) AS total_power FROM devices"
            )
        power_row = cur.fetchone()
        total_power_w   = float(power_row["total_power"] or 0)
        total_energy_kwh = round(total_power_w * (total_minutes / 60) / 1000, 2)

        # Daily production
        cur.execute(
            f"""
            SELECT
                DATE(b.start_time)              AS date,
                COUNT(b.id)                     AS batches,
                COALESCE(SUM(b.input_weight),  0) AS input_kg,
                COALESCE(SUM(b.output_weight), 0) AS output_kg
            FROM batches b
            WHERE {where_sql}
            GROUP BY DATE(b.start_time)
            ORDER BY date
            """,
            params,
        )
        daily_production = []
        for r in cur.fetchall():
            d = r["date"]
            date_str   = d.isoformat() if hasattr(d, "isoformat") else str(d)
            date_label = d.strftime("%d/%m") if hasattr(d, "strftime") else date_str
            daily_production.append({
                "date":       date_str,
                "date_label": date_label,
                "batches":    r["batches"],
                "input_kg":   float(r["input_kg"]),
                "output_kg":  float(r["output_kg"]),
            })

        # Crop stats
        cur.execute(
            f"""
            SELECT
                c.id   AS crop_id,
                c.name AS crop_name,
                COUNT(b.id) AS batch_count,
                COALESCE(SUM(b.input_weight),  0) AS input_kg,
                COALESCE(SUM(b.output_weight), 0) AS output_kg,
                COALESCE(AVG(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)), 0) AS avg_minutes,
                COALESCE(AVG(b.rating), 0) AS avg_rating
            FROM batches b
            JOIN crops c ON c.id = b.crop_id
            WHERE {where_sql}
            GROUP BY c.id, c.name
            ORDER BY batch_count DESC
            """,
            params,
        )
        crop_stats = []
        for r in cur.fetchall():
            inp = float(r["input_kg"])
            out = float(r["output_kg"])
            crop_stats.append({
                "crop_id":     r["crop_id"],
                "crop_name":   r["crop_name"],
                "batch_count": r["batch_count"],
                "input_kg":    inp,
                "output_kg":   out,
                "yield_rate":  round(out / inp * 100, 1) if inp > 0 else 0,
                "avg_minutes": round(float(r["avg_minutes"])),
                "avg_rating":  round(float(r["avg_rating"]), 1),
            })

        n = s["total_batches"] or 0
        return {
            "summary": {
                "total_batches":         n,
                "total_operating_minutes": int(total_minutes),
                "avg_batch_minutes":     round(total_minutes / n) if n > 0 else 0,
                "total_energy_kwh":      total_energy_kwh,
                "avg_rating":            round(float(s["avg_rating"] or 0), 1),
                "total_input_kg":        total_input,
                "total_output_kg":       total_output,
                "yield_rate":            round(total_output / total_input * 100, 1) if total_input > 0 else 0,
            },
            "daily_production": daily_production,
            "crop_stats":       crop_stats,
        }
    finally:
        conn.close()


# ─── Dryer Stats ───────────────────────────────────────────────────────────────

@router.get("/dryers")
def get_dryer_stats(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    dryer_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)

        where_clauses = ["b.end_time IS NOT NULL"]
        params: list = []
        if from_date:
            where_clauses.append("DATE(b.start_time) >= %s")
            params.append(from_date)
        if to_date:
            where_clauses.append("DATE(b.start_time) <= %s")
            params.append(to_date)
        if dryer_id:
            where_clauses.append("b.dryer_id = %s")
            params.append(dryer_id)
        where_sql = " AND ".join(where_clauses)

        # Per-dryer stats
        cur.execute(
            f"""
            SELECT
                d.id   AS dryer_id,
                d.name AS dryer_name,
                d.status,
                COUNT(b.id)  AS batch_count,
                COALESCE(SUM(b.input_weight),  0) AS input_kg,
                COALESCE(SUM(b.output_weight), 0) AS output_kg,
                COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)), 0) AS total_minutes,
                COALESCE(AVG(b.rating), 0) AS avg_rating
            FROM dryers d
            LEFT JOIN batches b ON b.dryer_id = d.id AND {where_sql}
            GROUP BY d.id, d.name, d.status
            ORDER BY d.id
            """,
            params,
        )
        dryer_rows = cur.fetchall()

        # Error counts per dryer from system_logs
        cur.execute(
            """
            SELECT sl.dryer_id, COUNT(*) AS error_count
            FROM system_logs sl
            JOIN severity_levels sv ON sv.id = sl.severity_id
            WHERE sv.level = 'error' AND sl.dryer_id IS NOT NULL
            GROUP BY sl.dryer_id
            """
        )
        error_map: dict = {}
        for r in cur.fetchall():
            if r["dryer_id"] is not None:
                error_map[r["dryer_id"]] = r["error_count"]

        dryer_stats = []
        for r in dryer_rows:
            inp = float(r["input_kg"])
            out = float(r["output_kg"])
            minutes = float(r["total_minutes"] or 0)
            dryer_stats.append({
                "dryer_id":        r["dryer_id"],
                "dryer_name":      r["dryer_name"],
                "status":          r["status"],
                "batch_count":     r["batch_count"],
                "input_kg":        inp,
                "output_kg":       out,
                "yield_rate":      round(out / inp * 100, 1) if inp > 0 else 0,
                "operating_hours": round(minutes / 60, 1),
                "error_count":     error_map.get(r["dryer_id"], 0),
                "avg_rating":      round(float(r["avg_rating"] or 0), 1),
            })

        # Batch details
        cur.execute(
            f"""
            SELECT
                b.id          AS batch_id,
                b.dryer_id,
                d.name        AS dryer_name,
                c.name        AS crop_name,
                b.input_weight,
                b.output_weight,
                b.start_time,
                b.rating,
                TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) AS duration_minutes
            FROM batches b
            JOIN dryers d ON d.id = b.dryer_id
            JOIN crops  c ON c.id = b.crop_id
            WHERE {where_sql}
            ORDER BY b.start_time DESC
            LIMIT 200
            """,
            params,
        )
        batch_details = []
        for r in cur.fetchall():
            inp = float(r["input_weight"] or 0)
            out = float(r["output_weight"] or 0) if r["output_weight"] is not None else None
            st  = r["start_time"]
            batch_details.append({
                "batch_id":         r["batch_id"],
                "dryer_id":         r["dryer_id"],
                "dryer_name":       r["dryer_name"],
                "crop_name":        r["crop_name"],
                "input_weight":     inp,
                "output_weight":    out,
                "yield_rate":       round(out / inp * 100, 1) if (inp > 0 and out is not None) else None,
                "start_time":       st.isoformat() if hasattr(st, "isoformat") else str(st),
                "duration_minutes": r["duration_minutes"],
                "rating":           r["rating"],
            })

        return {
            "dryer_stats":   dryer_stats,
            "batch_details": batch_details,
        }
    finally:
        conn.close()


# ─── Batch Sensor Readings ─────────────────────────────────────────────────────

@router.get("/batches/{batch_id}/sensors")
def get_batch_sensors(
    batch_id: int,
    current_user: dict = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)

        # Fetch batch time range and dryer
        cur.execute(
            "SELECT dryer_id, start_time, COALESCE(end_time, NOW()) AS end_time FROM batches WHERE id = %s",
            (batch_id,),
        )
        batch = cur.fetchone()
        if not batch:
            return []

        dryer_id  = batch["dryer_id"]
        start_ts  = batch["start_time"]
        end_ts    = batch["end_time"]

        # All sensor devices for this dryer
        cur.execute(
            """
            SELECT d.id AS device_id, d.name AS device_name,
                   dt.name AS device_type, dt.unit
            FROM devices d
            JOIN device_types dt ON dt.id = d.type_id
            WHERE d.dryer_id = %s AND dt.category = 'sensor'
            ORDER BY d.id
            """,
            (dryer_id,),
        )
        devices = cur.fetchall()

        result = []
        for dev in devices:
            cur.execute(
                """
                SELECT timestamp, value
                FROM sensor_logs
                WHERE device_id = %s
                  AND timestamp BETWEEN %s AND %s
                ORDER BY timestamp
                LIMIT 500
                """,
                (dev["device_id"], start_ts, end_ts),
            )
            readings = []
            for row in cur.fetchall():
                ts = row["timestamp"]
                readings.append({
                    "timestamp": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
                    "value":     float(row["value"]) if row["value"] is not None else None,
                })
            result.append({
                "device_id":   dev["device_id"],
                "device_name": dev["device_name"],
                "device_type": dev["device_type"],
                "unit":        dev["unit"],
                "readings":    readings,
            })

        return result
    finally:
        conn.close()
