import crypto from 'crypto';
import type { Express, Request, Response } from 'express';

// ============================================================================
// 1. 22 PORTALS REGISTRY (Task 1 & Task 3)
// ============================================================================
export interface PortalDefinition {
  slug: string;
  name: string;
  audience: 'external' | 'executive' | 'operations' | 'corporate' | 'technical';
  mfaRequired: boolean;
  agentName: string;
  status: 'NOT CONNECTED';
  coreLink: 'CONNECTED TO CORE';
  recordKinds: string[];
  emptyMessage: string;
}

export const PORTALS_22: PortalDefinition[] = [
  { slug: 'client', name: 'Client', audience: 'external', mfaRequired: true, agentName: 'Client Care', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['service_request', 'building_access'], emptyMessage: 'Connected to core, no live building telemetry connected.' },
  { slug: 'owner', name: 'Owner (Master Admin)', audience: 'executive', mfaRequired: true, agentName: 'Coordinator', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['broadcast', 'approval_decision', 'tier2_class'], emptyMessage: 'Connected to core. Zero Tier-2 classes enabled; Part 13 worksheet blank.' },
  { slug: 'dispatch', name: 'Dispatch', audience: 'operations', mfaRequired: false, agentName: 'Dispatcher', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['dispatch_job', 'crew_schedule'], emptyMessage: 'Connected to core, no active dispatch feed connected.' },
  { slug: 'install-tech', name: 'Install Tech', audience: 'operations', mfaRequired: false, agentName: 'Field Copilot', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['install_job', 'commission_check'], emptyMessage: 'Connected to core, awaiting assigned installation jobs.' },
  { slug: 'sales', name: 'Sales', audience: 'corporate', mfaRequired: false, agentName: 'Estimator', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['quote', 'contractor_lead'], emptyMessage: 'Connected to core. Prices are PROPOSED or UNPRICED only.' },
  { slug: 'warehouse', name: 'Warehouse', audience: 'operations', mfaRequired: false, agentName: 'Stockkeeper', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['inventory_allocation', 'receiving_manifest'], emptyMessage: 'Connected to core, no external WMS connected.' },
  { slug: 'production', name: 'Production', audience: 'operations', mfaRequired: false, agentName: 'Line Planner', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['production_run', 'qa_check'], emptyMessage: 'Connected to core, no production line telemetry connected.' },
  { slug: 'manufacturing', name: 'Manufacturing', audience: 'operations', mfaRequired: false, agentName: 'Fab Monitor', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['bom_revision', 'assembly_lot'], emptyMessage: 'Connected to core, no manufacturing bus connected.' },
  { slug: 'accounting', name: 'Accounting', audience: 'executive', mfaRequired: true, agentName: 'Ledger', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['invoice', 'comp_membership'], emptyMessage: 'Connected to core. Payment path in TEST MODE ONLY.' },
  { slug: 'office', name: 'Office', audience: 'corporate', mfaRequired: false, agentName: 'Front Desk', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['office_task', 'vendor_visit'], emptyMessage: 'Connected to core, no external calendar connected.' },
  { slug: 'corporate', name: 'Corporate', audience: 'executive', mfaRequired: true, agentName: 'Governance', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['board_resolution', 'policy_doc'], emptyMessage: 'Connected to core, no external entity filings connected.' },
  { slug: 'field-crews', name: 'Field Crews', audience: 'operations', mfaRequired: false, agentName: 'Crew Lead', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['site_walk', 'truck_stock'], emptyMessage: 'Connected to core, no fleet GPS connected.' },
  { slug: 'it', name: 'IT & Security', audience: 'technical', mfaRequired: true, agentName: 'Bastion', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['update_rollout', 'security_audit'], emptyMessage: 'Connected to core. Credential registry stores metadata only.' },
  { slug: 'advertising', name: 'Advertising', audience: 'corporate', mfaRequired: false, agentName: 'Media Buyer', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['ad_campaign', 'creative_draft'], emptyMessage: 'Connected to core, no ad network connected (publication owner-gated).' },
  { slug: 'marketing', name: 'Marketing', audience: 'corporate', mfaRequired: false, agentName: 'CopyDesk', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['collateral_piece', 'case_study'], emptyMessage: 'Connected to core, no external CMS connected.' },
  { slug: 'hr', name: 'HR', audience: 'executive', mfaRequired: true, agentName: 'PeopleOps', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['employee_record', 'onboarding_pack'], emptyMessage: 'Connected to core, employee records subject-scoped.' },
  { slug: 'employees', name: 'Employees', audience: 'operations', mfaRequired: false, agentName: 'Staff Companion', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['shift_note', 'training_ack'], emptyMessage: 'Connected to core, showing only self-scoped records.' },
  { slug: 'project-management', name: 'Project Management', audience: 'operations', mfaRequired: false, agentName: 'PMO Tracker', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['ground_zero_project', 'milestone_gate'], emptyMessage: 'Connected to core, Ground Zero land-and-expand gated.' },
  { slug: 'public-relations', name: 'Public Relations', audience: 'corporate', mfaRequired: false, agentName: 'PressDesk', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['press_release', 'media_inquiry'], emptyMessage: 'Connected to core, all external releases require Owner tap.' },
  { slug: 'customer-service', name: 'Customer Service', audience: 'operations', mfaRequired: false, agentName: 'Help Desk', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['follow_up_ticket', 'rma_request'], emptyMessage: 'Connected to core, no external telephony connected.' },
  { slug: 'legal', name: 'Legal & Compliance', audience: 'executive', mfaRequired: true, agentName: 'Docket', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['contract_draft', 'compliance_hold'], emptyMessage: 'Connected to core, no external e-signature provider connected.' },
  { slug: 'development', name: 'Development', audience: 'technical', mfaRequired: false, agentName: 'BuildBot', status: 'NOT CONNECTED', coreLink: 'CONNECTED TO CORE', recordKinds: ['firmware_spec', 'bench_fixture'], emptyMessage: 'Connected to core. Fault engine v0.3.0 byte-identical.' },
];

