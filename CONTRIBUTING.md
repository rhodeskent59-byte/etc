# Contributing to OBD Home Systems

One codebase: `packages/` (shared registries, the byte-identical fault
engine, the design system) and `apps/` (the Fastify platform service,
the React portal shell).

## Build and test

```sh
npm ci
npm run build   # shared → design-system → api → web
npm run test    # every workspace; all suites must be green
```

Node ≥ 22 is required (the platform store uses `node:sqlite`).

## Rules that are not negotiable

1. **Honesty states are features.** A portal with nothing connected
   reads NOT CONNECTED; an empty portal reads as an honest empty
   state; simulator data is badged SIMULATOR and never merges with a
   real building's records. Never dress up state.
2. **Life safety.** S-001/S-002 alarms can never be cleared through
   any UI or API. Do not add a path that does. The negative tests are
   the contract.
3. **No secrets in the repo.** The credential registry stores metadata
   only; secret-shaped input is rejected by the firewall and the
   refusal is audited. Example configs carry placeholder names only.
   Run `scripts/secret-scan.sh` before committing.
4. **The fault engine is byte-identical.** `packages/fault-engine/
   fault-engine.mjs` must keep sha256
   `c1a09c06e63c29cba1de7a5049b7f1f63e1b47076d984127dc3ec6231b750b3f`.
   Changes to diagnostics behavior go around it, never inside it.
5. **Money honesty.** Prices are PROPOSED or UNPRICED until the owner
   confirms them (Part 13 worksheet). An order reaches `paid` only
   through the provider confirmation flow in test mode. No real
   payment provider is named as chosen anywhere.
6. **Agent limits.** Agents never hold credentials, never clear
   life-safety alarms, never perform licensed work, and never send,
   pay, file, publish, change prices, or grant access — those are
   Tier 3, the owner's tap, enforced in `apps/api/src/agents.ts`.
7. **Tests prove outcomes.** New behavior lands with tests that prove
   the observable result (the record, the denial, the audit entry),
   not with screenshots of steps.

## Commits

Small, logical commits on `main`, one concern each. Deviations from
the engineering pack are recorded in `BUILD-LOG.md` with their reason;
verification evidence goes in `VERIFICATION.md`, clause by clause.
