# Building OBD — Senior-Engineer Architecture Review

**Date:** November 13, 2026 · **Scope:** read-only code review, no changes made
**Code reviewed:** Side A (TypeScript platform) at `~/workspace/your_files/obd-home-systems-platform/` and Engine B (Python/FastAPI) at `~/workspace/your_files/obd-engine-b/` (project copy verified byte-identical in source to the live tree at `/opt/obd-engine-b` — only generated `egg-info` metadata differs).

---

## The short version, in plain language

You don't have one app with problems. You have **the same app built twice**, in two different programming languages, by two separate efforts — and the two copies never talk to each other. Every feature (sign-in, two-factor codes, tamper-proof audit log, sensor readings, fault detection, health scans, AI workforce, payments, the store) exists **two times**, written two different ways, with two different sets of strengths and two different sets of holes.

- **Engine B (Python) is the careful one.** It checks its database settings on every connection, refuses sensor readings for devices that aren't installed yet, rejects impossible sensor values, and makes two-factor codes impossible to reuse. Its weaknesses are speed (every read and write lines up single-file through one queue) and a few places where the same logic was written twice inside itself.
- **Side A (TypeScript) is the broad one.** It has the real 22-code fault library and the bigger test suite, but it is missing four basic safety checks that Engine B has — including one where a foreign-key safety system was *declared* in the database design but **never switched on**.
- **One genuine honesty bug exists in Engine B** (the "HOLE-1" item): sensor readings that arrive labeled SIMULATOR through the normal API door are stored in the real readings table, and the history view labels *everything* in that table "real." Simulated data can therefore present as real in history. Details and the one-query fix are in §5 and §6.

Nothing in this review changes what the product does. Every recommendation is about making the same behavior safer, faster, or cheaper to maintain.

**Sizes, counted on disk:**

| | Side A | Engine B |
|---|---|---|
| Language | TypeScript / Node 22 | Python 3.12 / FastAPI |
| Main source size | 7,187 lines in `apps/api/src` + 1,728-line web app + shared packages | 14,408 lines in `src/obd` |
| HTTP routes | 77 (all in one file, `app.ts`) | 54 (across 13 router modules) |
| Database | 1 SQLite file (`platform.db`), ~30 tables created inline in code | 2 SQLite files (`state.db` 21 tables + `audit.db`), schema in `.sql` files |
| Tests on disk | ~152 test cases in 24 files | 41 test functions in 16 files (5,538 lines) |

---

## 1. Architecture breakdown

### 1.1 Side A — the TypeScript platform

An npm-workspaces monorepo (`package.json`, workspaces `packages/*` + `apps/*`):

- **`apps/api`** — one Fastify server (`src/server.ts`, 49 lines) that builds the whole app in `src/app.ts` (**1,742 lines, all 77 routes registered inline**). It serves both the JSON API and, when `WEB_DIST` is set, the built web shell same-origin (`src/static-web.ts`).
- **`apps/api/src/db.ts`** — a single `PlatformDb` class, **1,609 lines**: it creates the entire schema with inline `CREATE TABLE IF NOT EXISTS` statements in its constructor and implements every query for every domain (users, buildings, readings, scans, alarms, orders, portal records, agent actions, devices, equipment) as methods on the one class. Storage is Node's built-in synchronous SQLite (`node:sqlite` `DatabaseSync`) in WAL mode.
- **Domain modules** beside it: `scans.ts` (health scans), `alarms.ts`, `control.ts` (579 lines, whole-home device control), `equipment.ts` (597 lines, equipment catalog/packages), `portals.ts` (412, the 22-portal record system), `agents.ts` (425, AI workforce with tiered approvals), `commerce.ts` + `payments.ts` (orders + test-mode payment events), `gateways.ts` (sensor ingest drivers), `telemetry.ts` (trend/gap engine), `firewall.ts` (rejects secret-shaped input to the credential registry).
- **Identity, hand-rolled:** `passwords.ts` (scrypt, 14 lines), `jwt.ts` (a from-scratch HS256 JWT implementation, 65 lines), `totp.ts` (from-scratch base32/HOTP/TOTP on `node:crypto`, 76 lines), `audit.ts` (hash-chained append-only log stored as a JSON Lines **file**, 107 lines).
- **`packages/shared`** — the 22-portal registry (`src/portals.ts`), agent definitions, control/equipment catalogs. **`packages/fault-engine`** — the deterministic fault library as a plain JavaScript file (`fault-engine.mjs`, 186 lines) holding the **22 fault codes** (S-001/S-002 smoke/CO, P-001/P-002/P-101/P-201 plumbing, E-*, H-*, A-*, N-*); the TypeScript API consumes it through a hand-written declaration shim (`apps/api/src/fault-engine.d.ts`). **`packages/design-system`** — UI tokens.
- **Edge:** a `Caddyfile` puts Caddy in front (compression, cache policy, security headers), proxying to the API on port 8787. The same codebase is also run as extra instances for the Lowell demo and mock panel (ports 8788/8090/8901 in deployment).

