# Vegas: Make It Big! — browser port

## Current milestone: UI fidelity / playable browser prototype

### English-first frontend and localization milestone

English is the default, independent of browser language. A persisted English /
Greek selector is available on the main menu. Original English tokens are
imported from UTF-16LE `english.uni` into generated `src/locales/en.json`.
Greek currently translates the frontend, major categories, selected object names,
configuration text and notifications; untranslated entries fall back to English.
Greek coverage is partial, not a complete translation of the original game.

The main menu contains Campaign, Sandbox, Load Game, Configuration, Credits and
Quit. Welcome to the Strip starts the opening tutorial slice described below;
other campaign entries still preview original names. Sandbox starts the existing
casino prototype. Returning to the menu pauses simulation; opening the menu alone
never overwrites a save.

### Welcome to the Strip: opening sequence

- Starts at 09:00 / Day 1 with $250,000, verified against scenario setup/default Lua.
- Objectives table exposes the original Buy your first Lot / Build a Hotel / Build
  Path descriptions and completion statuses.
- Lot 1 can be selected on the ground or through its context panel. Purchase opens
  theme selection. Generic and Greece match the initial campaign theme unlocks.
- Lot price is $16,000, as shown in user references Untitled7/8. Accepting a theme
  debits this once. Cancelling or trying to buy twice cannot charge again.
- The construction sequence exposes only Small Hotel ($3,000, 13×11 footprint).
  Rotation, collision checks and cash deductions work in the minimal exterior.
- Ownership, theme and placed hotel persist in saves; the required hotel cannot
  be sold during this tutorial slice. Existing sandbox saves still load.
- Original tutorial messages render embedded GUI icons. New Greek translations
  cover the opening messages, objectives, theme selection and lot actions.
- Standard Paving now costs the original $10 per cell. Click-and-drag creates
  four-connected strokes without charging for duplicate or invalid cells.
- The importer captures hotel entrance (7,7), walkable/reserved cells and automatic
  pavement cells from SmallHotel.lua. Rotated navigation uses this data: the
  entrance forecourt and manually paved cells must form a continuous path to a
  lot edge. The template reservation list is interpreted as walkable entrance
  clearance for this minimal hotel model; this is not the full original engine's
  cell classifier.
- Connected hotels admit guests up to the source capacity of 20, charge the
  original default motel price ($25 from Goods.lua) on check-in, and use the
  90-second stay duration. Guests walk along paving and disappear while indoors.
  Arrivals every four simulated seconds and customer decisions are simplified;
  the original script instead explicitly spawns the first HardcoreGambler.
- The first paid visit activates the original View Sales objective. Finance
  advances to Information → Visitors → Statistics, with persistent progress.
  The statistics tab reports construction-to-date totals; daily historical charts,
  dynamic room pricing and reputation are not yet ported. Daily overhead is
  shown separately from lifetime receipts to avoid a misleading profit total.
- Paving, ownership, theme, receipts and tutorial panel progression survive
  save/load. Guest instances restart as in existing prototype saves.
- Closing Statistics advances to the original camera guidance. Page Up/Down zoom,
  right-drag orbits, two-button dragging pans, and clicking a building changes the
  focus. As in the original script, selecting the Lot continues the tutorial;
  no arbitrary camera movement threshold is required.
- Head Office costs $1,000 and must have paved road access. Its original entrance
  and reserved approach cells are imported, including cells outside its footprint.
- Retail Division (upgrade 2) costs $750 and adds $450 per game day to the office's
  $300 base/utility overhead. The shop's HeadOffice/upgrade-2 prerequisite is
  enforced. Repeat activation cannot debit money again.
- Souvenir Shop costs $3,200, has capacity 12, a 36-second service duration and a
  default goods price of $12. It needs paved access; simplified arrivals use the
  same navigation as the hotel. Check-ins trigger the original CashRegister.ogg
  use sound. Source customer preferences/desires are not reproduced yet.
- Camera acknowledgement, buildings, upgrades and road connection flags persist.
  Saves reject invalid prerequisite chains, duplicate upgrades and broken access.
- Mechanic's Hut costs $350, consumes $40 base + 30 power daily and automatically
  hires one mechanic on construction, matching the source OnBuild/OnHire flow.