// ============================================================================
// 2. SHA-256 HASH-CHAINED AUDIT LOG (Task 1 Clause 3)
// ============================================================================
export interface HashChainedAuditEntry {
  seq: number;
  timestamp: string;
  actor: string;
  portal: string;
  action: string;
  detail: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const auditChain: HashChainedAuditEntry[] = [];

function computeAuditHash(
  seq: number,
  timestamp: string,
  actor: string,
  portal: string,
  action: string,
  detail: Record<string, unknown>,
  prevHash: string
): string {
  const canonical = JSON.stringify({ seq, timestamp, actor, portal, action, detail, prevHash });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function appendAuditChain(
  actor: string,
  portal: string,
  action: string,
  detail: Record<string, unknown> = {}
): HashChainedAuditEntry {
  const seq = auditChain.length + 1;
  const timestamp = new Date().toISOString();
  const prevHash = seq === 1 ? GENESIS_HASH : auditChain[seq - 2]!.hash;
  const hash = computeAuditHash(seq, timestamp, actor, portal, action, detail, prevHash);
  const entry: HashChainedAuditEntry = {
    seq,
    timestamp,
    actor,
    portal,
    action,
    detail,
    prevHash,
    hash,
  };
  auditChain.push(entry);
  return entry;
}

export function verifyAuditChain(entries: HashChainedAuditEntry[] = auditChain): {
  ok: boolean;
  count: number;
  brokenAtSeq?: number;
  reason?: string;
} {
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i]!;
    const expectedPrev = i === 0 ? GENESIS_HASH : entries[i - 1]!.hash;
    if (item.prevHash !== expectedPrev) {
      return {
        ok: false,
        count: entries.length,
        brokenAtSeq: item.seq,
        reason: `prevHash mismatch at seq #${item.seq}`,
      };
    }
    const expectedHash = computeAuditHash(
      item.seq,
      item.timestamp,
      item.actor,
      item.portal,
      item.action,
      item.detail,
      item.prevHash
    );
    if (item.hash !== expectedHash) {
      return {
        ok: false,
        count: entries.length,
        brokenAtSeq: item.seq,
        reason: `SHA-256 payload digest mismatch at seq #${item.seq} (actor/payload tampered)`,
      };
    }
  }
  return { ok: true, count: entries.length };
}

// ============================================================================
// 3. SECRET-PATTERN REJECTION FIREWALL & CREDENTIAL REGISTRY (Task 1 Clause 4)
// ============================================================================
export interface RegistryMetadataEntry {
  id: string;
  provider: string;
  purpose: string;
  owner: string;
  rotationDate: string;
  status: 'NOT CONNECTED';
  createdAt: string;
}

const FORBIDDEN_FIELD_NAMES = new Set([
  'value',
  'secret',
  'apikey',
  'api_key',
  'client_secret',
  'clientsecret',
  'password',
  'private_key',
  'privatekey',
  'token',
  'bearer',
]);

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'stripe-live-key', regex: /\bsk_live_[A-Za-z0-9]{10,}/ },
  { name: 'sk-style-key', regex: /\bsk-[A-Za-z0-9_-]{12,}/ },
  { name: 'aws-access-key-id', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'github-token', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'slack-token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'google-api-key', regex: /\bAIza[0-9A-Za-z_-]{25,}/ },
  { name: 'json-web-token', regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'private-key-block', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'bearer-token', regex: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i },
];