### 1.2 Engine B — "OBD-Core-Py" (Python/FastAPI)

A single Python package (`src/obd/`, FastAPI + uvicorn, **loopback-only by design** — `create_app` in `src/obd/app.py` refuses to bind a non-`127.0.0.1` host):

- **`src/obd/db/connection.py`** — the heart: a `SingleWriterDbActor` that owns both SQLite connections and serializes **all** database work (reads included) through one `asyncio.Queue`. Every connection is opened with six pragmas applied *and read back to prove they took* — WAL, `synchronous=NORMAL`, `busy_timeout=5000`, **`foreign_keys=ON`**, `trusted_schema=OFF`, `cell_size_check=ON` — and the app refuses to start on any mismatch (`/health` re-verifies and returns 503 if they drift).
- **Schema as SQL files** (`src/obd/db/schema_state.sql`, 472 lines, 21 tables; `schema_audit.sql`) including **database triggers as the final law**: `trg_block_planned_device_telemetry` (a PLANNED device cannot accept readings), `trg_device_install_gate`, `trg_life_safety_immutable` / `trg_life_safety_no_delete` (smoke/CO alarms can never be edited or deleted), plus audit-chain triggers in the audit DB (`trg_audit_no_update`, `trg_audit_no_delete`, `trg_audit_linear_chain`).
- **`src/obd/auth.py`** (586 lines) — Argon2id password hashing (with a dummy-hash timing equalizer so attackers can't probe which emails exist), **Ed25519-signed JWTs** via PyJWT, **stateful sessions** (every token has a row in a `sessions` table; logout/revocation actually works), and **TOTP with replay protection**: each used code's time-step is recorded in `totp_used_codes` inside the same transaction that verifies it, so a code can never be spent twice. Strict one-user-one-portal scoping (`require_portal`).
- **`src/obd/audit.py`** (371 lines) — hash-chained audit ledger in its own database (`audit.db`), with a canonical hash format and a guard that refuses to write secret-shaped keys into audit payloads.
- **Feature modules, one per "chunk":** `ingest.py` (gateway bridge + the single shared insert transaction), `telemetry.py` (session-side ingest routes), `faults.py` (fault evaluation + alarm routes + dedup), `healthscan.py` (1,409 lines — Chunk 10 Health Scan), `honesty.py` (Chunk 12 — alarm dedup, offline/gap surfacing, canary), `workforce.py` (1,318 lines — Chunk 13, six draft-only AI employees writing into an Owner approval queue) + `workforce_runner.py` (1,206, Chunk 15 timer runner), `install_validator.py` (1,058, Chunk 14 photo/QR install checks), `cloning.py` (Chunk 11 multi-client clone), `commands.py`, `simfeed.py` (simulated feed that writes **only** to a separate `simulated_readings` table, off by default).
- **Money, in three layers:** `payments.py` (test-mode webhook harness, HMAC-verified, idempotent), `payments_stripe.py` + `payments_lib/` (1,198 lines across 8 modules — the Lane F Stripe-shaped checkout with a fake adapter, approver gate, webhook verification), and `web/store.py` (server-rendered storefront with a cookie cart).
- **Web layer:** server-rendered Jinja2 templates (16 templates). All 22 portals exist; **21 of them render from one generic template** (`dashboard_portal.html.j2`) and only Owner gets a bespoke one (`dashboard_owner.html.j2`) — see `src/obd/web/routes.py`. Session moves from API token to browser via an HttpOnly-cookie bridge (`/session/bridge`).

### 1.3 How the two stacks relate

**They don't — in code.** A full-text search finds zero references from either codebase to the other (no shared imports, no API calls, no shared files). They are two independent implementations of the *same product specification*: the same 22 portals (defined separately in three places — Side A `packages/shared/src/portals.ts`, Engine B `src/obd/config.py` `PORTAL_ROLES`, and again with full descriptions in Engine B `src/obd/web/context.py` `PORTAL_REGISTRY`), the same honesty rules (simulator data must never dress up as real), the same Ground Zero house, the same catalog. Engine B's config (`src/obd/config.py`) even reserves port settings named for Side A's demo and panel services — the *deployment* knows about both, the *code* doesn't. Engine B's default port is also 8787 — Side A's port — and only an environment variable keeps them apart in the live deployment (8897).

The merged product verdict's recommendation — collapse 22 portals to 4 active ones — is corroborated by the code itself: on Side A every portal is still flagged `"NOT CONNECTED"` in the registry, and on Engine B 21 of 22 portals are literally the same page template with different labels.

---

## 2. Data flow, traced through the code

### 2.1 Side A

**Sign-in** (`apps/api/src/app.ts`, `/auth/login` → `/auth/mfa/verify`):
Request → `portalBySlug()` validates the portal → `db.getUserByUsername()` → scrypt verify (`passwords.ts`) → portal grant check (`portal_grants` table) → if the portal requires MFA and the user has a TOTP secret, a 5-minute HS256 "challenge" JWT is returned → client posts the 6-digit code → `verifyTotp()` (`totp.ts`) accepts the current code **or one step either side** → 1-hour access JWT (HS256, grants embedded) → every later request passes `requireAuth`/`requireGrants` helpers that re-verify the JWT signature and expiry. **There is no server-side session record: a token cannot be revoked, only expired.** Every login outcome (success, denied, challenge) is appended to the JSONL audit chain (`audit.ts`).

**Sensor reading in** (`POST /api/gateways/:id/readings`):
Grant check → gateway + building lookup → `parseReading()` (checks only that `datapoint` is a non-empty string and `value` is a number/string/boolean) → the protocol driver (`gateways.ts`): MQTT/BACnet/Modbus drivers always throw "NOT CONNECTED" (HTTP 409); only the **bench** driver stores → `storeReading()` auto-creates the point and calls `db.insertReading()` → audit append. **No check that the value is finite or in any physical range, and no check that any device is installed** — see §4.

**Health scan:** route → `runBuildingScan()` (`scans.ts`) → `db.latestReadings()` (latest reading per point) → `runScan()` from `@obd/fault-engine` (the 22 codes) → scan + faults + alarms persisted → report generated from the stored scan (`reports.ts`).

### 2.2 Engine B

**Sign-in** (`src/obd/routes_auth.py` → `src/obd/auth.py`):
`POST /auth/login {portal, email, password}` → `AuthService.authenticate_primary()` → user fetched by email through the writer queue → Argon2id verify (a dummy hash is verified when the email doesn't exist, so response timing doesn't leak accounts) → **the user's one assigned portal must equal the requested portal** → MFA portals (7 of 22) get a 5-minute Ed25519 challenge token → `POST /auth/mfa/verify` runs the TOTP check *inside a writer transaction* that also inserts the spent time-step into `totp_used_codes` (replay = rejected) → a `sessions` row is written and a 30-minute Ed25519 session JWT issued. Every request then re-verifies the JWT **and** looks up the session row (exists, not revoked, portal matches).

**Sensor reading in** (two doors, one transaction):
- *Gateway door* (`src/obd/ingest.py`, `POST /ingest/readings`): `X-OBD-Gateway-Key` header compared with `hmac.compare_digest` against the `OBD_GATEWAY_KEY` env var — **if the variable is unset, every request gets HTTP 503 (fails closed)** → `IngestionService.submit()` validates (integer device id, known metric, source type ∈ {BENCH_HARNESS, SIMULATOR}, `math.isfinite` value check) → the shared `insert_reading_tx()` runs inside the single-writer queue → bounds lookup → device lookup → INSERT, where the **database trigger** rejects PLANNED devices (translated to HTTP 409) and physically impossible values (422) → `faults.evaluate_reading()` creates or dedupes alarms in the same transaction → an audit entry (accepted *or* rejected, with reason) is appended to `audit.db`.
- *Session door* (`POST /telemetry/readings`): the same shared transaction — but the route **re-implements all of the validation and audit logic itself** instead of calling `IngestionService.submit()` (see §5.2).

**Audit:** every audited action is a separate writer-queue command against `audit.db`; the entry hash chains to the previous entry and DB triggers forbid updates, deletes, and chain breaks.

**Web pages:** browser exchanges the API token for an HttpOnly cookie at `/session/bridge`; portal pages are rendered server-side with a context builder (`web/context.py`) that fetches **only that portal's** data.

---

## 3. The known starting points — each one verified in the code

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| (a) | Side A never sets `PRAGMA foreign_keys` | **TRUE** | `apps/api/src/db.ts` constructor sets only `journal_mode=WAL` and `busy_timeout=5000` (lines ~440–441). A search of all Side A source finds no other pragma. The schema *declares* `REFERENCES` on ~25 columns, but with the pragma off SQLite silently ignores all of them — deleting a building would leave orphan readings, alarms, and orders instead of failing. One table (`portal_records.building_id`) doesn't even declare the reference. Engine B, by contrast, sets `foreign_keys=ON` and *proves* it by read-back on every connection (`src/obd/db/connection.py`). |
| (b) | Side A telemetry lacks finite/range validation | **TRUE** | `parseReading()` in `app.ts` accepts any JSON number — and `JSON.parse("1e999")` produces `Infinity` in JavaScript, which passes its `typeof === "number"` check — and `storeReading()` in `gateways.ts` stores it unchecked. No per-metric bounds exist anywhere in Side A. Engine B rejects non-finite values in two places *and* enforces physical bounds in the schema itself (`value_num = value_num AND value_num > -1.0e308 AND value_num < 1.0e308` CHECK in `schema_state.sql`) plus per-metric bounds via trigger. |
| (c) | No install-state check on Side A telemetry ingest | **TRUE** | The ingest path (`app.ts` route → `gateways.ts` `storeReading`) never looks at the `devices` table or `install_state`. Readings attach to auto-created *points*, not devices, so a building with zero installed devices can accumulate "real" readings through the bench path. Engine B's equivalent is the `trg_block_planned_device_telemetry` trigger → HTTP 409. |
| (d) | Side A TOTP has no used-code record | **TRUE** | `verifyTotp()` in `totp.ts` is a pure function: it checks the code against the current ±1 time steps and records nothing. The same code can be replayed any number of times inside its ~90-second acceptance window. Engine B records `(user_id, time_step)` in `totp_used_codes` inside the verifying transaction (`auth.py`) — the exact fix, already written, in the other stack. |
| (e) | Merged verdict: collapse 22 portals → 4 | **Supported by the code** | 22 portals are defined three times (see §1.3). Side A's registry still marks every portal `"NOT CONNECTED"`. Engine B renders 21 of 22 portals from a single generic template (`web/routes.py` docstring: only Owner gets its own template) — i.e., 21 of the "portals" are the same page wearing different name tags. |
| (f) | Engine B planned-telemetry block (409) + fail-closed gateway key (503) | **TRUE** | `ingest.py`: `_check_gateway_key()` returns 503 `GATEWAY_NOT_CONFIGURED` when `OBD_GATEWAY_KEY` is unset/empty, 401 on mismatch (`hmac.compare_digest`). PLANNED-device inserts abort in the `trg_block_planned_device_telemetry` trigger and are translated to 409 `TELEMETRY_REJECTED_DEVICE_PLANNED` in `insert_reading_tx()`. Both behaviors are also covered by Engine B's tests (`tests/test_chunk9_monitoring.py`, `test_chunk3_auth.py`). |

**One more verified correctness item (the previously flagged HOLE-1):** Engine B's history query in `src/obd/honesty.py` (line ~151) selects readings from `telemetry_readings` with a hardcoded `0 AS simulated`. But `telemetry_readings` legitimately contains SIMULATOR-sourced rows — the schema's CHECK allows `source_type IN ('BENCH_HARNESS','SIMULATOR')` and both ingest doors accept SIMULATOR into that table. Only the separate demo feed (`simfeed.py`) writes to `simulated_readings`, which is the only source the history query labels simulated. **Net effect: a SIMULATOR reading submitted through the normal API or gateway door is stored in the real table and shown in history as real.** The fix is one query change (§6, Strategy 1).

---

## 4. Bad architecture decisions

1. **Two platforms for one product (the root decision).** Everything else in this report is downstream of building Side A and Engine B in parallel with no shared code and no integration. Each stack re-solved identity, audit, ingest, faults, scans, workforce, payments, and storefront — §5.3 quantifies it. The head-to-head "run both" posture doubles every future fix: the four Side A gaps in §3 were *already fixed once*, in Engine B, and still had to be re-found in Side A.
2. **Side A declared referential integrity but never enabled it** (§3a). The schema *looks* safe — `REFERENCES` everywhere — which is worse than no schema at all, because a reader trusts protection that isn't active.
3. **Side A's audit log is a single JSONL file with in-memory chain state** (`apps/api/src/audit.ts`). The constructor reads the *entire file* to find the last hash; `entries()` re-reads the whole file on every call; and because the chain tip lives in process memory, two processes writing the same file (e.g., the platform instance and the demo instance pointed at one data dir) would fork the chain. Engine B's DB-backed ledger with linear-chain triggers is the stronger design for the same job.
4. **Side A sessions can't be revoked.** Stateless HS256 JWTs with the grants baked in (`jwt.ts`, `app.ts`): a leaked token — or a portal grant you remove from the database — stays valid until the 1-hour expiry, because authorization rides inside the token. Engine B checks a server-side session row on every request.
5. **Side A's only working ingest driver is the test harness.** MQTT/BACnet/Modbus drivers are stubs that always refuse; the "bench" driver is the sole path that stores readings, and it's the path with no install-state or range checks (§3b/c). The honest NOT CONNECTED stance is good; shipping the harness as the de-facto production door is not.
6. **Engine B's schema lives in two places.** Fresh databases get `schema_state.sql`; older databases are patched at startup by six separate `ensure_*` functions scattered through feature modules (`app.py` lifespan calls `ensure_simulated_table`, `ensure_health_scans_table`, `ensure_alarm_dedup_columns`, `ensure_install_validator_schema`, `ensure_order_approver_schema`, `ensure_workforce_runner_schema`, each living in the module it patches). Side A has the mirror-image problem: the entire schema is one giant inline string in `db.ts` with exactly one hand-rolled migration (the `deployment_type` ALTER). Neither stack has a versioned migration sequence, so "what schema is this database on?" has no single answer in either.
7. **Engine B has two catalogs of truth for prices.** The storefront and the Lane F checkout both read a static file (`src/obd/web/data/catalog.json`, loaded independently by `web/store.py` and `payments_lib/catalog.py`), while `seed.py` also loads the catalog into the `catalog_items` database table that the workforce's quote drafter reads. Edit one, the other silently disagrees.
8. **Engine B carries three payment layers.** `payments.py` (test webhook harness with its own orders), `payments_stripe.py` + `payments_lib/` (Stripe-shaped checkout, its own order store/approvals), and `web/store.py` (display-only checkout fallback). Two webhook endpoints, two order models, one product. Side A has the same concept once (`commerce.ts` + `payments.ts`) — so payments exist in **five** modules across the codebase.
9. **The 22 fault codes exist only in Side A; Engine B invented a second, incompatible fault language.** Side A's `fault-engine.mjs` evaluates the 22 deterministic codes. Engine B's `faults.py` `evaluate_reading()` produces five generic alarm classes (`LIFE_SAFETY_SMOKE_CO`, `WATER_LEAK`, `ELECTRICAL_FAULT`, `HVAC_FAULT`, `AIR_QUALITY_FAULT`) and its Health Scan (`healthscan.py`) is a third, separate rules implementation over hand-entered measurements. A customer-facing "22-code" claim is currently true of exactly one of the two systems, and the two systems' alarms can never be merged or compared.

---

## 5. Duplicate logic

### 5.1 Across the two stacks (the expensive duplication)

Both stacks independently implement the same nine subsystems. Approximate sizes of each implementation, from the files read:

| Subsystem | Side A | Engine B |
|---|---|---|
| Password hashing | `passwords.ts` — scrypt, 14 lines | `auth.py` — Argon2id (in 586 lines with the rest of auth) |
| JWT | `jwt.ts` — hand-rolled HS256, 65 lines | PyJWT + Ed25519 (`auth.py`) |
| TOTP | `totp.ts` — hand-rolled, 76 lines, **no replay record** | pyotp + `totp_used_codes` table (`auth.py`) — replay-proof |
| Sessions | none (stateless token only) | `sessions` table + revocation (`auth.py`) |
| Audit chain | `audit.ts` — JSONL file, 107 lines | `audit.py` — dedicated DB + triggers, 371 lines |
| Portal registry | `packages/shared/src/portals.ts` (22, slugs) | `config.py` `PORTAL_ROLES` (22, names) **and** `web/context.py` `PORTAL_REGISTRY` (22, full descriptors) — three definitions total |
| Telemetry ingest | `gateways.ts` + `app.ts` `parseReading` | `ingest.py` + `telemetry.py` (516 + 267 lines) |
| Fault evaluation | `fault-engine.mjs` — 22 codes, 186 lines | `faults.py` — 5 generic classes, 591 lines |
| Health scan | `scans.ts` + `reports.ts` (~170 lines) | `healthscan.py` — 1,409 lines |
| AI workforce + approval queue | `agents.ts` (425) + agent tables in `db.ts` | `workforce.py` (1,318) + `workforce_runner.py` (1,206) |
| Payments / orders | `commerce.ts` + `payments.ts` (345 lines) | `payments.py` + `payments_stripe.py` + `payments_lib/` (~1,700 lines) |
| Storefront | `apps/web` SPA (App.tsx 1,728 lines serves all portals) | `web/store.py` + 16 Jinja templates |

Every security fix, price change, portal change, or fault-code change must currently be made **twice, in two languages, against two test suites** — and §3 shows what happens in practice: Engine B got the fix, Side A didn't.

### 5.2 Inside Engine B

- **`telemetry.py` re-implements `ingest.py`.** `IngestionService.submit()` already does validation → shared transaction → audit for every outcome. The session route in `telemetry.py` (~200 lines) repeats the same validation ladder and the same five audit calls by hand instead of calling it. It even redefines the same helpers: `telemetry.py` has its own `_is_finite_number` and its own `ALLOWED_SOURCE_TYPES` constant, duplicating `ingest.py`'s `is_finite_number` and identical constant. Any future change to ingest rules must be made in both files or the two doors will diverge — the exact failure mode the module docstring in `ingest.py` says the design exists to prevent.
- **The portal registry is defined twice inside Engine B alone** (`config.py` names for auth; `web/context.py` descriptors for pages), plus Side A's third copy.
- **Catalog loaded twice** from the same JSON file by two loader modules (§4.7).

### 5.3 Inside Side A

- Two "god files" concentrate the platform: `app.ts` (1,742 lines, all 77 routes + auth helpers + error mapping) and `db.ts` (1,609 lines, schema + every query for every domain). Most other modules are reasonably sized; these two are where changes collide.
- The fault engine is plain `.mjs` inside a TypeScript monorepo, consumed through a hand-maintained `fault-engine.d.ts` declaration file — if the `.mjs` API changes and the shim isn't updated in the same commit, the compiler will happily check against a fiction.

---

## 6. Performance bottlenecks & scalability risks

**Engine B**

1. **Every read waits in the write line.** `SingleWriterDbActor.fetch_all`/`fetch_one` are implemented by submitting the read to the *same* single-writer queue as writes (`db/connection.py`). One slow write transaction (a 500-reading batch, a workforce cycle) blocks every page load, every session check, every health check behind it. Session verification happens on *every* authenticated request, so the queue is on the critical path of all traffic. This is the stack's #1 scalability ceiling: throughput is capped at one SQLite transaction at a time, total, forever — fine for one house, a hard wall for a multi-client hosted service.
2. **Per-query overhead rituals.** Every `fetch_all`/`fetch_one` first runs `verify_connection_pragmas()` — six extra PRAGMA queries — and `insert_reading_tx()` and the TOTP transaction run it again inside the transaction. After *every* write command, the writer loop calls `ensure_file_mode_0640()`, which stats/chmods the DB file and its WAL/SHM sidecars. Individually trivial; multiplied by every query in every request, it's a constant tax on the single serialized lane where Engine B can least afford it.
3. **One process, one core.** `run_server()` starts a single uvicorn worker on loopback. Combined with (1), the deployment tops out at "one building, light traffic" no matter what hardware it sits on. (This is a deliberate local-first posture — but it should be a *known* ceiling, not a discovered one.)

**Side A**

4. **Synchronous database on an async server.** `node:sqlite`'s `DatabaseSync` blocks the Node event loop for the duration of every query. Fastify's concurrency doesn't help: while one request's query runs, no other request is served. Under any real load the whole API moves at the speed of its slowest query.
5. **N+1 in the scan path.** `db.latestReadings()` loops over every point in a building and issues one query per point (db.ts). Scan cost grows linearly with sensor count — exactly the wrong shape for the one computation the product sells.
6. **Whole-collection reads with in-memory filtering.** E.g. `GET /api/buildings` loads *all* buildings and filters by access in JavaScript (`app.ts`). Fine at 2 buildings; a leak and a slowdown at 2,000.
7. **Audit file growth is unbounded and read wholesale.** Startup cost and `entries()` cost grow linearly with total history (§4.3).

**Both**

8. **No rate limiting anywhere.** A full-text search for rate-limiting in both codebases finds none. The login and MFA endpoints' only brute-force brake is password-hash cost (scrypt on Side A, Argon2id on Engine B). For an internet-facing deployment this is a when, not an if.
9. **SQLite everywhere.** Both stacks bet on single-file SQLite. That's a legitimate local-first choice and both handle WAL/busy-timeout deliberately — but there is no migration path in either codebase to a client-server database (Side A's `db.ts` header comment names PostgreSQL/Timescale as the hosted-mode intent with the swap "not built yet"; Engine B has no equivalent seam at all — its actor *is* the seam, if reads are split per Strategy 3).

