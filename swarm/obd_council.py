"""
HOUSE-OBD Autonomous Multi-Agent Diagnostic Swarm & Adversarial Critic Council
Dispatches 3 specialized sub-agents in parallel via asyncio.gather() using the
Google Gemini API (`google-genai` SDK), followed by a Synthesizer pass returning
a strict `DiagnosticVerdict` Pydantic contract.
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Dict

from google import genai
from google.genai import types
from models.schemas import DiagnosticVerdict


MODEL_ID = "gemini-3.8-flash"


class OBDCouncil:
    def __init__(self, api_key: str | None = None) -> None:
        resolved_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.client = genai.Client(
            api_key=resolved_key,
            http_options={"headers": {"User-Agent": "aistudio-build"}},
        )

    async def _run_agent(self, system_prompt: str, user_payload: str) -> str:
        def _call() -> str:
            resp = self.client.models.generate_content(
                model=MODEL_ID,
                contents=user_payload,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                ),
            )
            return resp.text or ""

        return await asyncio.to_thread(_call)

    async def evaluate_dtc(
        self, dtc_code: str, node_id: str, severity: str, freeze_frame: Dict[str, Any]
    ) -> DiagnosticVerdict:
        context_blob = json.dumps(
            {
                "dtc_code": dtc_code,
                "node_id": node_id,
                "severity": severity,
                "freeze_frame_snapshot": freeze_frame,
            },
            indent=2,
        )

        # Parallel dispatch of the 3 specialized sub-agents
        analyst_task = self._run_agent(
            system_prompt=(
                "You are Agent 1: Root-Cause Telemetry Analyst (Role: Diagnostics) for HOUSE-OBD. "
                "Correlate cross-zone metrics from the freeze-frame snapshot (e.g., whether a compute "
                "thermal fault C0105 was triggered by HVAC static pressure loss E0301 or electrical sag P0102). "
                "Provide concise, quantitative root-cause findings."
            ),
            user_payload=context_blob,
        )

        critic_task = self._run_agent(
            system_prompt=(
                "You are Agent 2: Infrastructure & Compliance Auditor (Role: Adversarial Critic / Roast Mode). "
                "You are strictly forbidden from agreement bias. Challenge naive hypotheses, identify single "
                "points of failure, flag potential sensor drift or false positives, and cite NEC/ASHRAE/IEEE "
                "facility risks."
            ),
            user_payload=context_blob,
        )

        remediation_task = self._run_agent(
            system_prompt=(
                "You are Agent 3: Remediation & Dispatch Engineer (Role: Actuation). "
                "Draft deterministic, reversible remediation steps and a concrete shell command or CAN/MQTT "
                "actuator payload to stabilize the building subsystem safely."
            ),
            user_payload=context_blob,
        )

        analyst_out, critic_out, remediation_out = await asyncio.gather(
            analyst_task, critic_task, remediation_task
        )

        synthesis_prompt = (
            f"DTC Context:\n{context_blob}\n\n"
            f"--- Agent 1 (Root-Cause Telemetry Analyst) ---\n{analyst_out}\n\n"
            f"--- Agent 2 (Adversarial Critic / Roast Mode) ---\n{critic_out}\n\n"
            f"--- Agent 3 (Remediation & Actuation Engineer) ---\n{remediation_out}\n\n"
            "Synthesize these three sub-agent reports into the strict DiagnosticVerdict JSON schema."
        )

        def _synthesize() -> DiagnosticVerdict:
            resp = self.client.models.generate_content(
                model=MODEL_ID,
                contents=synthesis_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "You are the HOUSE-OBD Chief Diagnostic Verifier. Produce a strict JSON verdict "
                        "matching DiagnosticVerdict without any markdown wrappers."
                    ),
                    response_mime_type="application/json",
                    response_schema=DiagnosticVerdict,
                ),
            )
            raw_json = (resp.text or "{}").strip()
            return DiagnosticVerdict.model_validate_json(raw_json)

        return await asyncio.to_thread(_synthesize)
