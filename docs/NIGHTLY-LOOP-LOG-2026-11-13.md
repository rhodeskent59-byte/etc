# Nightly build loop — Fri 2026-11-13 (23:00 MST run)

## Backlog
GitHub `rhodeskent59-byte/etc`: 15 open `[ready]` issues (#1–#15). Picked the top 2, oldest first:
- **#1** — Side A: enforce SQLite foreign keys (PRAGMA foreign_keys)
- **#2** — Side A: validate telemetry values (finite + range checks)

## What was built

### Issue #1 — FK enforcement (commit `2371bb8`)
`PRAGMA foreign_keys = ON` in the `PlatformDb` constructor
(`apps/api/src/db.ts`) — the single connection site every platform.db
opener goes through (app, seed CLI, client-job-zero CLI, tests) — plus
a `foreignKeysEnabled()` accessor so tests can prove the pragma is on.
No behavior change beyond rejecting always-invalid writes.
- New test: `apps/api/test/foreign-keys.test.ts` (5 tests) — pragma
  reports ON; a reading, a gateway and an order line referencing
  nonexistent parents fail with `FOREIGN KEY constraint failed`;
  valid writes still succeed.
- Diff: `apps/api/src/db.ts` +15, `apps/api/test/foreign-keys.test.ts`
  +75 — 2 files, 90 insertions.

### Issue #2 — telemetry validation (commit `983fd54`)
Numeric telemetry is validated in the one shared store path every
ingest route uses (`apps/api/src/gateways.ts`, bench driver +
simulator), before any point or reading row is written, so a rejected
value leaves no trace:
1. Finite — NaN / Infinity rejected (they would poison trend averages).
2. Documented range — the fault engine's `PLAUSIBLE_RANGES` is the
   single source of truth, so ingest and fault firing now agree on
   what a plausible value is. Datapoints with no documented range get
   only the finite check; text/boolean device states pass through
   untouched.
Both ingest routes map the new `InvalidReadingValueError` to HTTP 400
(`INVALID_READING_VALUE`, with datapoint + reason).
- New test: `apps/api/test/telemetry-validation.test.ts` (11 tests) —
  NaN, Infinity, -Infinity; out-of-range (zone_humidity 150, co2 99999);
  boundary values accepted (0/100 humidity, -100/140 zone_temp) and
  just-outside rejected; undocumented datapoints finite-checked only;
  text/boolean states untouched; rejected values store nothing; both
  HTTP routes return 400 and store nothing.
- Diff: `apps/api/src/app.ts` 8 lines changed, `apps/api/src/gateways.ts`
  +51, `apps/api/test/telemetry-validation.test.ts` +146 — 3 files,
  204 insertions, 1 deletion.
- `tsc --noEmit` clean.

## Assumptions
- Issue #2 ranges are the fault engine's `PLAUSIBLE_RANGES` verbatim —
  no new range table invented (noted in the commit message). The issue
  said "documented per-sensor ranges" and that table is the only
  documented set in the codebase.
- Unknown datapoints are finite-checked only, not rejected — rejecting
  them would break extensibility and the issue only asks for documented
  ranges to be enforced.

## Test counts (actual, measured this run — never copied)
- Baseline (before changes, full Side A root suite): shared 30,
  fault-engine 28, design-system 10, api 119 (17 files), web 82 —
  **269 tests, all green**.
- Final (after both changes, full Side A root suite in the working
  tree): shared 30, fault-engine 28, design-system 10, api **135**
  (19 files), web 82 — **285 tests, all green**. No previously-green
  test broke. No BREAKS-LIVE flag.
- Scoped branch verification (clean HEAD + only these two commits,
  branch `nightly/2026-11-13`): api 110 tests green (17 files);
  shared 21, fault-engine 28, design-system 10, web 12 — 181 green.
  The branch numbers are lower because the working tree also carries
  uncommitted equipment/Argon work (see below) that is not on the
  branch. One flaky combined-run failure of `portals.test.ts` in the
  branch worktree was the known hook-timeout issue (HEAD's
  vitest.config lacks the 60s hookTimeout the working tree already
  carries as uncommitted work); the file passes standalone (10/10)
  and the full api suite re-ran green (110/110) immediately after.

## PRs / issue comments — BLOCKED, recorded here
- **No PR:** the GitHub repo does not mirror the local Side A code
  (local repo has no remote configured), so the work lives on local
  branch `nightly/2026-11-13` in
  `~/workspace/your_files/obd-home-systems-platform` — commits
  `2371bb8` (#1) and `983fd54` (#2). Never force-pushed; nothing
  merged (merge waits for Kent's "ship it").
- **Issue comments could not be posted:** the GitHub connector's
  `add_issue_comment` returns `403 Resource not accessible by
  integration` (the Muse GitHub App installation lacks Issues write
  access — same known limitation as `issue_write`, recorded in
  AGENTS.md). Attempted for #1 at ~23:05 MST; approval was granted,
  GitHub refused the write. #2's comment was not attempted separately
  — identical call, identical 403 expected. The summaries + diff
  stats that would have gone in the comments are in this log
  ("What was built" above); they can be posted from the live browser
  signed in as Kent when he wants them on the issues.

## Notes for the 7:00 AM summary
- The main working tree still carries pre-existing uncommitted work
  from earlier sessions (equipment system, Argon backlog tests,
  App.tsx/design-system changes, vitest hookTimeout fix) that is NOT
  on the `nightly/2026-11-13` branch and NOT part of tonight's two
  commits. Tonight's commits were made from a clean HEAD worktree
  precisely so their diffs are scoped to issues #1 and #2 only.
- Nothing was merged, deployed, priced, sent, filed, or paid. The
  human-at-every-sell rule stands.
- Next in the queue (oldest first): #3 Side A telemetry for
  non-INSTALLED devices, #4 Side A TOTP replay protection, #5 catalog
  membership totals, #6 Side A platform.db in the snapshot sync, #7
  portal inventory piece 1, #8–#15 Engine B items.

## Needs Kent's decision
- Merge ("ship it") for #1 and #2 — both are PR-ready on the local
  branch, blocked only by the repo mirror + his word.
- Whether the GitHub repo `etc` should be made to mirror the local
  Side A code so real PRs can be opened (currently no remote).
