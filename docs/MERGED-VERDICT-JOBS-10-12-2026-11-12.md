# MERGED VERDICT — OBD Home and Office Systems
Web deep research (sourced, ~/workspace/research_notes/obd-home-office-systems-benchmark-20261113-0356/) cross-checked against Argon Jobs #10, #11, #12 (4 Argon, Nov 12, 2026, 8:59–9:36 PM MST). Verified by Chappie Nov 12 ~21:40 MST. Argon is a drafting engine, never an authority — conflicts below are ruled on the sourced evidence.

## WHERE BOTH TRACKS AGREE (high confidence)
1. **Prior art:** tried before, comprehensively. No surviving company sells diagnostics-first monitoring as the standalone product to owners of small homes. The novelty that survives is the packaging: diagnostics-first, non-alarm, cross-system (water + HVAC + energy + acoustic smoke/CO + security points), kit + membership + technician portal, homes AND small offices.
2. **Winners win on channel/service, not diagnostics.** Alarm.com FY2025: $1.0112B revenue, SaaS $689.4M at ~86% gross margin (SEC-filed; both tracks cite the same 10-K figures). Dealer/partner channel is the business. Pure diagnostics players get acquired (BrainBox→Trane, 75F→Carrier).
3. **Portals collapse.** Web: 22 → 3. Argon: 4 active launch portals (Owner, Client, Install Tech/Dispatch, Storefront/Wall Panel), other 18 stay honest NOT CONNECTED shells. Same direction; adopt Argon's 4 (storefront already sells).
4. **Fault detection rules-first, deterministic.** AI narrates, translates, drafts, and verifies photos — never invents readings, prices, health scores, or life-safety states. Both tracks, same boundary (web adds the Air Canada liability case behind it).
5. **AI employees are cheap at the token level and viable as draft-only workers.** Argon's 6-agent spec (triage/briefing, report scribe, photo/label auditor, dispatch intake, quote drafter, bookkeeping support), all writing to a PENDING_OWNER approval queue: ~$9.70–$18.26/mo at 25 buildings (Argon's own Python-checked token math, ESTIMATE). Web concurs: raw tokens <1¢/interaction; platform fees/QA/escalation are the real costs. ServiceTitan charges $2.75/call for the same trick — build in-house on the Flash API.
6. **Residential first; commercial is a fork, not a second platform.** Shared core (telemetry, alerts, audit, dashboard shell) + forked edge (Zigbee/Z-Wave home; BACnet/Modbus commercial). Commercial fork only after ~5 paying residential customers (Argon #12; web's reachable commercial segment = residential-like small commercial, supplementary monitoring only, in writing).
7. **Sell the service, not the dashboard.** Cash Health Scans ($99/$149/$249, approved prices) + labeling are the cash engine now; partners (plumbers/HVAC/property managers) before ad spend. Web GTM rank and Argon Moves agree.
8. **Monitoring honesty features are the product:** heartbeat/OFFLINE states, GAP markers instead of flat lines, alert deduplication, weekly canary test. (Argon #12 §2.6; matches web §8 dashboard requirements.)

## CONFLICTS — AND THE RULING
1. **SQLite vs PostgreSQL.** Argon #10: "Keep FastAPI + dual SQLite — you have built it, do not rewrite it." Web: "SQLite in cloud is the clearest technical debt — move to PostgreSQL + TimescaleDB before paying customers." Argon #12 itself lists "buying Timescale before SQLite proves insufficient" as a trap. **Ruling: both are right in sequence — SQLite stays for the local-first pilot and first installs; the Postgres move is scheduled BEFORE paying cloud customers, not now and not never.**
2. **BrainBox AI acquisition.** Argon: "acquired by Trane Aug 2025 for $150M (VERIFIED)." Web (sourced): acquired by Trane Jan 2025, price NOT DISCLOSED. **Ruling: Argon's figure is NOT adopted. Record: Trane acquired BrainBox (Jan 2025 per sourced research); price not disclosed.**
3. **Sense.** Argon: "acquired by VergeSmart?" (its own question mark). Web: Sense exited consumer hardware Dec 31, 2025 (VERIFIED). **Ruling: web version stands; Argon's guess discarded.**
4. **Facilio funding.** Argon cites both $35M Series C and $45M Series C in the same job — internally inconsistent. **Not adopted; Facilio figures stay at the web report's sourced values.**
5. **CAC numbers.** Argon §5.1 channel costs are MODEL-KNOWLEDGE/ESTIMATE. Web provides sourced figures (e.g., LocaliQ HVAC leads $127.74 REPORTED). **Ruling: plan on the web numbers; Argon's are directional only.**
6. **Argon's invented kit price.** Job #10 Move 2 proposes a "$1,105.86 Starter" configuration. **Not adopted — Kent's approved catalog governs pricing; a starter-tier kit is a Kent decision, not an Argon one.** The underlying observation (23 smart bulbs inside a diagnostics kit will make buyers balk; lighting as an optional add-on pack) is noted for Kent.
7. One garbled paragraph in Job #10 ("April and Blake are one person…") is disregarded — no meaning recoverable, nothing rests on it.

## THE BUILD SEQUENCE THAT RESULTS (feeds Kent's "build the very best" order)
1. **Deploy the finished Live Monitoring build** (ingestion + PLANNED block + SIMULATED feed + residential/commercial dashboards, 24/24 tests) to live Engine B — AWAITING Kent's tap (options presented Nov 12 ~21:09 MST).
2. **Health Scan intake + AI report generator** (Argon #11 Move 1): measurements in via Tech portal → deterministic findings → Flash-drafted plain-language report → Owner approves → customer gets the report. Turns the software into the cash tool.
3. **Multi-client scoping + blueprint cloning** (#11 Move 2): client_id filtering + clone the 7965 blueprint to spin up Building #2 in PLANNED state with its own client login.
4. **Monitoring honesty pack** (#12 Moves): alert deduplication, heartbeat/OFFLINE, GAP markers, canary test, alarm→dispatch action. (Live-pulse 10s refresh already in the monitoring build.)
5. **Photo + QR label validator** (#11 Move 3) at the PLANNED→INSTALLED gate — needs first real devices in hand.
6. **AI workforce agents 1–6**, draft-only into PENDING_OWNER, after 2–4 land.
7. **Commercial BACnet fork** — only after 5 paying residential customers.

## ARGON'S OPEN QUESTION TO KENT (Job #10, relayed verbatim in substance)
Of the 60 PLANNED devices on the 7965 Lowell blueprint, how many physical sensors/plugs does Kent actually have in hand at the house right now that could be wired up, labeled with the P-Touch, photographed, and flipped PLANNED → INSTALLED this week — so the demo runs on 5–10 real devices when he talks to first buyers?

## FILES
- Web research: ~/workspace/research_notes/obd-home-office-systems-benchmark-20261113-0356/report.md + report-addendum-findings-6-7-8.md
- Argon diagrams: ARGON-JOB-11-TARGET-ARCHITECTURE-DIAGRAM.txt, ARGON-JOB-12-DATAFLOW-DIAGRAM.txt (this folder)
- Findings page: artifact "OBD Home and Office Systems Benchmark" (web research; Argon cross-check summarized in chat Nov 12 ~21:40 MST)