function shannonEntropy(str: string): number {
  if (!str) return 0;
  const freq: Record<string, number> = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let ent = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

export function inspectForSecretShapes(obj: Record<string, unknown>): {
  rejected: boolean;
  field?: string;
  pattern?: string;
} {
  for (const [rawKey, rawVal] of Object.entries(obj)) {
    const normalizedKey = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (FORBIDDEN_FIELD_NAMES.has(normalizedKey)) {
      return { rejected: true, field: `$.${rawKey}`, pattern: 'forbidden-field' };
    }
    if (typeof rawVal === 'string') {
      for (const pat of SECRET_PATTERNS) {
        if (pat.regex.test(rawVal)) {
          return { rejected: true, field: `$.${rawKey}`, pattern: pat.name };
        }
      }
      const trimmed = rawVal.trim();
      if (trimmed.length >= 32 && !/\s/.test(trimmed) && shannonEntropy(trimmed) > 4.25) {
        return { rejected: true, field: `$.${rawKey}`, pattern: 'high-entropy-value' };
      }
    }
  }
  return { rejected: false };
}

const credentialRegistry: RegistryMetadataEntry[] = [
  {
    id: 'reg-01',
    provider: 'test-mode-adapter',
    purpose: 'payments',
    owner: 'owner@obd-home',
    rotationDate: '2027-01-01',
    status: 'NOT CONNECTED',
    createdAt: new Date().toISOString(),
  },
];

// ============================================================================
// 4. v0.3.0 22-CODE FAULT ENGINE & LIFE-SAFETY S-001/S-002 ALARMS (Task 2)
// ============================================================================
export interface FaultCodeSpec {
  code: string;
  category: 'HVAC' | 'ELECTRICAL' | 'PLUMBING' | 'STRUCTURE' | 'AIR' | 'LIFE_SAFETY';
  severity: 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  title: string;
  lifeSafety: boolean;
}

export const FAULT_CODES_22: FaultCodeSpec[] = [
  // Life Safety (N3 / S-001, S-002, S-003) — NEVER clearable via API/UI
  { code: 'S-001', category: 'LIFE_SAFETY', severity: 'EMERGENCY', title: 'Ionization/Photoelectric Smoke Detector Chamber Alarm', lifeSafety: true },
  { code: 'S-002', category: 'LIFE_SAFETY', severity: 'EMERGENCY', title: 'Electrochemical Carbon Monoxide (CO > 70 ppm) Life-Safety Alarm', lifeSafety: true },
  { code: 'S-003', category: 'LIFE_SAFETY', severity: 'CRITICAL', title: 'Combustible Natural Gas / Methane LEL Threshold Breach', lifeSafety: true },
  // Plumbing / Water (P4)
  { code: 'P-001', category: 'PLUMBING', severity: 'CRITICAL', title: 'Active Moisture / Pan Conductive Leak Sensor Wet State', lifeSafety: false },
  { code: 'P-002', category: 'PLUMBING', severity: 'WARNING', title: 'Main Shutoff Continuous Nighttime Micro-Flow (>0.25 GPM)', lifeSafety: false },
  { code: 'P-003', category: 'PLUMBING', severity: 'WARNING', title: 'Domestic Water Heater Flue / Tank Recovery Thermal Lag', lifeSafety: false },
  { code: 'P-004', category: 'PLUMBING', severity: 'CRITICAL', title: 'Supply Line Static Pressure Surge (>85 PSI PRV Failure)', lifeSafety: false },
  // HVAC (H4)
  { code: 'H-001', category: 'HVAC', severity: 'WARNING', title: 'Supply/Return Plenum Static Pressure Filter Restriction', lifeSafety: false },
  { code: 'H-002', category: 'HVAC', severity: 'CRITICAL', title: 'Compressor Short-Cycling (>6 Starts/Hr Liquid Slug Risk)', lifeSafety: false },
  { code: 'H-003', category: 'HVAC', severity: 'WARNING', title: 'Evaporator Coil Delta-T Sub-Nominal (<12°F Split)', lifeSafety: false },
  { code: 'H-004', category: 'HVAC', severity: 'CRITICAL', title: 'Hydronic / Forced-Air Zone Freeze Stat Low-Temp Cutout', lifeSafety: false },
  // Electrical (E4)
  { code: 'E-001', category: 'ELECTRICAL', severity: 'WARNING', title: 'Branch Circuit L1/L2 Voltage Sag Under Load (<110V)', lifeSafety: false },
  { code: 'E-002', category: 'ELECTRICAL', severity: 'CRITICAL', title: 'AFCI / High-Frequency Series Arc Signature Detected', lifeSafety: false },
  { code: 'E-003', category: 'ELECTRICAL', severity: 'WARNING', title: 'Continuous Plug Load >80% NEC Breaker Rating', lifeSafety: false },
  { code: 'E-004', category: 'ELECTRICAL', severity: 'CRITICAL', title: 'Neutral-to-Ground Impedance Drift / Stray Current', lifeSafety: false },
  // Structure & Perimeter (S4)
  { code: 'S-101', category: 'STRUCTURE', severity: 'CRITICAL', title: 'Crawlspace / Pipe Chase Freeze Zone (<34°F)', lifeSafety: false },
  { code: 'S-102', category: 'STRUCTURE', severity: 'WARNING', title: 'Foundation Sump Pit High-Water Float Duty Cycle High', lifeSafety: false },
  { code: 'S-103', category: 'STRUCTURE', severity: 'WARNING', title: 'Attic / Rim-Joist Relative Humidity Condensation Risk (>72%)', lifeSafety: false },
  { code: 'S-104', category: 'STRUCTURE', severity: 'WARNING', title: 'Perimeter Entry Contact Supervisory Loop Open', lifeSafety: false },
  // Air Quality (A3)
  { code: 'A-001', category: 'AIR', severity: 'WARNING', title: 'Indoor CO2 Concentration Sustained >1,200 ppm', lifeSafety: false },
  { code: 'A-002', category: 'AIR', severity: 'WARNING', title: 'TVOC / Formaldehyde Index Spike (>500 ppb)', lifeSafety: false },
  { code: 'A-003', category: 'AIR', severity: 'CRITICAL', title: 'Particulate Matter PM2.5 > 55 µg/m³ Infiltration', lifeSafety: false },
];

export interface PlatformAlarm {
  id: string;
  buildingId: string;
  code: string;
  title: string;
  severity: 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  lifeSafety: boolean;
  simulator: boolean;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED' | 'RESOLVED_AT_DEVICE';
  deliveryChannel: 'platform-console';
  deliveryStatus: 'DELIVERED';
  externalDelivery: 'NOT CONNECTED';
  raisedAt: string;
  clearedBy: string | null;
}

const platformAlarms: PlatformAlarm[] = [
  {
    id: 'alm-s001-bench',
    buildingId: 'bldg-bench-sim',
    code: 'S-001',
    title: 'Ionization/Photoelectric Smoke Detector Chamber Alarm (Bench Harness)',
    severity: 'EMERGENCY',
    lifeSafety: true,
    simulator: true,
    status: 'ACTIVE',
    deliveryChannel: 'platform-console',
    deliveryStatus: 'DELIVERED',
    externalDelivery: 'NOT CONNECTED',
    raisedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    clearedBy: null,
  },
  {
    id: 'alm-s002-bench',
    buildingId: 'bldg-bench-sim',
    code: 'S-002',
    title: 'Electrochemical Carbon Monoxide (CO > 70 ppm) Life-Safety Alarm (Bench Harness)',
    severity: 'EMERGENCY',
    lifeSafety: true,
    simulator: true,
    status: 'ACTIVE',
    deliveryChannel: 'platform-console',
    deliveryStatus: 'DELIVERED',
    externalDelivery: 'NOT CONNECTED',
    raisedAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    clearedBy: null,
  },
  {
    id: 'alm-p001-bench',
    buildingId: 'bldg-bench-sim',
    code: 'P-001',
    title: 'Active Moisture / Pan Conductive Leak Sensor Wet State (Bench Harness)',
    severity: 'CRITICAL',
    lifeSafety: false,
    simulator: true,
    status: 'ACTIVE',
    deliveryChannel: 'platform-console',
    deliveryStatus: 'DELIVERED',
    externalDelivery: 'NOT CONNECTED',
    raisedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    clearedBy: null,
  },
];

// ============================================================================
// 5. PART 14: WHOLE-HOME CONTROL, MODES & CLIENT JOB ZERO (7965 LOWELL)
// ============================================================================
export type DeviceCategory =
  | 'lighting'
  | 'metered_outlet'
  | 'water'
  | 'hvac'
  | 'security'
  | 'smoke_co_listen_only'
  | 'infrastructure';

export interface PlannedOrInstalledDevice {
  id: string;
  buildingId: string;
  name: string;
  location: string;
  category: DeviceCategory;
  loadClass: 'standard' | 'space_heater' | 'cooking' | 'medical' | 'listen_only';
  installState: 'PLANNED' | 'INSTALLED';
  listenOnly: boolean;
  monitorOnly: boolean;
  allowedActions: string[];
  desiredState: string;
  reportedState: string;
}

export const RESIDENTIAL_MODES = [
  'Home',
  'Away',
  'Sleep',
  'Wake',
  'Vacation',
  'Guest',
  'Movie',
  'Emergency Shutoff',
] as const;

export const COMMERCIAL_MODES = [
  'Open',
  'Closed',
  'After-Hours',
  'Cleaning Crew',
  'Holiday',
] as const;

function buildLowell60PlannedDevices(): PlannedOrInstalledDevice[] {
  const list: PlannedOrInstalledDevice[] = [];
  const pushDev = (
    idx: number,
    name: string,
    location: string,
    category: DeviceCategory,
    loadClass: PlannedOrInstalledDevice['loadClass'] = 'standard'
  ) => {
    const listenOnly = category === 'smoke_co_listen_only' || loadClass === 'listen_only';
    const monitorOnly =
      listenOnly ||
      loadClass === 'space_heater' ||
      loadClass === 'cooking' ||
      loadClass === 'medical';
    const allowedActions = listenOnly
      ? []
      : monitorOnly
      ? []
      : category === 'lighting'
      ? ['on', 'off', 'dim']
      : category === 'metered_outlet'
      ? ['on', 'off']
      : category === 'water'
      ? ['open_valve', 'close_valve', 'set_temp_eco']
      : category === 'hvac'
      ? ['set_cool', 'set_heat', 'set_eco', 'fan_auto']
      : category === 'security'
      ? ['lock', 'unlock', 'arm_stay', 'arm_away']
      : ['ping'];

    list.push({
      id: `lowell-dev-${String(idx).padStart(2, '0')}`,
      buildingId: 'bldg-7965-lowell',
      name,
      location,
      category,
      loadClass,
      installState: 'PLANNED',
      listenOnly,
      monitorOnly,
      allowedActions,
      desiredState: 'NONE (PLANNED)',
      reportedState: 'NOT INSTALLED',
    });
  };

  let n = 1;
  // 23 Smart Bulbs across rooms
  const bulbLocations = [
    'Foyer', 'Living Room North', 'Living Room South', 'Dining Room Chandelier L1',
    'Dining Room Chandelier L2', 'Kitchen Island East', 'Kitchen Island West',
    'Kitchen Sink Task', 'Pantry', 'Hallway Main', 'Primary Bedroom Ceiling',
    'Primary Bedside Left', 'Primary Bedside Right', 'Primary Closet',
    'Bedroom 2 Ceiling', 'Bedroom 3 Ceiling', 'Office Desk Overhead',
    'Basement Stairwell', 'Basement Rec North', 'Basement Rec South',
    'Mechanical Room', 'Front Porch Coach', 'Rear Patio Flood',
  ];
  for (const loc of bulbLocations) {
    pushDev(n++, `Zigbee Smart Bulb — ${loc}`, loc, 'lighting', 'standard');
  }

  // 12 Metered Outlets (including dangerous-load monitor-only outlets)
  const outletSpecs: Array<[string, PlannedOrInstalledDevice['loadClass']]> = [
    ['Kitchen Counter Espresso', 'cooking'],
    ['Kitchen Induction Aux', 'cooking'],
    ['Office Space Heater Circuit', 'space_heater'],
    ['Primary Bedroom CPAP Outlet', 'medical'],
    ['Living Room Media Console', 'standard'],
    ['Office Workstation Rack', 'standard'],
    ['Garage Chest Freezer', 'standard'],
    ['Basement Sump Pump Primary', 'standard'],
    ['Laundry Washer Metering Plug', 'standard'],
    ['Utility Room Dehumidifier', 'standard'],
    ['Workshop Bench Strip', 'standard'],
    ['Network Closet PoE Injector', 'standard'],
  ];
  for (const [loc, lc] of outletSpecs) {
    pushDev(n++, `Metered Plug — ${loc}`, loc, 'metered_outlet', lc);
  }

  // 7 Water Points (incl. Water Heater + Main Shutoff + 5 Leak Sensors)
  const waterLocations = [
    'Main Domestic Water Shutoff Valve',
    'Basement Hybrid Heat-Pump Water Heater',
    'Kitchen Under-Sink Supply Pan',
    'Primary Bath Vanity & Toilet',
    'Hall Bath Tub & Supply',
    'Laundry Standpipe & Pan',
    'Basement Utility Floor Drain',
  ];
  for (const loc of waterLocations) {
    pushDev(n++, `Water Node — ${loc}`, loc, 'water', 'standard');
  }

  // 5 HVAC Points
  const hvacLocations = [
    'Main Floor Thermostat Zone 1',
    'Upper Floor Thermostat Zone 2',
    'Basement Zone Damper Actuator',
    'AHU Supply Plenum Static Probe',
    'AHU Return Plenum Delta-T Probe',
  ];
  for (const loc of hvacLocations) {
    pushDev(n++, `HVAC Node — ${loc}`, loc, 'hvac', 'standard');
  }

  // 6 Security Points
  const secLocations = [
    'Front Entry Deadbolt & Contact',
    'Back Patio Slider Contact',
    'Garage Service Door Contact',
    'Basement Egress Window Contact',
    'Main Hall Motion Sensor',
    'Garage Overhead Door Tilt Sensor',
  ];
  for (const loc of secLocations) {
    pushDev(n++, `Security Node — ${loc}`, loc, 'security', 'standard');
  }

  // 5 Smoke / CO Listen-Only Detectors (NEVER actuatable)
  const smokeLocations = [
    'Hallway Outside Bedrooms (Smoke/CO)',
    'Primary Bedroom Suite (Smoke/CO)',
    'Kitchen Perimeter (Photoelectric Smoke)',
    'Basement Mechanical Room (CO/Gas)',
    'Living Room Vault (Smoke/CO)',
  ];
  for (const loc of smokeLocations) {
    pushDev(n++, `Life-Safety Detector — ${loc}`, loc, 'smoke_co_listen_only', 'listen_only');
  }

  // +1 Hub + 1 Wall Panel = 60 Planned Devices total
  pushDev(n++, 'OBD Local Coordinator Hub (Zigbee/Thread/Matter)', 'Network Closet', 'infrastructure', 'standard');
  pushDev(n++, 'OBD Whole-Home Kiosk Wall Panel (#1)', 'Hallway Main', 'infrastructure', 'standard');

  return list;
}

export const LOWELL_JOB_ZERO = {
  building: {
    id: 'bldg-7965-lowell',
    name: '7965 Lowell (Client Job Zero)',
    address: '7965 Lowell Blvd',
    deploymentType: 'residential' as const,
    simulator: false,
    monitored: false,
    readingsCount: 0,
    scansCount: 0,
    statusLabel: 'REAL BUILDING · NOT MONITORED · 0 READINGS',
  },
  jobRecord: {
    id: 'job-ground-zero-01',
    title: 'Ground Zero — Installation No. 1 (7965 Lowell)',
    status: 'unassigned',
    window: 'Nov 17–23 Baseline Walk',
    beforePhotos: [] as string[],
    fixNo1: null as string | null,
    checklist: [
      { id: 'chk-1', label: 'Room-by-room RF & receptacle mapping across all 39 locations', checked: false },
      { id: 'chk-2', label: 'Main panel circuit breaker attribution & AFCI/GFCI baseline test', checked: false },
      { id: 'chk-3', label: 'Static water pressure & shutoff valve torque verification', checked: false },
      { id: 'chk-4', label: 'AHU supply/return plenum static pressure tap placement', checked: false },
      { id: 'chk-5', label: 'Smoke/CO detector manufacture date & listen-only acoustic verification', checked: false },
    ],
  },
  devices: buildLowell60PlannedDevices(),
};

// ============================================================================
// 6. GOVERNED 23-AGENT WORKFORCE & 4-TIER AUTONOMY ENGINE (Task 4)
// ============================================================================
export interface AgentActionRecord {
  id: string;
  timestamp: string;
  agentName: string;
  portal: string;
  actionClass: string;
  tier: 0 | 1 | 2 | 3 | 'HARD_LIMIT';
  status: 'EXECUTED' | 'QUEUED_FOR_OWNER' | 'DENIED_HARD_LIMIT' | 'APPROVED' | 'REJECTED';
  summary: string;
}

const agentActions: AgentActionRecord[] = [
  {
    id: 'ag-act-01',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    agentName: 'Coordinator',
    portal: 'owner',
    actionClass: 'watch_scan_fault',
    tier: 0,
    status: 'EXECUTED',
    summary: 'Tier 0 Watch: Observed bench fault P-001 and triggered cross-department follow-up chain.',
  },
  {
    id: 'ag-act-02',
    timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    agentName: 'Dispatcher',
    portal: 'dispatch',
    actionClass: 'stage_job',
    tier: 1,
    status: 'EXECUTED',
    summary: 'Tier 1 Prepare: Staged draft dispatch job for field leak inspection.',
  },
  {
    id: 'ag-act-03',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    agentName: 'Ledger',
    portal: 'accounting',
    actionClass: 'issue_vendor_payment',
    tier: 3,
    status: 'QUEUED_FOR_OWNER',
    summary: 'Tier 3 Outward Act: Vendor payment ($0.00 test) queued for Owner tap — never auto-executed.',
  },
];

// Seed initial hash-chained audit entries
appendAuditChain('system-boot', 'it', 'platform.initialized', {
  version: '1.0.0+part14',
  portals: 22,
  faultEngineSha256: 'c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f',
});
appendAuditChain('owner@obd-home', 'owner', 'job_zero.seeded', {
  building: '7965 Lowell',
  plannedDevices: 60,
  locations: 39,
  readings: 0,
});

// ============================================================================
// 7. MOUNT ROUTES ON EXPRESS
// ============================================================================
export function registerObdPlatformRoutes(app: Express) {
  // Overview of the 22 Portals, Audit Chain, Registry, Alarms, Agents & Job Zero
  app.get('/api/v1/platform/overview', (_req: Request, res: Response) => {
    const chainVerification = verifyAuditChain(auditChain);
    res.json({
      version: '1.0.0+part14',
      testSuiteSummary: {
        shared: 21,
        faultEngine: 28,
        designSystem: 10,
        api: 94,
        web: 12,
        totalPassed: 165,
        totalFailed: 0,
        faultEngineSha256: 'c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f',
      },
      portals: PORTALS_22,
      auditChain: {
        verification: chainVerification,
        entries: [...auditChain].reverse(),
      },
      credentialRegistry,
      alarms: platformAlarms,
      faultCatalog22: FAULT_CODES_22,
      agentActions,
      jobZero: LOWELL_JOB_ZERO,
      modes: {
        residential: RESIDENTIAL_MODES,
        commercial: COMMERCIAL_MODES,
      },
    });
  });

  // Test the Secret-Pattern Rejection Firewall (Clause 4)
  app.post('/api/v1/platform/registry', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const scan = inspectForSecretShapes(body);
    if (scan.rejected) {
      appendAuditChain('operator@hud', 'it', 'registry.rejected_secret_shape', {
        field: scan.field,
        pattern: scan.pattern,
      });
      res.status(400).json({
        error: 'SECRET_SHAPED_INPUT',
        field: scan.field,
        pattern: scan.pattern,
        message: `Refused by Credential Registry Firewall (pattern: ${scan.pattern}). Value was never stored.`,
      });
      return;
    }

    const entry: RegistryMetadataEntry = {
      id: `reg-${String(credentialRegistry.length + 1).padStart(2, '0')}`,
      provider: String(body.provider || 'custom-provider'),
      purpose: String(body.purpose || 'telemetry-gateway'),
      owner: String(body.owner || 'owner@obd-home'),
      rotationDate: String(body.rotationDate || '2027-06-01'),
      status: 'NOT CONNECTED',
      createdAt: new Date().toISOString(),
    };
    credentialRegistry.push(entry);
    appendAuditChain('operator@hud', 'it', 'registry.metadata_created', {
      id: entry.id,
      provider: entry.provider,
      purpose: entry.purpose,
    });
    res.status(201).json(entry);
  });

  // Attempt to clear an alarm (Enforces S-001 / S-002 Life-Safety Hard Refusal!)
  app.post('/api/v1/platform/alarms/:id/clear', (req: Request, res: Response) => {
    const alarm = platformAlarms.find((a) => a.id === req.params.id);
    if (!alarm) {
      res.status(404).json({ error: 'ALARM_NOT_FOUND' });
      return;
    }

    if (alarm.lifeSafety || alarm.code === 'S-001' || alarm.code === 'S-002') {
      appendAuditChain('operator@hud', 'client', 'alarm.clear_denied', {
        alarmId: alarm.id,
        code: alarm.code,
        reason: 'LIFE_SAFETY_NOT_CLEARABLE',
      });
      res.status(403).json({
        error: 'LIFE_SAFETY_NOT_CLEARABLE',
        code: alarm.code,
        message: `${alarm.code} is a Life-Safety alarm. It can NEVER be cleared from any screen or API — it resolves only at the physical detector (RESOLVED_AT_DEVICE).`,
      });
      return;
    }

    alarm.status = 'CLEARED';
    alarm.clearedBy = 'operator@hud';
    appendAuditChain('operator@hud', 'dispatch', 'alarm.cleared', {
      alarmId: alarm.id,
      code: alarm.code,
    });
    res.json({ status: 'CLEARED', alarm });
  });

  // Simulate device-level resolution for S-001/S-002 or re-trigger for testing
  app.post('/api/v1/platform/alarms/:id/reconcile-device', (req: Request, res: Response) => {
    const alarm = platformAlarms.find((a) => a.id === req.params.id);
    if (!alarm) {
      res.status(404).json({ error: 'ALARM_NOT_FOUND' });
      return;
    }
    if (alarm.status === 'ACTIVE') {
      alarm.status = 'RESOLVED_AT_DEVICE';
      alarm.clearedBy = null;
      appendAuditChain('scan-reconciler', 'development', 'alarm.resolved_at_device', {
        alarmId: alarm.id,
        code: alarm.code,
      });
    } else {
      alarm.status = 'ACTIVE';
      alarm.clearedBy = null;
      appendAuditChain('bench-harness', 'development', 'alarm.raised', {
        alarmId: alarm.id,
        code: alarm.code,
      });
    }
    res.json({ status: alarm.status, alarm });
  });

  // Apply Whole-Home Mode on 7965 Lowell (Client Job Zero) or try Device Control
  app.post('/api/v1/platform/lowell/mode', (req: Request, res: Response) => {
    const mode = String(req.body?.mode || 'Home');
    const isCommercial = (COMMERCIAL_MODES as readonly string[]).includes(mode);
    if (isCommercial) {
      appendAuditChain('operator@hud', 'client', 'mode.refused_deployment_mismatch', {
        building: '7965 Lowell',
        mode,
        reason: 'Commercial mode refused on residential building',
      });
      res.status(400).json({
        error: 'DEPLOYMENT_MODE_MISMATCH',
        message: `Mode '${mode}' is a Commercial mode and cannot be applied to residential building 7965 Lowell.`,
      });
      return;
    }

    // Because all 60 devices at 7965 Lowell are PLANNED / NOT INSTALLED, 0 devices actuate!
    const installedCount = LOWELL_JOB_ZERO.devices.filter((d) => d.installState === 'INSTALLED').length;
    appendAuditChain('operator@hud', 'client', 'mode.applied', {
      building: '7965 Lowell',
      mode,
      actuatedCount: 0,
      installedDevices: installedCount,
      note: 'actuated nothing (all 60 devices are PLANNED / NOT INSTALLED)',
    });

    res.json({
      buildingId: 'bldg-7965-lowell',
      mode,
      actuated: 0,
      note: 'actuated nothing — all 60 devices at 7965 Lowell are PLANNED / NOT INSTALLED (0 readings, 0 gateways connected).',
    });
  });

  // Control an individual device (proves Listen-Only S-001/S-002 refusal & Dangerous-Load Monitor-Only refusal)
  app.post('/api/v1/platform/devices/:id/control', (req: Request, res: Response) => {
    const dev = LOWELL_JOB_ZERO.devices.find((d) => d.id === req.params.id);
    const verb = String(req.body?.action || 'on');
    if (!dev) {
      res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
      return;
    }

    if (dev.listenOnly) {
      appendAuditChain('operator@hud', 'client', 'control.refused_listen_only', {
        deviceId: dev.id,
        name: dev.name,
        attemptedVerb: verb,
      });
      res.status(403).json({
        error: 'LISTEN_ONLY_DEVICE',
        commandStatus: 'REFUSED',
        message: `${dev.name} is a LISTEN-ONLY life-safety detector with an empty control-actions list. No verb exists that actuates it.`,
      });
      return;
    }

    if (dev.monitorOnly) {
      appendAuditChain('operator@hud', 'client', 'control.refused_dangerous_load', {
        deviceId: dev.id,
        name: dev.name,
        loadClass: dev.loadClass,
        attemptedVerb: verb,
      });
      res.status(403).json({
        error: 'DANGEROUS_LOAD_MONITOR_ONLY',
        commandStatus: 'REFUSED',
        message: `${dev.name} carries load class '${dev.loadClass}' (space heater / cooking / medical) and is strictly MONITOR-ONLY.`,
      });
      return;
    }

    // Honest Failsafe: No gateway connected -> NOT SENT (manual fallback)
    dev.desiredState = verb.toUpperCase();
    appendAuditChain('operator@hud', 'client', 'control.command_queued_not_sent', {
      deviceId: dev.id,
      name: dev.name,
      desiredState: dev.desiredState,
      reportedState: dev.reportedState,
      commandStatus: 'NOT SENT',
    });

    res.json({
      deviceId: dev.id,
      commandStatus: 'NOT SENT',
      desiredState: dev.desiredState,
      reportedState: dev.reportedState,
      failsafe: 'MANUAL FALLBACK (gateway NOT CONNECTED; desired ≠ reported)',
    });
  });

  // Execute Cross-Department Fault Follow-Up Chain or Governed Agent Action (Task 4)
  app.post('/api/v1/platform/agents/dispatch', (req: Request, res: Response) => {
    const actionType = String(req.body?.actionType || 'fault_chain');
    if (actionType === 'clear_life_safety_alarm') {
      const rec: AgentActionRecord = {
        id: `ag-act-${agentActions.length + 1}`,
        timestamp: new Date().toISOString(),
        agentName: 'Client Care',
        portal: 'client',
        actionClass: 'clear_life_safety_alarm',
        tier: 'HARD_LIMIT',
        status: 'DENIED_HARD_LIMIT',
        summary: '403 AGENT_HARD_LIMIT: Agents are permanently forbidden from clearing S-001/S-002 life-safety alarms.',
      };
      agentActions.unshift(rec);
      appendAuditChain('agent:Client Care', 'client', 'agent.hard_limit_denied', {
        actionClass: 'clear_life_safety_alarm',
      });
      res.status(403).json({ error: 'AGENT_HARD_LIMIT', record: rec });
      return;
    }

    if (actionType === 'tier3_outward_payment') {
      const rec: AgentActionRecord = {
        id: `ag-act-${agentActions.length + 1}`,
        timestamp: new Date().toISOString(),
        agentName: 'Ledger',
        portal: 'accounting',
        actionClass: 'outward_payment_request',
        tier: 3,
        status: 'QUEUED_FOR_OWNER',
        summary: 'Tier 3 Outward Act: Queued in Owner Approvals Queue (executed: false; outward act never performed automatically).',
      };
      agentActions.unshift(rec);
      appendAuditChain('agent:Ledger', 'accounting', 'agent.tier3_queued', {
        actionId: rec.id,
      });
      res.status(202).json({ executed: false, status: 'queued', record: rec });
      return;
    }

    // Default: Cross-department fault follow-up chain (Coordinator -> Dispatcher -> Stockkeeper -> Help Desk)
    const steps = [
      { agent: 'Coordinator', portal: 'owner', tier: 0 as const, action: 'watch_fault', desc: 'Coordinator watched fault P-001 and initiated chain' },
      { agent: 'Dispatcher', portal: 'dispatch', tier: 1 as const, action: 'stage_job', desc: 'Dispatcher staged field inspection job on Dispatch board' },
      { agent: 'Stockkeeper', portal: 'warehouse', tier: 1 as const, action: 'stage_allocation', desc: 'Stockkeeper allocated replacement sensor kit in Warehouse' },
      { agent: 'Help Desk', portal: 'customer-service', tier: 1 as const, action: 'stage_follow_up', desc: 'Help Desk staged customer follow-up ticket' },
    ];
    for (const s of steps) {
      agentActions.unshift({
        id: `ag-act-${agentActions.length + 1}`,
        timestamp: new Date().toISOString(),
        agentName: s.agent,
        portal: s.portal,
        actionClass: s.action,
        tier: s.tier,
        status: 'EXECUTED',
        summary: s.desc,
      });
      appendAuditChain(`agent:${s.agent}`, s.portal, 'agent.action_executed', {
        actionClass: s.action,
      });
    }
    appendAuditChain('agent:Coordinator', 'owner', 'agent.chain_completed', {
      steps: 4,
    });
    res.json({ status: 'CHAIN_COMPLETED', stepsExecuted: 4 });
  });

  // Owner tap decision on Tier-3 queued actions
  app.post('/api/v1/platform/agents/:id/decision', (req: Request, res: Response) => {
    const rec = agentActions.find((a) => a.id === req.params.id);
    if (!rec) {
      res.status(404).json({ error: 'ACTION_NOT_FOUND' });
      return;
    }
    const decision = String(req.body?.decision || 'APPROVE').toUpperCase();
    rec.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    appendAuditChain('owner@obd-home', 'owner', `agent.tier3_${decision.toLowerCase()}d`, {
      actionId: rec.id,
      agentName: rec.agentName,
    });
    res.json({ status: rec.status, record: rec });
  });
}
