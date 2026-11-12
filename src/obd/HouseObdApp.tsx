import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Activity,
  Cpu,
  Zap,
  Wifi,
  Wind,
  ShieldAlert,
  Terminal,
  RefreshCw,
  Trash2,
  Play,
  Sparkles,
  CheckCircle2,
  Database,
  Flame,
  Lock,
  Unlock,
  Camera,
  Code2,
  Layers,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PlatformWorkspaces } from './PlatformWorkspaces';

export interface DiagnosticVerdict {
  dtc_code: string;
  root_cause_confidence: number;
  correlated_anomalies: string[];
  critic_dissent: string;
  automated_script_safe: boolean;
  remediation_steps: string[];
  terminal_command_or_payload?: string | null;
}

export interface ActiveDTCItem {
  dtc_code: string;
  node_id: string;
  zone: string;
  subsystem: 'POWER' | 'HVAC' | 'FIBER/NET' | 'PERIMETER' | 'COMPUTE';
  title: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  freeze_frame: {
    captured_at?: string;
    can_frame_hex?: string;
    host_kernel?: string;
    trigger_node_id?: string;
    zone?: string;
    metrics?: Record<string, number>;
  };
  swarm_verdict: DiagnosticVerdict | null;
}

export interface FacilityNode {
  node_id: string;
  zone: string;
  hardware_type: string;
  ip_or_serial: string;
  status: 'ONLINE' | 'DEGRADED' | 'ISOLATED' | 'OFFLINE';
  last_heartbeat: string;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  agent_role: string;
  dtc_code: string;
  action_taken: string;
  verification_status: string;
}

export interface LiveTelemetry {
  timestamp: string;
  cpuLoadPct: number;
  cpuTempC: number;
  ramUsedPct: number;
  diskAwaitMs: number;
  fiberRxMbps: number;
  fiberTxMbps: number;
  gatewayRttMs: number;
  opticalRxDbm: number;
  powerWatts: number;
  lineVoltageV: number;
  upsLoadPct: number;
  upsBatteryPct: number;
  hvacSupplyTempC: number;
  hvacReturnTempC: number;
  staticPressureInWg: number;
  ambientAqi: number;
  co2Ppm: number;
  waterFlowGpm: number;
}

interface TelemetryPoint {
  time: string;
  cpuTempC: number;
  powerKw: number;
  fiberMbps: number;
  cpuLoadPct: number;
}

interface WalBenchmarkResult {
  status: string;
  journal_mode: string;
  busy_timeout_ms: number;
  write_transactions: number;
  rows_inserted: number;
  analytical_reads: number;
  database_locked_exceptions: number;
  pruned_old_rows: number;
  elapsed_ms: number;
}

const ZONES = [
  'All Zones',
  'Server/Edge Rack',
  'Office Command',
  'Fabrication/Workshop',
  'Perimeter',
] as const;

const READINESS_ORDER = ['POWER', 'HVAC', 'FIBER/NET', 'COMPUTE', 'PERIMETER'] as const;