- Source staff attention/skill/speed ranges, base wage ($80) and wage multiplier
  (0.4) are imported from Staff/Generic/Mechanic.lua. Hire rolls/clamps stats and
  rounds base + mean(stats) × multiplier to a whole-dollar daily wage. Exact native
  engine rounding remains unverified. Wage is added to daily expenses.
- Hotel/shop age wear and per-use wear use their source template values. A
  zero-health business stops admitting customers. The hotel Information panel
  and shop panel expose Call Mechanic; the hut shows the single worker's status,
  stats and daily wage.
- Staff movement currently stays on the lot. Hut and target need paved road
  access AND a continuous paved connection between their access/repair cells.
  Separate paths ending at different street-edge cells must be joined inside
  the lot. Original world-road traversal by staff is not implemented.
- Repair state is outbound → repairing → returning → idle. Health increases only
  on site; no instant remote repair or per-job fee is applied. Movement uses
  2 + speed/50 cells per second and repair uses 4 + skill/20 health per second.
  These are new prototype formulas, not recovered native engine timings.
- Staff identity, rolled stats, wage, position, target and remaining path persist
  during active jobs. Save validation checks salary, target, route continuity and
  progression. Ordinary visitors still restart when loading.
- Original Mechanic.ogg hut ambience is used with prototype focus-distance
  attenuation. Full original spatial sound mixing/animation remain unported.
- As in the original tutorial script, Call Mechanic advances the objective when
  the request is accepted, while the actual job continues. This Steam installation
  then uses Cinema + Electricians Hut (the UK manual instead describes a Night Club).
- Cinema construction ($5,000, 10×8 cells), four source entrance plates, repair
  point (5,3), capacity 22, $8 ticket price and 75-second service time are imported.
  Paved access is required before customers are admitted. Source age/use wear is
  0.06 per second / 0.09 per visit.
- Electrician's Hut costs $300 and $70 in daily base/utilities, plus its worker's
  wage. It automatically hires one electrician using the source stats/wage
  template. The source hut capacity field is 3; this implementation exposes only
  the initial automatic worker, not additional hiring/firing slots.
- Both staff roles share the new path-based movement/repair implementation, but
  retain independent identity, wage, job, route and save state. A mechanic cannot
  be dispatched to Cinema; its native handyman type is ELECTRICIAN. Cinema's
  Information panel offers the original Call Electrician action/icon.
- Zero-health businesses latch closed and reopen only on completed on-site
  repair, even when a saved job is restored partway through fixing them.
- The original Cinema has no configured use-sound, so ticket sales do not trigger
  the souvenir shop's CashRegister effect. Existing original UI audio is retained.
- Connecting Cinema and Electrician's Hut completes their source tutorial
  objective; calling the electrician is available but is not an extra mandatory
  objective.
- The Filters button now opens the In-game influence panel. Noise, Smell, Beauty
  and Calming overlays use the source `_Influences` bands (cumulative square rings,
  intensity 1–3) and the original InfluenceMaps colour ramps (alpha 80/150/255).
  Only raw intensity is mapped; `_influenceeffectors` modify guest reactions and
  are not used to blank the visualization.
- Tutorial flow follows the source clicks: view Noise, then Smell, then Beauty.
  All three flags require completed electrical work and are validated in order and
  persisted. The panel is also available from Sandbox.
- Current tutorial buildings only define noise/smell bands, so the Beauty view can
  legitimately be empty; decoration sources arrive with the next scenery objective.
  Overlap uses the maximum intensity. Ring distance is Chebyshev; the native
  engine's influence propagation is not decompiled, so exact falloff is approximate.
- The source objective says "Tree", but this Steam tutorial selects `Palm2x2_0`.
  The Giant Palm is imported at $340 with Beauty {2,2,1,3} and Calming {2,2,1,5}.
  It is offered from Scenery → Plants, Fountains; only one is allowed in the
  tutorial and selling remains disabled. No paving access is required for 1×1
  scenery, matching the source template (no entrance list).
- A second filter mode, Objects, exposes State of Repair using the original
  `VF_BlackToGold` ten-band ramp and thresholds 10..100. Because the placeholder
  meshes are not the native buildings, the view currently recolours building
  materials rather than using the original object shader. Only footprints are
  affected; the ramp is approximate but driven by real health values.
