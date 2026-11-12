"""
Standalone Verification Script: SQLite WAL High-Concurrency Stress Harness
Simulates 50 concurrent sensor writes per second while simultaneously executing
analytical read queries across nodes, telemetry streams, and active DTC tables.
Verifies zero `sqlite3.OperationalError: database is locked` exceptions.
"""

from __future__ import annotations

import asyncio
import os
import random
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.engine import HouseOBDDatabaseEngine


NODES = [
    ("node-rack-01", "Server/Edge Rack", "Ryzen-9-7950X-Edge", "10.20.0.10"),
    ("node-hvac-01", "Fabrication/Workshop", "CRAC-ESP32-PoE", "10.20.1.14"),
    ("node-pwr-01", "Server/Edge Rack", "Eaton-9PX-UPS-CAN", "10.20.0.22"),
    ("node-net-01", "Office Command", "GPON-SFP-10G-Core", "10.20.0.1"),
    ("node-sec-01", "Perimeter", "Manifold-Ultrasonic-Flow", "10.20.4.8"),
]


async def run_wal_stress_test(duration_seconds: float = 2.0, writers_per_sec: int = 50) -> dict:
    tmp_dir = tempfile.mkdtemp(prefix="house_obd_wal_test_")
    db_file = os.path.join(tmp_dir, "verify_wal.sqlite3")
    engine = HouseOBDDatabaseEngine(db_path=db_file, reader_pool_size=6)
    await engine.initialize()

    pragmas = await engine.verify_pragmas()
    assert pragmas["journal_mode"] == "WAL", f"Expected WAL mode, got {pragmas}"
    assert pragmas["busy_timeout"] >= 5000, f"Expected busy_timeout >= 5000, got {pragmas}"

    for node_id, zone, hw, ip in NODES:
        await engine.upsert_node(node_id, zone, hw, ip)

    lock_errors: list[str] = []
    completed_writes = 0
    completed_reads = 0
    start_time = time.perf_counter()

    async def sensor_writer_worker(worker_id: int) -> None:
        nonlocal completed_writes
        node_id, _, _, _ = NODES[worker_id % len(NODES)]
        ts = datetime.now(timezone.utc).isoformat()
        samples = [
            (ts, node_id, "cpu_temp_c", round(random.uniform(42.0, 88.5), 2), "C"),
            (ts, node_id, "line_voltage_v", round(random.uniform(118.2, 121.4), 2), "V"),
            (ts, node_id, "fiber_jitter_ms", round(random.uniform(0.4, 9.8), 3), "ms"),
        ]
        try:
            await engine.ingest_telemetry_batch(samples)
            completed_writes += 1
        except Exception as exc:
            lock_errors.append(f"Writer-{worker_id}: {exc!r}")

    async def analytical_reader_worker(reader_id: int) -> None:
        nonlocal completed_reads
        try:
            async with engine.read_connection() as conn:
                await conn.execute(
                    """
                    SELECT
                        n.zone,
                        t.metric_key,
                        COUNT(*) AS sample_cnt,
                        AVG(t.metric_value) AS avg_val,
                        MAX(t.metric_value) AS peak_val
                    FROM telemetry_stream t
                    JOIN nodes n ON n.node_id = t.node_id
                    GROUP BY n.zone, t.metric_key
                    ORDER BY peak_val DESC;
                    """
                )
            completed_reads += 1
        except Exception as exc:
            lock_errors.append(f"Reader-{reader_id}: {exc!r}")

    ticks = max(1, int(duration_seconds))
    for tick in range(ticks):
        tasks = []
        for w in range(writers_per_sec):
            tasks.append(asyncio.create_task(sensor_writer_worker(tick * writers_per_sec + w)))
        for r in range(20):
            tasks.append(asyncio.create_task(analytical_reader_worker(tick * 20 + r)))
        await asyncio.gather(*tasks)

    await engine.record_dtc(
        dtc_code="C0105",
        node_id="node-rack-01",
        severity="CRITICAL",
        freeze_frame={"cpu_temp_c": 91.4, "fan_rpm": 4820, "ambient_c": 29.8},
    )
    rollup_stats = await engine.prune_and_rollup_ring_buffer(retention_days=7)
    elapsed = round(time.perf_counter() - start_time, 3)
    await engine.shutdown()

    result = {
        "status": "PASS" if len(lock_errors) == 0 else "FAIL",
        "pragmas": pragmas,
        "completed_write_transactions": completed_writes,
        "total_rows_inserted": completed_writes * 3,
        "completed_analytical_reads": completed_reads,
        "database_locked_exceptions": len(lock_errors),
        "elapsed_seconds": elapsed,
        "rollup_check": rollup_stats,
    }
    print(result)
    if lock_errors:
        raise RuntimeError(f"SQLite WAL concurrency errors detected: {lock_errors}")
    return result


if __name__ == "__main__":
    asyncio.run(run_wal_stress_test())