---

## 7. Maintainability issues

- **Engine B project hygiene:** the project copy has **no `.git`** — no version history for 14,408 lines of production code. It also carries a 57 MB `.venv`, three `.pre-chunk*/.pre-repair` backup directories, and `__pycache__` folders inside the source tree. Side A *is* a git repo, but its tree contains committed build output (`apps/api/dist/`, `packages/*/dist/`).
- **Schema truth is scattered** (§4.6): Engine B = SQL files + six `ensure_*` patch functions in six modules; Side A = one 400-line SQL string inside a class constructor + one hand-rolled ALTER.
- **Chunk-era file sizes in Engine B:** `healthscan.py` 1,409, `workforce.py` 1,318, `workforce_runner.py` 1,206, `install_validator.py` 1,058, `seed.py` 912 lines. Each is a feature island with its own helpers — workable now, but every cross-cutting change (audit shape, error shape) touches all of them.
- **Test coverage is real but lopsided.** Side A: ~152 test cases across 24 files, including dedicated suites for auth, TOTP, audit, portals, commerce, control. Engine B: 41 test functions across 16 files — good coverage of the chunk features (auth, ingest honesty, workforce, validator) but thin per-module for a 14k-line codebase (e.g., one test function for all of Chunk 11 scoping/cloning, one for the workforce runner). Neither suite was executed for this review (read-only scope) — counts are from the files on disk.
- **Naming debt:** Engine B's default port (8787) is Side A's port; the storefront's static catalog vs the DB catalog (§4.7); "telemetry.ts" on Side A is the *trend* engine while ingest lives in `gateways.ts` — the file names actively mislead a new reader about where readings enter.