- Completing the palm objective advances to State of Repair, then to the pending
  Small Casino objective. Casino-interior construction, staff/other filter views
  and the remaining training are not implemented. The scenario does not award a win.
- The next original step is to construct and enter a Small Casino. That work is
  pending, along with later interior, staff and house-edge filters.
- The exterior was rebuilt from the latest reference screenshots as a closer
  approximation: a large gravel lot with white boundary/pink trim, palm rows on
  all sides, surrounding streets with lane markings, a green fountain/service
  area and neighbouring city blocks. It is still hand-built geometry. The
  original CMF/CMB city map, exact lot scale, terrain and traffic remain
  unported; decoding those files is required for a true map port.
- A Lot summary panel now shows the original-style money, reputation, people,
  object count and power/water figures. Values come from the live prototype
  simulation, not the native engine's lot accounting.
- Staff are selectable: clicking a mechanic/electrician in the 3D scene opens a
  staff panel with role, status, wage, skill, speed, attention and current job.
  This mirrors selecting people in the original, but native staff dispatch,
  thoughts/preferences and animations are not reproduced.
- Tutorial order was re-checked against the Steam ai.lua objective list and
  matches steps 1-15 (Lot, Hotel, Paths, Sales, Sales details, Camera, Head
  Office, Retail upgrade/shop, Mechanic Hut, Repair, Cinema/Electrician,
  Noise/Smell/Beauty filters, Palm, State of Repair). The next objective is
  Small Casino (step 16); it and all later steps are not yet implemented.

Reviewed user references `Untitled1.jpg` through `Untitled10.jpg`: green frontend
and tutorial dialogs, bronze world HUD, lavender lot panels, original objective
table, lot purchase and theme selection. These screenshots are reference material,
not shipped as game backgrounds. Current CSS panels approximate those references;
pixel-accurate panels and complete campaign gameplay remain outstanding.

Priority: complete UI flows, localization, original gameplay and audio before
original 3D mesh conversion. Minimal geometry remains acceptable.

Desktop-first TypeScript + Three.js + Vite. Static deployment on GitHub Pages.
The Windows executable is not run or emulated. The browser simulation is a new
implementation; the original engine source is not present in the installation.

## Installation investigation

Inspected the Steam installation, the 19-page UK manual, campaign definitions,
theme registration, gambling definitions and representative source templates.

| Format | Count | Finding |
| --- | ---: | --- |
| Lua | 1,329 | Readable game scripts; source building templates expose cost, size, capacity, expenses, callbacks, influences and dependencies. |
| TGA | 1,067 | Standard Targa images. Original thumbnails load successfully using Three.js TGALoader. |
| TM | 883 | Binary model/animation format. Representative slot and blackjack files contain embedded DDT material paths. Geometry decoder still required. |
| DDT | 1,339 | Binary textures; decoding not implemented. Do not assume compatibility with unrelated games' DDT formats. |
| OGG | 89 | Browser-compatible sound containers. Not imported in milestone 0.1. |
| CMB / CMF | 24 each | Scenario map data, currently undecoded. |
| UNI | 6 | Localization resources; character encoding/schema still to investigate. |

`public/assets/game-data.json` includes the complete format counts and byte totals.
The import also records 164 exterior/interior build templates, all 372 original
GUI sprites and twelve selected original interface/casino/result/use sounds.
`public/assets/provenance.json` records installation-relative source paths and
SHA-256 hashes for every imported thumbnail, UI sprite, selected sound and
building script.

The source scripts reference `GAMEART/TM Files`, while the supplied production
models are under `GAMEART/OTM Files`. Future importers need a case-insensitive
resolver and this directory alias. Web URLs themselves must remain case-correct.

### Verified examples

- Slot: $120 build, $60 resale, 1×3 cells, 1 guest, $2 running cost + 5 power units.
- Blackjack: $400 build, $200 resale, 7×6 cells, 7 guests, $25 running cost.
- Roulette: $700 build, $350 resale, 8×5 cells, 6 guests, $40 running cost.
- Cashier: $500 build, 5×5 cells, $105 running cost + 35 power units.
- Roulette has a pit-boss dependency in the original; dependencies are not enforced in this unlocked prototype sandbox.
- Original casino interiors contain per-cell walkability and entrance lists. The
  prototype uses conservative rectangular footprints and reachable perimeter
  access, so it does not reproduce the original interior pathing.

