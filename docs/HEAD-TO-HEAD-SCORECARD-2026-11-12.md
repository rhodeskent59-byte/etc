# HEAD-TO-HEAD SCORECARD — Current System vs Engine B (OBD-Core-Py)
**Date:** Nov 12, 2026 · **Prepared by:** Chappie, from firsthand verification only
**The question (Kent, Nov 12):** run a second system beside ours, compare, and pick the best end product.

Both systems hold the IDENTICAL Ground Zero truth today: 7965 Lowell Blvd, 39 locations,
60 devices PLANNED / 0 installed, building NOT MONITORED, Job No. 1 OPEN, 0 orders, $0 revenue.

---

## SIDE A — The current system (TypeScript platform)

**Status:** LIVE — the system in daily use. 5 services, watchdog self-recovery (proved 3× on Nov 12
after machine replacements), daily backup rotation live. **Tests: 269/269 green** (canonical repo run,
re-run Nov 12). Security headers + CSP verified on both edges; unauthenticated API = 401;
forged test-mode payment event = 401 with orders still 0.

**Strengths**
- Operational maturity: built, running, recovered, backed up — today, not in theory.
- Rich SPA dashboards (the 22 portals as interactive apps), one shared TypeScript type system
  across shared packages, API, fault engine (@obd/fault-engine v0.3.0) and web.
- Audit log is database-backed, hash-linked (prevHash), WITH a built-in recompute verifier.
  (Argon's head-to-head bullet claiming "flat-file JSONL concurrency hazards" is WRONG — checked
  in source Nov 12: apps/api/src/audit.ts. Corrected here.)

**Verified gaps (Job 4 source review, all confirmed in code, none fixed yet)**
1. `PRAGMA foreign_keys` is never set → OFF on every connection; orphan records possible.
2. Telemetry ingest has NO finite/range validation — garbage values can poison health scores.
3. Telemetry has NO install-state check — readings could be recorded against PLANNED devices.
4. TOTP has no used-code tracking — a code is reusable inside its ±1-step window.
5. Services run as root (OPEN BY KENT'S DECISION — the obd-svc migration is staged for pre-launch).
6. Cross-portal authorization is proven for one account's door scoping, not a full 22×22 matrix.

## SIDE B — Engine B (Python 3.12 + FastAPI, Argon's clean-room build)

**Status:** BUILT and VERIFIED — **18/18 tests green** (7 chunk suites, run locally Nov 12) and
**RUNNING NOW on http://127.0.0.1:8897**, seeded with the same Ground Zero. Live-verified Nov 12:
health 200 (all 6 pragmas on both DBs), Owner + Client sign-in with MFA, Dispatch direct sign-in,
billing summary 0/0/0, current system untouched on :8080.

**Strengths — the four Side A code gaps are closed by database design, not by convention**
1. foreign_keys ON, verified on every connection at startup (refuses to serve on mismatch).
2. Telemetry bounds table (10 metrics) + API finite check + DB trigger — 9000°F rejected, 72°F accepted.
3. DB trigger blocks telemetry against PLANNED devices outright (proven in tests AND live design).
4. TOTP used-codes table — the same code a second time is rejected (replay test green).
- Plus: audit chain append-only at the trigger level with an offline-tamper test that names the
  edited row; life-safety alarms cannot be cleared at API or DB layer; Ed25519 session tokens with
  server-side revocation; server-rendered portals (another portal's markup/data never ships to your
  browser); dedicated `obdsvc` service units delivered hardened (User=obdsvc, UMask=0027,
  ProtectSystem=strict) — delivered, NOT installed (pre-launch gate is Kent's).

**Weaknesses / honest costs**
- One day old: zero operational history, no watchdog mileage, no real-world load.
- Server-rendered UI: same approved carbon/honeycomb look (Kent approved Nov 12), but plainer and
  less interactive than the SPA.
- A second language (Python) to maintain beside TypeScript.
- Delivery friction on Chappie's side of the ledger: Argon's first test files deadlocked
  (cross-event-loop flaw — repaired in Job 13, all assertions kept), and the README reached disk
  truncated; its honest-status + runbook sections were completed by Chappie from Argon's own
  quoted text (disclosed, verified statements only).
- Argon's "377/377 tests" line for Side A is the whole-workspace grouping; the canonical platform
  figure is 269/269. Both green at their scope.

## CHAPPIE'S RECOMMENDATION

**Run both.** Keep the current system as the primary — it is live, proven, and the one the
business runs on. Keep Engine B running beside it on :8897 as the hardened reference implementation.
Before go-live, port Engine B's four fixes into the current system (foreign_keys pragma, telemetry
validation, install-state check, TOTP used-codes) — each is a small, well-understood change, and
Engine B now exists as the working proof of each pattern. Revisit the primary-system call after
Engine B has real operating hours on it.

**The end-product call is Kent's.** Scoreboard either way: 0 kits / 0 members / $0 — approval
and architecture are not sales.