---

## 8. Refactoring strategies — ordered by value ÷ risk

*None of these change what the product does. Each preserves behavior (same endpoints, same responses, same data) while removing a verified weakness.*

### Strategy 1 — Close the five verified correctness gaps (highest value, low risk)

Port the protections Engine B already has into Side A (foreign keys on, finite/range validation at ingest, install-state gate, TOTP replay record), and fix Engine B's HOLE-1 history label. These are small, test-backed changes — Engine B's implementations and Engine B's tests are the reference for each one.

Side A — switch on the integrity that was already declared, and validate at the one door readings enter (`db.ts` constructor + `gateways.ts` `storeReading`):

```ts
// db.ts — in the PlatformDb constructor, next to the existing pragmas:
this.raw.exec("PRAGMA journal_mode = WAL;");
this.raw.exec("PRAGMA busy_timeout = 5000;");
this.raw.exec("PRAGMA foreign_keys = ON;");   // was declared in schema, never enabled

// gateways.ts — reject what cannot be a physical reading, before it is stored:
const METRIC_BOUNDS: Record<string, { min: number; max: number }> = {
  // one row per known datapoint, mirroring Engine B's telemetry_bounds table
};

function assertStorableReading(building: BuildingRow, input: ReadingInput): void {
  if (typeof input.value === "number") {
    if (!Number.isFinite(input.value)) {
      throw new InvalidReadingError("NON_FINITE_VALUE");
    }
    const bounds = METRIC_BOUNDS[input.datapoint];
    if (bounds && (input.value < bounds.min || input.value > bounds.max)) {
      throw new InvalidReadingError("VALUE_OUT_OF_PHYSICAL_BOUNDS");
    }
  }
}
```

