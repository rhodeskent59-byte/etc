"""
HOUSE-OBD Standardized Building DTC (Diagnostic Trouble Code) & Telemetry Schemas
Pydantic v2 contracts mirroring automotive OBD-II / CAN-bus specifications.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


DTC_PATTERN = re.compile(r"^[PENSC][0-9]{4}$")


class DTCSubsystem(str, Enum):
    POWER = "P"          # P0xxx: Power & Electrical (circuit load, UPS, voltage sag, solar/inverter)
    ENVIRONMENTAL = "E"  # E0xxx: Environmental & HVAC (static pressure, VOC/CO2, thermal drift)
    NETWORK = "N"        # N0xxx: Network & Fiber Infrastructure (packet loss, jitter, ONT thermal)
    SECURITY = "S"       # S0xxx: Structural, Security & Perimeter (contacts, water leak, pressure)
    COMPUTE = "C"        # C0xxx: Compute & Edge Hardware (CPU thermal, RAM pressure, disk I/O, USB)


class DTCSeverity(str, Enum):
    INFO = "INFO"
    WARN = "WARN"
    CRITICAL = "CRITICAL"


class NodeStatus(str, Enum):
    ONLINE = "ONLINE"
    DEGRADED = "DEGRADED"
    ISOLATED = "ISOLATED"
    OFFLINE = "OFFLINE"


class ReadinessStatus(str, Enum):
    OK = "OK"
    INC = "INC"
    FAULT = "FAULT"


STANDARD_DTC_CATALOG: Dict[str, Dict[str, str]] = {
    "P0102": {
        "subsystem": "POWER",
        "title": "Main Panel Phase-B Voltage Sag Below 111.5V",
        "default_severity": "WARN",
    },
    "P0214": {
        "subsystem": "POWER",
        "title": "Server Rack Online UPS Battery Internal Resistance High",
        "default_severity": "CRITICAL",
    },
    "P0308": {
        "subsystem": "POWER",
        "title": "Hybrid Inverter String-2 MPPT Arc-Fault / Ripple Anomaly",
        "default_severity": "CRITICAL",
    },
    "E0104": {
        "subsystem": "HVAC",
        "title": "AHU-1 Supply Plenum Static Pressure Drop (Filter Restriction)",
        "default_severity": "WARN",
    },
    "E0301": {
        "subsystem": "HVAC",
        "title": "Server Closet CRAC Return Airflow Delta-T Exceeded (+9.4C)",
        "default_severity": "CRITICAL",
    },
    "E0412": {
        "subsystem": "HVAC",
        "title": "Fabrication Bay TVOC / Particulate PM2.5 Threshold Breach",
        "default_severity": "WARN",
    },
    "N0104": {
        "subsystem": "FIBER/NET",
        "title": "WAN GPON ONT Optical RX Power Marginal / High Jitter (>28ms)",
        "default_severity": "WARN",
    },
    "N0209": {
        "subsystem": "FIBER/NET",
        "title": "Core 10GbE SFP+ Transceiver Cage 3 Thermal Throttling",
        "default_severity": "CRITICAL",
    },
    "S0108": {
        "subsystem": "PERIMETER",
        "title": "Main Water Manifold Flow Rate Continuous Micro-Leak Signature",
        "default_severity": "CRITICAL",
    },
    "S0203": {
        "subsystem": "PERIMETER",
        "title": "North Loading Bay Reed Contact Tamper / Desync",
        "default_severity": "WARN",
    },
    "C0105": {
        "subsystem": "COMPUTE",
        "title": "Ryzen Edge Node Package Thermal Throttling (Tctl > 89C)",
        "default_severity": "CRITICAL",
    },
    "C0201": {
        "subsystem": "COMPUTE",
        "title": "Edge Node Memory Pressure / Swap Thrashing (>92% Utilized)",
        "default_severity": "WARN",
    },
    "C0311": {
        "subsystem": "COMPUTE",
        "title": "NVMe RAID-1 Array Write Await Latency Spike (>45ms)",
        "default_severity": "WARN",
    },
}


class NodeRegistration(BaseModel):
    node_id: str = Field(..., min_length=2, max_length=64)
    zone: str = Field(..., min_length=2, max_length=64)
    hardware_type: str = Field(..., min_length=2, max_length=64)
    ip_or_serial: str = Field(..., min_length=2, max_length=128)
    status: NodeStatus = Field(default=NodeStatus.ONLINE)
    last_heartbeat: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TelemetrySample(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    node_id: str = Field(..., min_length=2, max_length=64)
    metric_key: str = Field(..., min_length=1, max_length=64)
    metric_value: float
    unit: str = Field(..., min_length=1, max_length=24)


class BatchTelemetryIngestRequest(BaseModel):
    node: Optional[NodeRegistration] = None
    samples: List[TelemetrySample] = Field(..., min_length=1, max_length=500)


class FreezeFrameSnapshot(BaseModel):
    captured_at: str
    trigger_node_id: str
    trigger_metric: str
    trigger_value: float
    trigger_unit: str
    zone_metrics: Dict[str, Dict[str, float]]
    system_load_1m: float
    ambient_temp_c: float
    line_voltage_v: float
    fiber_jitter_ms: float


class ActiveDTC(BaseModel):
    dtc_code: str
    node_id: str
    zone: str = "Server/Edge Rack"
    title: str
    severity: DTCSeverity
    first_seen: str
    last_seen: str
    occurrence_count: int = Field(default=1, ge=1)
    freeze_frame_json: Dict[str, Any]
    resolved_at: Optional[str] = None
    swarm_verdict: Optional[DiagnosticVerdict] = None

    @field_validator("dtc_code")
    @classmethod
    def validate_dtc_format(cls, value: str) -> str:
        code = value.strip().upper()
        if not DTC_PATTERN.match(code):
            raise ValueError(
                f"Invalid Building DTC '{value}'. Must match [P|E|N|S|C]0xxx (e.g., P0102, E0301, C0105)."
            )
        return code


class DiagnosticVerdict(BaseModel):
    dtc_code: str
    root_cause_confidence: float = Field(..., ge=0.0, le=1.0)
    correlated_anomalies: List[str]
    critic_dissent: str
    automated_script_safe: bool
    remediation_steps: List[str]
    terminal_command_or_payload: Optional[str] = None

    @field_validator("dtc_code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = value.strip().upper()
        if not DTC_PATTERN.match(code):
            raise ValueError(f"Invalid DTC code format: {value}")
        return code


class AgentAuditEntry(BaseModel):
    id: int
    timestamp: str
    agent_role: str
    dtc_code: str
    action_taken: str
    verification_status: str


class OBDClearRequest(BaseModel):
    dtc_code: Optional[str] = None
    operator_id: str = "TACTICAL-HUD-OP"
    reason: str = "Manual DTC reset and readiness monitor re-initialization"


class OBDScanReport(BaseModel):
    scanned_at: str
    mil_illuminated: bool
    active_node_count: int
    readiness_monitors: Dict[str, ReadinessStatus]
    active_dtcs: List[ActiveDTC]
    recent_audit_log: List[AgentAuditEntry]
