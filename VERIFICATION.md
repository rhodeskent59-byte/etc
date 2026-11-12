# VERIFICATION — Task 1 Definition of Done, clause by clause

Verified 2026-11-09/10 on the build VM (Node v24.22.1, npm 10.9.4,
git 2.43.0). Source commit under test: `a3c5c8e` ("Task 1 foundations…").
Every result below was produced by running the stated command; nothing is
asserted from reading code alone.

## Platform test totals (working repo and clean clone agree)

| Workspace | Runner | Passed | Failed |
|---|---|---|---|
| @obd/shared | vitest | 7 | 0 |
| @obd/fault-engine | node --test | 28 | 0 |
| @obd/design-system | vitest | 10 | 0 |
| @obd/api | vitest | 31 | 0 |
| @obd/web | vitest | 5 | 0 |
| **Total** | | **81** | **0** |

## Clause 1 — Clean-clone build passes

Commands (fresh clone of the committed repo):

```
git clone ~/workspace/your_files/obd-home-systems-platform /tmp/obd-clone-verify
cd /tmp/obd-clone-verify
npm ci            → exit 0
npm run build     → exit 0 (web bundle: dist/index.html 0.41 kB,
                    assets css 2.24 kB, js 156.13 kB, "✓ built")
npm test          → exit 0 — 7 + 28 + 10 + 31 + 5 = 81 passed, 0 failed
sha256sum packages/fault-engine/fault-engine.mjs
                  → c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f
```

**Status: PROVEN.**

## Clause 2 — Sign-in on two portals; Portal A session denied on Portal B

Automated tests (`apps/api/test/auth.test.ts`, 6 tests) using Fastify inject
against the real service:

- user with only a Dispatch grant logs in at `POST /auth/login`
  {portal:"dispatch"} → **200** with access token; `GET
  /api/portals/dispatch/session` with that token → **200**, portal status
  NOT CONNECTED, empty records.
- the same user presenting at the Client door → **403 PORTAL_NOT_GRANTED**;
  unknown portal slug → **404 PORTAL_NOT_FOUND**.
- the Dispatch-scoped token presented at `GET /api/portals/sales/session`
  → **403 PORTAL_NOT_GRANTED** (cross-portal denial).
- a second user granted Client + Owner signs in at the **Client** portal →
  **200** (second portal proven), and at Owner → **401 MFA_REQUIRED**
  (Client is in the MFA-required set too; Owner flow proven in clause
  tests below). Wrong password → **401 INVALID_CREDENTIALS**; missing
  token → **401**.

Live cross-check against the BUILT server (`node apps/api/dist/server.js`,
seeded dev users, real HTTP): /health → 200 {portals:22,
store:"sqlite (journal_mode=wal)"}; dispatch login → 200; dispatch session
→ 200; sales session with dispatch token → **403
{"error":"PORTAL_NOT_GRANTED"}**; owner login → **401 MFA_REQUIRED**;
TOTP verify → **200**.

**Status: PROVEN (automated tests + live HTTP run).**

## Clause 3 — Audit chain verifies; tampering fails verification

Automated tests (`apps/api/test/audit.test.ts`, 4 tests):

- 3 appended entries → `verifyChain()` → {ok:true, count:3}; hash linkage
  and genesis prevHash asserted.
- **Tamper test:** one stored entry's actor is rewritten in the file →
  `verifyChain()` → {ok:false} and names the broken sequence number.
- Service integration: login, registry create, and registry rejection each
  append audit entries (chain still verifies after mixed activity).

Live cross-check: `GET /api/audit/verify` → **{"ok":true,"count":6}** after
the smoke run's logins, registry create, and rejection.

**Status: PROVEN.**

## Clause 4 — Secret-shaped input rejected by the registry firewall

Automated tests (`apps/api/test/registry.test.ts`, 13 tests). Each of these
was submitted and refused with 400 SECRET_SHAPED_INPUT (pattern name
recorded, value never stored):

- API-key-shaped string (`sk-` style, EXAMPLE-marked) → pattern sk-style-key
- AWS access key id shape (AKIA…) → aws-access-key-id
- GitHub PAT shape (ghp_…) → github-token
- Stripe live key shape (sk_live_…) → stripe-live-key
- Slack token shape (xoxb-…) → slack-token
- Google API key shape (AIza…) → google-api-key
- JWT-shaped string → json-web-token
- PEM private-key block → private-key-block
- Bearer string → bearer-token
- high-entropy blob in a metadata field → high-entropy-value
- value-bearing field names (`apiKey`, `client_secret`) → forbidden-field

Also proven: clean metadata (provider/purpose/owner/status) → **201** and
reads back with **no value field present**; a user without an IT/Owner
grant → **403** on both write and read; every rejection appended an
audit entry carrying the pattern name only.

Live cross-check: POST /api/registry with an sk-shaped purpose →
**400 {"error":"SECRET_SHAPED_INPUT","field":"$.purpose","pattern":"sk-style-key"}**;
valid metadata → **201**.

**Status: PROVEN.**

## Clause 5 — Design tokens render the shell in dark AND light

