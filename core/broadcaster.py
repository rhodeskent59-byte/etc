"""
HOUSE-OBD Real-Time Multiplexed WebSocket Broadcaster
Manages zero-latency telemetry frames, DTC MIL alerts, and client backpressure.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Dict, Set
from fastapi import WebSocket


class TelemetryBroadcaster:
    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._sequence = 0

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def broadcast(self, event_type: str, payload: Dict[str, Any]) -> int:
        self._sequence += 1
        envelope = json.dumps(
            {
                "seq": self._sequence,
                "type": event_type,
                "server_ts_ms": int(time.time() * 1000),
                "payload": payload,
            },
            separators=(",", ":"),
        )
        async with self._lock:
            targets = list(self._clients)

        stale: list[WebSocket] = []
        delivered = 0
        for client in targets:
            try:
                await asyncio.wait_for(client.send_text(envelope), timeout=1.5)
                delivered += 1
            except Exception:
                stale.append(client)

        if stale:
            async with self._lock:
                for client in stale:
                    self._clients.discard(client)
        return delivered
