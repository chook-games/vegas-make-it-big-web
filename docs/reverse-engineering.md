# Reverse engineering log — Vegas: Make It Big!

Goal: replace guesses with data decoded from the original installation. The game
engine is closed source; the readable material is Lua scripts, plus proprietary
binary scene/asset formats. This log records verified findings and open questions.

## Tooling available

- Python 3.14 (standard library only for the scripts in `tools/re/`).
- Node.js 24 for the web project.
- No Lua, gcc, 7z, Ghidra or IDA installed. No community tools for these formats
  were found in public searches.

Scripts:

```sh
python tools/re/cmf_strings.py "<game>/GAMEDATA/Scripts/SCENARIOS/Welcome to The Strip/WelcomeToTheStrip.cmf"
python tools/re/cmb_blocks.py "<game>/GAMEDATA/Scripts/SCENARIOS/Welcome to The Strip/WelcomeToTheStrip.cmb"
python tools/re/cmb_blocks.py <file.cmb> --render 0 48 24 4 0
```

Outputs are written to `.re-out/` (git-ignored).

## CMF (scenario scene)

Verified on `WelcomeToTheStrip.cmf` (1,548,742 bytes):

- Starts with `1B 4C 75 61` (`\x1bLua`) but the rest of the header does **not**
  match standard Lua 5.0/5.1 bytecode headers (`40 01 04 04 04 20 06 09 04 ...`).
  It is a proprietary container, not a chunk that can be fed directly to `luac`.
- From offset 17 there is a string table of length-prefixed NUL-terminated names.
  A count-like `u32` of **3462** appears immediately before the first real name.
- Extracted **3463** names. Inventory:
  `WayPoint` 868, `Road2x2` 652, `Generic` 547, `Fluff` 394, `Road6x2` 328,
  `Mayan` 175, `Space` 96, `RoadJunction1x1` 53, `India` 42, `LotMap` 41,
  `GameMap` 31, `RoadCorner1x1` 24, `Greece` 18, …
  Last names include `WORLD_FLOOR`, `STRIP_DESERT.tm`, `WORLD_BACKDROP`,
  `STRIP_MOUNTAINS.tm`, `OBJECT_COUNT`.
- Schema-looking names (`RoadInstance`, `x`, `z`, `rotation`) appear at the start,
  followed by hundreds of instance names. This suggests a class/property schema
  followed by object records.
- Binary data starts at offset **66,458** with `u32 = 1094`, followed by many
  plausible floats (e.g. 5.25, 65.13, 27.4, 668.51, 1204.74). Meaning unknown.

Open questions:

1. Are object transforms stored after the name table, or interleaved with it?
2. Does `1094` count records for the first class? What is the record stride?
3. Where are the lot rectangles (`LotMap_1..41`) and their world coordinates?
4. How does this container encode strings vs. numbers? Header checksum/flags?

## CMB (city map)

Verified on `WelcomeToTheStrip.cmb` (1,145,188 bytes):

- Contains 31 embedded names `GameMap_7`, `GameMap_6`, … `GameMap_28`.
- The first block layout appears to be:
  `[u32 3][NUL-terminated name][u16 ?][f32 1.0][u32 48][u32 40][payload]`
  - name at 4, header at 14 (18 bytes), payload at 32.
  - payload size to the next name is exactly **4608 bytes**.
- 4608 bytes is 48×24×4, 24×24×8 or 48×48×2, but rendering payload bytes as
  grayscale with those layouts produces stripes, not terrain. The payload is
  therefore packed/compressed or not a simple cell array.
- Repeated 8-byte pattern `30 e0 00 7f 7f 7f 7f 00`; second u32 is often
  `0x007F7F7F`. Likely material/flags plus height or packed vertex data.
- Later `GameMap_*` blocks do **not** share the same header layout under the
  current assumption (their preceding 4 bytes are `7f 7f 7f 00`), so block
  boundaries/headers still need validation.

Open questions:

1. What do the two `u32`/`f32`/`u32 u32` header fields mean?
2. Is the payload RLE/compressed? Does it describe heights, materials, a mesh,
   or path/road connectivity?
3. How do the 31 map blocks relate to the 41 `LotMap_*` lots and the road pieces?
4. How is world scale/orientation defined relative to the CMF transforms?

## Already decoded (non-binary)

- 1,329 Lua scripts: costs, capacities, objectives, tutorial order, UI strings.
- 164 build templates, 372 GUI sprites, original sounds (see provenance).
- Localisation from UTF-16LE `.uni` files.
- Manual PDF (not yet machine-read; PDF input unsupported by this model, text can
  be extracted with Python if needed).

## Next experiments

1. Locate references to name-table indices in the CMF binary and reconstruct
   object records (class, instance, x/z/rotation).
2. Test whether CMF binary is a sequence of typed values after a count; use the
   known total counts to find section boundaries.
3. For CMB, dump block payloads and test RLE/LZ hypotheses; compare decoded
   layouts with `RoadMap.tga` and the reference screenshots.
4. Decode DDT textures (no DDS magic; header starts `01 00 00 00 ...`) and TM
   meshes (no DirectX `.x` magic) enough to import one static building.
5. Only after geometry/layout is decoded, rebuild the web map from data instead
   of hand-placed boxes.
