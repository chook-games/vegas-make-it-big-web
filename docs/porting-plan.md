# Vegas: Make It Big! — browser port

## Current milestone: UI fidelity / playable browser prototype

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
GUI sprites and ten selected original interface/casino/result sounds.
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
- A mechanic automatically repairs equipment; a cashier maintains slots.
  This is a temporary approximation of the original staff system.
- One web day is 120 seconds. Expenses are charged at its end. This differs
  from the original manual's start-of-day charging.
- The first goal (50 arrivals + $1,000 net play/service income) is a new prototype
  goal, not the original training mission. Net play/service income excludes daily
  overhead and construction costs; it is not total business profit.
- Casino-interior and exterior object categories are selectable, but there is
  not yet a separate exterior map/lot scene or hotel/lot ownership workflow.
- No original terrain levels, playable campaigns, opponents, progression, full
  soundscape or original savegame compatibility yet.

## Next milestones

1. Decode TM static meshes and DDT textures: validate triangle counts, coordinate
   transforms, UVs, material names, alpha and lighting against original screenshots.
   Start with slot, blackjack, roulette and cashier. Replace placeholder meshes.
2. Port original per-cell navigation and entrances, guest classes/desires,
   gambling outcome tables and house-edge logic. Separate simulation from rendering.
3. Implement staff dispatch, cleaning, security, repairs, pricing, reputation and
   influences. Import remaining strings and sound with a documented mapping.
4. Decode maps and introduce exterior lots, themes, utilities, paths, hotels,
   entertainment, casino interiors and building dependency/unlock trees.
5. Implement original training and all ten campaign scenarios. Add scenario
   validation and original-versus-port comparison fixtures.
6. Optimize larger guest populations, add settings and wider browser/device testing.

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