- `packages/design-system/test/tokens.test.ts` (5 tests): accent is exactly
  #FF7A1A; dark and light themes differ on bg/surface/ink; generated CSS
  contains `[data-theme="dark"]` and `[data-theme="light"]` blocks, the
  carbon-weave and honeycomb textures, the orange stitch rule, skeleton
  shimmer, command bar; all seven health states have colors.
- `packages/design-system/test/shell.test.tsx` (5 tests): the shell renders
  under `data-theme="dark"` AND `data-theme="light"` (root attribute
  asserted for each), health badge shows NOT CONNECTED, all 22 portals are
  indexed by the command bar, skeleton renders its busy state.
- `apps/web/test/app.test.tsx` (5 tests): 22 door tiles render with NOT
  CONNECTED state; exactly 7 doors carry the MFA mark; theme toggle flips
  dark → light in the rendered app; per-door sign-in screens render.
- Snapshot run: `node scripts/render-shell-snapshots.mjs` →
  `shell-dark.html: 5381 bytes` and `shell-light.html: 5381 bytes`, all 7
  assertions true for each (theme attribute, own + other theme token
  blocks, --obd-accent:#FF7A1A, NOT CONNECTED badge, honeycomb strip,
  empty state), ending "THEME SNAPSHOTS OK". Snapshots saved under
  `verification-assets/` (gitignored evidence files).

**Status: PROVEN by DOM assertions in the test suite + server-rendered
snapshots of the built design system.** (Pixel screenshots were not
captured — no browser tooling in this build environment; the DOM/token
assertions above are the recorded evidence.)

## Clause 6 — v0.3.0's own test counts still pass with the engine integrated

- Platform engine suite (`packages/fault-engine/test/engine.test.mjs`,
  node --test): **28 passed / 0 failed** — all 22 codes in FAULT_CODES, one
  crafted trigger vector per code (22 reachable), runScan returns the
  SCN-SCAN-5 shape, empty/garbage input fires nothing, healthFromFaults
  priority ladder (EMERGENCY → CRITICAL → WARNING).
- The v0.3.0 suites re-run in their home directory against the source:
  `node tests/run-tests.mjs` → **97 passed / 0 failed**;
  `node tests/run-copilot-tests.mjs` → **25 passed / 0 failed**;
  `node tests/run-app-smoke.mjs` → **ALL PASSED**.
- Byte identity: sha256 of source and integrated copy both
  `c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f`
  (186 lines), re-confirmed inside the clean clone.
- Behavioral equivalence: 331 inputs (trigger vectors, edge cases, garbage
  readings, 300 seeded fuzz inputs) produce identical scan output from the
  source and the integrated copy (timestamps stripped).

**Status: PROVEN.**

## Honest limits (not claimed as verified)

- The CI workflow (`.github/workflows/ci.yml`) is configuration only — it
  has not run on a hosted runner because the repo has no remote (creating
  one was out of scope). The identical commands (npm ci, build, test) are
  what the clean-clone run executed locally. **Deployment update
  (2026-11-09/10): a remote was attempted and is BLOCKED on GitHub
  integration permissions — see "Live deployment" below; CI hosted-run
  status remains UNVERIFIED.**
- MFA was verified against the RFC 6238 public test vectors and the
  platform's own TOTP implementation end-to-end (enroll → challenge →
  verify), not against a third-party authenticator app.
- The IdP is OIDC-shaped (discovery document, standard claims) but is a
  local implementation — not a certified OIDC provider; authorization-code
  flow, refresh/revocation, Postgres/TimescaleDB, and Keycloak are the
  production shapes deferred per BUILD-LOG.md deviations D1–D4.
- No live system is connected: all 22 portals report NOT CONNECTED, and no
  building is monitored.

---

# Live deployment — verification (2026-11-09/10)

Deployment scope after GATE 1 approval (owner direction, Nov 9, 2026):
container artifacts, Caddy edge, live deployment on this VM, GitHub
remote. Environment: same VM (Node v24.22.1); Podman 4.9.3 / buildah
1.33.7 installed via apt during this task; Caddy v2.8.4 (official release
binary). Every result below was produced by running the stated command
against the live stack; nothing is asserted from reading code alone.

## Tests after the deployment changes

```
npm test   → shared 7 · fault-engine 28 · design-system 10 ·
             api 37 (31 Task 1 + 6 new static-web) · web 5
             TOTAL 87 passed / 0 failed
```

The 6 new tests (`apps/api/test/static-web.test.ts`) prove: GET / serves
index.html no-cache; hashed /assets file → `public, max-age=31536000,
immutable`; SPA fallback for unknown non-API paths; unknown /api paths
404 as JSON (never the SPA); three traversal shapes never escape the web
root; /health unaffected with web hosting on.

## Image build — BLOCKED on this VM (proven limit, not skipped)

```
git archive HEAD | tar -x -C /tmp/obd-fresh     # fresh checkout of HEAD
podman build -t obd-home-systems-platform:latest /tmp/obd-fresh
  → base image node:24-bookworm-slim pulled OK (236 MB)
  → FAILED creating the build container:
    "fuse-overlayfs: cannot mount … fuse: device not found"
    (kernel overlay fallback: mount not permitted)
```

