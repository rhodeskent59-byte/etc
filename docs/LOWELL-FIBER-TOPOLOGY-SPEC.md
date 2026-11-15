# Lowell Fiber Network — Full Topology Spec
**Property:** 7965 Lowell Blvd, Westminster, CO — single-story ranch, 752 sq ft (built 1946) + detached garage, 900 sq ft
**Layout of record:** Rev F — Living (SW), Dining (center), Kitchen (front-center), Laundry (NW), utility closet (HVAC + water heater, center-north), Bath, Bedroom 1 (SE), Bedroom 2 (east)
**Date:** Nov 13, 2026 · **Status: SPEC ONLY — nothing ordered, nothing purchased**
**Price basis:** every price below was observed on a live listing or a price-checked source on Nov 13, 2026 (sources linked per line). Prices move; re-check at order time. Cable **lengths** are ESTIMATED from the floor plan and labeled as such. Lines that could not be price-verified are marked **UNPRICED** and are **not** in the total.

---

## 1. The topology — your layout

```
        DETACHED GARAGE (900 sq ft) — the "remote building"
  ┌──────────────────────────────────────────────────────────────┐
  │  [Bridge B: NanoBeam 5AC]──▶[USW-Lite-8-PoE]──▶[AP-2: U6 Pro]│
  │                                  │                           │
  │                                  └─ PoE ports reserved for   │
  │                                     future garage cameras    │
  └───────────────────▲──────────────────────────────────────────┘
                      )))  5 GHz point-to-point air link  (((
                      (    hop is tens of feet, clear LOS     )
  ┌───────────────────┴──────────────────────────────────────────┐
  │  HOUSE (752 sq ft)                                           │
  │                                                              │
  │  [Bridge A: NanoBeam 5AC] on house eave, PoE-fed from core   │
  │                                                              │
  │     UTILITY CLOSET (center-north) = NETWORK CORE             │
  │     ISP fiber ─▶ [ONT] ─▶ [UDM-Pro router / firewall]        │
  │                              │ 10G DAC (SFP+)                │
  │                              ▼                               │
  │                       [USW-Aggregation — 8× SFP+ 10G core]   │
  │                         │          │             │           │
  │              OS2 fiber  │          │ OS2 fiber   │ OS2 fiber │
  │           ┌─────────────┘          │             └────────┐  │
  │           ▼                        ▼                      ▼  │
  │   [SERVER POSITION]        [BED 1 = OFFICE]       [BED 2 =   │
  │    Sony VAIO (OBD srv)      fiber ▶ [CSS610       REMOTE RM] │
  │    Today: 1G copper via      room switch]          fiber ▶   │
  │    SFP+→RJ45 module in       ├─▶ Chromebook 11     [CSS610   │
  │    the core (see notes)      │    (wired, slow)     room sw] │
  │    Fiber leg stays in        └─▶ Lenovo on Wi-Fi   ├─▶ TV    │
  │    place for a future                              └─▶ spare │
  │    SFP+ NAS / server                                         │
  │                                                              │
  │   Cat6A home runs (patch panel ▶ UDM-Pro gigabit ports):     │
  │     Living: TV · Night Owl D12 DVR (network tie-in)          │
  │     Kitchen: printer / IoT                                   │
  │     Dining ceiling: [AP-1: U6 Pro] ◀ house Wi-Fi +           │
  │        front-door coverage for the 3 Blink cameras (Wi-Fi)   │
  │   UPS: APC 600VA backs ONT + router + core switch            │
  └──────────────────────────────────────────────────────────────┘
        FRONT / SOUTH = Lowell Blvd — front door + Blink cams
```

**Endpoint devices that drive this design**
- **Lenovo laptop (Kent's workstation)** — **Wi-Fi ONLY** (Kent confirmed Nov 13: it can't hardwire in — no plug). Lives anywhere in the house on AP-1/AP-2 Wi-Fi; there is no wired option for this machine and none is specced.
- **Dell Chromebook 11** — the one laptop that CAN hardwire (has a plug), but per Kent it is very slow with little memory. Role: a fixed wired endpoint/display (e.g., a wall-panel or status display, or a plug-in connectivity check point) on a room switch — not a compute device, not the fiber-kit runner.
- **Zebra TC57 (rugged Android handheld)** — **no wired port; it rides the fiber-fed Wi-Fi only.** The TC57 runs the Building OBD install-validator / photo workflow, so its Wi-Fi quality is a **work requirement, not a luxury.** **Coverage requirement: Wi-Fi must reach (1) inside the detached garage — served by AP-2 on the bridge leg — and (2) the front door / camera area — served by AP-1.** Both APs are therefore required lines, not options.

