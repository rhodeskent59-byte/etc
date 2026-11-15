# Eco Tech Corp — Building OBD: Copilot Brief

Uploaded Nov 14, 2026 at the owner's direction so GitHub Copilot has the full
software picture in one place. This repo does not yet mirror the live code —
these are the design, review, and status documents. No credentials, keys, or
customer data are included, by design.

## What this is

Eco Tech Corp (ETC) builds **Building OBD**: building monitoring and
diagnostics (NOT vehicle OBD). A house or small building gets sensors and a
hub; the system watches for faults (freeze risk, leaks, HVAC, power, air
quality), scores building health, and produces a written Health Scan report.
It is never marketed as a fire or burglar alarm system.

## The two codebases (same product, built twice)

- **Side A** — TypeScript platform (`obd-home-systems-platform`): API, edge,
  demo, panel services; SQLite `platform.db`; 22 fault codes in its fault
  engine (the only place the deterministic 22-code registry lives).
- **Engine B** — Python/FastAPI (`OBD-Core-Py`): dual SQLite with triggers,
  hash-chained audit log, Ed25519 JWTs, Argon2id, TOTP replay protection,
  22 portals, test-mode payments.
- Verdict (see HEAD-TO-HEAD-SCORECARD): **run both**. Side A has the fault
  registry; Engine B has the stronger security and audit design.

## Documents in this folder

- `ARCHITECTURE-REVIEW-2026-11-13.md` — senior-engineer review of both
  codebases: data flow, duplication, bottlenecks, risks. Start here.
- `HEAD-TO-HEAD-SCORECARD-2026-11-12.md` — Side A vs Engine B scoring.
- `CATALOG-2026-11-12.json` — approved product catalog (29 items): Home Core
  $1,413.64, Health Scan $249/$149/$99, memberships, labeling service.
- `MERGED-VERDICT-JOBS-10-12-2026-11-12.md` — merged research verdict:
  channel/trust/service wins, collapse 22 portals to 4, rules-first fault
  detection (AI narrates only).
- `30-DAY-SWARM-CONSOLIDATED-REPORT.md` + `30-DAY-SWARM-HANDOFF.md` —
  30-day plan verification against live state; 13 open decisions (D1–D13).
- `ADVANCEMENT-HUNT-REPORT-2026-11-13.md` — verified findings: 5 new fault
  codes (A-201, S-201, P-102, H-102, N-005), honesty holes HOLE-2…HOLE-6,
  security probes (6 of 10 breached staging copies: P01, P03, P04, P07, P09,
  P10), performance fix, label module proof-of-concept.
- `FRONTDOOR-KIT-REVIEW-2026-11-14.md` — front-door security kit code review
  (hub, BLE bridge, Blink bridge, agent) and its two known bugs.
- `LOWELL-FIBER-TOPOLOGY-SPEC.md` — the reference home's fiber network
  build spec ($2,800.50 total, phased; nothing bought yet).
- `NIGHTLY-LOOP-LOG-2026-11-13.md` — first nightly build-loop run: issues
  #1 (SQLite foreign keys) and #2 (telemetry validation) built, Side A suite
  269 → 285 green.
- `BUILDING-OBD-SOFTWARE-V3-CODE-2026-11-12.txt` — Side A v3 code snapshot
  (Nov 12) in a single readable file.

## Honest current state (Nov 14, 2026)

- Scoreboard: **0 kits sold, 0 members, $0 revenue.** Payments in test mode.
- Reference house: 60 devices planned, **0 installed**, 0 telemetry readings.
  The house is NOT monitored yet.
- Tests: Side A 285 green (working tree), Engine B 41 green.
- Build queue: 15 GitHub issues, all labeled ready; the nightly loop works
  the top 2 each night; merges need the owner's "ship it".
- Known worst holes: HOLE-1 (Engine B honesty.py hardcodes simulated=0),
  HOLE-4 (client portal "house not monitored" badge is hardcoded text),
  P07 (portal scoping), P09 (proposal approve lacks state check),
  P10 (TOTP secrets plaintext in state.db). All are tracked as issues.

## Rules that govern this project

- Real data only: simulated/example numbers are labeled in place.
- A named human approves every real-money sell.
- Never market the system as a fire or burglar alarm.
- Catalog prices were owner-approved Nov 11, 2026; do not reprice from
  competitor reports (competition intel never changes prices on its own).