Root cause (measured, not guessed): this VM is itself a restricted
container — effective capabilities are cap_net_admin, cap_net_raw,
cap_sys_ptrace only; /dev/fuse does not exist and mknod is refused;
`mount` is not permitted. No container runtime can build or run images
here. The Dockerfile itself was not reached by the failure (it occurs at
storage mount, before any Dockerfile step). **Status: image build
UNPROVEN on this VM; the Dockerfile is the deployment of record for a
normal host (compose file validated by construction against it).**

## Live stack — PROVEN (identical units, process form)

Deployment: `scripts/deploy-local.sh start` →
platform = `node apps/api/dist/server.js` (the image's exact CMD) with
WEB_DIST=apps/web/dist (shell built with VITE_API_BASE=""), OBD_HOST
loopback, data in ./data; edge = Caddy v2.8.4 running the repo Caddyfile
directives (only listen port :8080 and upstream 127.0.0.1:8787 differ —
BUILD-LOG D6). All checks below went through the EDGE port
http://127.0.0.1:8080 on a fresh seeded database:

```
GET  /health                       → {"status":"OK","service":"identity","portals":22,"store":"sqlite (journal_mode=wal)"}
GET  /                             → 200 text/html (portal shell; edge adds
                                     X-Content-Type-Options nosniff, X-Frame-Options DENY,
                                     Referrer-Policy no-referrer; Cache-Control: no-cache)
GET  /assets/index-9xVJs7N3.js     → 200, Cache-Control: public, max-age=31536000, immutable
                                     (Accept-Encoding: gzip → Content-Encoding: gzip)
POST /auth/login {portal:dispatch} → 200, access token issued
GET  /api/portals/dispatch/session → 200 (own portal)
GET  /api/portals/sales/session    → 403 {"error":"PORTAL_NOT_GRANTED"} (cross-portal denial)
POST /auth/login {portal:owner}    → 401 MFA_REQUIRED + challenge token
POST /auth/mfa/verify (RFC 6238 code from the seeded TOTP secret)
                                   → 200, owner access token issued
POST /api/registry purpose="sk-EXAMPLE…" (owner token)
                                   → 400 {"error":"SECRET_SHAPED_INPUT","field":"$.purpose","pattern":"sk-style-key"}
POST /api/registry clean metadata  → 201, row reads back with NO value field,
                                     status NOT CONNECTED
GET  /api/audit/verify             → {"ok":true,"count":6}
```

**Status: PROVEN — edge → platform → health, auth, RBAC denial, MFA,
registry firewall, and audit chain all exercised over live HTTP through
the edge.**

## Load smoke (measured; a smoke, NOT a load test)

```
200 sequential GET /health through the edge (one curl per request):
  200 × HTTP 200 · 0 failures · wall 1.85 s · ≈9.3 ms/request
  (includes curl process startup per request; no concurrency)
```

No requests/second capacity figure is claimed from this. See
docs/DEPLOYMENT-ARCHITECTURE.md for the design-target language.

## GitHub remote + CI — BLOCKED (integration permission)

```
github get_me            → login "rhodeskent59-byte" (OAuth connected)
github create_repository {name:"obd-home-systems-platform", private:true}
  → ERROR: "failed to create repository: POST https://api.github.com/user/repos:
    403 Resource not accessible by integration"
```

The connector's integration token cannot create repositories, so no
remote exists, nothing was pushed, and `.github/workflows/ci.yml` has
still never run on a hosted runner (**CI status: UNVERIFIED — no run
exists to report**). `.github/workflows/deploy.yml` (GHCR build on tags)
is likewise config-only and unproven. Unblock: the owner creates the
empty private repo `obd-home-systems-platform` once in the GitHub UI (or
extends the integration's permissions); the local history (3 commits,
87 tests green) then pushes via the connector's push_files flow. No
token, SSH-key, or credential workaround was attempted — OAuth is the
only auth path, per the deployment brief.

## Secret hygiene (pre-push greps, run 2026-11-10)

```
grep -rF "$(cat .deploy/jwt-secret.txt)" . (excluding .git, node_modules, .deploy)
  → no matches: the deployment secret exists ONLY in .deploy/jwt-secret.txt
git check-ignore .deploy/jwt-secret.txt data/x
  → both ignored (.deploy/ added this task; data/ already covered)
grep for AKIA…/ghp_…/xoxb-…/AIza…/sk-live shapes outside test fixtures
  → only the literal text "sk_live_…" pattern name in this file's Task 1
    section; no secret values anywhere in the tree
```

## What "live" does and does not mean here

Live = the platform serves real HTTP on this VM at
http://127.0.0.1:8080 (VM-local; no public hostname, no TLS yet). It does
NOT change any monitoring truth: all 22 portals still report
NOT CONNECTED, no building is monitored, Part 13 is still blank, and
Task 2 has not started.

---

# VERIFICATION — Task 2 Definition of Done, clause by clause

Verified 2026-11-10 on the build VM (Node v24.22.1, npm 10.9.4,
git 2.43.0). Source commits under test: `fc4456b` (domain layer),
`c26caf1` (routes + tests), `76c1073` (live-proof fix). Every result
below was produced by running the stated command or HTTP call; nothing
is asserted from reading code alone. This section supersedes the
deployment section's closing line "Task 2 has not started."

## Platform test totals (working repo and clean clone agree)

| Workspace | Runner | Passed | Failed |
|---|---|---|---|
| @obd/shared | vitest | 7 | 0 |
| @obd/fault-engine | node --test | 28 | 0 |
| @obd/design-system | vitest | 10 | 0 |
| @obd/api | vitest | 57 (37 Task 1 + 20 Task 2) | 0 |
| @obd/web | vitest | 5 | 0 |
| **Total** | | **107** | **0** |

Clean clone: `git clone <repo> /tmp/obd-clone-t2 && npm ci && npm run
build && npm test` → all green at the totals above; `sha256sum
packages/fault-engine/fault-engine.mjs` →
`c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f`
(byte-identical to the v0.3.0 source, before and after Task 2).

## Clause 1 — End-to-end bench pass (pack DoD)

Automated: `apps/api/test/e2e-bench.test.ts` (Fastify inject against
the real service and store):

- bench gateway reading in (`leak_detected=wet`, `zone_temp`,
  `gateway_heartbeat`, `sensor_battery`) → **201**s; points list shows
  exactly the 4 stored datapoints.
- trend for `zone_temp` over the stored window → 2 samples, bucket
  averages 68 and 69 — drawn from stored points only.
- scan → **201**, health_state **ACT NOW**, health_score 25 (DESIGN
  DEFAULT mapping, labeled in the response), faults include **P-001**
  from the real v0.3.0 fault library.
- alarm raised (exactly 1) → `GET /api/alarms/:id` shows status ACTIVE
  and one delivery record, channel `platform-console`, status
  **DELIVERED**; `externalDelivery: "NOT CONNECTED"` stated in the same
  payload (no external channel exists — BUILD-LOG D9).
- report → `POST /api/buildings/:id/reports {scanId}` → **201**; body
  `generatedFrom.scanId` equals the scan's id and its faults trace to
  the stored scan record.

Live: the same pass ran over real HTTP through the Caddy edge
(http://127.0.0.1:8080) against a throwaway data dir — **33/33
assertions passed**, including owner MFA login through the edge, the
full bench chain, and an audit-chain verify (`ok: true`, 26 entries)
at the end. The throwaway data dir was deleted afterward; the real
deployment data was never written by the proof (post-restart counts:
users 3, registry 1, buildings/orders/products and all other Task 2
tables 0).

## Clause 2 — Gap-honest trend engine

`apps/api/test/core-platform.test.ts`: samples in buckets 0 and 3 of a
4-bucket window → buckets 1–2 return `avg: null, gap: true`; the merged
gap range is reported exactly (`00:30 → 01:30`); coverage 0.5;
`interpolation: "none"` in the payload. Missing data is never filled.

## Clause 3 — Gateway honesty (no fake telemetry)

For each of MQTT, BACnet/IP, Modbus: gateway registers with status
**NOT CONNECTED**; `POST /api/gateways/:id/readings` → **409
GATEWAY_NOT_CONNECTED** and the building's point list stays empty
(test) — and live assertion 9 of 33 through the edge. The bench driver
is labeled **BENCH HARNESS** in its status, never "connected."

## Clause 4 — Simulator data badged and never merged (pack DoD)

`apps/api/test/core-platform.test.ts`, three levels of proof:

- **Store level:** raw rows — every reading on the real building has
  `simulator = 0`, every reading on the simulator building has
  `simulator = 1` (the flag is derived from the building record at
  ingest; the simulator ingest path refuses a real building with 400
  SIMULATOR_REQUIRES_SIMULATOR_BUILDING).
- **API level:** the real building's trend contains only its own value
  (70) with `simulator: false`; the simulator building's trend shows
  its own value (32) with `simulator: true`.
- **Scan/alarm level:** a simulator-only S-101 (pipe_zone_temp 30)
  appears in the simulator building's scan and NOT in the real
  building's scan; every alarm on the real building has
  `simulator = 0`.

## Clause 5 — S-001/S-002 cannot be cleared through any API (pack DoD, recorded negative test)

`apps/api/test/alarms.test.ts`, for S-001 (smoke) and S-002 (CO):

- `POST /api/alarms/:id/clear` → **403 LIFE_SAFETY_NOT_CLEARABLE**
  (twice for S-001: before and after acknowledging).
- The domain function itself throws `LifeSafetyClearForbiddenError` —
  the clear path refuses in code, before any store write; there is no
  other status-transition path an endpoint could call.
- Every refusal is in the audit chain (`alarm.clear_denied`, 3 entries
  in the S-001 test) and the chain still verifies.
- The alarm leaves the open state ONLY when a later scan's stored
  readings stop reporting the alarm state → **RESOLVED_AT_DEVICE** with
  `cleared_by: null` (resolved at the detector, never from a screen).
- Live: assertions 22–24 of 33 through the edge reproduce the refusal
  over real HTTP (403, alarm still ACTIVE).

Non-safety contrast (same file): P-001 can be acknowledged and cleared
by an operator (200, cleared_by recorded), and auto-clears by scan
reconciliation when the condition stops.

## Clause 6 — Report generator refuses without a stored record

`apps/api/test/e2e-bench.test.ts`: unknown scan id → **409
REPORT_REQUIRES_RECORD**; a real scan belonging to a DIFFERENT building
→ **409**; the reports table still holds 0 rows for that building
afterwards. Live: assertion 21 of 33 through the edge.

## Clause 7 — Money path (owner's Task 2 brief)

`apps/api/test/commerce.test.ts` (8 tests):

- **Price honesty:** a recorded price is stored `PROPOSED`; no price →
  `UNPRICED` with `price_cents: null`. An order over priced lines totals
  from PROPOSED prices; an order containing an UNPRICED line has
  `total_cents: null` — never invented. (Part 13 stays blank.)
- **Firewall:** product creation passes through the Task 1
  secret-pattern firewall — a value-bearing field → **400
  SECRET_SHAPED_INPUT** (plus the 13 Task 1 registry tests still green).
- **Manual/comp:** checkout `manual` → status `manual` with the MANUAL
  badge ("the platform charged nothing"); `comp` → status `comp` with
  the COMP badge. Settled orders cannot re-enter checkout or be
  cancelled (409).
- **Registry gate:** test-mode checkout with no payments registry entry
  → **409 PAYMENT_PROVIDER_NOT_REGISTERED**, order still `draft`.
  After a metadata-only entry (purpose "payments", status
  NOT CONNECTED, no value field) is created through the registry API,
  checkout opens a session badged **SIMULATOR** and the order sits at
  `awaiting_payment` — NOT paid.
- **Paid only via provider event:** a `payment.succeeded` event with a
  forged session → **409**, recorded with `applied = 0`, order still
  `awaiting_payment`. A `payment.failed` event on the real session →
  order back to `draft`. A new session + matching `payment.succeeded`
  event → `paid`, `payment_mode: "test"`, and the read model renders
  the TEST MODE / SIMULATOR badge. A duplicate event on the settled
  order → 409. Domain level: applying an event to a draft order throws
  `OrderNotPayableError`. There is no set-status endpoint.
- **Provider-agnostic:** the only provider identifier in code is
  `test-mode-adapter`; grep for a chosen real provider across
  `apps/api/src` finds only a comment recording that the decision is
  UNRESOLVED (Part 13). No real charge is possible in this build: no
  live provider, no keys, no code path that speaks to one.
- Live: assertions 25–32 of 33 through the edge reproduce the registry
  gate, the forged-event refusal, and the badged paid state over HTTP.

## Clause 8 — Live deployment extended, not broken

`scripts/deploy-local.sh` stop/start on the Task 2 build → health OK
via the edge; the additive schema migration applied on first open
(Task 2 tables present, 0 rows; Task 1 contents untouched);
unauthenticated `GET /api/buildings` through the edge → 401. The
Dockerfile runtime stage now ships `packages/fault-engine` alongside
`packages/shared` (the API's workspace imports); the container build
itself remains unproven on this VM for the Task 1 reason (no container
runtime can execute here — deviation D5 stands).

## Regression found and fixed during this verification

The first live pass failed at `POST /scans` with a 500: Fastify's
default JSON parser rejects an empty body when a client sets
`content-type: application/json` on a body-less POST. Fixed with a
custom parser (empty body → {}, malformed JSON → clean 400) plus
regression assertions in the bench-pass test; the live proof then ran
33/33. Commit `76c1073`. (BUILD-LOG H2.)

## GATE 2 — reached, not passed

Task 2 stops here per the pack's gate rule. Task 3 (the 22 portals'
operations) was NOT started. Still open and unchanged: Part 13 is
blank (payment door undecided, no confirmed prices, no legal name);
all portals still report NOT CONNECTED; no building is monitored;
external alarm delivery is NOT CONNECTED; the GitHub remote/CI item
from the deployment section is unchanged (no remote exists to push
the three new commits to).

---

# VERIFICATION — Task 3 Definition of Done, clause by clause

Environment: this VM, repo at commit af1b8ad (Task 3/4 code), Node 24.
Commands run: `npm run build` (all workspaces), `npm run test` (all
workspaces), live HTTP checks via `scripts/deploy-local.sh` (edge
http://127.0.0.1:8080) and a throwaway instance of the same build.

## Platform test totals after Task 3 + Task 4

| Workspace | Before | After |
|---|---|---|
| @obd/shared | 7 | 16 |
| @obd/fault-engine | 28 | 28 (engine byte-identical, sha256 c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f) |
| @obd/design-system | 10 | 10 |
| @obd/api | 57 | 74 (portals.test.ts 10 + agents.test.ts 7 added) |
| @obd/web | 5 | 9 |
| **Total** | **107** | **137** |

## Clause 1 — Per-portal isolation test suite passes

`apps/api/test/portals.test.ts` (10 tests, all passing):

- A session from one portal cannot use another portal's door even
  while holding its grant (403 PORTAL_SESSION_MISMATCH); a session
  without the grant is denied at the grant check (403
  PORTAL_NOT_GRANTED).
- Employee records are visible only to HR and to the employee they are
  about (subject scoping): worker A sees the record, worker B does
  not, and the employee cannot act on it.
- Install-tech job visibility is assignee-scoped: the assigned tech
  sees the job, a second tech does not; a warehouse session cannot
  transition it (403).
- Client tenant scoping: a client session's building list is filtered
  to granted buildings; direct queries of another building (detail,
  trends) return 403 BUILDING_NOT_GRANTED; scans on ungranted
  buildings are refused; a client with no grants sees an empty core.

## Clause 2 — Every operation executes against real records and writes its audit entry

- Dispatch → install-tech job flow runs the full transition map
  (unassigned → assigned → in_progress → completed → closed) with an
  illegal jump refused (400); every step writes audit entries.
- Quotes snapshot totals from the product record (24900 × 2 = 49800;
  the caller-sent totalCents of 1 was ignored); an UNPRICED product
  yields totalCents null with an explicit UNPRICED totalStatus; a
  quote for a nonexistent product is refused (400).
- Invoices snapshot the order's amount (order total 3000); a missing
  order is refused (400).
- Publication is approval-gated: publish before approval → 409
  OWNER_APPROVAL_REQUIRED; submit → owner queue → approve → publish
  succeeds.
- GET /api/audit/entries (owner) shows record.created,
  record.transitioned, record.approval_requested, record.approved,
  access.building_granted; every entry carries actor, portal, and
  timestamp (linkage rule); chain verification ok: true.
- Secret-shaped input to a portal record is refused by the metadata
  firewall (400 SECRET_SHAPED_INPUT).

## Clause 3 — Every portal opens on its honest empty state

- The isolation suite opens the workspace of all 22 portals with a
  fresh single-grant user each: all 22 return state EMPTY, coreLink
  "CONNECTED TO CORE", status "NOT CONNECTED", with the honest
  empty-state message. The web suite renders the same states.

## Clause 4 — Honesty invariants held

- Simulator flags in workspaces derive from building records
  (client workspace shows SIMULATOR / NOT MONITORED from the building
  kind); gateway drivers remain NOT CONNECTED; the bench harness
  remains labeled BENCH; no portal shows telemetry the gateway layer
  does not have.
- S-001/S-002: no portal UI offers a clear action (web test asserts no
  clear button renders); the Task 2 negative tests still pass in the
  74-test API suite.
- Part 13 blank; payment surface unchanged; prices PROPOSED/UNPRICED
  only.

## Clause 5 — Live deployment on the new build

- `scripts/deploy-local.sh stop && start` on the Task 3/4 build:
  edge /health → {"status":"OK","service":"identity","portals":22};
  portal shell served (title "OBD Home Systems — Platform");
  unauthenticated portal session → 401.
- Full portal flow over real HTTP against a throwaway instance of the
  same build (temp data dir; seed credentials used in-process only,
  never printed): 10/10 PASS — health, dispatch login, EMPTY
  workspace, job create + assign, owner MFA login, Master Admin
  overview (22 portals, 0 Tier 2 classes), Tier 3 payment queued not
  executed, life-safety clear hard-denied, audit chain verifies.
- Real deployment data untouched: before and after — users 3,
  buildings 0, scans 0, alarms 0, orders 0, products 0, audit lines 6.

## GATE 3

Reached and APPROVED by owner standing direction (Nov 9, 2026:
"Approve all gates"). Recorded in README.md and BUILD-LOG.md.

---

# VERIFICATION — Task 4 Definition of Done, clause by clause

Suite: `apps/api/test/agents.test.ts` (7 tests, all passing) plus the
Master Admin assertions in the live check above.

## Clause 1 — Cross-department chain executes end to end, every step audited

Fault follow-up chain (Coordinator watch → Dispatcher stage_job →
Stockkeeper stage_allocation → Help Desk stage_follow_up): the test
asserts the job record exists on Dispatch's board, the warehouse item
reached `allocated`, the follow-up exists on Customer Service's board,
and the audit log contains agent.action_executed entries attributed
to Coordinator, Dispatcher, Stockkeeper, and Help Desk, plus
agent.chain_completed.

## Clause 2 — A Tier 3 agent attempt lands in the approvals queue and cannot execute before approval

- Payment run → 202, executed: false, status queued; the action
  appears in GET /api/owner/approvals; the owner approves and the
  status becomes "approved" — and no order exists and nothing was
  paid (the platform performs no outward act; D13).
- Rejection path verified. Unclassified action classes default to
  Tier 3 and queue.
- Hard limits: clear_life_safety_alarm → 403 AGENT_HARD_LIMIT,
  recorded as a denied action; it never reaches the queue.

## Clause 3 — Tier 2 ships with zero classes enabled, and the mechanism is real

- Master Admin overview on a fresh platform: tier2Classes = [] with
  the note that zero classes are approved (Part 13 blank).
- A Tier 2 action with no class queues. The owner creates a capped
  class (cap 3): amount 2 executes, amount 9 queues. Registering a
  Tier 3 class (payment) as Tier 2 → 400 CLASS_NOT_PERMITTED.
  Revoking the class makes the same action queue again immediately.

## Clause 4 — A candidate learning cannot promote without an approval record

- Dispatch stages a candidate from its own door (status staged,
  playbook_version null). A non-owner decision attempt → 403 and the
  candidate stays staged. The owner promotes → playbook version 2;
  one-tap rollback → version 1. A rejected candidate stays on record
  and never touches the playbook. The measured agent report covers
  all 23 agents (22 + Coordinator) with counts.

## Clause 5 — Pausing takes effect immediately; alarm monitoring continues

- Pausing the Docket agent → its next run is refused 409
  AGENT_PAUSED; a core scan on a new building still returns 201 while
  the agent is paused. Resume restores execution.
- Portal switch: pausing Advertising → its workspace returns 423
  PORTAL_PAUSED; the Owner door and a core scan still work; reopening
  restores the workspace.

## GATE 4

Reached and APPROVED by owner standing direction (Nov 9, 2026).
Recorded in README.md and BUILD-LOG.md.

---

# VERIFICATION — Task 5 Definition of Done, clause by clause

## Clause 1 — Desktop installers with signing and signed updater

NOT BUILT — exact blocker: this VM has no Rust toolchain (`cargo`,
`rustc` absent; verified by `command -v`). `packaging/tauri/` holds
the Tauri 2 configuration and Rust skeleton with placeholder names
only; the updater endpoint and public key are placeholders because
signing certificate holders are a Part 13 blank — no key exists and
none was invented. Fresh-install proof on a clean machine: NOT RUN
(no clean machine, no toolchain). Recorded in docs/NOT-BUILT.md.

## Clause 2 — Native Android app (signed APK + Play bundle)

NOT BUILT — exact blocker: no JDK, Gradle, or Android SDK on this VM
(`java`, `gradle`, `adb`, `sdkmanager` all absent; verified).
`packaging/android/` holds the Gradle project skeleton (minSdk 26,
covering the Zebra TC57's Android 8.1); signing reads environment
variable names only. Fresh-install proof: NOT RUN.

## Clause 3 — Offline install completes a full scan cycle with no network and no key

PROVEN. `scripts/offline-proof.mjs` against a fresh instance (empty
data dir, empty signing-secret env, empty credential registry):
10/10 PASS — boots with no key configured; owner sign-in (password +
TOTP); registry verified EMPTY; building + bench gateway created;
readings in; trend drawn from stored points; scan completes and
fires P-001 from the stored record (health ACT NOW); alarm raised;
report generated from that scan record. No network dependency: every
call is loopback to the instance itself, and no provider, key, or
account exists anywhere in the run.

## Clause 4 — Open-source release

- License: Apache License 2.0 (official text) at repo root.
- README carries architecture (docs/ARCHITECTURE.md, with diagram),
  quickstart, and honest status; CONTRIBUTING.md states the build's
  non-negotiable rules.
- Public repo: DOES NOT EXIST — the connected GitHub integration
  cannot create repositories (403 "Resource not accessible by
  integration"); creating the empty repo is an owner-hand step.
  Releases are therefore local: git tag v1.0.0 + archive
  `releases/obd-home-systems-platform-1.0.0.tar.gz`
  (sha256 8615685aa89e14f6f1d6e126f89aeec6d6adc2f27dc07d88f3eb06338ae16bf5).
- Example configs carry placeholder names only (packaging configs
  use deliberate, searchable PLACEHOLDER markers).

## Clause 5 — Repo passes a secret scan with zero findings

`scripts/secret-scan.sh` over all git-tracked files (pattern families
mirroring the registry firewall; only this script and the firewall
source are excluded as pattern definitions): **0 findings**, 5
allowed EXAMPLE/PLACEHOLDER lines in test fixtures (each labeled on
its own line). One fixture (a bare PEM header used as
firewall-rejection test input) was labeled to make the allowance
explicit rather than widening exclusions.

## Clause 6 — SaaS deployment mode with tenant isolation on the same codebase

- `apps/api/src/config.ts`: `OBD_DEPLOYMENT_MODE=saas` refuses to
  boot without a host-provided `OBD_JWT_SECRET` (an ephemeral secret
  would silently invalidate tenant sessions); unknown modes are
  configuration errors. Unit-tested: `test/config.test.ts` (5 tests).
- Tenant isolation is the Task 3 server-side scoping, unchanged by
  mode and proven by the isolation suite; /health reports the mode.

## GATE 5

Reached and APPROVED by owner standing direction (Nov 9, 2026:
"Approve and build everything"). Recorded in README.md and
BUILD-LOG.md. The unbuilt items above are carried into
docs/NOT-BUILT.md, not simulated.

---

# VERIFICATION — Task 6 Definition of Done, clause by clause

## Clause 1 — All suites green with counts printed

Final build AND clean clone (fresh `git clone` → checkout v1.0.0 →
`npm ci` → `npm run build` → `npm run test`) agree exactly:

| Workspace | Tests |
|---|---|
| @obd/shared | 16 |
| @obd/fault-engine | 28 (engine sha256 c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f — byte-identical before and after the whole run) |
| @obd/design-system | 10 |
| @obd/api | 83 |
| @obd/web | 9 |
| **Total** | **146 / 146** |

## Clause 2 — Security hardening + signable IT security review checklist

`docs/SECURITY-REVIEW.md`: every control marked in place (with its
proof) or NOT IN PLACE with the reason — encryption at rest, public
TLS, mid-TTL token revocation, and automated backups are the named
gaps; signature block for the owner/IT reviewer.

## Clause 3 — Independent pen test commissioned; findings triaged

The test itself is **NOT DONE (not performed)** — per the owner's
environment-honesty direction for this stage, the full package was
prepared instead of simulated: `docs/PENTEST-PACKAGE.md` carries the
scope, the seven priority question areas (with any S-001/S-002 clear
path defined as critical by definition), rules of engagement, and an
empty triage table that says so. Consequently v1.0.0 is a LOCAL
release only: no public exposure, no customer data, until the test
is performed and critical findings are closed.

## Clause 4 — Business-operations layer (Part 8) wired as live configuration

`apps/api/test/business-ops.test.ts` (4 tests, passing) +
`docs/BUSINESS-OPS.md`: comp membership executes as a labeled
no-charge record (never `paid`); the contractor-channel workflow
executes across Sales → Dispatch → Customer Service on real records;
the diagnostics tier is provably separate (scans are core services,
not record kinds — a smuggled "scan" record is refused 400); Ground
Zero land-and-expand runs as project records whose transition map
makes expansion unreachable from `blocked`.

## Clause 5 — Load test against the Part 2 budgets

Part 2 states its quality targets as DESIGN TARGETS (no hard numeric
budgets), so the run measures this environment and labels it as such
(`docs/LOAD-TEST.md`, `scripts/load-test.mjs`): dataset 1 building /
2,000 readings; /health mean 3.55 ms (2,767 req/s); trends over the
full window mean 43.36 ms; owner workspace mean 10.41 ms; full scan
cycle mean 5.04 ms; 630 requests, zero errors. Alarm delivery
latency is not measurable — external delivery is NOT CONNECTED.

## Clause 6 — Store-grade release engineering; rollback demonstrated

- Staged rollouts are tracked as IT-portal `update_rollout` records
  (planned → staged → deployed / rolled_back).
- Rollback demonstrated with two real builds on a shared data dir
  (Task 2 commit 0d482c3 ↔ current HEAD): A live (workspace route
  404) → update to B (401, route exists; /health gains
  deploymentMode) → roll back to A (404, healthy) → roll forward to
  B (401). /health OK at all four steps; the data dir was preserved
  across every switch.
- Version 1.0.0 across the platform packages (the fault engine
  remains 0.3.0 — its own version); git tag `v1.0.0`; release archive
  with sha256 in `releases/`.

## Clause 7 — NOT-BUILT statement and operator runbook written

`docs/NOT-BUILT.md` (NOT CONNECTED / NOT BUILT with exact blockers /
NOT DONE / DESIGN, including the pen test, Part 13 blank, and the
0/0/$0 scoreboard) and `docs/OPERATOR-RUNBOOK.md` (daily checks,
start/stop, backup, access administration, agent governance, update
and rollback procedure, failure playbook).

## Clause 8 — Live deployment on the final build

`scripts/deploy-local.sh` restarted on the v1.0.0 build: edge
/health → OK with deploymentMode "local"; portal shell served;
unauthenticated workspace request → 401. Real deployment data
verified untouched, identical before and after the entire run:
users 3, buildings 0, scans 0, alarms 0, orders 0, products 0,
audit lines 6.

## GATE 6 — RELEASE

Reached and APPROVED by owner standing direction (Nov 9, 2026).
**v1.0.0 is released as a LOCAL deployment** with the pen test NOT
DONE and the NOT-BUILT list above standing exactly as written.

## PART 14 — Whole-home control + Client Job Zero (Nov 9, 2026, post-release)

Verified by execution, not by inspection:

- Full suite 165/165 green (shared 21 · fault-engine 28 ·
  design-system 10 · api 94 · web 12); root `npm run build` green;
  fault engine sha256
  c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f
  unchanged.
- New negative tests prove: listen-only control refused + recorded +
  audited (smoke, CO, air quality); dangerous-load outlets monitor-only
  (space heater / cooking / medical); unknown verbs refused; offline
  failsafe (NOT SENT, desired ≠ reported, MANUAL FALLBACK); bench
  harness is the only applying path and is labeled; mode application
  audited with a live S-001 ACTIVE before and after, bit-identical;
  deployment-mismatched modes refused both directions; commercial
  Closed applies on a commercial building; client sessions are
  tenant-scoped for control (own building only, registration refused).
- Client Job Zero test asserts: real (non-simulator) building; 60
  planned devices (58 across the six named categories + hub + panel)
  at 39 locations, ALL PLANNED / NOT INSTALLED; zero readings; zero
  scans; job record open with the baseline-walk checklist entirely
  unchecked, before-photos [], Fix No. 1 null; mode application
  actuates 0 and records the "actuated nothing" note; seed idempotent.
- Live service proof after restart on this build: /health OK; sign-in
  through the API; the Lowell building + job + 60 planned devices
  returned; a mode applied over HTTP recorded actuated 0 / "actuated
  nothing" in the audit chain; alarm state on Lowell empty; an S-001
  raised on a labeled bench building refused clearing over HTTP
  (403 LIFE_SAFETY_NOT_CLEARABLE). Offline fresh-install proof re-run
  green. Live counts after seeding: buildings include Lowell (real)
  + the labeled proof bench building; Lowell readings 0.
