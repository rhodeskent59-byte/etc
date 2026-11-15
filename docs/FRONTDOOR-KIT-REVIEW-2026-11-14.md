# Front Door Security Kit — Chappie review (Nov 14, 2026)

Status: **UNTESTED — read-only review. Nothing installed, nothing run.**
(Installs rule + competition/pasted-package intel rule: adoption needs Kent's explicit word.)

## The four zips are really two builds
- frontdoor-security-kit.zip = v0, core only (hub 11 KB + dashboard + PWA shell).
- __1 = the full kit (hub 15.7 KB, dashboard, ble/blink/clue bridges, Android TWA project, DVR/BLE readme). No installer.
- __2 and __3: **every code file byte-identical to __1** (md5-verified); they add the installer (install.py/.sh/.bat + requirements.txt, identical in both). __3 is effectively a re-zip of __2.

## What it is
A standalone front-door hub written for Lowell's actual gear:
- `security_hub.py` (stdlib only): WiZ local UDP control/discovery/motion polling (real WiZ protocol, port 38899), push alerts via ntfy.sh, a fiber check (30 s ping, outage at 3 fails), dashboard PWA on port 8765.
- `blink_bridge.py`: blinkpy-based; Blink email/password typed on the machine, PIN via Blink's own 2FA prompt, session saved to config/blink.json; polls cameras every 30 s and posts motion/arm events to the hub.
- `ble_bridge.py` + `clue_security_node.py`: the Adafruit CLUE Kent owns becomes a door node (TAP via accelerometer, DOOR_OPEN via a switch on the A pad, TEMP every 60 s) over a Bluefruit LE Friend serial dongle.
- `install.py`: venv + pip (requests, pyserial, blinkpy with --with-blink), py_compile check, boot test, systemd **user** services, --uninstall. All 11 subprocess calls accounted for (venv/pip/compile/systemctl).
- Android route is a PWA install, with a TWA project for a future Play build.

## Risk scan — CLEAN as read
- Outbound endpoints in the entire kit: **https://ntfy.sh only** (plus the hub's own localhost). Dashboard fetches only the hub's relative endpoints.
- No eval/exec/os.system/teardown calls anywhere; installer subprocess use is exactly what its docstring says.
- Blink credentials go only to Blink's cloud via blinkpy and are stored locally by blinkpy's own save (config/blink.json — plaintext tokens, as the readme admits; deleting the file forgets them).

## Bugs and soft spots found by reading
1. **BLE pushes never fire (real bug):** ble_bridge's PUSH_EVENTS = {"TAP", "DOOR_OPEN"}, but handle() compares the remapped kinds "tap"/"door" — never equal, so push is always False. TAP/DOOR_OPEN land in the log but never reach the phone, contradicting the readme.
2. **Fiber status flips early:** the hub writes status "outage" into state on the FIRST failed check; only the push waits for 3. Dashboard can show an outage the readme says needs 3 checks.
3. **Hub has no auth and binds 0.0.0.0:8765:** anyone on the LAN can flip the lights, retarget the ntfy topic, inject fake camera/BLE events, or register a fake DVR. (Same pattern as the fiber kit; flagged there too.)
4. **/api/blink_status trusts any LAN POST:** it sets Blink "LINKED" on the bridge's say-so — reasonable design, but the tile is only as honest as the LAN.
5. **ntfy topics are public:** anyone who learns the topic can read the front-door alerts and post fake ones. The hub generates a fresh random topic per install (good); the topic printed in the readme (frontdoor-nnbaw2szga) is the author's test topic — never use it.
6. Cosmetic: motion sensors never get renamed in scan_wiz (name is always already set).

## Claims vs reality
- "Tested end to end before shipping" is the **author's claim — not verified by Chappie**. Nothing here was run.
- WiZ: the kit assumes a WiZ motion sensor + 2 WiZ bulbs at the front door. Kent's record says bulb brand is **unconfirmed (possibly WiZ)** — if they aren't WiZ, discovery finds nothing and the hub is a dashboard of NOT LINKED tiles.
- Night Owl D12: the hub does not proxy video; it builds Hikvision-format RTSP URLs and the readme itself says the firmware may differ. Unverified against the actual D12.
- Blink via blinkpy is the real community path and fails honestly, but Blink cloud changes break it from time to time.
- The fiber card duplicates the Fiber Monitor already live on the Sony (port 8799) — same 30 s / 3-fail design.
- It is a **parallel standalone hub**: its own event log and state file, no connection to Engine A/B, no fault codes. Lowell's Blink ×3, Vivitar doorbell, and CLUE already exist in the OBD platform as PLANNED devices (ids 42–47), none installed.

## Verdict
Clean, competently written, unusually honest labeling (NOT LINKED states are real, limits are stated). Two real bugs (BLE push, fiber status) and one standing exposure (no-auth LAN server + public push topic). Filed as intel only — not installed, not run, nothing adopted.

## Addendum — AI agent added at Kent's direction (Nov 14, 2026 ~01:20 MST)
Kent directed: add an AI agent to this kit. Built `agent/frontdoor_agent.py` (stdlib-only, read-only against the hub): escalation rules (door-within-3-min-of-motion, quiet-hours motion clusters, stale Blink heartbeat, fiber flapping, hub-down reported as NO DATA), a rescue for the kit's broken BLE pushes (fresh events only; stale ones logged, not pushed), an hourly/daily digest with a coverage statement, and an ask mode over the real log. Optional LLM digest polish exists only behind env config (template composer by default, footer always names the composer). **16 unit tests green** (fake hub; one real routing bug found and fixed — "linked" was sending camera questions to the fiber answer). **Live smoke passed** against the kit's actual hub in a sandbox: injected Blink motion + CLUE door events produced the rescue + correlation findings, a correct digest, and correct ask answers. The smoke also caught an agent design bug — the history baseline was per-process, so a restarted agent would silently swallow events from its downtime; fixed (baseline flag persisted + stale-rescue discipline) with regression tests 15–16. Packaged with the kit as `frontdoor-kit-with-agent-2026-11-14.zip` (sha256 c4404427…, 58 files, no bytecode caches). **Not installed anywhere** — the Sony install is a separate step awaiting Kent's go.

## UI addendum (Nov 14, 2026 ~01:45 MST)
At Kent's direction ("add a super high grade tech ui") the kit's dashboard was rebuilt as a premium command-center page (`ui/dashboard.html`): frosted-glass tiles on carbon, orange accent, a live hero status derived only from real hub state, KPI row, a page-session fiber latency sparkline (labeled as session-only), and the full event log as a styled feed. It speaks the hub's API exactly as the original did — every original function preserved — and quietly fixes two original defects (the DVR username is now also sent as `rtsp_user`, the field the hub actually reads; event/device text is escaped before rendering). Verified: JS syntax check + the real hub serving it in a sandbox. No screenshot tooling exists on this VM, so no rendered preview was produced — first visual proof is the live page on the Sony. Both deliverables rebuilt with the new UI: kit zip sha256 e1d3c405…, Sony installer tarball sha256 7d9c034f… (re-staged in kentr's Sony home, far-end verified).