## Implemented

- Reproducible scalar-data importer; does not execute original Lua.
- 164 exterior/interior objects extracted from original Lua templates with
  source costs, footprints, major/minor build groups, capacity, duration, resale
  and utility/running expenses.
- Original in-game status strip, clock/cash panel, side tools and bottom
  major-group → minor-tab → thumbnail construction toolbox, using 372 original
  GUI sprites.
- Exterior-lot vs casino-interior construction context switch.
- Original UI click, casino ambience/machines and result win/lose sounds. Browser
  interaction unlocks audio playback; simulated game results trigger result sounds.
- 3D casino floor, orbit/pan/zoom camera and temporary geometric objects.
- Placement preview, rotation, repeat placement with Shift, selection and selling.
- Collision and bounds checks, protected entry and reachable building access.
- Visitors with grid pathfinding, capacity limits, play/service cycles and departure.
- Simplified income/payouts, daily expenses, wear and automatic maintenance.
- Pause, 1×/2×/3×, opening/closing, example layout and a prototype-specific goal.
- Local save/load and autosave. Economy and layout persist; visitors restart.
- Original campaign order imported as metadata only.
- Automated core checks and browser integration checks.

## Fidelity boundaries

- Room, carpet, people and objects use newly generated placeholder geometry/materials.
- Lua callbacks, original random payout tables, house-edge controls, desires,
  guest archetypes and reputation formulas are not yet ported.
- Security and cleaner buildings can be placed and incur original expenses,
  but their behaviors are not implemented yet.
- The bar, restroom and sofa provide simplified service cycles.
- Sandbox still uses its early automatic mechanic/cashier maintenance approximation.
  The exterior tutorial uses the actual path-based mechanic job state described
  above; other staff roles are not yet implemented.
- One web day is 120 seconds. Expenses are charged at its end. This differs
  from the original manual's start-of-day charging.
- The first goal (50 arrivals + $1,000 net play/service income) is a new prototype
  goal, not the original training mission. Net play/service income excludes daily
  overhead and construction costs; it is not total business profit.
- Casino-interior and exterior object categories are selectable in sandbox.
  The tutorial now has a separate minimal exterior/lot-ownership workflow; it is
  not a full world-map/casino-interior implementation.
- No original terrain levels, complete campaign scenarios, opponents, full progression,
  soundscape or original savegame compatibility yet.

## Next milestones

1. Continue the Steam tutorial with tree/scenery placement and casino-interior
   construction, preserving original panels and actions.
2. Extend staff dispatch to cashiers, cleaning and security. Add
   missing original UI, sounds, pricing, reputation and influences.
3. Port guest desires/classes, original gambling outcomes/house-edge rules and
   historical finance charts. Expand navigation from the currently imported cells.
4. Decode maps and introduce full exterior lots, themes, utilities, entertainment,
   casino interiors and the remaining building dependency/unlock trees.
5. Complete training and all ten campaign scenarios with comparison fixtures.
6. Complete Greek localization, add more locales and test larger populations.
7. Original TM/DDT model conversion is low priority: minimal geometry is accepted
   while UI and gameplay fidelity take precedence.

## Engineering and verification

Keep each responsibility in a cohesive module; aim below 800–1,000 lines per
handwritten file, never exceed 1,500. Generated/lock files are exempt.

- `npm install` then `npm run dev` for development.
- `npm run import:game -- "C:/.../Vegas - Make It Big"` to regenerate catalog,
  GUI sprites, selected sounds and provenance.
- `node tools/inspect-game.mjs "C:/.../Vegas - Make It Big"` for inventory/header diagnostics.
- `npm test` for original data, placement, paths, simulation, costs and saves.
- `npm run build` for strict TypeScript and production output.
- `npm run test:browser` for a real Chromium integration run against the built site.

All production asset references use the Vite base path. GitHub Actions builds
and deploys the static `dist/` directory to Pages on each push to `main`.