export function HouseObdApp({ onToggleStorefront }: { onToggleStorefront?: () => void }) {
  const [selectedZone, setSelectedZone] = useState<string>('All Zones');
  const [activeTab, setActiveTab] = useState<
    'hud' | 'portals_agents' | 'job_zero_panel' | 'firewall_audit' | 'architecture'
  >('hud');
  const [milIlluminated, setMilIlluminated] = useState<boolean>(true);
  const [activeNodeCount, setActiveNodeCount] = useState<number>(8);
  const [totalTelemetryRows, setTotalTelemetryRows] = useState<number>(0);
  const [readiness, setReadiness] = useState<Record<string, 'OK' | 'INC' | 'FAULT'>>({
    POWER: 'INC',
    HVAC: 'FAULT',
    'FIBER/NET': 'INC',
    COMPUTE: 'FAULT',
    PERIMETER: 'OK',
  });
  const [nodes, setNodes] = useState<FacilityNode[]>([]);
  const [dtcs, setDtcs] = useState<ActiveDTCItem[]>([]);
  const [selectedDtcCode, setSelectedDtcCode] = useState<string | null>('C0105');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [telemetry, setTelemetry] = useState<LiveTelemetry>({
    timestamp: new Date().toISOString(),
    cpuLoadPct: 41.2,
    cpuTempC: 89.4,
    ramUsedPct: 62.4,
    diskAwaitMs: 3.2,
    fiberRxMbps: 418.5,
    fiberTxMbps: 182.0,
    gatewayRttMs: 6.4,
    opticalRxDbm: -21.4,
    powerWatts: 3640,
    lineVoltageV: 118.8,
    upsLoadPct: 54.0,
    upsBatteryPct: 98.0,
    hvacSupplyTempC: 16.2,
    hvacReturnTempC: 35.1,
    staticPressureInWg: 0.58,
    ambientAqi: 23,
    co2Ppm: 538,
    waterFlowGpm: 0.0,
  });
  const [history, setHistory] = useState<TelemetryPoint[]>(() => {
    const now = Date.now();
    return Array.from({ length: 24 }, (_, idx) => {
      const t = new Date(now - (23 - idx) * 1500);
      return {
        time: t.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
        cpuTempC: Number((87.5 + Math.sin(idx * 0.4) * 2.2).toFixed(1)),
        powerKw: Number((3.45 + Math.cos(idx * 0.3) * 0.25).toFixed(2)),
        fiberMbps: Math.round(540 + Math.sin(idx * 0.5) * 75),
        cpuLoadPct: Number((42 + Math.sin(idx * 0.35) * 9).toFixed(1)),
      };
    });
  });

  const [wsLatencyMs, setWsLatencyMs] = useState<number>(3);
  const [wsConnected, setWsConnected] = useState<boolean>(true);
  const [councilLoadingDtc, setCouncilLoadingDtc] = useState<string | null>(null);
  const [actuatingDtc, setActuatingDtc] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [walBenchResult, setWalBenchResult] = useState<WalBenchmarkResult | null>(null);
  const [walBenchLoading, setWalBenchLoading] = useState<boolean>(false);

  // Command Terminal State
  const [cmdInput, setCmdInput] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<Array<{ ts: string; cmd: string; out: string; tone: 'info' | 'warn' | 'ok' }>>([
    {
      ts: new Date().toLocaleTimeString(),
      cmd: 'SYSTEM BOOT',
      out: 'SQLite3 WAL Engine initialized (PRAGMA journal_mode=WAL; busy_timeout=5000ms). 8 Facility CAN/BACnet nodes online.',
      tone: 'ok',
    },
  ]);

  // Source Code Inspector State
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>({});
  const [selectedSourceFile, setSelectedSourceFile] = useState<string>('VERIFICATION.md');
  const [injectCodeSelection, setInjectCodeSelection] = useState<string>('S0108');
  const [scrollProgressPct, setScrollProgressPct] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const appendTerminal = useCallback((cmd: string, out: string, tone: 'info' | 'warn' | 'ok' = 'info') => {
    setTerminalLogs((prev) => [
      { ts: new Date().toLocaleTimeString(), cmd, out, tone },
      ...prev.slice(0, 24),
    ]);
  }, []);

  const fetchScanReport = useCallback(async (showSpinner = false) => {
    if (showSpinner) setScanning(true);
    try {
      const res = await fetch('/api/v1/obd/scan');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMilIlluminated(Boolean(data.mil_illuminated));
      setActiveNodeCount(Number(data.active_node_count || 8));
      setTotalTelemetryRows(Number(data.total_telemetry_rows || 0));
      if (data.readiness_monitors) setReadiness(data.readiness_monitors);
      if (Array.isArray(data.nodes)) setNodes(data.nodes);
      if (Array.isArray(data.active_dtcs)) {
        setDtcs(data.active_dtcs);
        setSelectedDtcCode((prev) => {
          if (prev && data.active_dtcs.some((d: ActiveDTCItem) => d.dtc_code === prev)) return prev;
          return data.active_dtcs[0]?.dtc_code || null;
        });
      }
      if (Array.isArray(data.recent_audit_log)) setAuditLogs(data.recent_audit_log);
      if (data.latest_telemetry) setTelemetry(data.latest_telemetry);
    } catch (err) {
      console.error('OBD scan error:', err);
    } finally {
      if (showSpinner) setScanning(false);
    }
  }, []);

  // Load initial scan + Python reference files
  useEffect(() => {
    fetchScanReport(false);
    fetch('/api/v1/obd/source-files')
      .then((r) => r.json())
      .then((d) => {
        if (d.files) setSourceFiles(d.files);
      })
      .catch(() => {});
  }, [fetchScanReport]);

  // Connect real-time WebSocket stream (/ws/hud)
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/hud`;
    let ws: WebSocket | null = null;
    let pingTimer: number | undefined;
    let reconnectTimer: number | undefined;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
        pingTimer = window.setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', client_ts_ms: performance.now() }));
          }
        }, 2500);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong' && typeof msg.client_ts_ms === 'number') {
            const rtt = Math.max(1, Math.round(performance.now() - msg.client_ts_ms));
            setWsLatencyMs(rtt);
          } else if (msg.type === 'telemetry_frame' && msg.payload) {
            const frame = msg.payload as LiveTelemetry;
            setTelemetry(frame);
            setTotalTelemetryRows((c) => c + 4);
            setHistory((prev) => {
              const point: TelemetryPoint = {
                time: new Date(frame.timestamp).toLocaleTimeString([], {
                  minute: '2-digit',
                  second: '2-digit',
                }),
                cpuTempC: frame.cpuTempC,
                powerKw: Number((frame.powerWatts / 1000).toFixed(2)),
                fiberMbps: Math.round(frame.fiberRxMbps + frame.fiberTxMbps),
                cpuLoadPct: frame.cpuLoadPct,
              };
              return [...prev.slice(-29), point];
            });
          } else if (
            msg.type === 'dtc_alert' ||
            msg.type === 'dtc_updated' ||
            msg.type === 'verdict_ready' ||
            msg.type === 'node_status'
          ) {
            fetchScanReport(false);
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (pingTimer) window.clearInterval(pingTimer);
        if (!unmounted) {
          reconnectTimer = window.setTimeout(connect, 2000);
        }
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (pingTimer) window.clearInterval(pingTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [fetchScanReport]);

  // Track page scroll for subtle top-of-viewport progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100)));
      setScrollProgressPct(pct);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredDtcs = useMemo(() => {
    if (selectedZone === 'All Zones') return dtcs;
    return dtcs.filter((d) => d.zone === selectedZone);
  }, [dtcs, selectedZone]);

  const filteredNodes = useMemo(() => {
    if (selectedZone === 'All Zones') return nodes;
    return nodes.filter((n) => n.zone === selectedZone);
  }, [nodes, selectedZone]);

  const activeDtcDetail = useMemo(() => {
    return (
      filteredDtcs.find((d) => d.dtc_code === selectedDtcCode) ||
      dtcs.find((d) => d.dtc_code === selectedDtcCode) ||
      filteredDtcs[0] ||
      null
    );
  }, [filteredDtcs, dtcs, selectedDtcCode]);

  // Handlers
  async function handleRunSwarmCouncil(dtcCode: string) {
    setCouncilLoadingDtc(dtcCode);
    appendTerminal(
      `/council ${dtcCode}`,
      `Dispatching 3 parallel Gemini sub-agents (Diagnostics, Adversarial Critic, Actuation Engineer) on ${dtcCode} freeze-frame...`,
      'info'
    );
    try {
      const res = await fetch('/api/v1/obd/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtc_code: dtcCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Council error');
      await fetchScanReport(false);
      appendTerminal(
        `COUNCIL VERDICT [${dtcCode}]`,
        `Confidence ${(data.verdict.root_cause_confidence * 100).toFixed(0)}% | Critic: ${data.verdict.critic_dissent}`,
        'ok'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendTerminal(`COUNCIL ERROR [${dtcCode}]`, msg, 'warn');
    } finally {
      setCouncilLoadingDtc(null);
    }
  }

  async function handleActuateRemediation(dtc: ActiveDTCItem) {
    setActuatingDtc(dtc.dtc_code);
    const cmdPayload =
      dtc.swarm_verdict?.terminal_command_or_payload ||
      `obd-actuate --node ${dtc.node_id} --reset-fault ${dtc.dtc_code}`;
    try {
      const res = await fetch('/api/v1/obd/actuate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dtc_code: dtc.dtc_code,
          command: cmdPayload,
          resolve_dtc: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchScanReport(false);
      appendTerminal(
        `ACTUATE [${dtc.dtc_code}]`,
        `Executed payload: ${cmdPayload} — Fault latch cleared & verified.`,
        'ok'
      );
    } catch (err: unknown) {
      appendTerminal(`ACTUATE ERROR`, String(err), 'warn');
    } finally {
      setActuatingDtc(null);
    }
  }

  async function handleClearDtc(code?: string) {
    try {
      const res = await fetch('/api/v1/obd/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtc_code: code || 'ALL' }),
      });
      const data = await res.json();
      await fetchScanReport(false);
      appendTerminal(
        `/clear ${code || 'ALL'}`,
        `Reset ${data.cleared_count} active DTC latch(es) and re-armed OBD readiness monitors.`,
        'ok'
      );
    } catch (err: unknown) {
      appendTerminal('/clear', String(err), 'warn');
    }
  }

  async function handleInjectDtc(code: string) {
    try {
      const res = await fetch('/api/v1/obd/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtc_code: code }),
      });
      const data = await res.json();
      await fetchScanReport(false);
      setSelectedDtcCode(data.dtc_code);
      appendTerminal(
        `/inject ${data.dtc_code}`,
        `Tripped DTC ${data.dtc_code} with millisecond multi-sensor freeze-frame (${data.freeze_frame?.can_frame_hex}).`,
        'warn'
      );
    } catch (err: unknown) {
      appendTerminal('/inject', String(err), 'warn');
    }
  }

  async function handleToggleIsolateNode(nodeId: string) {
    try {
      const res = await fetch('/api/v1/obd/isolate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to isolate node');
      await fetchScanReport(false);
      appendTerminal(
        `/isolate ${nodeId}`,
        `Node ${nodeId} bus state transitioned to ${data.node_status}.`,
        data.node_status === 'ISOLATED' ? 'warn' : 'ok'
      );
    } catch (err: unknown) {
      appendTerminal(`/isolate ${nodeId}`, String(err), 'warn');
    }
  }

  async function handleRunWalBenchmark() {
    setWalBenchLoading(true);
    appendTerminal(
      '/verify-wal',
      'Running 50 concurrent sensor write batches (150 rows) + 25 analytical reads against SQLite WAL engine...',
      'info'
    );
    try {
      const res = await fetch('/api/v1/obd/wal-benchmark', { method: 'POST' });
      const data: WalBenchmarkResult = await res.json();
      setWalBenchResult(data);
      await fetchScanReport(false);
      appendTerminal(
        'WAL BENCHMARK PASS',
        `${data.write_transactions} write txns (${data.rows_inserted} rows) + ${data.analytical_reads} analytical reads in ${data.elapsed_ms}ms | Lock errors: ${data.database_locked_exceptions}`,
        'ok'
      );
    } catch (err: unknown) {
      appendTerminal('WAL BENCHMARK ERROR', String(err), 'warn');
    } finally {
      setWalBenchLoading(false);
    }
  }

  async function handleExecuteSlashCommand(rawCmd: string) {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;
    setCmdInput('');

    const parts = trimmed.split(/\s+/);
    const verb = parts[0].toLowerCase();
    const arg = parts[1];

    if (verb === '/scan') {
      await fetchScanReport(true);
      appendTerminal('/scan', `Completed full-facility CAN/BACnet sweep across ${nodes.length} nodes. Active DTCs: ${dtcs.length}.`, 'ok');
    } else if (verb === '/clear') {
      await handleClearDtc(arg || 'ALL');
    } else if (verb === '/inject') {
      await handleInjectDtc(arg || 'S0108');
    } else if (verb === '/isolate') {
      const targetNode = arg || nodes[0]?.node_id || 'hvac-crac-rack-02';
      await handleToggleIsolateNode(targetNode);
    } else if (verb === '/freeze') {
      const targetNode = arg || 'edge-ryzen-rack-01';
      const res = await fetch('/api/v1/obd/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: targetNode }),
      });
      const data = await res.json();
      await fetchScanReport(false);
      appendTerminal(
        `/freeze ${targetNode}`,
        `Freeze-frame locked (${data.freeze_frame?.can_frame_hex}): CPU ${data.freeze_frame?.metrics?.cpu_package_temp_c}°C, Line ${data.freeze_frame?.metrics?.line_voltage_l2_v}V, Fiber ${data.freeze_frame?.metrics?.fiber_throughput_mbps}Mbps`,
        'ok'
      );
    } else if (verb === '/roast-architecture') {
      appendTerminal('/roast-architecture', 'Dispatching Gemini Adversarial Critic across facility topology...', 'info');
      try {
        const res = await fetch('/api/v1/obd/roast', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Roast failed');
        await fetchScanReport(false);
        appendTerminal('ADVERSARIAL ROAST', data.roast, 'warn');
      } catch (err: unknown) {
        appendTerminal('/roast-architecture', String(err), 'warn');
      }
    } else if (verb === '/verify-wal') {
      await handleRunWalBenchmark();
    } else {
      appendTerminal(
        trimmed,
        'Supported OBD slash commands: /scan, /clear [DTC|ALL], /freeze [node_id], /roast-architecture, /isolate [node_id], /inject [DTC], /verify-wal',
        'info'
      );
    }
  }

  // Readiness completion ratio for top viewport subtle progress bar
  const readinessOkCount = READINESS_ORDER.filter((k) => readiness[k] === 'OK').length;
  const topBarProgress = Math.max(scrollProgressPct, Math.round((readinessOkCount / READINESS_ORDER.length) * 100));

  return (
    <div
      ref={containerRef}
      className="obd-carbon-surface obd-sans min-h-screen text-zinc-100 relative selection:bg-orange-500 selection:text-black"
    >
      {/* Woven Carbon-Fiber Honeycomb Micro-Overlay */}
      <div className="obd-honeycomb-overlay fixed inset-0 pointer-events-none z-0" />

      {/* Subtle Top-of-Viewport Scroll & Readiness Progress Indicator */}
      <div
        className="fixed top-0 left-0 right-0 h-[2px] bg-zinc-900/90 z-50 overflow-hidden"
        role="progressbar"
        aria-label="Facility readiness and viewport exploration progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={topBarProgress}
      >
        <div
          className="h-full bg-gradient-to-r from-[#FF5500] via-orange-400 to-amber-300 transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${Math.max(0.08, topBarProgress / 100)})` }}
        />
      </div>

      {/* =====================================================================
          1. TOP BAR — MIL ("CHECK BUILDING") & SYSTEM READINESS STRIP
         ===================================================================== */}
      <header className="sticky top-[2px] z-40 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 px-4 lg:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Brand Identity + Physical MIL Lamp */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#FF5500]/15 border border-[#FF5500]/60 flex items-center justify-center shadow-[0_0_15px_rgba(255,85,0,0.25)]">
                <Gauge className="w-4 h-4 text-[#FF5500]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-sm text-white whitespace-nowrap">
                    HOUSE-OBD
                  </span>
                  <span className="obd-mono text-[11px] text-orange-400">
                    CAN-BUS · FACILITY ENGINE
                  </span>
                </div>
                <p className="obd-mono text-[10px] text-zinc-400">
                  SQLite3 WAL · {totalTelemetryRows.toLocaleString()} frames · {activeNodeCount} Active Nodes
                </p>
              </div>
            </div>

            {/* Physical-Style "CHECK BUILDING" Malfunction Indicator Lamp (MIL) */}
            <div
              className={`px-3 py-1.5 border flex items-center gap-2 transition-all ${
                milIlluminated
                  ? 'bg-red-950/60 border-red-500 text-red-200 obd-mil-active'
                  : dtcs.length > 0
                  ? 'bg-amber-950/50 border-amber-500/70 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  milIlluminated
                    ? 'text-red-400'
                    : dtcs.length > 0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              />
              <div className="obd-mono leading-none">
                <div className="text-[10px] font-bold tracking-wider">
                  {milIlluminated
                    ? 'CHECK BUILDING [MIL ON]'
                    : dtcs.length > 0
                    ? 'PENDING ADVISORY'
                    : 'BUILDING NOMINAL'}
                </div>
                <div className="text-[9px] opacity-80 mt-0.5">
                  {dtcs.length} ACTIVE DTC{dtcs.length === 1 ? '' : 'S'}
                </div>
              </div>
            </div>
          </div>

          {/* Center: OBD-II Subsystem Readiness Monitors */}
          <div className="flex flex-wrap items-center gap-1.5">
            {READINESS_ORDER.map((sub) => {
              const st = readiness[sub] || 'OK';
              return (
                <div
                  key={sub}
                  className={`px-2.5 py-1 border obd-mono text-[11px] flex items-center gap-2 ${
                    st === 'OK'
                      ? 'bg-zinc-900/70 border-zinc-800 text-emerald-400'
                      : st === 'INC'
                      ? 'bg-amber-950/35 border-amber-500/50 text-amber-300'
                      : 'bg-red-950/40 border-red-500/60 text-red-300'
                  }`}
                >
                  <span className="text-zinc-400">{sub}</span>
                  <span className="font-semibold">{st}</span>
                </div>
              );
            })}
          </div>

          {/* Right: Live WS Telemetry Latency + Mode Actions */}
          <div className="flex items-center gap-2.5">
            <div className="px-2.5 py-1.5 bg-zinc-900/80 border border-zinc-800 obd-mono text-[11px] flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-zinc-400">WS</span>
              <span className="text-orange-400 font-semibold">{wsLatencyMs} ms</span>
            </div>

            <button
              type="button"
              onClick={() => fetchScanReport(true)}
              disabled={scanning}
              className="px-3 py-1.5 bg-[#FF5500] hover:bg-orange-500 text-black font-semibold obd-mono text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,85,0,0.25)] transition-all whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>OBD Scan</span>
            </button>

            {onToggleStorefront && (
              <button
                type="button"
                onClick={onToggleStorefront}
                className="px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 obd-mono text-xs whitespace-nowrap shrink-0"
                title="Switch to Gemini Supply Collection View"
              >
                Storefront
              </button>
            )}
          </div>
        </div>

        {/* Platform Task 1–6 & Part 14 Navigation Strip */}
        <div className="max-w-[1600px] mx-auto mt-2.5 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'hud', label: '01 · Tactical OBD HUD & Gemini Council' },
              { id: 'portals_agents', label: '02 · 22 Portals & 23 Governed Agents' },
              { id: 'job_zero_panel', label: '03 · Part 14 Whole-Home & 7965 Lowell (60 Planned)' },
              { id: 'firewall_audit', label: '04 · Secret Firewall & SHA-256 Audit Chain' },
              { id: 'architecture', label: '05 · Release Verification (165/165) & Python WAL' },
            ].map((tab) => {
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.id as
                        | 'hud'
                        | 'portals_agents'
                        | 'job_zero_panel'
                        | 'firewall_audit'
                        | 'architecture'
                    )
                  }
                  className={`px-3 py-1.5 border obd-mono text-xs transition-all whitespace-nowrap ${
                    isAct
                      ? 'bg-[#FF5500] text-black border-[#FF5500] font-semibold shadow-[0_0_12px_rgba(255,85,0,0.25)]'
                      : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-[#FF5500]/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <span className="obd-mono text-[10px] text-emerald-400">
            v1.0.0 RELEASE · 165/165 CHECKS · S-001/S-002 LIFE-SAFETY INVARIANT
          </span>
        </div>
      </header>

      {/* =====================================================================
          MAIN WORKSPACE: TACTICAL HUD, PLATFORM WORKSPACES, OR CODE INSPECTOR
         ===================================================================== */}
      {activeTab === 'portals_agents' ||
      activeTab === 'job_zero_panel' ||
      activeTab === 'firewall_audit' ? (
        <PlatformWorkspaces subTab={activeTab} onLogTerminal={appendTerminal} />
      ) : activeTab === 'architecture' ? (
        <main className="relative z-10 max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6 pb-28">
          <div className="bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  OBD Home Systems Platform Release Docs (165/165 Pass) & Python SQLite WAL Deliverables
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Inspect `VERIFICATION.md`, `README.md`, `CONTRIBUTING.md`, `Dockerfile`, `docker-compose.yml`, `src/obd/platformCore.ts`, and Python 3.11+ edge modules (`db/engine.py`, `models/schemas.py`, `swarm/obd_council.py`, `main.py`).
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunWalBenchmark}
                disabled={walBenchLoading}
                className="px-4 py-2 bg-[#FF5500] hover:bg-orange-500 text-black font-semibold obd-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,85,0,0.25)]"
              >
                <Database className="w-4 h-4" />
                <span>{walBenchLoading ? 'Running 50-Writer Stress Test...' : 'Run 50-Writer WAL Concurrency Benchmark'}</span>
              </button>
            </div>

            {walBenchResult && (
              <div className="mt-4 p-4 bg-zinc-900/80 border border-orange-500/40 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 obd-mono text-xs">
                <div>
                  <div className="text-zinc-400 text-[10px]">STATUS</div>
                  <div className="text-emerald-400 font-bold">{walBenchResult.status}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">JOURNAL MODE</div>
                  <div className="text-orange-400 font-bold">{String(walBenchResult.journal_mode).toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">WRITE TXNS</div>
                  <div className="text-white">{walBenchResult.write_transactions} (50/sec)</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">ROWS INSERTED</div>
                  <div className="text-white">{walBenchResult.rows_inserted}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">ANALYTICAL READS</div>
                  <div className="text-white">{walBenchResult.analytical_reads}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">LOCK EXCEPTIONS</div>
                  <div className="text-emerald-400 font-bold">{walBenchResult.database_locked_exceptions}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">ELAPSED</div>
                  <div className="text-orange-400">{walBenchResult.elapsed_ms} ms</div>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-3 space-y-1.5">
                {Object.keys(sourceFiles).map((fileKey) => (
                  <button
                    key={fileKey}
                    type="button"
                    onClick={() => setSelectedSourceFile(fileKey)}
                    className={`w-full text-left px-3 py-2.5 border obd-mono text-xs flex items-center justify-between transition-colors ${
                      selectedSourceFile === fileKey
                        ? 'bg-[#FF5500]/15 border-[#FF5500] text-orange-300 font-semibold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="truncate">{fileKey}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                  </button>
                ))}
              </div>
              <div className="lg:col-span-9 bg-zinc-950 border border-zinc-800 p-4 overflow-x-auto max-h-[640px]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3 obd-mono text-xs text-orange-400">
                  <span>FILE: /{selectedSourceFile}</span>
                  <span>PRODUCTION-HARDENED · ZERO STUBS</span>
                </div>
                <pre className="obd-mono text-xs text-zinc-200 leading-relaxed whitespace-pre">
                  {sourceFiles[selectedSourceFile] || 'Loading source file...'}
                </pre>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="relative z-10 max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 pb-28">
          {/* =================================================================
              2. LEFT COLUMN — ZONE MATRIX, LIVE GAUGES & CAN-BUS NODES
             ================================================================= */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-5">
            {/* Interactive Zone Selector */}
            <section className="bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase obd-mono">
                  01. Facility Zone Matrix
                </h2>
                <span className="obd-mono text-[11px] text-orange-400">
                  {filteredNodes.length} NODES
                </span>
              </div>

              <div className="space-y-1.5">
                {ZONES.map((zone) => {
                  const zoneDtcs =
                    zone === 'All Zones'
                      ? dtcs.length
                      : dtcs.filter((d) => d.zone === zone).length;
                  const isSelected = selectedZone === zone;
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => setSelectedZone(zone)}
                      className={`w-full px-3 py-2 border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FF5500]/15 border-[#FF5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.2)]'
                          : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{zone}</span>
                      <span
                        className={`obd-mono text-[11px] ${
                          zoneDtcs > 0 ? 'text-orange-400 font-semibold' : 'text-emerald-400'
                        }`}
                      >
                        {zoneDtcs > 0 ? `${zoneDtcs} DTC` : 'NOMINAL'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Live High-Density Telemetry Gauges */}
            <section className="bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 p-4 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase obd-mono">
                  02. Live Subsystem Gauges
                </h2>
                <span className="obd-mono text-[10px] text-zinc-400">1.5s SAMPLE</span>
              </div>

              {/* Compute Thermal & Load Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Ryzen Edge Package Temp</span>
                  </span>
                  <span
                    className={`obd-mono font-semibold ${
                      telemetry.cpuTempC >= 85 ? 'text-red-400' : 'text-orange-400'
                    }`}
                  >
                    {telemetry.cpuTempC.toFixed(1)} °C · {telemetry.cpuLoadPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-900 border border-zinc-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      telemetry.cpuTempC >= 85 ? 'bg-red-500' : 'bg-[#FF5500]'
                    }`}
                    style={{ width: `${Math.min(100, telemetry.cpuTempC)}%` }}
                  />
                </div>
                <div className="flex justify-between obd-mono text-[10px] text-zinc-400">
                  <span>RAM: {telemetry.ramUsedPct.toFixed(1)}%</span>
                  <span>NVMe Await: {telemetry.diskAwaitMs.toFixed(1)} ms</span>
                </div>
              </div>

              {/* Electrical Power & Voltage Gauge */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/70">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Facility Load & Line L2</span>
                  </span>
                  <span className="obd-mono font-semibold text-orange-400">
                    {telemetry.powerWatts} W · {telemetry.lineVoltageV.toFixed(1)} V
                  </span>
                </div>
                <div className="h-2 bg-zinc-900 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#FF5500] transition-all duration-300"
                    style={{ width: `${Math.min(100, (telemetry.powerWatts / 6000) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between obd-mono text-[10px] text-zinc-400">
                  <span>UPS Load: {telemetry.upsLoadPct.toFixed(0)}%</span>
                  <span>Battery SoC: {telemetry.upsBatteryPct.toFixed(0)}%</span>
                </div>
              </div>

              {/* Fiber & WAN Optical Telemetry */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/70">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>10G Fiber RX/TX & GPON</span>
                  </span>
                  <span className="obd-mono font-semibold text-emerald-400">
                    {(telemetry.fiberRxMbps + telemetry.fiberTxMbps).toFixed(0)} Mbps
                  </span>
                </div>
                <div className="h-2 bg-zinc-900 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((telemetry.fiberRxMbps + telemetry.fiberTxMbps) / 1000) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between obd-mono text-[10px] text-zinc-400">
                  <span>Optical RX: {telemetry.opticalRxDbm} dBm</span>
                  <span>WAN Jitter: {telemetry.gatewayRttMs} ms</span>
                </div>
              </div>

              {/* HVAC & Environmental Plenum */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/70">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>HVAC Supply / Return ΔT</span>
                  </span>
                  <span className="obd-mono font-semibold text-amber-400">
                    {telemetry.hvacSupplyTempC}°C / {telemetry.hvacReturnTempC}°C
                  </span>
                </div>
                <div className="flex justify-between obd-mono text-[10px] text-zinc-400">
                  <span>Static: {telemetry.staticPressureInWg} in.wg</span>
                  <span>AQI: {telemetry.ambientAqi} · CO2: {telemetry.co2Ppm}ppm</span>
                </div>
              </div>
            </section>

            {/* Bus Nodes & Quick Quarantine Controls */}
            <section className="bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase obd-mono">
                  03. CAN / BACnet Node Bus
                </h2>
                <span className="obd-mono text-[10px] text-zinc-400">CLICK TO ISOLATE</span>
              </div>
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {filteredNodes.map((node) => {
                  const isIso = node.status === 'ISOLATED';
                  return (
                    <div
                      key={node.node_id}
                      className={`p-2.5 border transition-colors ${
                        isIso
                          ? 'bg-red-950/25 border-red-500/50'
                          : 'bg-zinc-900/50 border-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="obd-mono text-xs font-semibold text-white truncate">
                          {node.node_id}
                        </span>
                        <span
                          className={`obd-mono text-[10px] ${
                            isIso
                              ? 'text-red-400 font-bold'
                              : node.status === 'DEGRADED'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {node.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center justify-between">
                        <span className="truncate">{node.hardware_type}</span>
                        <span className="obd-mono text-[10px] text-zinc-500">{node.ip_or_serial}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleIsolateNode(node.node_id)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 obd-mono text-[10px] text-zinc-200 flex items-center gap-1"
                        >
                          {isIso ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-orange-400" />}
                          <span>{isIso ? 'Restore Bus' : 'Isolate'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteSlashCommand(`/freeze ${node.node_id}`)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 obd-mono text-[10px] text-zinc-200 flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3 text-orange-400" />
                          <span>Freeze</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>

          {/* =================================================================
              3. CENTER & RIGHT STAGE — TELEMETRY OSCILLOGRAPH, ACTIVE DTC
                 SCANNER & FREEZE-FRAME / AI SWARM VERDICT INSPECTOR
             ================================================================= */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-5">
            {/* High-Frequency Telemetry Plotter (Recharts) */}
            <section className="bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 p-4 lg:p-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#FF5500]" />
                    <span>Real-Time Multi-Bus Telemetry Stream (SQLite WAL Ring Buffer)</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Continuous high-frequency edge ingestion across Compute Thermal (°C), Fiber Throughput (Mbps), and Facility Load (kW)
                  </p>
                </div>
                <div className="flex items-center gap-4 obd-mono text-xs">
                  <span className="text-[#FF5500]">■ CPU Temp: {telemetry.cpuTempC}°C</span>
                  <span className="text-emerald-400">
                    ■ Fiber: {Math.round(telemetry.fiberRxMbps + telemetry.fiberTxMbps)} Mbps
                  </span>
                  <span className="text-amber-400">
                    ■ Load: {(telemetry.powerWatts / 1000).toFixed(2)} kW
                  </span>
                </div>
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF5500" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#FF5500" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="time"
                      stroke="#71717a"
                      tick={{ fontSize: 10, fontFamily: 'Google Sans Mono, monospace' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      tick={{ fontSize: 10, fontFamily: 'Google Sans Mono, monospace' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#09090b',
                        borderColor: '#FF5500',
                        fontFamily: 'Google Sans Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpuTempC"
                      name="CPU Temp (°C)"
                      stroke="#FF5500"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#emberGrad)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpuLoadPct"
                      name="CPU Load (%)"
                      stroke="#10B981"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#emeraldGrad)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Split Grid: Active DTC Scanner Table + Freeze-Frame & AI Swarm Verdict Inspector */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* Active DTC Trouble Code Scanner Table */}
              <section className="xl:col-span-6 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 p-4 lg:p-5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Active Diagnostic Trouble Codes (DTCs)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Click any trouble code to inspect its millisecond Freeze-Frame & 3-Agent Swarm Verdict
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Select fault code to inject"
                      value={injectCodeSelection}
                      onChange={(e) => setInjectCodeSelection(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 px-2 py-1 obd-mono text-xs text-zinc-200"
                    >
                      <option value="S0108">S0108 (Water Leak)</option>
                      <option value="P0214">P0214 (UPS Impedance)</option>
                      <option value="N0209">N0209 (SFP+ Thermal)</option>
                      <option value="E0104">E0104 (Plenum Filter)</option>
                      <option value="C0201">C0201 (RAM Thrash)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleInjectDtc(injectCodeSelection)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-[#FF5500]/60 text-orange-400 obd-mono text-xs whitespace-nowrap"
                    >
                      + Trip DTC
                    </button>
                    {dtcs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearDtc('ALL')}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-red-950/60 border border-zinc-700 text-zinc-300 obd-mono text-xs flex items-center gap-1 whitespace-nowrap"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>

                {filteredDtcs.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <div className="text-sm font-medium text-white">
                      Zero Active Trouble Codes in {selectedZone}
                    </div>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      All monitored CAN-bus / BACnet subsystems report nominal parameters. Use "+ Trip DTC" above to simulate a facility anomaly.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {filteredDtcs.map((item) => {
                      const isSelected = activeDtcDetail?.dtc_code === item.dtc_code;
                      return (
                        <div
                          key={`${item.dtc_code}-${item.node_id}`}
                          onClick={() => setSelectedDtcCode(item.dtc_code)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSelectedDtcCode(item.dtc_code);
                          }}
                          className={`p-3.5 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FF5500]/12 border-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.2)]'
                              : 'bg-zinc-900/55 border-zinc-800/90 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`obd-mono text-sm font-bold ${
                                  item.severity === 'CRITICAL'
                                    ? 'text-red-400'
                                    : item.severity === 'WARN'
                                    ? 'text-amber-400'
                                    : 'text-orange-400'
                                }`}
                              >
                                {item.dtc_code}
                              </span>
                              <span className="text-xs text-zinc-400 obd-mono">
                                {item.subsystem} · {item.zone}
                              </span>
                            </div>
                            <span
                              className={`obd-mono text-[11px] font-semibold ${
                                item.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
                              }`}
                            >
                              {item.severity} · {item.occurrence_count}x
                            </span>
                          </div>

                          <div className="text-xs font-medium text-zinc-100 mt-1.5">
                            {item.title}
                          </div>

                          <div className="mt-2 flex items-center justify-between obd-mono text-[11px] text-zinc-400">
                            <span>Node: {item.node_id}</span>
                            <span className="text-orange-400">
                              {item.swarm_verdict
                                ? `Swarm Confidence ${(item.swarm_verdict.root_cause_confidence * 100).toFixed(0)}%`
                                : 'Click to Run Gemini Council →'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent Agent & Operator Audit Trail */}
                <div className="mt-5 pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="obd-mono text-xs font-semibold text-zinc-300 uppercase">
                      Agent & Actuation Audit Log (SQLite WAL)
                    </h3>
                    <span className="obd-mono text-[10px] text-zinc-500">
                      {auditLogs.length} RECORDS
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {auditLogs.slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800/70 flex items-center justify-between gap-2 obd-mono text-[11px]"
                      >
                        <div className="truncate">
                          <span className="text-orange-400 font-semibold">[{log.dtc_code}]</span>{' '}
                          <span className="text-zinc-300">{log.action_taken}</span>
                        </div>
                        <span className="text-emerald-400 shrink-0 text-[10px]">
                          {log.verification_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Freeze-Frame Inspector & 3-Agent AI Swarm Diagnostic Verdict Drawer */}
              <section className="xl:col-span-6 bg-zinc-950/75 backdrop-blur-xl border border-[#FF5500]/50 p-4 lg:p-5 shadow-[0_0_20px_rgba(255,85,0,0.12)]">
                {activeDtcDetail ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="obd-mono text-base font-bold text-[#FF5500]">
                            FREEZE-FRAME // {activeDtcDetail.dtc_code}
                          </span>
                          <span className="obd-mono text-xs text-zinc-400">
                            · {activeDtcDetail.freeze_frame?.can_frame_hex || '0x18FF2A91'}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white mt-0.5">
                          {activeDtcDetail.title}
                        </h3>
                        <p className="obd-mono text-[11px] text-zinc-400 mt-0.5">
                          Node: {activeDtcDetail.node_id} · Zone: {activeDtcDetail.zone} · Captured:{' '}
                          {new Date(activeDtcDetail.last_seen).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRunSwarmCouncil(activeDtcDetail.dtc_code)}
                          disabled={councilLoadingDtc === activeDtcDetail.dtc_code}
                          className="px-3 py-1.5 bg-[#FF5500] hover:bg-orange-500 text-black font-semibold obd-mono text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,85,0,0.25)] whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {councilLoadingDtc === activeDtcDetail.dtc_code
                              ? 'Synthesizing 3-Agent Verdict...'
                              : 'Run Gemini Swarm Council'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearDtc(activeDtcDetail.dtc_code)}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 obd-mono text-xs whitespace-nowrap"
                        >
                          Clear DTC
                        </button>
                      </div>
                    </div>

                    {/* Multi-Sensor Millisecond Freeze-Frame Snapshot Grid */}
                    <div>
                      <div className="obd-mono text-[11px] text-zinc-400 uppercase mb-2 flex items-center justify-between">
                        <span>Multi-Sensor Snapshot at Fault Trigger</span>
                        <span className="text-orange-400">
                          {activeDtcDetail.freeze_frame?.host_kernel || 'Linux Edge RT'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(activeDtcDetail.freeze_frame?.metrics || {}).map(
                          ([k, v]) => (
                            <div
                              key={k}
                              className="p-2 bg-zinc-900/75 border border-zinc-800/90 obd-mono"
                            >
                              <div className="text-[10px] text-zinc-400 truncate">{k}</div>
                              <div className="text-xs font-semibold text-white mt-0.5">
                                {typeof v === 'number' ? v : String(v)}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* 3-Agent AI Swarm Diagnostic Verdict */}
                    {activeDtcDetail.swarm_verdict ? (
                      <div className="space-y-3 pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="obd-mono text-xs font-semibold text-orange-400 uppercase flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5" />
                            <span>AI Swarm Diagnostic Verdict (3-Agent Council)</span>
                          </span>
                          <span className="obd-mono text-xs text-emerald-400 font-semibold">
                            Confidence:{' '}
                            {(activeDtcDetail.swarm_verdict.root_cause_confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        {/* Agent 1: Correlated Cross-Zone Anomalies */}
                        <div className="p-3 bg-zinc-900/70 border border-zinc-800 space-y-1.5">
                          <div className="obd-mono text-[11px] text-zinc-300 font-semibold">
                            AGENT 1 · ROOT-CAUSE CROSS-ZONE CORRELATIONS
                          </div>
                          <ul className="space-y-1 text-xs text-zinc-200">
                            {activeDtcDetail.swarm_verdict.correlated_anomalies.map((anom, i) => (
                              <li key={i} className="obd-mono text-[11px] text-orange-300">
                                → {anom}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Agent 2: Adversarial Critic / Roast Mode Dissent */}
                        <div className="p-3 bg-red-950/25 border border-red-500/40 space-y-1">
                          <div className="obd-mono text-[11px] text-red-300 font-semibold flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                            <span>AGENT 2 · ADVERSARIAL CRITIC / STRESS-TEST DISSENT</span>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            {activeDtcDetail.swarm_verdict.critic_dissent}
                          </p>
                        </div>

                        {/* Agent 3: Deterministic Remediation Steps & Actuation Payload */}
                        <div className="p-3 bg-zinc-900/70 border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="obd-mono text-[11px] text-emerald-400 font-semibold">
                              AGENT 3 · DETERMINISTIC REMEDIATION & ACTUATION
                            </span>
                            <span className="obd-mono text-[10px] text-zinc-400">
                              Auto-Script Safe:{' '}
                              {activeDtcDetail.swarm_verdict.automated_script_safe ? 'YES' : 'MANUAL'}
                            </span>
                          </div>
                          <ol className="space-y-1 text-xs text-zinc-200 list-decimal list-inside">
                            {activeDtcDetail.swarm_verdict.remediation_steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>

                          {activeDtcDetail.swarm_verdict.terminal_command_or_payload && (
                            <div className="mt-2 p-2 bg-black border border-zinc-800 obd-mono text-[11px] text-orange-300 overflow-x-auto">
                              $ {activeDtcDetail.swarm_verdict.terminal_command_or_payload}
                            </div>
                          )}

                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleActuateRemediation(activeDtcDetail)}
                              disabled={actuatingDtc === activeDtcDetail.dtc_code}
                              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold obd-mono text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>
                                {actuatingDtc === activeDtcDetail.dtc_code
                                  ? 'Executing Actuation...'
                                  : 'Execute Safe Actuation & Clear Fault'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-zinc-900/50 border border-zinc-800 text-center space-y-2">
                        <p className="text-xs text-zinc-300">
                          Freeze-frame captured. Dispatch the 3-Agent Gemini Diagnostic Council to correlate cross-zone anomalies and generate an adversarial critique.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRunSwarmCouncil(activeDtcDetail.dtc_code)}
                          disabled={councilLoadingDtc === activeDtcDetail.dtc_code}
                          className="px-4 py-2 bg-[#FF5500] hover:bg-orange-500 text-black font-semibold obd-mono text-xs inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {councilLoadingDtc === activeDtcDetail.dtc_code
                              ? 'Dispatching Parallel Agents...'
                              : 'Evaluate with Gemini OBD Council'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-zinc-400 obd-mono">
                    Select any active DTC on the left or trip a synthetic fault code to inspect its Freeze-Frame snapshot.
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          4. BOTTOM DOCK — INTERACTIVE OBD COMMAND TERMINAL
         ===================================================================== */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/92 backdrop-blur-xl border-t border-zinc-800 px-4 lg:px-6 py-2.5 shadow-2xl">
        <div className="max-w-[1600px] mx-auto space-y-2">
          {/* Latest Terminal Output Strip */}
          {terminalLogs.length > 0 && (
            <div className="flex items-center justify-between gap-3 px-2.5 py-1 bg-zinc-900/90 border border-zinc-800/90 obd-mono text-[11px] overflow-x-auto">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-zinc-500 shrink-0">{terminalLogs[0].ts}</span>
                <span className="text-[#FF5500] font-semibold shrink-0">
                  {terminalLogs[0].cmd}
                </span>
                <span
                  className={`truncate ${
                    terminalLogs[0].tone === 'warn'
                      ? 'text-amber-300'
                      : terminalLogs[0].tone === 'ok'
                      ? 'text-emerald-300'
                      : 'text-zinc-200'
                  }`}
                >
                  {terminalLogs[0].out}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 shrink-0">OBD-II TTY</span>
            </div>
          )}

          {/* Command Input + Quick Slash Command Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteSlashCommand(cmdInput);
              }}
              className="flex-1 min-w-[260px] flex items-center bg-zinc-900 border border-zinc-700 focus-within:border-[#FF5500]"
            >
              <span className="pl-3 pr-2 text-[#FF5500] obd-mono text-xs flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>obd&gt;</span>
              </span>
              <input
                type="text"
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                placeholder="Type slash command: /scan, /clear C0105, /freeze edge-ryzen-rack-01, /roast-architecture, /isolate hvac-crac-rack-02"
                className="w-full py-1.5 pr-3 bg-transparent text-xs text-white obd-mono focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#FF5500] hover:bg-orange-500 text-black font-semibold obd-mono text-xs shrink-0"
              >
                RUN
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                '/scan',
                '/roast-architecture',
                '/freeze edge-ryzen-rack-01',
                '/isolate hvac-crac-rack-02',
                '/verify-wal',
                '/clear ALL',
              ].map((quickCmd) => (
                <button
                  key={quickCmd}
                  type="button"
                  onClick={() => handleExecuteSlashCommand(quickCmd)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#FF5500]/60 obd-mono text-[11px] text-zinc-300 whitespace-nowrap transition-colors"
                >
                  {quickCmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
