"""
HOUSE-OBD FastAPI Ingestion Bus, Diagnostic Scanner & WebSocket Multiplexer
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from collectors.local_node import EdgeNodeCollectorDaemon
from core.broadcaster import TelemetryBroadcaster
from db.engine import HouseOBDDatabaseEngine
from models.schemas import (
    BatchTelemetryIngestRequest,
    OBDClearRequest,
    ReadinessStatus,
    STANDARD_DTC_CATALOG,
)
from swarm.obd_council import OBDCouncil


db_engine = HouseOBDDatabaseEngine("house_obd.sqlite3")
broadcaster = TelemetryBroadcaster()
council = OBDCouncil()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await db_engine.initialize()
    db_engine.start_background_maintenance(interval_seconds=900)

    async def on_collector_dtc(
        dtc_code: str, node_id: str, severity: str, freeze_frame: Dict[str, Any]
    ) -> None:
        record = await db_engine.record_dtc(dtc_code, node_id, severity, freeze_frame)
        await broadcaster.broadcast("dtc_alert", record)

    collector = EdgeNodeCollectorDaemon(on_dtc_tripped=on_collector_dtc)
    await db_engine.upsert_node(
        node_id=collector.node_id,
        zone=collector.zone,
        hardware_type="Linux-Edge-Node",
        ip_or_serial="127.0.0.1",
    )

    stop_event = asyncio.Event()

    async def collector_loop() -> None:
        while not stop_event.is_set():
            snap = await collector.collect_once()
            now_iso = datetime.now(timezone.utc).isoformat()
            batch = [
                (now_iso, collector.node_id, k, float(v), "")
                for k, v in snap.items()
            ]
            await db_engine.ingest_telemetry_batch(batch)
            await broadcaster.broadcast(
                "telemetry_frame",
                {"node_id": collector.node_id, "zone": collector.zone, "metrics": snap},
            )
            await asyncio.sleep(2.0)

    loop_task = asyncio.create_task(collector_loop())
    try:
        yield
    finally:
        stop_event.set()
        loop_task.cancel()
        await db_engine.shutdown()


app = FastAPI(
    title="HOUSE-OBD Autonomous Facility Engine",
    version="2.4.0",
    lifespan=lifespan,
)


@app.post("/api/v1/telemetry/ingest")
async def ingest_telemetry(payload: BatchTelemetryIngestRequest) -> Dict[str, Any]:
    if payload.node:
        await db_engine.upsert_node(
            node_id=payload.node.node_id,
            zone=payload.node.zone,
            hardware_type=payload.node.hardware_type,
            ip_or_serial=payload.node.ip_or_serial,
            status=payload.node.status.value,
            last_heartbeat=payload.node.last_heartbeat.isoformat(),
        )

    rows = [
        (
            s.timestamp.isoformat(),
            s.node_id,
            s.metric_key,
            float(s.metric_value),
            s.unit,
        )
        for s in payload.samples
    ]
    inserted = await db_engine.ingest_telemetry_batch(rows)
    await broadcaster.broadcast("ingest_ack", {"inserted": inserted})
    return {"status": "OK", "ingested_samples": inserted}


@app.get("/api/v1/obd/scan")
async def obd_full_scan() -> Dict[str, Any]:
    async with db_engine.read_connection() as conn:
        node_rows = await conn.execute("SELECT * FROM nodes ORDER BY zone, node_id;")
        dtc_rows = await conn.execute(
            "SELECT * FROM active_dtcs WHERE resolved_at IS NULL ORDER BY last_seen DESC;"
        )
        audit_rows = await conn.execute(
            "SELECT * FROM agent_audit_log ORDER BY id DESC LIMIT 25;"
        )

    readiness = {
        "POWER": ReadinessStatus.OK.value,
        "HVAC": ReadinessStatus.OK.value,
        "FIBER/NET": ReadinessStatus.OK.value,
        "COMPUTE": ReadinessStatus.OK.value,
        "PERIMETER": ReadinessStatus.OK.value,
    }

    active_dtcs = []
    for r in dtc_rows:
        code = r["dtc_code"]
        meta = STANDARD_DTC_CATALOG.get(
            code, {"subsystem": "COMPUTE", "title": f"Facility Subsystem Fault {code}"}
        )
        sub = meta["subsystem"]
        if sub in readiness:
            readiness[sub] = (
                ReadinessStatus.FAULT.value
                if r["severity"] == "CRITICAL"
                else ReadinessStatus.INC.value
            )
        active_dtcs.append(dict(r))

    return {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "mil_illuminated": any(d["severity"] == "CRITICAL" for d in active_dtcs),
        "active_node_count": len(node_rows),
        "readiness_monitors": readiness,
        "active_dtcs": active_dtcs,
        "recent_audit_log": [dict(a) for a in audit_rows],
    }


@app.post("/api/v1/obd/clear")
async def obd_clear_dtcs(req: OBDClearRequest) -> Dict[str, Any]:
    cleared = await db_engine.clear_dtcs(req.dtc_code, req.operator_id)
    await broadcaster.broadcast(
        "dtc_cleared", {"dtc_code": req.dtc_code or "ALL", "cleared_count": cleared}
    )
    return {"status": "RESET_COMPLETE", "cleared_count": cleared}


@app.websocket("/ws/hud")
async def ws_hud_endpoint(ws: WebSocket) -> None:
    await broadcaster.connect(ws)
    try:
        while True:
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        await broadcaster.disconnect(ws)