For the TOTP replay record, mirror Engine B's `totp_used_codes`: a `totp_used_codes (user_id, time_step, PRIMARY KEY (user_id, time_step))` table, checked and inserted in `verifyTotp`'s caller before the access token is issued.

Engine B — HOLE-1 is a one-query change in `honesty.py`: derive the flag from the row's own `source_type` instead of the table it sits in:

```sql
SELECT metric_key, value_num, within_bounds, recorded_at,
       CASE WHEN source_type = 'SIMULATOR' THEN 1 ELSE 0 END AS simulated
FROM telemetry_readings
WHERE device_id = ?
```

### Strategy 2 — One telemetry door in Engine B (high value, low risk)

Delete the duplicated validation/audit ladder in `telemetry.py` and route the session door through the existing `IngestionService.submit()` — the shared transaction already guarantees identical semantics; the route shrinks to authentication + delegation:

```python
@router.post("/readings")
async def ingest_reading(
    request: Request,
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> JSONResponse:
    body = await request.json()
    if not isinstance(body, dict):
        return JSONResponse(status_code=400, content={
            "error": "BAD_REQUEST", "message": "Payload must be a JSON object."})

    service = IngestionService(
        db_actor=request.app.state.db_actor,
        audit_ledger=request.app.state.audit_ledger,
    )
    status_code, payload = await service.submit(
        actor=AuditActor(user_id=principal.user_id, portal=principal.portal),
        device_id=body.get("device_id"),
        metric=body.get("metric"),
        value=body.get("value"),
        source_type=body.get("source_type"),
    )
    return JSONResponse(status_code=status_code, content=payload)
```