---

## 2. Parts by leg

### 2A. Core (utility closet)

| Role | Product | Why this one | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| Router / firewall | Ubiquiti UniFi Dream Machine Pro (UDM-Pro) | SFP+ WAN + SFP+ LAN, UniFi controller built in — runs the whole UniFi side (switch, APs) from one box; maker-rated IDS/IPS throughput 3.5 Gbps, well above the ~1 Gbps service | 1 | **$379.00** (manufacturer price; resellers run higher — CompSource listed $472.11 in stock) | [RouterHaus](https://www.routerhaus.com/routers/ubiquiti-dream-machine-pro) · [CompSource](https://www.compsource.com/buy/UDMPro/Ubiquiti-3329) |
| Core switch | Ubiquiti USW-Aggregation (8× 10G SFP+, fanless) | Pure SFP+ core exactly as drawn in the topology — 8 ports cover router uplink + 3 fiber legs with room to grow; fanless = silent in a closet | 1 | **$334.20** — listed price; **out of stock at both US resellers checked at spec time** (Colamco listed $304.53, also out) | [CompSource](https://www.compsource.com/buy/USWAggregation/Ubiquiti-3329) |
| Router↔core link | Ubiquiti UACC-DAC-SFP10-3M (10G SFP+ DAC, 3 m) | Cheapest reliable 10G hop inside one closet — no optics needed | 1 | **$25.09** (in stock) | [CompSource](https://www.compsource.com/buy/UACCDACSFP103M/buy/SMT577UZKGN14/buy/SMT577UZKGN14/Samsung-389) |
| Patch panel | TRENDnet TC-KP24 24-port blank keystone panel | Landing point for the Cat6A home runs; 24 ports is years of headroom in a 752 sq ft house | 1 | **≈$22** (price as recorded by ComputingForGeeks, Amazon US checked Oct 2026) | [ComputingForGeeks](https://computingforgeeks.com/wire-house-ethernet-cat6/) |
| Rack | 6U wall-mount cabinet | Keeps core gear off the closet floor, away from the water heater side; *fit-check the closet first — fall back to a wall backboard if the 6U box doesn't fit* | 1 | **$205.00** (Newegg listing via DealNews, Oct 2026) | [DealNews/Newegg](https://www.dealnews.com/s504/Newegg/22281469.html) |
| UPS for the core | APC Back-UPS 600VA (BE600M1) | Sized for ONT + router + core switch (~30–40 W) — rides out short outages so the network (and OBD server access) stays up | 1 | **$83.99** (Amazon price as checked Nov 2–4, 2026) | [The Gadgeteer](https://the-gadgeteer.com/2026/11/02/10-best-ups-battery-backups-2026/) |

> **Existing APC Back-UPS 650:** its battery failed self-test. A replacement cartridge *may* be cheaper than a new UPS, but the correct cartridge depends on the exact sub-model, and the cartridge listings checked (e.g., RBC2, $76.49–$84.28 at Staples) did **not** confirm fit for the Back-UPS 650 — so the battery-only route is **UNPRICED / verify the sub-model first** (see §6). The new 600VA above is the priced, no-guess path; the old 650 can then move to the Sony or be retired.

### 2B. Fiber legs (core → office, server, remote room)

All three legs are **OS2 single-mode, LC-to-LC duplex, pre-terminated** — no splicing, just pull and plug. In a 752 sq ft house every in-house run fits a 15 m (49 ft) cable with slack; lengths below are **ESTIMATED** from the Rev F layout.

| Role | Product | Why | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| 10G optics, all legs | 10Gtek 10GBASE-LR SFP+ module (OS2, LC) | LR optics match the OS2 runs; proven commodity modules at a fraction of brand-name optics. 2 per leg × 3 legs = 6 | 6 | **$18.00** (Amazon price as checked Oct 19, 2026; 2-packs ≈$33) | [ComputingForGeeks](https://computingforgeeks.com/sfp-dac-vs-fiber-vs-10gbase-t/) |
| Fiber run — office leg | FLYPROFiber OS2 LC-LC duplex, 15 m | Pre-terminated = zero fiber tools; run ESTIMATED ≈50 ft incl. slack (closet → Bed 1 SE) | 1 | **$18.00** (Amazon, checked Oct 2026) | [ComputingForGeeks](https://computingforgeeks.com/sfp-dac-vs-fiber-vs-10gbase-t/) |
| Fiber run — server leg | FLYPROFiber OS2 LC-LC duplex, 15 m | Same cable; server position is near the core, run ESTIMATED ≈30 ft — coil the slack | 1 | **$18.00** | [ComputingForGeeks](https://computingforgeeks.com/sfp-dac-vs-fiber-vs-10gbase-t/) |
| Fiber run — remote-room leg | FLYPROFiber OS2 LC-LC duplex, 15 m | Run ESTIMATED ≈50 ft (closet → Bed 2 east) | 1 | **$18.00** | [ComputingForGeeks](https://computingforgeeks.com/sfp-dac-vs-fiber-vs-10gbase-t/) |

*If any leg actually measures over 15 m at install time, the next verified step up is the StarTech 30 m OS2 LC-LC duplex at **$57.39** ([Best Buy](https://www.bestbuy.com/product/startech-30m-lc-to-lc-os2-single-mode-duplex-fiber-optic-cable/J7PHYXCT5C/sku/13258194?ref=166_625&loc=SOC_1692337_%ebuy!_%epid!)).*

### 2C. Office leg — Bedroom 1 (Lenovo workstation)

| Role | Product | Why | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| Room switch | MikroTik CSS610-8G-2S+IN (8× 1G copper + 2× SFP+) | One SFP+ takes the fiber leg, the other stays free; 8 gigabit copper ports for desk gear; maker-priced well under a UniFi equivalent | 1 | **$119.00** (manufacturer price) | [MikroTik](https://mikrotik.com/products/group/switches) |
| Lenovo | **Wi-Fi only — no wired option.** Kent confirmed Nov 13 the Lenovo can't hardwire in (no plug), so the USB-C dock previously specced here was REMOVED (saved $199.99). The Lenovo rides AP-1/AP-2 Wi-Fi like the TC57. | — | 0 | **$0** | — |

### 2D. Server leg — Sony VAIO position

| Role | Product | Why | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| Sony copper handoff (today) | 10GBASE-T SFP+ → RJ45 module (CablesAndKits SFP-10G-T) | Sits in one core SFP+ port and hands the Sony plain gigabit over a short Cat6A patch — the Sony's NIC is gigabit-era (see §4a). Module negotiates 10G/1G, so a future 10G machine can use the same port | 1 | **$166.49** (in stock) | [CablesAndKits](https://www.cablesandkits.com/networking/transceivers/sfp10gt-3d/pro-10265/) |

*Money note: this is the one line where shopping around pays — generic modules in this class (e.g., 10Gtek ASF-10G-T) have tested well at ≈$60, but no current US listing price could be verified at spec time, so the in-stock verified price is the one carried in the total. Ubiquiti's first-party module (UACC-CM-RJ45-MG class) was only found at non-US prices — UNPRICED in USD.*

### 2E. Remote-room leg — Bedroom 2

| Role | Product | Why | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| Room switch | MikroTik CSS610-8G-2S+IN | Same as office leg — matched pair, fiber in on SFP+, copper out to the room | 1 | **$119.00** | [MikroTik](https://mikrotik.com/products/group/switches) |

### 2F. Wi-Fi (the fiber-fed wireless layer)

Your wireless devices never touch fiber directly — fiber is the **backhaul** that feeds the access points at full speed, and the devices ride clean Wi-Fi from there.

| Role | Product | Why | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| AP-1 — house | Ubiquiti UniFi U6 Pro (Wi-Fi 6, PoE+, GbE uplink) | One centrally placed AP covers 752 sq ft with ease, including the front door (Blink cameras + doorbell) and every room the TC57 works in | 1 | **$217.00** (in stock; street prices seen $179–$217 depending on seller/stock) | [DirectDial](https://www.directdial.com/us/item/ubiquiti-unifi-6-professional-u6-pro-dual-band-802-11ax-5-30-gbit-s-wireless-access-point/u6-pro) |
| AP-2 — garage | Ubiquiti UniFi U6 Pro | **Required for the TC57 coverage requirement** (garage interior) — powered and fed by the garage switch on the bridge leg | 1 | **$217.00** | [DirectDial](https://www.directdial.com/us/item/ubiquiti-unifi-6-professional-u6-pro-dual-band-802-11ax-5-30-gbit-s-wireless-access-point/u6-pro) |
| PoE injector — AP-1 + spare | Ubiquiti U-POE+ 30 W 802.3at adapter | AP-1's run lands on a non-PoE core port, so it needs an injector at the core end; second unit is a spare / bridge-feed backup | 2 | **$14.99** (in stock) | [IP Security Depot](https://www.ipsecuritydepot.com/ubiquiti-u-poe-adapter-that-powers-unifi-poe-devices/u-poe-ehqs/) |

### 2G. Garage leg — point-to-point bridge (the remote-building leg)

| Role | Product | Why | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| Bridge radio A + B | Ubiquiti NanoBeam 5AC Gen2 (NBE-5AC-Gen2) | Purpose-built airMAX PtP radio: maker-rated **>450 Mbps** throughput, 19 dBi antenna, 2× GbE ports, 24 V passive PoE. Distance class is multi-kilometre per retailer listings (6.2 mi / 10 km at B&H) — the Lowell garage hop is tens of feet, so the link runs with huge margin | 2 | **$132.00** (in stock) | [DirectDial](https://www.directdial.com/us/item/ubiquiti-nanobeam-ac-gen2-nbe-5ac-gen2-ieee-802-11ac-450-mbit-s-wireless-bridge/nbe-5ac-gen2) |
| Garage switch | Ubiquiti USW-Lite-8-PoE (8× GbE, 4× PoE+, 52 W) | Feeds AP-2 and leaves PoE+ ports ready for future garage cameras; managed in the same UniFi controller | 1 | **$136.75** (in stock; Sweetwater lists $109.00 backordered) | [CompSource](https://www.compsource.com/buy/USWLITE8POE/Ubiquiti-3329) |

*Bridge power note: NanoBeam radios are 24 V passive PoE devices (the UniFi switch's 802.3 PoE does not drive them directly) — plan on each radio using its own PoE adapter at its power end (house side: at the core; garage side: at the garage switch location). Whether the adapter is in the retail box was not verified from the listings captured — confirm at order time; the spare U-POE+ line above is 802.3at and does **not** substitute for a 24 V passive adapter.*

### 2H. Copper plant (Cat6A)

| Role | Product | Why | Qty | Unit price (observed) | Source |
|---|---|---|---|---|---|
| Bulk Cat6A | trueCABLE Cat6A CMR (riser), 1000 ft box | One box covers every home run + drops in the house and leaves stock for the garage/shop later; Cat6A carries 10G to 100 m, so copper never becomes the bottleneck | 1 | **≈$320** (Amazon US, checked Oct 2026) | [ComputingForGeeks](https://computingforgeeks.com/wire-house-ethernet-cat6/) |
| Keystone jacks + wall plates (~14 jacks: Living ×2, Kitchen ×1, Bed 1 ×1, Bed 2 ×2, AP/bridge terminations, spares) | Cat6A punch-down keystones + single/dual wall plates | — | — | **UNPRICED** — no verified US price captured at spec time | — |
| Cat6A patch cables (short jumpers, ≈10: panel→ports, switch→dock, core→Sony, etc.) | Pre-made Cat6A patch leads | — | — | **UNPRICED** — not price-verified at spec time | — |


---

## 3. Run list — room by room

**Utility closet + Laundry (the core)**
- ISP fiber → ONT → Cat6A patch → UDM-Pro (router/firewall). UDM-Pro → 10G DAC → USW-Aggregation core.
- Patch panel + 6U wall cabinet (fit-check first) hold the core; APC BE600M1 UPS powers ONT + UDM-Pro + core switch.
- **Sony VAIO (OBD server) position:** short Cat6A patch from the SFP+→RJ45 module in the core — gigabit today. Its dedicated **fiber leg is pulled to the server position at the same time** and left terminated/capped: the day a server or NAS with an SFP+ port replaces the Sony, it plugs straight into 10G fiber with no new cable work.
- Bridge A feed: one Cat6A home run from the core to the house eave where Bridge A mounts (24 V PoE adapter at the core end).

**Living (SW)**
- 2× Cat6A home runs to the patch panel: **TV** and **Night Owl D12 DVR**. The DVR's cameras stay on their own Night Owl wiring — the Ethernet drop is the DVR's network tie-in, so recordings are reachable from the Sony / LAN.
- No switch here — two home runs straight to core gigabit ports is simpler and enough.

**Dining (center)**
- **AP-1 (U6 Pro), ceiling/wall high near the Dining–Kitchen center.** Dead-center in a 752 sq ft single story: every room is one wall away. This position also throws strong signal to the **front door**, which is what the 3 battery Blink cameras, the doorbell, and the TC57 at the front of the house depend on. Fed by one Cat6A run + the U-POE+ injector at the core end.

**Kitchen (front-center)**
- 1× Cat6A home run: printer / IoT drop. Everything else in the kitchen rides AP-1 Wi-Fi.

**Bedroom 1 (SE) = Office / workstation room**
- Fiber leg (OS2, ESTIMATED ≈50 ft) → MikroTik CSS610 room switch.
- **Lenovo laptop:** Wi-Fi only (Kent confirmed it can't hardwire — no plug). It's on AP-1 Wi-Fi anywhere in the house, AP-2 in the garage. The **Dell Chromebook 11** is the wired laptop: slow and low-memory per Kent, so its job is a fixed plug-in endpoint/display on the room switch's spare jack — not a compute role.
- 1× spare Cat6A wall jack off the room switch for a future desk device / guest machine.

**Bedroom 2 (east) = Remote room**
- Fiber leg (OS2, ESTIMATED ≈50 ft) → second MikroTik CSS610.
- Drops off the room switch: TV/media jack + 1× spare wall jack.

**Detached garage (900 sq ft) — remote building**
- Bridge B on the garage wall, clear line of sight to Bridge A (tens of feet). Bridge B → USW-Lite-8-PoE.
- **AP-2 (U6 Pro)** inside the garage on a PoE+ port — this is what puts the **TC57 on solid Wi-Fi inside the garage** for install/validation work, and covers any garage devices.
- Remaining PoE+ ports reserved for future wired garage cameras (no camera model chosen — UNPRICED, §6). The T-Mobile 5G gateway stays as-is as a backup WAN path; it is not part of this topology.

**Zebra TC57 coverage — explicit requirement**
The TC57 has no wired port and runs the Building OBD install-validator/photo workflow, so: **AP-1 must cover the house interior + front door/camera area, and AP-2 must cover the garage interior.** If either area is weak, the fix is AP placement/power tuning first — in 752 sq ft + a 900 sq ft garage, these two APs have ample margin on paper; verify with the TC57 itself on install day (walk the front door and the garage corners while running the validator).

---

## 4. Honest engineering notes

**(a) The Sony is gigabit-era — here's what it gets.** The VAIO's built-in NIC tops out at gigabit (at best), so today it connects at **1G over copper** via the SFP+→RJ45 module in the core. The 10G fiber leg to its position isn't wasted — it's the future-proofing for whatever replaces the Sony (an SFP+ NAS or server drops straight onto fiber), and pulling it now costs one $18 cable while walls/attic are already being worked.

**(b) 10G in a 752 sq ft house is headroom, not need.** Your internet service is ~1 Gbps class; nothing in the house *requires* 10G today. The 10G core buys instant local transfers (backups to a future NAS, DVR/server traffic) and a backbone that never needs re-pulling — that's the honest case for it, and it's the topology you picked.

**(c) Garage leg: bridge vs. buried fiber.** Bridge = no digging, up and running in an afternoon, but it's a radio link — weather and line-of-sight dependent (at tens of feet with clear LOS, that risk is small). Buried fiber = immune to lightning surge between buildings and never degrades, but it's conduit/trench labor for a 900 sq ft garage hop. This spec follows your sketch: **bridge now**; if it ever disappoints, the same garage switch accepts a buried-fiber SFP uplink later with no other changes.

**(d) Small print that matters.** The utility closet has 2 plugs and shares space with HVAC/water-heater gear — the UPS is not optional decoration, it's what keeps a power blip from rebooting the whole core. Keep the rack on the opposite side from the water heater and off the floor. All fiber here is OS2 single-mode with LR optics — do not mix in multimode (OM3/OM4) patch cables or SR optics on these legs.

---

## 5. Phasing — if you stage the buying

**Phase 1 — Core + server leg + house Wi-Fi (≈ $1,821.76)**
UDM-Pro, core switch, DAC, UPS, rack + patch panel + bulk Cat6A, server leg (2 LR modules + run + RJ45 module for the Sony), AP-1 + injector. Result: fiber-fed core live, Sony on the new backbone at 1G, whole house on real Wi-Fi, front door covered.

**Phase 2 — Room legs (≈ $346.00)**
Office leg + remote-room leg: 2× CSS610, 4× LR modules, 2× fiber runs. (Lenovo dock removed Nov 13 — Kent confirmed the Lenovo can't hardwire; it is Wi-Fi only.) Result: both bedrooms on fiber-fed switches; the Dell Chromebook 11 is the wired endpoint.

**Phase 3 — Garage leg (≈ $632.74)**
2× NanoBeam, garage switch, AP-2, spare injector. Result: garage online, TC57 covered in the garage, PoE ports ready for garage cameras.

---

## 6. Totals

| Section | Priced total |
|---|---|
| Core (router, core switch, DAC, panel, rack, UPS) | $1,049.28 |
| Fiber legs (6× LR modules + 3× OS2 runs) | $162.00 |
| Office leg (room switch; Lenovo dock removed — Wi-Fi only) | $119.00 |
| Server leg (Sony RJ45 module) | $166.49 |
| Remote-room leg (room switch) | $119.00 |
| Wi-Fi (2× U6 Pro + 2× injectors) | $463.98 |
| Garage leg (2× NanoBeam + garage switch) | $400.75 |
| Copper plant (bulk Cat6A box) | $320.00 |
| **TOTAL — priced lines only** | **$2,800.50** |

*Of the total, $342.00 (bulk Cat6A ≈$320 + patch panel ≈$22) comes from ComputingForGeeks' Amazon-US-checked guide prices (Oct 2026) rather than a retailer page captured directly; every other line is a retailer/manufacturer listing observed Nov 13, 2026.*

**UNPRICED lines (excluded from the total — get prices before ordering):**
1. Cat6A keystone jacks + wall plates (~14) — not price-verified.
2. Cat6A patch cables (~10 jumpers) — not price-verified.
3. Replacement battery cartridge for the existing APC Back-UPS 650 — correct cartridge depends on the exact sub-model; the RBC2 listing checked ($76.49–$84.28, Staples) did not confirm 650 fit. Verify first, or just use the new BE600M1 already in the total.
4. Ubiquiti first-party SFP+→RJ45 module (UACC-CM-RJ45-MG class) — only non-USD prices observed; the priced generic module in §2D covers the slot.
5. 24 V passive PoE adapters for the NanoBeam pair — may be in the retail box (unverified); confirm at order.
6. Garage PoE cameras — ports reserved in the design; no model chosen or priced.
7. Labor, pull tools, punch-down/tester tools — not priced.

**Could not verify at spec time:**
- USW-Aggregation stock: out of stock at both US resellers checked (price carried is the listed $334.20).
- Whether the NanoBeam retail box includes its 24 V PoE adapter.
- Exact Back-UPS 650 sub-model → its battery cartridge.
- Lenovo: Kent confirmed Nov 13 it can't hardwire in (no plug) → Wi-Fi only; the dock line was removed and totals adjusted ($3,000.49 → $2,800.50). The Dell Chromebook 11 is the wired-capable laptop (slow, low memory — endpoint/display role only).
- Fiber run lengths are ESTIMATED from the floor plan — measure each path before ordering cable lengths.
