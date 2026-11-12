# OBD Home Systems — Platform

The software platform for OBD Home Systems (building diagnostics: fault codes,
live readings, health scans, reports — HVAC, electrical at plug/load level,
plumbing/water, structure, air quality, life safety). Built from the OBD Home
Systems Master Engineering Prompt Pack in gated tasks.

**Status: v1.0.0 RELEASED (local deployment) — TASKS 1–6 COMPLETE
(Foundations, Core platform + money path, the 22 portals working
against the core, Master Admin + the governed AI agent workforce,
packaging, hardening + handover). 146/146 tests green in the repo and
in a clean clone at tag v1.0.0. POST-RELEASE (Nov 9, 2026, owner's
direct order): PART 14 FOLDED IN — whole-home control, the modes
engine, the wall-panel view, the commercial deployment mode, and
CLIENT JOB ZERO (7965 Lowell stood up as a real client job in the
live data store). Suite now 165/165 green; see "What Part 14 added". The independent penetration test is
NOT DONE — this release is for the owner's own VM only (see
docs/NOT-BUILT.md). GATE 1 APPROVED by owner direction (Nov 9, 2026).
GATE 2 APPROVED by the owner (Kent, Nov 9, 2026 19:05 MST: "Go").
GATES 3, 4, 5, 6 APPROVED by owner standing direction (Nov 9, 2026:
"Approve all gates" / "Approve and build everything" / "No more
approval needed") — recorded as each gate is reached. The platform is
LIVE on the VM host behind a Caddy edge at http://127.0.0.1:8080
(host-local; no public hostname yet). There is NO GitHub remote — the
connected GitHub integration cannot create repositories (403), so all
commits are local until the owner creates the empty repo; hosted CI has
never run (UNVERIFIED). Going live changed hosting only: every portal
still reads NOT CONNECTED and opens on an honest empty state — no live
system is connected and no building is monitored. The money path is
TEST-MODE-ONLY; there are still no confirmed prices and no chosen
payment provider — those are owner decisions (Part 13 worksheet, still
blank).**

## What Task 1 built

| Piece | Where | What it does |
|---|---|---|
| Monorepo | `packages/`, `apps/` | npm workspaces: shared, fault-engine, design-system, api, web |
| Design system (Part 3) | `packages/design-system` | Tokens as code (carbon black, machined silver, one orange #FF7A1A), carbon-weave + honeycomb textures, health badges, skeleton states, command bar, portal shell rendering in dark AND light |
| Portal registry | `packages/shared` | All 22 doors (Client, Owner, Dispatch, Install Tech, Sales, Warehouse, Production, Manufacturing, Accounting, Office, Corporate, Field Crews, IT, Advertising, Marketing, HR, Employees, Project Management, Public Relations, Customer Service, Legal, Development), each with audience, MFA flag, honest NOT CONNECTED status |
| Identity service | `apps/api` | OIDC-shaped local IdP (discovery document, JWT sessions), scrypt password hashing, TOTP MFA (RFC 6238) enforced on the seven sensitive portals, per-portal RBAC grants, cross-portal denial |
| Audit log | `apps/api/src/audit.ts` | Append-only JSONL, SHA-256 hash-chained, with chain verification and tamper detection |
| Credential registry | `apps/api` (`/api/registry`) | Metadata ONLY (provider, purpose, owner, rotation date, status) behind a secret-pattern rejection firewall — secret-shaped input is refused and the refusal is audited. No secret value can be stored |
| Portal shell | `apps/web` | React/Vite app: 22-door grid, per-portal sign-in screens, MFA step, portal home on the honest empty state, dark/light theme persisted |
| Diagnostics core | `packages/fault-engine` | The v0.3.0 fault engine (22 codes: H4/E4/P4/S4/A3/N3) integrated **byte-identical, unmodified** — sha256 `c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f`, equal to the v0.3.0 source |
| CI | `.github/workflows/ci.yml` | Install → type-check → build → test on push/PR (hosted-run status: see VERIFICATION.md "Live deployment") |
| Deployment | `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `docs/DEPLOYMENT-ARCHITECTURE.md` | Multi-stage OCI image (slim, non-root, /health HEALTHCHECK); Caddy edge (compression, security headers, immutable hashed-asset cache) in front of the stateless API; SQLite WAL behind PlatformDb today, Postgres swap point documented. On hosts without a container runtime, `scripts/deploy-local.sh` runs the identical units as processes |

## What Task 2 built

| Piece | Where | What it does |
|---|---|---|
| Data model / point DB | `apps/api/src/db.ts` | Buildings (real/simulator), gateways, points, readings, scans, alarms, deliveries, reports, products, orders, payment events — all behind PlatformDb |
| Gateway service | `apps/api/src/gateways.ts` | MQTT + BACnet/IP + Modbus drivers behind one interface, all honestly **NOT CONNECTED** (ingest refuses — no fake telemetry); a labeled BENCH HARNESS driver for the bench pass; a simulator ingest path whose SIMULATOR flag is derived from the building record, so simulator data provably never merges with a real building's records |
| Trend engine | `apps/api/src/telemetry.ts` | Fixed-bucket trends that are gap-honest: missing data returns null + an explicit gap range, never an interpolated reading |
| Scan / health engine | `apps/api/src/scans.ts` | Snapshots stored readings, runs the byte-identical v0.3.0 fault library, persists the full scan record; the numeric score is a labeled DESIGN DEFAULT mapping |
| Alarm engine | `apps/api/src/alarms.ts` | Scan-raised alarms with platform-console delivery records (external delivery: NOT CONNECTED). **Life-safety rule in code: S-001/S-002 can never be cleared through any API** — the clear path throws, the refusal is audited, and those alarms resolve only at the device via scan reconciliation (RESOLVED_AT_DEVICE) |
| Report generator | `apps/api/src/reports.ts` | Generates ONLY from a stored scan record for the same building — no record, no report (409 REPORT_REQUIRES_RECORD) |
| Money path | `apps/api/src/commerce.ts`, `payments.ts` | Product catalog (prices PROPOSED or UNPRICED only), orders (total computed or honestly absent), manual/comp checkout labeled as no-charge records, and payments in **TEST MODE ONLY**: a provider-agnostic interface + test-mode adapter behind the credential registry (metadata only). An order reaches `paid` only via a session-matching provider confirmation event, badged SIMULATOR — no real provider is connected, the payment-door decision is still open |

## What Task 3 built

| Piece | Where | What it does |
|---|---|---|
| Record-kind registry | `packages/shared/src/operations.ts` | ~48 record kinds covering every operation listed for the 22 portals in the pack (Parts 4–6): who may create/view/act on each kind, its row-scope rule, its status transition map, and which kinds are owner-approval-gated before publication |
| Portal operations | `apps/api/src/portals.ts` + `/api/portals/:slug/*` | Every portal is a working surface: a workspace fed by the core (records + per-portal core views), record create/transition operations with server-side role, tenant, and building scoping on every request, and an owner approvals queue. Quotes snapshot totals from the product record and invoices from the order record — totals are never typed in. A portal with nothing reads "connected to core, no data", never a simulated feed |
| Tenant scoping | `apps/api/src/app.ts` (core routes) | A Client-door session sees only buildings it holds access to — list, detail, trends, scans, alarms, reports all filtered or refused (403 BUILDING_NOT_GRANTED); clients run scans and generate reports only on their own buildings |
| Access administration | `/api/admin/*` + `/api/audit/entries` | Owner/IT doors provision users, grant/revoke portal access and building access, and export the audit log — every change audited |
| Portal UI | `apps/web` PortalHome | Each portal home renders its live workspace: sections, records with status/simulator/approval badges, transition actions, create form, broadcasts, and per-portal core views (client buildings labeled SIMULATOR / NOT MONITORED). No portal UI offers a clear action for S-001/S-002 |

## What Task 4 built

| Piece | Where | What it does |
|---|---|---|
| Agent workforce | `packages/shared/src/agents.ts` | One named agent per portal (Client Care, Dispatcher, Stockkeeper, Ledger, Docket, …) plus the Coordinator at Master Admin; the 4-tier autonomy model and hard limits as data + a classifier (unclassified actions default to Tier 3) |
| Governed agent engine | `apps/api/src/agents.ts` | Tier 0 Watch / Tier 1 Prepare execute; Tier 2 executes ONLY inside an owner-created, capped, revocable pre-approved class — **zero classes exist (Part 13 blank)**; Tier 3 (sends, payments, filings, publications, price changes, access grants) queues for the owner's tap and the platform never performs the outward act; hard limits (clearing a life-safety alarm, holding credentials, licensed work, signing) are refused outright and recorded as denied |
| Cross-department chain | `runFaultFollowUpChain` | Fault → Coordinator watch → Dispatcher stages a job → Stockkeeper allocates inventory → Help Desk stages the customer follow-up — every step a real record and an audit entry |
| Governed learning | `apps/api/src/agents.ts` | Candidate learnings stage per agent; promotion requires a recorded owner decision and ships a versioned playbook upgrade; one-tap rollback; rejections stay on record. Measured per-agent report (executed/queued/denied/approved counts, playbook version, health) |
| Master Admin | `/api/master-admin/*` + Owner portal UI | Portal health grid (honest NOT CONNECTED statuses + core link), merged operations feed, approvals queue (records + agent actions), broadcasts (owner announcements), portal switches (pausing a portal never touches core alarm functions), tier-2 class management, audit export with chain verification |

## What Part 14 added (post-v1.0.0, Nov 9, 2026)

The product truth widened by the owner's order: OBD Home Systems is a
whole-home monitoring AND control system, with a commercial line.

| Piece | Where | What it does |
|---|---|---|
| Control registry | `packages/shared/src/control.ts` | Device classes for the whole home (lighting, metered outlets, water heater, water, HVAC, security, air quality CO2/VOC) as data. **Smoke and CO are LISTEN-ONLY classes with an EMPTY control-actions list — no verb exists that actuates them.** Dangerous loads (space heater / cooking / medical) are defined here; the 8 residential modes and 5 commercial modes are named intent sets |
| Device + command store | `apps/api/src/db.ts` | `devices` (install state PLANNED/INSTALLED, load class, monitor-only, desired vs reported state kept separate) and `control_commands` (NOT SENT / SENT / APPLIED / REFUSED) tables; buildings gained `deployment_type` (residential \| commercial), migrated in place |
| Control domain | `apps/api/src/control.ts` | THE control path. Listen-only attempts are refused, recorded as REFUSED commands, audited, thrown. Dangerous-load outlets are monitor-only (derived at registration AND re-checked per command). **Failsafe: with no connected gateway a command is recorded NOT SENT — queued, never reported applied — and the device keeps its manual-fallback state**; only the labeled BENCH harness can apply a command. Modes engine: applies intent sets to installed control-capable devices, audits who/what/mode, snapshots alarm states before/after (a mode holds no alarm-writing call and cannot change them) |
| Control API | `apps/api/src/app.ts` | Device register/list/install, device control, mode application, command log, and the control surface (`GET /api/buildings/:id/control`). Writes: field/owner grants, or a Client-door session scoped to its own building (the wall panel's door). Registration/install stay field-only |
| Wall panel | `apps/web` (`#/panel/<id>`) | A kiosk-shaped view on the SAME app, not a fork: health score (or the honest NO SCAN ON RECORD state), the S-001/S-002 life-safety banner pinned with NO clear action anywhere, one-tap modes with results reported verbatim, room control for control-capable installed devices only, a labeled concept PIN gate for arm/disarm-class actions. Panel hardware remains a DESIGN TARGET — none selected |
| Commercial mode | registry + API + panel | `deployment_type: commercial` buildings get the commercial modes (Open, Closed, After-Hours, Cleaning Crew, Holiday) through the same engine; a residential mode on a commercial building (and vice versa) is refused. Commercial pricing stays PROPOSED/UNPRICED — none invented |
| Client Job Zero | `apps/api/src/client-job-zero.ts` + `npm run seed:job-zero -w @obd/api` | 7965 Lowell stood up as a real client job in the data store: a REAL (non-simulator) residential building, the job record "Ground Zero — Installation No. 1" open at `unassigned`, the baseline-walk checklist (Nov 17–23) present and entirely unchecked with before-photos empty and the Fix No. 1 slot empty, and the blueprint plan as 60 planned device records at 39 locations — 58 across the six named categories (23 bulbs, 12 outlets, 7 water points incl. the water heater, 5 HVAC, 6 security, 5 smoke/CO listen-only) plus hub and wall panel. **Every device is PLANNED / NOT INSTALLED; zero readings exist; applying a mode actuates nothing and says so on the record.** Idempotent; asserted by test |

## Quickstart (self-hosted / standalone)

```sh
git clone <this repo> obd-home-systems-platform   # or unpack a release archive
cd obd-home-systems-platform
npm ci && npm run build
scripts/deploy-local.sh start     # edge on http://127.0.0.1:8080
scripts/deploy-local.sh status
```

Then open http://127.0.0.1:8080 — the 22 portal doors. Seed local dev
users with `npm run seed -w @obd/api` (passwords print once; local use
only). On a host with a working container runtime,
`docker compose up -d --build` runs the same units instead. Hosted
mode: set `OBD_DEPLOYMENT_MODE=saas` and provide `OBD_JWT_SECRET`
through the host's secret store — the process refuses to boot without
it (see `apps/api/src/config.ts`). Architecture:
`docs/ARCHITECTURE.md`. Packaging forms and their exact build status:
`packaging/README.md`. Operator procedures: `docs/OPERATOR-RUNBOOK.md`.

## How to run it (development)

Container stack (Docker or Podman, from the repo root):

```bash
export OBD_JWT_SECRET="$(cat .deploy/jwt-secret.txt)"   # host env only — never commit it
docker compose up -d --build     # edge on http://localhost:8080
```

On this VM there is no container runtime socket (see VERIFICATION.md), so
the live deployment runs the identical units as processes:

```bash
scripts/deploy-local.sh start    # platform :8787 + Caddy edge :8080
scripts/deploy-local.sh status
scripts/deploy-local.sh stop
```

Local dev (no container, API-only):

```bash
npm install        # once
npm run build      # builds shared → design-system → api → web
npm test           # full suite: 165 tests

# Seed local dev users (passwords + TOTP secrets print ONCE to stdout;
# only scrypt hashes are stored). Data lives in a local SQLite file.
node apps/api/dist/seed-cli.js

# Identity service on http://127.0.0.1:8787
npm run start -w @obd/api

# Portal shell (dev server; VITE_API_BASE overrides the API origin —
# the production build sets it empty for same-origin hosting)
npm run dev -w @obd/web
```

Environment knobs (all optional): `PORT` (default 8787), `OBD_HOST`
(default `127.0.0.1`; the container sets `0.0.0.0`), `OBD_DATA_DIR`
(default `./data` inside apps/api), `WEB_DIST` (when set, the API process
also serves that built web shell same-origin), `OBD_JWT_SECRET` (dev
secret generated per data dir when unset locally; in deployment it comes
from the host environment only and never belongs in this repo).

## What is NOT built yet

- Live sensor ingestion: the protocol gateways (MQTT, BACnet/IP,
  Modbus) are drivers with an honest NOT CONNECTED status — nothing is
  connected and nothing is monitored. LOWELL IS NOT MONITORED.
- Real payments: the money path runs in TEST MODE ONLY behind the
  credential registry. No payment provider is chosen (Part 13), no keys
  exist, and no real charge is possible in this build.
- Packaging and release items are tracked in `docs/NOT-BUILT.md`
  (Task 5/6): signed desktop installers and Android builds need
  toolchains this VM does not have; the independent penetration test
  is packaged but NOT performed.
- No prices, no Part 13 answers. The deployment above is host-local on
  the VM (no public hostname, no TLS); local substitutions for
  Postgres/Keycloak are recorded as deviations in BUILD-LOG.md — they
  are the pack's local path, not the production shape.

See `BUILD-LOG.md` for what was built, deviations, and failures/fixes, and
`VERIFICATION.md` for the Definition-of-Done evidence, clause by clause.