~200 lines deleted, one behavior — and the two doors can never drift apart again. (The response shapes already match: `IngestionService.submit` returns the same status codes and error bodies the hand-written route produces.)

### Strategy 3 — Let Engine B reads bypass the writer queue (high value, medium risk)

SQLite in WAL mode is explicitly designed for many concurrent readers alongside one writer. Give `SingleWriterDbActor` a small pool of read-only connections (opened with the same verified pragmas) and point `fetch_all`/`fetch_one` at them; keep every write — and only writes — in the serialized queue:

```python
class SingleWriterDbActor:
    def __init__(self, config: EngineConfig) -> None:
        # ... existing queue/writer setup unchanged ...
        self._read_pool: dict[str, list[sqlite3.Connection]] = {"state": [], "audit": []}

    def _acquire_reader(self, target: str) -> sqlite3.Connection:
        pool = self._read_pool[target]
        if pool:
            return pool.pop()
        path = (self._config.state_db_path if target == "state"
                else self._config.audit_db_path)
        # Same verified-pragma opening path as the writer connections —
        # WAL mode is what makes concurrent readers safe alongside the
        # single writer.
        return open_verified_connection(path)

    async def fetch_all(self, sql, params=(), *, target="state"):
        def _query() -> list[dict[str, Any]]:
            conn = self._acquire_reader(target)
            try:
                cur = conn.execute(sql, params)
                return [dict(row) for row in cur.fetchall()]
            finally:
                self._read_pool[target].append(conn)
        return await asyncio.to_thread(_query)
```

