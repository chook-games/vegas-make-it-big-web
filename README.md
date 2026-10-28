# VEGA$ — Make It Big! Web

A desktop-first browser port project for **Vegas: Make It Big!**

**Status: UI fidelity milestone — playable browser prototype.** The in-game HUD,
construction groups, category tabs, icons and action sounds now use original
game assets. The catalogue contains 164 objects extracted from original Lua
templates. 3D models and simulation rules remain simplified replacements. See the detailed
[porting plan and fidelity status](docs/porting-plan.md).

## Play

https://chook-games.github.io/vegas-make-it-big-web/

The game starts at the main menu in **English**. Select **Ελληνικά** to try the
initial Greek translation; the selection is saved in this browser. Greek coverage
is partial and untranslated content falls back to English. Select **Sandbox** to
play. **Campaign → Welcome to the Strip!** now starts the playable opening:
objectives, Lot 1 selection/purchase, theme choice and Small Hotel construction.
Continue with **Build Path**: use Standard Paving ($10 per cell) to connect the
hotel entrance to a street edge. Click or drag to pave. Connected hotels admit
guests, charge $25 per check-in and offer Finance, Information, Visitors and
Statistics panels. Close Statistics, review the camera guidance and select the
Lot to continue to Head Office construction, road access, Retail Division and a
Souvenir Shop. The shop must be connected before it serves customers. Continue by
building a **Mechanic's Hut ($350)**, joining its paving to the hotel and pressing
**Call Mechanic** in the hotel's Information panel. The worker repairs on site
and returns; active jobs survive save/load. The next Cinema/Electrician tasks and
the rest of the campaign are still being ported. Other campaigns remain previews. The exterior
is a minimal new scene, not the decoded original scenario map.

Build a casino floor, attract visitors, manage expenses and save your layout.
The example layout provides a quick way to try the simulation. The bottom build
panel follows the original major-group → minor-tab → thumbnail workflow.

| Control | Action |
| --- | --- |
| Click catalog → click floor | Place object |
| Space / R | Rotate selected construction |
| Shift + click | Place multiple copies |
| Esc | Cancel construction / selection |
| Click existing object | Inspect / sell |
| Left drag | Pan camera |
| Right drag | Rotate camera |
| Mouse wheel | Zoom |

## Development

Requires Node.js 24 and npm.

```sh
npm install
npm run dev
npm test
npm run build
```

On Windows PowerShell with restricted script execution, use `npm.cmd`.
To run browser integration checks:

```sh
npx playwright install chromium
npm run test:browser
```

To regenerate the selected data from a local installation:

```sh
npm run import:game -- "C:/Program Files (x86)/Steam/steamapps/common/Vegas - Make It Big"
```

The web app runs entirely client-side, with local browser saves. No Steam
installation or backend is needed to play the current published prototype.
The original executable, DLLs and player saves are not part of the distribution.

## Project layout

- `src/game.ts` — simulation, grid navigation, placement and save validation.
- `src/scene.ts` — Three.js scene, TGA loading and temporary object geometry.
- `src/main.ts` — interface and interaction.
- `src/tutorial.ts` — tutorial ownership, purchase rules and persisted state.
- `src/tutorial-ui.ts` — objectives, original tutorial messages and theme selection.
- `src/paving.ts` — rotated hotel access cells, paved routes and paving validation.
- `src/hotel-simulation.ts` — hotel arrivals, check-in, stays and departure.
- `src/hotel-ui.ts` — hotel finance, information, visitor and statistics panels.
- `src/development.ts`, `src/development-ui.ts` — Head Office upgrades and retail unlocks.
- `src/maintenance.ts`, `src/maintenance-ui.ts` — automatic mechanic hire, wages,
  path-based repair jobs and maintenance controls.
- `tools/` — reproducible import, inspection and browser checks.
- `public/assets/` — 164 catalog entries, 372 original GUI sprites, thumbnails,
  selected original UI/gameplay sounds and provenance hashes.
- `.github/workflows/pages.yml` — static Pages deployment.

## Credits

Original game by Deep Red Games / Empire Interactive. Original game assets,
names and source data retain their respective owners' rights. This project is
an unofficial browser port effort, not an official release or endorsement.
