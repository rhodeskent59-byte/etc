# ADVANCEMENT HUNT — Building OBD Codebase
**Date:** November 13, 2026 · **Coordinator:** hunt coordinator (7 hunter subagents, one per angle)
**Rule of the hunt (Kent's words):** *findings verified before anything counts.* Every claim below was
re-run by the coordinator personally, on temp copies / temp deployments only. Live trees, live DBs,
and live services were never written, probed, or restarted.

**Verdict counts:** 7 angles · **0 claims REFUTED · 0 claims UNPROVEN** — every proof that was
submitted reproduced exactly under the coordinator's hand. Confirmed items: **5 new fault-code
candidates, 5 new honesty holes (HOLE-2 → HOLE-6), 6 security breaches in live Engine B code
(+ 4 surfaces proven HELD), 1 measured performance fix, 1 gateway wire-up, 1 label-module
proof-of-concept, 1 outage timeline wired to the real API** — plus 2 evidence-backed kills and
several proven negatives.

---

## 1. Findings ledger — every claim, coordinator's verdict, re-run evidence

### Angle 1 — New fault intelligence (Engine A fault engine, temp copy)
Proof: `proofs/angle1-fault-intelligence/prove.mjs` — coordinator re-run: **38 passed, 0 failed**;
shipped engine byte-identical after the hunt (sha256 `c1a09c06e63c…750b3f`, verified);
shipped suite re-run: **28 pass / 0 fail**.

| Claim | Verdict | Evidence observed on re-run |
|---|---|---|
| A-201 humidity climbing steadily (≥10pt/6h and ≥50%) fires WATCH | **CONFIRMED** | Real engine silent on fire fixture; extended engine fires A-201; silent on slow-climb and cross-zone fixtures; boundary 10.0 fires / 9.9 doesn't |
| S-201 pipe temp falling toward freeze (≥8°F/3h, 38<temp≤50) fires WATCH | **CONFIRMED** | Fires where real engine is silent; at 30°F S-101 fires alone (no double-report); fires ~2.25h before S-102 on its fixture trajectory |
| P-102 flow + humidity rise in same zone (correlation) fires SCHEDULE | **CONFIRMED** | Flow-only, humidity-only, and cross-zone fixtures all silent — the correlation itself is the detector |
| H-102 HVAC continuous run ≥180 min fires SCHEDULE | **CONFIRMED** | Real engine ignores the scalar; 45-min and missing-scalar fixtures silent; boundary 180/179 exact |
| N-005 co-located sensor pair disagreeing >5°F ≥30 min fires WATCH | **CONFIRMED** | Small-spread fixture silent; offline pair member → N-001 fires alone |
| "Short-cycling needs a new code" | **CONFIRMED KILL** | Shipped engine already fires H-001 on `hvac_starts_per_hour: 9` — a new code would duplicate it |
| "Refrigerant/compressor pressure trend code" | **CONFIRMED KILL** | No pressure datapoint exists anywhere in either engine's data model; both engines ignore pressure keys (`[]`). This is a datapoint-library gap, not a fault code |

Framing discovery (matters for adoption): Engine A is a **snapshot engine, not time-series** — every
shipped "trend" is an upstream-computed scalar (`flow_duration_min`, E-201's baseline object). All
five candidates are spec'd as new upstream scalars in that exact idiom, the same adoption shape as
Day 12's H-003/N-004. All thresholds are **DESIGN DEFAULTs, unvalidated against real hardware.**

### Angle 2 — Honesty surfaces, round 2 (Engine B, temp DB seeded by the app's own code)
Proof: `proofs/angle2-honesty-surfaces/` (scenario + supplement + checker) — coordinator re-ran
the whole chain fresh: scenario exit 0, isolation supplement OK, checker **16/16 PASS**, every
verdict re-derived from fresh captured outputs. HOLE-1 was re-captured only as a reference check
and is **not** counted here.

| Claim | Verdict | Evidence observed on re-run |
|---|---|---|
| **HOLE-2** — Owner portal (`web/context.py`, the surface Day 15 left unaudited) counts SIMULATOR readings as "Live Readings" | **CONFIRMED** | Rendered page says "3 Live Readings" where 2 of 3 readings are SIMULATOR; page contains zero occurrences of SIMULATOR/SIMULATED. Health summary's `counts_by_state` shadows SIMULATOR to 0 and `_building_info` discards it entirely |
| **HOLE-3** — alarms lose provenance at write time; SIMULATOR-triggered alarms present as real on every surface | **CONFIRMED** | The `alarms` table has **no source_type / reading-id column** and `ingest.py` records none — a SIMULATOR-triggered alarm is field-identical to the BENCH_HARNESS control in the Owner list, `GET /alarms`, and monitoring, where it renders under **"Alerts — Real Alarms"** beside the page's own claim *"simulated data never raises alarms."* |
| **HOLE-4** — Client portal badge is a hardcoded false all-clear | **CONFIRMED** | `context.py:505` hardcodes **"0 ACTIVE FAULTS · HOUSE NOT MONITORED"**; the client branch never queries alarms. Rendered false with 3 ACTIVE alarms in the DB, and in phase 2 it contradicts the same screen's own "Building Status: ACTIVE" tile |
| **HOLE-5** — Wall Panel prints a static detector claim that can be false | **CONFIRMED** | `panel.html.j2:35` unconditionally prints *"all 5 smoke/CO detectors are PLANNED (0 installed)"* while the fixture DB has one INSTALLED with an ACTIVE life-safety alarm (whose count the same panel shows unbadged). The owner/monitoring equivalents are correctly conditional; only the panel's is frozen text |
| **HOLE-6** — a SENT Health Scan's customer document still says DRAFT | **CONFIRMED** | Stored `report_markdown` is byte-identical at DRAFT and after SENT, still reading *"Report status: DRAFT — pending Owner approval"* (`healthscan.py:635` hardcodes it; approve/send never regenerate). The SENT JSON and report page carry status SENT and the stale DRAFT line simultaneously |
| Telemetry API preserves honesty | **CONFIRMED NEGATIVE** | `GET /telemetry/readings` returns `"source_type": "SIMULATOR"` per row |
| Commercial monitoring leaks nothing | **CONFIRMED NEGATIVE** | With the poisoned DB the page still shows 0 sites, 27 SAMPLE badges, no fixture values or alarm text |
| Simfeed table cannot move portal counts | **CONFIRMED NEGATIVE** | Planting a `simulated_readings` row leaves portal `readings_count` unchanged |
| Dispatch/other portals carry no readings surface | **CONFIRMED NEGATIVE** | Context keys enumerated; no readings/alarms fields exist to leak through |

### Angle 3 — Performance, measured (temp copies of Engine B; harness re-run in full by coordinator)
Proof: `proofs/angle3-performance/` (harness + fix.patch + raw JSON). Coordinator rebuilt both
variants from scratch, applied the patch cleanly, and ran the identical 5-rep protocol.

| Claim | Verdict | Coordinator's own numbers |
|---|---|---|
| Reads under batch-write load are queue-hostages in baseline Engine B | **CONFIRMED** | Baseline loaded-read medians across 5 reps: **24.4, 0.60, 0.58, 19.2, 19.5 ms** — a queue-position lottery (hunter's reps: 0.59–38.38 ms). Unloaded: ~0.076 ms |
| WAL reader pool + a one-line event-loop yield removes the tail, functionality unchanged | **CONFIRMED (with the median caveat)** | Fixed loaded-read medians: **4.63, 4.05, 4.08, 4.28, 4.12 ms** — tight every rep. Concurrent loaded throughput: baseline 160–180 rps → fixed **396–491 rps**. Unloaded reads and write-batch speed unchanged. Response-set hash identical across variants (hunter-verified) |
| The reader pool alone is the fix | **CONFIRMED KILL** | Ablation: pool alone made loaded medians *worse* (62.4 ms). Diagnosis measured: reader SQL finished in 0.52 ms but the coroutine resumed 42.9 ms later — `_writer_loop` drains a non-empty queue in one event-loop step and starves all callbacks. The cure is pool **plus** `await asyncio.sleep(0)` per drained write |

Honest caveat, carried from the hunter and reproduced: the fix does **not** beat the baseline's
lucky median draws — it **eliminates the tail**. Bonus finding: a deep write queue stalls Engine
B's *entire* event loop, not just reads.

### Angle 4 — Security, live-code round (temp deployments of Engine B only; ports 19101–19201)
Proof: `proofs/angle4-security/` — coordinator re-ran **all 10 exploit scripts** against fresh
temp instances; every verdict reproduced identically.

| Probe | Verdict | What the re-run showed |
|---|---|---|
| P01 Session revocation | **BREACH (Medium) — CONFIRMED** | Logout revokes own jti (held), but sessions survive **both** password rotation **and** TOTP-secret reset — old session still 200 at /auth/me alongside new-credential sessions. No password-change / revoke-all / TOTP-reset endpoint exists (all 404) |
| P02 JWT attacks | **HELD — CONFIRMED** | All 16 variants 401: alg=none, signature stripping, HS256 with the server's public-key PEM as HMAC secret, attacker Ed25519 key, and a properly server-signed orphan JWT with no sessions row |
| P03 TOTP / challenge reuse | **BREACH (Low–Medium) — CONFIRMED** | Same-code replay held (both directions), ±2-step / cross-user / expired-challenge held — but **one challenge token minted 2 additional distinct sessions** (next-step and prev-step codes both accepted, both valid at /auth/me). Challenges are stateless and never consumed |
| P04 Throttling | **BREACH (Medium) — CONFIRMED** | No rate limit, lockout, or attempt counter anywhere: **300 wrong TOTP codes on one challenge in ~1.0s (~293 req/s, zero 429s)**, correct code on the same challenge then accepted; 40 wrong logins then correct login 200. Estimated MFA bypass ~19 min for someone holding the password |
| P05 Login enumeration | **HELD — CONFIRMED** | Byte-identical generic 401 body across unknown-user / wrong-password / wrong-portal; timing medians in the same Argon2 band |
| P06 Portal boundary + fixation | **HELD — CONFIRMED** | `require_portal` routes and web portals 403 cross-portal both directions; no fixation (server-minted uuid jti, bridge verifies first). Info note: bridge cookie lacks `Secure` (documented localhost choice) |
| P07 Any-portal privilege | **BREACH (Medium) — CONFIRMED** | Routes guarded only by `get_current_principal` (telemetry, alarms, proposals) accept **any** portal: a Client (homeowner) token **wrote telemetry on an INSTALLED device (201, raised WATER_LEAK), listed all alarms, CLEARED the alarm (200, verified in Owner view), and filed a tier-3 PAYMENT proposal (201)**. Portal isolation is route-by-route, not systemic |
| P08 Gateway key | **HELD — CONFIRMED** | Unset key fails closed (503) on all attempts; wrong/misplaced/session-token keys all 401; `hmac.compare_digest` in code; credentials not interchangeable. Low observation: no throttling on key guessing (folds into P04) |
| P09 Workforce proposals | **BREACH (Medium) — CONFIRMED** | Non-Owner approve/reject 403 on both paths and forged approver fields at creation ignored (held) — BUT: a Sales session planted a fake `workforce.fault_triage` draft that appears in the Owner's queue; a workforce-**REJECTED** proposal was **resurrected to APPROVED** via the generic `/proposals/{id}/approve` (no state check in commands.py, 200); re-approving overwrote `owner_approval_jti` with a second Owner session; `verify_chain` appears 0× in either approve module |
| P10 TOTP secret storage | **BREACH (Medium) — CONFIRMED** | `totp_secret_enc` is **plaintext** despite the name — read verbatim from the temp state.db and used to complete a real MFA login (200). Seed stores raw; auth feeds it straight to pyotp. A database/backup read defeats MFA for every portal |

### Angle 5 — Gateway integration (temp copy of the swarm staging tree)
Proof: `proofs/angle5-gateway/gateway/` — coordinator re-ran all suites: **gateway_core 9 OK,
buffer 7, watchdog 15, new e2e 2, combined pytest 24** — all matching. Coordinator also verified
by `cmp`: all three pre-existing test files byte-identical to the originals; the original tree
still defines its duplicate LinkState (untouched); the wired copy defines LinkState **exactly once**.

| Claim | Verdict | Evidence |
|---|---|---|
| LinkState unified; ingest → buffer → watchdog wired end-to-end (Day 7's spec) | **CONFIRMED** | Canonical `LinkState(str, Enum)` in `gateway_core/links.py`; watchdog imports it. One seam (`gateway_integration/adapter.py`) converts Reading dataclasses ↔ buffer dict records; `IntegratedGateway` drives the real modules, no mocks |
| Outages are first-class records from the moment they open | **CONFIRMED** | `mark_disconnected` writes the record immediately (`ongoing: true`); `mark_connected` completes the same record in place (e2e-verified 300.0s window) |
| Bonus bug found by the wiring | **CONFIRMED** | A mid-outage reading used to **auto-close** the outage (the mechanism behind Day 19's shim). Fixed in the staging copy: only `mark_connected` closes an explicit outage — a deliberate semantics change, flagged for any promotion decision |

### Angle 6 — Label module proof-of-concept (staging, temp DBs)
Proof: `proofs/angle6-label/` — coordinator re-ran the suite: **17 passed in 0.27s**, matching.

| Claim | Verdict | Evidence |
|---|---|---|
| The F-6 label lifecycle can be built in Engine B's idiom and gated correctly | **CONFIRMED** | Issuance succeeds only from APPROVED/SENT scans; refused from DRAFT/INTAKE; one ACTIVE label per scan enforced in code **and** by a partial unique index; Owner-only revocation with reason + stamps; re-issuance after revocation mints a new serial; public verify returns status + dates + scan type only — a test asserts no building/client/issuer/measurement keys appear and the address string appears nowhere in the result |
| Caveat wording discipline | **CONFIRMED** | Every invented caveat string carries **"PROPOSED WORDING — NOT APPROVED"** (13 text occurrences, coordinator-counted). Serial format `ETC-LBL-<YYYY>-<NNNNNN>-<check digit>` encodes no private data |

### Angle 7 — Outage timeline, wired (temp Engine B copy → verbatim HTTP fixture → renderer → verifier)
Proof: `proofs/angle7-outage-timeline/` — coordinator deleted all generated files and re-ran the
full pipeline from scratch: **29/29 checks passed, verifier exit 0**.

| Claim | Verdict | Evidence |
|---|---|---|
| GAP survives builder → view-model → HTTP, and a customer view can draw it honestly | **CONFIRMED** | Fixture is the **verbatim HTTP body** of `GET /monitoring/api/device/43/history`: 84 READING + 1 GAP (09:00–12:00 UTC, 10800s), identical at all three layers. Rendered line splits into segments of 36 and 48 points; no segment enters the hatched, labeled "NO DATA — outage" band; every rendered point matches its recomputed position (±0.6px); axis ticks come from the data |
| Correction to the Day 20 record | **CONFIRMED** | Day 20's hand-shaped fixture invented `label`/`reason` fields on GAP entries. The real API carries **only** `type/start/end/duration_sec` — renderers must derive labels/coverage from the entries |

---

## 2. Confirmed advancements — what they are, why they matter, what adoption takes

**A. Five new fault codes (Angle 1).** The product's detection library grows from 22 to 27 codes
(29 with Day 12's H-003/N-004) — including its first *leading* indicator (S-201 warns ~2¼ hours
before the static freeze codes) and its first *correlation* detector (P-102: flow + humidity in
the same zone — the classic slow-leak signature neither signal betrays alone). **Adoption takes:**
Kent's registry decision per code (same gate as H-003/N-004); the collector must compute the new
upstream scalars; thresholds are DESIGN DEFAULTs until real Lowell telemetry exists to validate
them (Runbook Gap #4 — sensor count still unconfirmed).

**B. HOLE-2 → HOLE-6 (Angle 2).** These are the trust core of the product: a monitoring company
whose screens can't tell simulated from real — or that tells a homeowner "0 ACTIVE FAULTS" during
an active life-safety alarm (HOLE-4) — has no honest product. HOLE-3 is the deep one: alarms lose
provenance **at write time** (no source column in `alarms`, ingest records none), so HOLE-1's
one-query history fix — already on Kent's D5 list — **does not fix alarms**. **Adoption takes:**
engineering fixes, no product invention: HOLE-2 (group/count by source in the Owner context),
HOLE-4 (query alarms in the client branch; never hardcode an all-clear), HOLE-5 (make the panel
sentence conditional like its siblings), HOLE-6 (regenerate report markdown on approve/send).
HOLE-3 needs a schema + write-path change (record source_type/reading id on alarms; badge or
segregate simulator-raised alarms) — bigger, and it should ride with the D5 decision.

**C. Six live-code security breaches (Angle 4).** None of these were in F-1–F-24 (Day 29 hit the
staging builds; this round hit the shipping code). The three that matter most:
- **P07** — portal isolation is route-by-route: a homeowner token wrote telemetry, **cleared an
  alarm**, and filed a payment proposal. Alarm integrity is the product's promise; this breaks it.
- **P10** — TOTP secrets sit in `state.db` in plaintext under a column named `*_enc`. Any DB or
  backup read (including the hourly snapshots) defeats MFA for every portal.
- **P09** — the generic proposal-approve path has no state machine: a workforce-REJECTED draft
  was resurrected to APPROVED, and the approver stamp is overwritable — with `verify_chain`
  never called. This touches Kent's "human at every sell" rule directly: the approval record is
  the trust artifact, and today it can be rewritten.
Plus P01 (sessions survive credential rotation — no revoke-all exists), P04 (no throttling
anywhere; ~19-minute MFA bypass estimate for a password holder), P03 (challenge tokens are
stateless and reusable across codes within the window). **Adoption takes:** engineering fixes
(systemic portal scoping instead of per-route checks; encrypt TOTP secrets with a real key —
a key-custody choice for Kent; consume challenges on use; add throttling; state-check the
generic approve and verify the chain). JWT, enumeration, guarded-route boundaries, and the
gateway key all **held** — the crypto core is sound; the gaps are session/authorization plumbing.

**D. Reader-off-queue performance fix (Angle 3).** Under ingest/write load, every Engine B read
today rolls dice between 0.6 ms and 38 ms; the proven fix (WAL reader pool + one-line yield)
makes loaded reads a steady ~4 ms and roughly triples concurrent read throughput, with writes
and responses unchanged. **Adoption takes:** applying `fix.patch` to the live tree — a deploy
decision under Kent's "ship it" gate, ideally through the nightly loop as a PR.

**E. Gateway wire-up (Angle 5).** The gateway is no longer three proven parts in separate boxes:
one LinkState, one seam, one end-to-end path, outages recorded from the moment they open. This
was Day 7's named seam and decision D10's option (i). **Adoption takes:** Kent's D10 call to
promote the staging tree (a straight copy), with the two buffer semantics changes named in the
promotion (open-outage record; append no longer closes an explicit outage).

**F. Label module PoC (Angle 6).** F-6's missing lifecycle now exists as working, tested code in
Engine B's own idiom — the "$249 report **and label**" promise is buildable as specified.
**Adoption takes:** Kent's D4 decisions — the canonical caveat wording (his text or approval of
the PROPOSED draft), the serial format and one-active-label rule, build-vs-strike on the label
promise, and D8 hosting if verify is to be genuinely public.

**G. Outage timeline wired to the real API (Angle 7).** F-7's last mile is closed as a working
staging artifact: real API shape in, honest gap out, structurally verified. **Adoption takes:**
wiring the renderer into the customer-facing history view (small product/UI job) — the data
layer needed no changes; the gap was never lost, only never drawn.

---

## 3. Per-angle coverage notes (including honest negatives)

- **Angle 1:** 7 candidates examined; 5 proven, 2 killed with evidence. Coverage limit: fixtures
  are SIMULATED scalars against Engine A's engine only (Engine B has no registry to test against —
  F-1); no candidate was tested against real sensor streams because none exist yet at Lowell.
- **Angle 2:** 10 surfaces audited (Owner, Client, Wall Panel, monitoring residential, monitoring
  commercial, telemetry API, alarms API, health-scan report, dispatch + 16 other portals by
  context enumeration, simfeed supplement). 5 holes, 4 proven negatives, HOLE-1 reference-only.
- **Angle 3:** 1 fix proven with a full ablation (pool-alone refuted). Limits: measurements on
  this small shared-CPU box; unloaded concurrent throughput was noisy and no claim was made there.
- **Angle 4:** 10 probes, all re-run by the coordinator. 6 breaches, 4 held. Coverage limit:
  temp deployments with invented credentials — payment-webhook and Lane F paths were out of
  scope (Day 22/29 covered the staging side); no live probing of any kind.
- **Angle 5:** full DoD met in a temp copy; original staging tree verified untouched by `cmp`.
  Promotion was explicitly NOT taken — it is a decision, not a hunt result.
- **Angle 6:** 17 tests cover issuance gating, double-issuance, revocation, re-issuance, tamper,
  and verify privacy. Simplification on the record: the PoC is synchronous sqlite3, not wrapped
  in Engine B's async SingleWriterDbActor + audit ledger — the wrapping is a listed adoption step.
- **Angle 7:** verification is structural (coordinates, segments, fixture fidelity), not a pixel
  screenshot — same limit Day 20 recorded. One metric (temp_f) proven; the shape is metric-generic.

## 4. Proof index

All proofs are preserved twice: inside each `angle*/proofs/` folder and collected under
[`proofs/`](sandbox://workspace/your_files/advancement-hunt-2026-11-13/proofs/) (125 files).
Every re-run command in this report appears in the corresponding angle's FINDINGS.md.

## 5. What did NOT happen

Nothing was deployed, merged, sent, charged, or installed. No live DB, service, or tree was
modified — verified after the hunt: Engine A engine file sha256 unchanged, live DB counts
unchanged (60 PLANNED / 0 installed), scoreboard unchanged ($0 revenue, 0 kits, 0 members,
house NOT MONITORED). Every item above is a staging proof awaiting Kent's decisions where flagged.