Also drop `verify_connection_pragmas()` from the per-query path (verify once at connection open and in `/health`, where it already lives) and move the post-write chmod to connection close/startup. Expected effect: page loads and session checks stop queuing behind batch writes and workforce cycles; write behavior is untouched.

### Strategy 4 — One portal registry (medium value, low risk)

Make Engine B's `web/context.py` `PORTAL_REGISTRY` (the richest of the three definitions) the single source, and *generate* `config.py`'s `PORTAL_ROLES`/`MFA_REQUIRED_PORTALS` and Side A's `portals.ts` from it in a small build script. A portal rename or MFA change then happens once. This is also the natural vehicle for the 22 → 4 collapse when that product decision is executed: one list shrinks, everything downstream follows.

### Strategy 5 — Versioned schema migrations, both stacks (medium value, medium risk)

Introduce a `schema_migrations (version, applied_at)` table and an ordered list of migration steps in each stack; move Engine B's six `ensure_*` functions and Side A's inline `CREATE TABLE` block + hand-rolled ALTER into that sequence. Behavior is identical (same final schema); the win is that "which schema is this database on?" becomes one query, and the next schema change stops being archaeology.

### Strategy 6 — Break up the god files (medium value, low risk, mechanical)

- Side A: split `db.ts` into one repository module per domain (users, buildings/readings, scans/alarms, commerce, portals, agents, devices/equipment) behind the same `PlatformDb` facade, and split `app.ts` routes into per-domain route files registered by `buildApp`. Pure file moves; the test suite (152 cases) is the safety net.
- Engine B: same treatment for `healthscan.py`, `workforce.py`, `workforce_runner.py`, `install_validator.py` — extract their persistence helpers into the service modules they already conceptually belong to.

