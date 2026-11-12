import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Bot,
  Home,
  KeyRound,
  Link2,
  XCircle,
  Check,
  WifiOff,
  Wifi,
  Flame,
} from 'lucide-react';
import type {
  PortalDefinition,
  HashChainedAuditEntry,
  RegistryMetadataEntry,
  PlatformAlarm,
  FaultCodeSpec,
  AgentActionRecord,
  PlannedOrInstalledDevice,
} from './platformCore';

export interface PlatformOverviewResponse {
  version: string;
  testSuiteSummary: {
    shared: number;
    faultEngine: number;
    designSystem: number;
    api: number;
    web: number;
    totalPassed: number;
    totalFailed: number;
    faultEngineSha256: string;
  };
  portals: PortalDefinition[];
  auditChain: {
    verification: {
      ok: boolean;
      count: number;
      brokenAtSeq?: number;
      reason?: string;
    };
    entries: HashChainedAuditEntry[];
  };
  credentialRegistry: RegistryMetadataEntry[];
  alarms: PlatformAlarm[];
  faultCatalog22: FaultCodeSpec[];
  agentActions: AgentActionRecord[];
  jobZero: {
    building: {
      id: string;
      name: string;
      address: string;
      deploymentType: 'residential';
      simulator: boolean;
      monitored: boolean;
      readingsCount: number;
      scansCount: number;
      statusLabel: string;
    };
    jobRecord: {
      id: string;
      title: string;
      status: string;
      window: string;
      beforePhotos: string[];
      fixNo1: string | null;
      checklist: Array<{ id: string; label: string; checked: boolean }>;
    };
    devices: PlannedOrInstalledDevice[];
  };
  modes: {
    residential: string[];
    commercial: string[];
  };
}

