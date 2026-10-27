# VEGA$ — Make It Big! Web

A desktop-first browser port project for **Vegas: Make It Big!**

**Status: UI fidelity milestone — playable browser prototype.** The in-game HUD,
construction groups, category tabs, icons and action sounds now use original
game assets. The catalogue contains 164 objects extracted from original Lua
templates. 3D models and simulation rules remain simplified replacements. See the detailed
[porting plan and fidelity status](docs/porting-plan.md).

## Play

https://chook-games.github.io/vegas-make-it-big-web/

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
- `tools/` — reproducible import, inspection and browser checks.
- `public/assets/` — 164 catalog entries, 372 original GUI sprites, thumbnails,
  selected original UI/gameplay sounds and provenance hashes.
- `.github/workflows/pages.yml` — static Pages deployment.

## Credits

Original game by Deep Red Games / Empire Interactive. Original game assets,
names and source data retain their respective owners' rights. This project is
an unofficial browser port effort, not an official release or endorsement.