### Strategy 7 — Repository hygiene (low cost, do immediately)

Put Engine B under git (Side A already is); add `.gitignore` coverage and remove `.venv/`, `.pre-*` backup dirs, `__pycache__/`, and committed `dist/` output from both trees. Backups belong in the snapshot system that already exists for the databases, not in the source tree.

### Strategy 8 — Throttle the auth doors (medium value, low risk)

Add a simple per-account + per-IP failed-login throttle (in-memory counter with exponential backoff is sufficient at this scale) in front of `/auth/login` and `/auth/mfa/verify` in both stacks. No behavior change for legitimate users; removes the brute-force exposure noted in §6.8.

### Strategy 9 — The strategic one (highest total value; Kent's decision, not a refactor)

Every duplication in §5.1 exists because two stacks exist. The cheapest long-term fix for the entire cross-stack duplication table is the end-product decision that is already on the table: **pick the surviving stack** (the existing head-to-head recommendation was "run both, port the 4 fixes" as an interim posture — §3 shows the port is still owed), execute Strategy 1's port into the survivor, and freeze the other. Until that decision lands, Strategies 1–8 keep both stacks safe and honest; after it lands, roughly 7,000–14,000 lines of duplicated platform stop needing maintenance. No code in this strategy changes functionality — it deletes a duplicate.

---

## 9. Verified vs. inferred — honesty note

**Verified by reading the code directly in this review:** every claim in §§1–5 and §7 that carries a file path, including the six starting-point verdicts in §3, the HOLE-1 mechanism (schema CHECK + both ingest doors + the history query), the read-through-writer-queue design, the per-query pragma verification, the duplicated telemetry validation, the three portal registries, the two catalog sources, the 22 fault codes in `fault-engine.mjs` vs. the five generic classes in `faults.py`, all file sizes, route counts (77 / 54), and test counts on disk (Side A ~152 cases / 24 files; Engine B 41 functions / 16 files). The Engine B project copy was diffed against the live `/opt/obd-engine-b` tree: all Python sources identical.

**Counted, not executed:** the test suites. This review was read-only — no servers were started and no test suite was run — so "163/163 green"-style pass claims from earlier work were **not** re-verified here; only the presence and size of the tests on disk were.

**Inferred (labeled as such):** the performance *consequences* in §6 are reasoned from the code's structure (synchronous SQLite on an event loop, a single serialized queue, N+1 query loops, whole-file audit reads). No load testing was performed, so no latency or throughput numbers are claimed — only the shapes that guarantee where the ceilings are. The statement that the two stacks never interact at runtime is verified at the code level (zero cross-references found by full-text search of both trees); deployment-level wiring (Caddy/systemd) was reviewed only where it appears inside these two repos.

**Not reviewed:** the separate v2/v3 prototype folders, the one-click install bundle, and the live databases' contents — this report covers the two codebases named in the task only.