export function PlatformWorkspaces({
  subTab,
  onLogTerminal,
}: {
  subTab: 'portals_agents' | 'job_zero_panel' | 'firewall_audit';
  onLogTerminal: (cmd: string, out: string, tone?: 'info' | 'warn' | 'ok') => void;
}) {
  const [data, setData] = useState<PlatformOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPortal, setSelectedPortal] = useState<string>('client');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');
  const [activeMode, setActiveMode] = useState<string>('Home');
  const [bannerMessage, setBannerMessage] = useState<{
    title: string;
    detail: string;
    tone: 'ok' | 'warn' | 'err';
  } | null>(null);
  const [lanOfflineSimulated, setLanOfflineSimulated] = useState<boolean>(false);

  // Firewall safe metadata form
  const [fwProvider, setFwProvider] = useState<string>('stripe-billing-adapter');
  const [fwPurpose, setFwPurpose] = useState<string>('invoice-webhooks');
  const [fwOwner, setFwOwner] = useState<string>('owner@obd-home');
  const [fwRotation, setFwRotation] = useState<string>('2027-06-01');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/platform/overview');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PlatformOverviewResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error('Platform overview error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  async function handleDispatchAgentAction(
    actionType: 'fault_chain' | 'clear_life_safety_alarm' | 'tier3_outward_payment'
  ) {
    const res = await fetch('/api/v1/platform/agents/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType }),
    });
    const out = await res.json();
    await fetchOverview();

    if (actionType === 'clear_life_safety_alarm') {
      setBannerMessage({
        title: `HTTP ${res.status} · ${out.error || 'AGENT_HARD_LIMIT'}`,
        detail: out.record?.summary || 'Agents are permanently forbidden from clearing S-001/S-002 life-safety alarms.',
        tone: 'err',
      });
      onLogTerminal(
        '/agent-hard-limit S-001',
        `HTTP ${res.status} (${out.error}): ${out.record?.summary}`,
        'warn'
      );
    } else if (actionType === 'tier3_outward_payment') {
      setBannerMessage({
        title: `Tier 3 Outward Act Queued (HTTP ${res.status} · executed: ${String(out.executed)})`,
        detail: out.record?.summary || 'Queued for Owner approval tap.',
        tone: 'warn',
      });
      onLogTerminal('/agent-tier3-queue', `${out.record?.summary}`, 'info');
    } else {
      setBannerMessage({
        title: 'Cross-Department Fault Chain Completed (Coordinator → Dispatcher → Stockkeeper → Help Desk)',
        detail: `Executed ${out.stepsExecuted} governed staging steps across Owner, Dispatch, Warehouse, and Customer Service portals.`,
        tone: 'ok',
      });
      onLogTerminal(
        '/agent-chain P-001',
        'Coordinator → Dispatcher → Stockkeeper → Help Desk staging chain recorded in SHA-256 audit log.',
        'ok'
      );
    }
  }

  async function handleOwnerDecision(actionId: string, decision: 'APPROVE' | 'REJECT') {
    const res = await fetch(`/api/v1/platform/agents/${actionId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    const out = await res.json();
    await fetchOverview();
    setBannerMessage({
      title: `Owner Tap Decision Recorded: ${out.status}`,
      detail: `${out.record?.agentName} (${out.record?.actionClass}) -> ${out.status}`,
      tone: decision === 'APPROVE' ? 'ok' : 'warn',
    });
    onLogTerminal(`/owner-${decision.toLowerCase()} ${actionId}`, `Action ${actionId} marked ${out.status}`, 'ok');
  }

  async function handleApplyLowellMode(mode: string) {
    if (lanOfflineSimulated) {
      setBannerMessage({
        title: `OFFLINE FAILSAFE · COMMAND NOT SENT (${mode})`,
        detail:
          'LAN Gateway is unreachable. UI honestly reports NOT SENT (desired ≠ reported). Physical wall switches remain in MANUAL FALLBACK.',
        tone: 'warn',
      });
      onLogTerminal(
        `/lowell-mode ${mode} [OFFLINE]`,
        'NOT SENT — desired ≠ reported. Wall switches operating in physical MANUAL FALLBACK.',
        'warn'
      );
      return;
    }

    const res = await fetch('/api/v1/platform/lowell/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const out = await res.json();
    await fetchOverview();
    if (!res.ok) {
      setBannerMessage({
        title: `HTTP ${res.status} · ${out.error} (${mode})`,
        detail: out.message,
        tone: 'err',
      });
      onLogTerminal(`/lowell-mode ${mode}`, `REFUSED (${res.status} ${out.error}): ${out.message}`, 'warn');
    } else {
      setActiveMode(mode);
      setBannerMessage({
        title: `Mode '${mode}' Applied on 7965 Lowell — Actuated: ${out.actuated} Devices`,
        detail: out.note,
        tone: 'ok',
      });
      onLogTerminal(`/lowell-mode ${mode}`, out.note, 'ok');
    }
  }

  async function handleAttemptClearAlarm(alarm: PlatformAlarm) {
    const res = await fetch(`/api/v1/platform/alarms/${alarm.id}/clear`, {
      method: 'POST',
    });
    const out = await res.json();
    await fetchOverview();
    if (!res.ok) {
      setBannerMessage({
        title: `HTTP ${res.status} · ${out.error} (${alarm.code})`,
        detail: out.message,
        tone: 'err',
      });
      onLogTerminal(`/clear-alarm ${alarm.code}`, `BLOCKED (${res.status} ${out.error}): ${out.message}`, 'warn');
    } else {
      setBannerMessage({
        title: `Alarm ${alarm.code} Cleared via Software`,
        detail: `${alarm.title} transitioned to CLEARED.`,
        tone: 'ok',
      });
      onLogTerminal(`/clear-alarm ${alarm.code}`, `Alarm ${alarm.code} cleared.`, 'ok');
    }
  }

  async function handleReconcileDeviceAlarm(alarm: PlatformAlarm) {
    const res = await fetch(`/api/v1/platform/alarms/${alarm.id}/reconcile-device`, {
      method: 'POST',
    });
    const out = await res.json();
    await fetchOverview();
    setBannerMessage({
      title: `Hardware Scan Reconciler: ${alarm.code} → ${out.status}`,
      detail:
        out.status === 'RESOLVED_AT_DEVICE'
          ? `Life-safety alarm ${alarm.code} resolved strictly via physical RESOLVED_AT_DEVICE hardware scan.`
          : `Life-safety alarm ${alarm.code} re-triggered on bench harness.`,
      tone: out.status === 'RESOLVED_AT_DEVICE' ? 'ok' : 'warn',
    });
    onLogTerminal(`/reconcile-device ${alarm.code}`, `${alarm.code} transitioned to ${out.status}`, 'ok');
  }

  async function handleTestDeviceControl(deviceId: string, action = 'on') {
    const res = await fetch(`/api/v1/platform/devices/${deviceId}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const out = await res.json();
    await fetchOverview();
    if (!res.ok) {
      setBannerMessage({
        title: `Device ${deviceId} · HTTP ${res.status} (${out.error})`,
        detail: out.message,
        tone: 'err',
      });
      onLogTerminal(`/device-control ${deviceId}`, `HTTP ${res.status} ${out.error}: ${out.message}`, 'warn');
    } else {
      setBannerMessage({
        title: `Device ${deviceId} · Command Status: ${out.commandStatus}`,
        detail: `desiredState=${out.desiredState} | reportedState=${out.reportedState} | ${out.failsafe}`,
        tone: 'warn',
      });
      onLogTerminal(`/device-control ${deviceId}`, `${out.commandStatus}: ${out.failsafe}`, 'info');
    }
  }

  async function handleTestSecretFirewall(payload: Record<string, unknown>, label: string) {
    const res = await fetch('/api/v1/platform/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    await fetchOverview();
    if (!res.ok) {
      setBannerMessage({
        title: `FIREWALL BLOCKED [${label}] · HTTP ${res.status} ${out.error}`,
        detail: `${out.message} (field: ${out.field}, pattern: ${out.pattern})`,
        tone: 'err',
      });
      onLogTerminal(`/registry-firewall [${label}]`, `HTTP ${res.status} ${out.error} on ${out.field} (${out.pattern})`, 'warn');
    } else {
      setBannerMessage({
        title: `METADATA REGISTERED [${label}] · HTTP ${res.status}`,
        detail: `Registered ${out.provider} (${out.purpose}) with status ${out.status}. Zero secret values stored.`,
        tone: 'ok',
      });
      onLogTerminal(`/registry-metadata [${label}]`, `Registered ${out.provider} metadata safely.`, 'ok');
    }
  }

  if (!data && loading) {
    return (
      <main className="relative z-10 max-w-[1600px] mx-auto p-6 text-xs obd-mono text-zinc-400">
        Loading OBD Home Systems Platform (22 Portals, 23 Governed Agents, 7965 Lowell Job Zero)...
      </main>
    );
  }

  if (!data) return null;

  const activePortalObj = data.portals.find((p) => p.slug === selectedPortal) || data.portals[0]!;
  const uniqueLocations = Array.from(new Set(data.jobZero.devices.map((d) => d.location)));
  const filteredJobZeroDevices =
    selectedLocationFilter === 'ALL'
      ? data.jobZero.devices
      : data.jobZero.devices.filter((d) => d.location === selectedLocationFilter);

  return (
    <main className="relative z-10 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-5 pb-28">
      {/* Live Feedback Banner */}
      {bannerMessage && (
        <div
          className={`p-3.5 border flex items-start justify-between gap-4 ${
            bannerMessage.tone === 'err'
              ? 'bg-red-950/50 border-red-500 text-red-200'
              : bannerMessage.tone === 'warn'
              ? 'bg-amber-950/50 border-amber-500 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200'
          }`}
        >
          <div className="space-y-1">
            <div className="obd-mono text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-[#FF5500]" />
              <span>{bannerMessage.title}</span>
            </div>
            <p className="text-xs opacity-90">{bannerMessage.detail}</p>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="obd-mono text-xs px-2 py-0.5 border border-current/40 hover:bg-white/10"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB A: 22 PORTALS & 23 GOVERNED AI AGENT WORKFORCE
         ===================================================================== */}
      {subTab === 'portals_agents' && (
        <div className="space-y-6">
          <section className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 p-4 lg:p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF5500]" />
                <h2 className="text-base font-semibold text-white">
                  22 Department Portal Doors & 23 Governed AI Agent Workforce ({data.version})
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every portal renders its real operational workspace with{' '}
                <span className="obd-mono text-emerald-400">CONNECTED TO CORE</span> and honest{' '}
                <span className="obd-mono text-amber-300">NOT CONNECTED</span> external integration badges — never fake green status.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDispatchAgentAction('fault_chain')}
                className="px-3.5 py-2 bg-[#FF5500] hover:bg-orange-500 text-black font-semibold obd-mono text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,85,0,0.25)]"
              >
                <Bot className="w-4 h-4" />
                <span>Run Cross-Dept Fault Chain (Coordinator → Dispatcher → Stockkeeper → Help Desk)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDispatchAgentAction('tier3_outward_payment')}
                className="px-3 py-2 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/70 text-amber-200 obd-mono text-xs"
              >
                Queue Tier-3 Outward Payment (202 Queued)
              </button>
              <button
                type="button"
                onClick={() => handleDispatchAgentAction('clear_life_safety_alarm')}
                className="px-3 py-2 bg-red-950/60 hover:bg-red-900/70 border border-red-500/70 text-red-200 obd-mono text-xs"
              >
                Test Agent Hard-Limit (Clear S-001 → 403)
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 22 Portal Doors Grid */}
            <section className="lg:col-span-7 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                <span className="obd-mono text-xs font-semibold text-zinc-300 uppercase">
                  22 Role-Gated Portal Doors (`/portal/&lt;slug&gt;`)
                </span>
                <span className="obd-mono text-[11px] text-orange-400">
                  7 MFA DOORS · HONEST CONNECTION STATES
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {data.portals.map((p, idx) => {
                  const isSel = p.slug === selectedPortal;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setSelectedPortal(p.slug)}
                      className={`p-3 border text-left transition-all ${
                        isSel
                          ? 'bg-[#FF5500]/15 border-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.2)]'
                          : 'bg-zinc-900/60 border-zinc-800/90 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="obd-mono text-[11px] text-orange-400 font-bold">
                          #{String(idx + 1).padStart(2, '0')} · {p.name}
                        </span>
                        {p.mfaRequired && (
                          <span className="px-1.5 py-0.5 bg-amber-950/70 border border-amber-500/60 text-amber-300 obd-mono text-[9px]">
                            MFA
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between obd-mono text-[10px]">
                        <span className="text-zinc-300">Agent: {p.agentName}</span>
                        <span className="text-amber-300">{p.status}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{p.emptyMessage}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Right Column: Selected Portal Detail + 4-Tier Agent Governance & Owner Approval Queue */}
            <section className="lg:col-span-5 space-y-5">
              <div className="bg-zinc-950/75 backdrop-blur-xl border border-[#FF5500]/60 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <div className="obd-mono text-xs text-orange-400">
                      PORTAL // /portal/{activePortalObj.slug} ({activePortalObj.audience.toUpperCase()})
                    </div>
                    <h3 className="text-base font-semibold text-white mt-0.5">
                      {activePortalObj.name} Workspace
                    </h3>
                  </div>
                  <div className="text-right obd-mono text-[11px]">
                    <div className="text-emerald-400 font-bold">{activePortalObj.coreLink}</div>
                    <div className="text-amber-400">Ext: {activePortalObj.status}</div>
                  </div>
                </div>

                <p className="text-xs text-zinc-200 leading-relaxed">{activePortalObj.emptyMessage}</p>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 flex items-center justify-between obd-mono text-xs">
                  <div>
                    <span className="text-zinc-400">Assigned Portal Agent: </span>
                    <span className="text-white font-semibold">{activePortalObj.agentName}</span>
                  </div>
                  <span className="text-orange-400">
                    Records: {activePortalObj.recordKinds.join(', ')}
                  </span>
                </div>
              </div>

              {/* 4-Tier Autonomy Model & Owner Approval Queue */}
              <div className="bg-zinc-950/75 backdrop-blur-xl border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="obd-mono text-xs font-semibold text-zinc-200 uppercase">
                    23-Agent Governance & Tier-3 Owner Approval Queue
                  </span>
                  <span className="obd-mono text-[10px] text-emerald-400">
                    TIER-2 ENABLED CLASSES: 0 (SAFE DEFAULT)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 obd-mono text-[11px]">
                  <div className="p-2 bg-zinc-900/70 border border-zinc-800">
                    <div className="text-orange-400 font-semibold">Tier 0 · Watch</div>
                    <div className="text-zinc-400 text-[10px]">Read & summarize only</div>
                  </div>
                  <div className="p-2 bg-zinc-900/70 border border-zinc-800">
                    <div className="text-orange-400 font-semibold">Tier 1 · Prepare</div>
                    <div className="text-zinc-400 text-[10px]">Stage drafts & tickets</div>
                  </div>
                  <div className="p-2 bg-zinc-900/70 border border-zinc-800">
                    <div className="text-orange-400 font-semibold">Tier 2 · Capped Class</div>
                    <div className="text-zinc-400 text-[10px]">Ships with 0 classes enabled</div>
                  </div>
                  <div className="p-2 bg-zinc-900/70 border border-zinc-800">
                    <div className="text-orange-400 font-semibold">Tier 3 · Owner Tap</div>
                    <div className="text-zinc-400 text-[10px]">Explicit Approve / Reject</div>
                  </div>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {data.agentActions.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 bg-zinc-900/65 border border-zinc-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 obd-mono text-[11px]">
                        <span className="text-orange-400 font-semibold">
                          [{act.agentName} · /portal/{act.portal}] Tier: {act.tier}
                        </span>
                        <span
                          className={
                            act.status === 'QUEUED_FOR_OWNER'
                              ? 'text-amber-300 font-bold'
                              : act.status === 'DENIED_HARD_LIMIT'
                              ? 'text-red-400 font-bold'
                              : 'text-emerald-400'
                          }
                        >
                          {act.status}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-white">{act.actionClass}</div>
                      <p className="text-[11px] text-zinc-400">{act.summary}</p>
                      {act.status === 'QUEUED_FOR_OWNER' && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOwnerDecision(act.id, 'APPROVE')}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold obd-mono text-[11px] flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Owner Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOwnerDecision(act.id, 'REJECT')}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-red-950 border border-zinc-700 text-zinc-200 obd-mono text-[11px] flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB B: PART 14 WHOLE-HOME CONTROL, MODES, WALL PANEL & 7965 LOWELL
         ===================================================================== */}
      {subTab === 'job_zero_panel' && (
        <div className="space-y-6">
          <section className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#FF5500]" />
                  <h2 className="text-base font-semibold text-white">
                    Part 14 · Whole-Home Control, Wall-Panel Kiosk & {data.jobZero.building.name}
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {data.jobZero.building.statusLabel} · {data.jobZero.devices.length} Planned Devices across{' '}
                  {uniqueLocations.length} Locations · Baseline Walk: {data.jobZero.jobRecord.window}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setLanOfflineSimulated((v) => !v)}
                  className={`px-3 py-1.5 border obd-mono text-xs flex items-center gap-1.5 ${
                    lanOfflineSimulated
                      ? 'bg-amber-950/70 border-amber-500 text-amber-200 font-semibold'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                  }`}
                >
                  {lanOfflineSimulated ? (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>LAN Offline Failsafe: ACTIVE (NOT SENT / MANUAL FALLBACK)</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Simulate LAN Disconnect (Offline Failsafe)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 8 Residential Modes + 5 Commercial Modes */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
              <div>
                <div className="obd-mono text-xs text-orange-400 font-semibold mb-2 flex items-center justify-between">
                  <span>8 RESIDENTIAL MODES (7965 LOWELL — ACTUATES 0 PLANNED DEVICES)</span>
                  <span className="text-zinc-400">SELECTED: {activeMode.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {data.modes.residential.map((m) => {
                    const active = activeMode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleApplyLowellMode(m)}
                        className={`p-2.5 border text-left transition-all ${
                          active
                            ? 'bg-[#FF5500] text-black border-[#FF5500] font-semibold'
                            : 'bg-zinc-900/70 border-zinc-800 text-zinc-200 hover:border-[#FF5500]/60'
                        }`}
                      >
                        <div className="obd-mono text-xs font-bold">{m}</div>
                        <div className={`text-[10px] mt-0.5 ${active ? 'text-black/80' : 'text-zinc-400'}`}>
                          Residential Scene
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="obd-mono text-xs text-orange-400 font-semibold mb-2 flex items-center justify-between">
                  <span>5 COMMERCIAL MODES (REFUSED ON RESIDENTIAL 7965 LOWELL → 400)</span>
                  <span className="text-zinc-400">GUARDED</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {data.modes.commercial.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleApplyLowellMode(m)}
                      className="p-2.5 border bg-zinc-900/70 border-zinc-800 text-zinc-200 hover:border-red-500/60 text-left transition-all"
                    >
                      <div className="obd-mono text-xs font-bold">{m}</div>
                      <div className="text-[10px] mt-0.5 text-zinc-400">Commercial</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Split Row: Life-Safety S-001/S-002 Invariant + Baseline Walk Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-7 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="obd-mono text-xs font-semibold text-white uppercase flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#FF5500]" />
                  <span>Life-Safety Invariant (S-001 Smoke / S-002 CO) & Monitor-Only Load Protection</span>
                </span>
                <span className="obd-mono text-[10px] text-red-400 font-semibold">
                  HTTP 403 LIFE_SAFETY_NOT_CLEARABLE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className={`p-3 border space-y-2 ${
                      alarm.lifeSafety
                        ? 'bg-red-950/25 border-red-500/60'
                        : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between obd-mono text-xs">
                      <span className="font-bold text-white">{alarm.code}</span>
                      <span
                        className={
                          alarm.status === 'ACTIVE' ? 'text-red-400 font-bold' : 'text-emerald-400'
                        }
                      >
                        {alarm.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 line-clamp-2">{alarm.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAttemptClearAlarm(alarm)}
                        className="px-2 py-1 bg-zinc-900 hover:bg-red-950 border border-zinc-700 obd-mono text-[10px] text-zinc-200"
                      >
                        Attempt UI Clear {alarm.lifeSafety ? '(403 Blocked)' : '(Allowed)'}
                      </button>
                      {alarm.lifeSafety && (
                        <button
                          type="button"
                          onClick={() => handleReconcileDeviceAlarm(alarm)}
                          className="px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 obd-mono text-[10px] text-emerald-300"
                        >
                          {alarm.status === 'ACTIVE' ? 'Send RESOLVED_AT_DEVICE' : 'Re-Trip on Bench'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Listen-Only & Dangerous-Load Refusal Buttons */}
              <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center gap-2">
                <span className="obd-mono text-[11px] text-zinc-400">
                  Test Part 14 Device Control Guardrails:
                </span>
                <button
                  type="button"
                  onClick={() => handleTestDeviceControl('lowell-dev-54', 'silence')}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-red-950/60 border border-zinc-700 obd-mono text-[11px] text-orange-300"
                >
                  Actuate Smoke/CO Detector (lowell-dev-54 → 403 LISTEN_ONLY)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestDeviceControl('lowell-dev-26', 'on')}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-red-950/60 border border-zinc-700 obd-mono text-[11px] text-orange-300"
                >
                  Actuate Space Heater (lowell-dev-26 → 403 MONITOR_ONLY)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestDeviceControl('lowell-dev-27', 'off')}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-red-950/60 border border-zinc-700 obd-mono text-[11px] text-orange-300"
                >
                  Actuate Medical CPAP Outlet (lowell-dev-27 → 403 MONITOR_ONLY)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestDeviceControl('lowell-dev-01', 'on')}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 obd-mono text-[11px] text-emerald-300"
                >
                  Queue Foyer Smart Bulb (lowell-dev-01 → NOT SENT / MANUAL FALLBACK)
                </button>
              </div>
            </section>

            {/* 7965 Lowell Baseline-Walk Checklist (Nov 17-23) */}
            <section className="lg:col-span-5 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="obd-mono text-xs font-semibold text-white uppercase">
                  {data.jobZero.jobRecord.title} ({data.jobZero.jobRecord.window})
                </span>
                <span className="obd-mono text-[10px] text-amber-400">
                  STATUS: {data.jobZero.jobRecord.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                {data.jobZero.jobRecord.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-zinc-900/65 border border-zinc-800 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-zinc-200">{item.label}</span>
                    <span className="obd-mono text-[10px] px-2 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 shrink-0">
                      {item.checked ? 'DONE' : 'PENDING WALK'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 60 Planned Devices Across 39 Locations Table */}
          <section className="bg-zinc-950/75 backdrop-blur-xl border border-zinc-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  7965 Lowell — {data.jobZero.devices.length} Planned Devices Across {uniqueLocations.length} Locations (PLANNED / NOT INSTALLED)
                </h3>
                <p className="text-xs text-zinc-400">
                  Zero fake live telemetry: every device reports <span className="obd-mono text-amber-300">PLANNED</span> with{' '}
                  <span className="obd-mono text-zinc-300">reportedState: NOT INSTALLED</span> until physical commissioning.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="obd-mono text-xs text-zinc-400">Filter Location:</span>
                <select
                  aria-label="Filter 7965 Lowell location"
                  value={selectedLocationFilter}
                  onChange={(e) => setSelectedLocationFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 px-2.5 py-1 obd-mono text-xs text-white"
                >
                  <option value="ALL">
                    All {uniqueLocations.length} Locations ({data.jobZero.devices.length} Devices)
                  </option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredJobZeroDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-2.5 bg-zinc-900/60 border border-zinc-800/90 flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between obd-mono text-[11px]">
                    <span className="text-orange-400 font-bold">{dev.id}</span>
                    <span className="px-1.5 py-0.5 bg-zinc-800 text-amber-300 text-[10px]">
                      {dev.installState} · {dev.reportedState}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-white truncate">{dev.name}</div>
                  <div className="obd-mono text-[10px] text-zinc-400 flex items-center justify-between">
                    <span className="truncate">{dev.location}</span>
                    <span
                      className={
                        dev.listenOnly || dev.monitorOnly
                          ? 'text-red-400 font-semibold shrink-0'
                          : 'text-emerald-400 shrink-0'
                      }
                    >
                      {dev.listenOnly
                        ? 'LISTEN-ONLY'
                        : dev.monitorOnly
                        ? `MONITOR-ONLY (${dev.loadClass})`
                        : 'STANDARD'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB C: CREDENTIAL FIREWALL & SHA-256 HASH-CHAINED AUDIT LOG
         ===================================================================== */}
      {subTab === 'firewall_audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Secret-Pattern Rejection Firewall Tester */}
          <section className="lg:col-span-5 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800 p-4 space-y-4">
            <div className="border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#FF5500]" />
                <h2 className="text-sm font-semibold text-white">
                  Credential Registry & Secret-Pattern Rejection Firewall
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Accepts metadata only (`provider`, `purpose`, `owner`, `rotationDate`). Any secret-shaped value (`sk-...`, `AKIA...`, `ghp_...`, `AIza...`, JWT, PEM, high-entropy) or forbidden field (`apiKey`, `secret`, `token`, `password`, `privateKey`) is rejected with HTTP 400 `SECRET_SHAPED_INPUT`.
              </p>
            </div>

            <div className="space-y-2">
              <div className="obd-mono text-[11px] text-orange-400 font-semibold uppercase">
                Adversarial Secret-Injection Test Vectors (Expect HTTP 400 Block)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleTestSecretFirewall(
                      {
                        provider: 'OpenAI Key Leak Attempt',
                        purpose: 'sk-proj-9876543210abcdefghijkLMNOPQRST',
                      },
                      'OpenAI sk-...'
                    )
                  }
                  className="p-2 bg-red-950/35 hover:bg-red-950/60 border border-red-500/50 text-left obd-mono text-[11px] text-red-200"
                >
                  Test `sk-...` Secret Pattern → 400
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTestSecretFirewall(
                      {
                        provider: 'AWS IAM Key Leak Attempt',
                        purpose: 'AKIAIOSFODNN7EXAMPLE',
                      },
                      'AWS AKIA...'
                    )
                  }
                  className="p-2 bg-red-950/35 hover:bg-red-950/60 border border-red-500/50 text-left obd-mono text-[11px] text-red-200"
                >
                  Test `AKIA...` AWS Key → 400
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTestSecretFirewall(
                      {
                        provider: 'GitHub PAT Leak Attempt',
                        purpose: 'ghp_1234567890abcdefghijklmnopqrstuvwx',
                      },
                      'GitHub ghp_...'
                    )
                  }
                  className="p-2 bg-red-950/35 hover:bg-red-950/60 border border-red-500/50 text-left obd-mono text-[11px] text-red-200"
                >
                  Test `ghp_...` GitHub PAT → 400
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleTestSecretFirewall(
                      {
                        provider: 'Forbidden Field Name Attempt',
                        apiKey: 'pointer_ref_only',
                      },
                      'Forbidden field apiKey'
                    )
                  }
                  className="p-2 bg-red-950/35 hover:bg-red-950/60 border border-red-500/50 text-left obd-mono text-[11px] text-red-200"
                >
                  Test Forbidden Field `apiKey` → 400
                </button>
              </div>
            </div>

            {/* Safe Metadata Registration Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTestSecretFirewall(
                  {
                    provider: fwProvider,
                    purpose: fwPurpose,
                    owner: fwOwner,
                    rotationDate: fwRotation,
                  },
                  'Safe Metadata Registration'
                );
              }}
              className="p-3 bg-zinc-900/70 border border-zinc-800 space-y-2.5"
            >
              <div className="obd-mono text-[11px] text-emerald-400 font-semibold">
                Register Safe Metadata Entry (Zero Secret Values)
              </div>
              <input
                type="text"
                value={fwProvider}
                onChange={(e) => setFwProvider(e.target.value)}
                placeholder="Provider (e.g. stripe-billing-adapter)"
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 text-xs text-white obd-mono"
              />
              <input
                type="text"
                value={fwPurpose}
                onChange={(e) => setFwPurpose(e.target.value)}
                placeholder="Purpose (e.g. invoice-webhooks)"
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 text-xs text-white obd-mono"
              />
              <input
                type="text"
                value={fwOwner}
                onChange={(e) => setFwOwner(e.target.value)}
                placeholder="Owner (e.g. owner@obd-home)"
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 text-xs text-white obd-mono"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-[#FF5500] hover:bg-orange-500 text-black font-semibold obd-mono text-xs"
              >
                Register Metadata in Credential Registry
              </button>
            </form>

            {/* Stored Metadata Entries */}
            <div className="space-y-1.5">
              <div className="obd-mono text-[11px] text-zinc-400 uppercase">
                Registered Metadata Entries ({data.credentialRegistry.length})
              </div>
              {data.credentialRegistry.map((reg) => (
                <div
                  key={reg.id}
                  className="p-2.5 bg-zinc-900/60 border border-zinc-800 obd-mono text-[11px] flex items-center justify-between"
                >
                  <div>
                    <div className="text-white font-semibold">
                      {reg.provider} · {reg.purpose}
                    </div>
                    <div className="text-zinc-400 text-[10px]">
                      Owner: {reg.owner} · Rotate: {reg.rotationDate}
                    </div>
                  </div>
                  <span className="text-amber-300 text-[10px]">{reg.status}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Right: SHA-256 Hash-Chained Append-Only Audit Log */}
          <section className="lg:col-span-7 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#FF5500]" />
                  <h2 className="text-sm font-semibold text-white">
                    SHA-256 Hash-Chained Append-Only Audit Log
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Every portal action, firewall block, life-safety clear refusal, and mode actuation is cryptographically chained (`prevHash` → `hash`).
                </p>
              </div>
              <div className="px-3 py-1.5 bg-emerald-950/50 border border-emerald-500/60 obd-mono text-xs text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  CHAIN VERIFIED: {data.auditChain.verification.ok ? 'OK' : 'TAMPERED'} ({data.auditChain.verification.count} BLOCKS)
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {data.auditChain.entries.map((entry) => (
                <div
                  key={entry.seq}
                  className="p-3 bg-zinc-900/65 border border-zinc-800/90 space-y-1 obd-mono text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-orange-400 font-bold">
                      BLOCK #{entry.seq} · {entry.action}
                    </span>
                    <span className="text-zinc-400 text-[10px]">
                      {new Date(entry.timestamp).toLocaleTimeString()} · Actor: {entry.actor} (/portal/{entry.portal})
                    </span>
                  </div>
                  <div className="text-zinc-200 text-xs font-mono">
                    {JSON.stringify(entry.detail)}
                  </div>
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500 border-t border-zinc-800/70">
                    <span>prev: {entry.prevHash.slice(0, 20)}…</span>
                    <span className="text-emerald-400">sha256: {entry.hash.slice(0, 24)}…</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
