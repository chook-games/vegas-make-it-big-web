import type { CatalogItem, GameState } from './game';
import { DEPTH, WIDTH } from './grid.ts';

export type InfluenceType = 'noise' | 'smell' | 'beauty' | 'calming';
export const INFLUENCE_TYPES: InfluenceType[] = ['noise', 'smell', 'beauty', 'calming'];
// Original InfluenceMaps.lua colour ramps (least → most intense).
export const INFLUENCE_COLOURS: Record<InfluenceType, [number, number, number, number][]> = {
  noise: [[200, 0, 0, 80], [200, 0, 0, 150], [200, 0, 0, 255]],
  smell: [[200, 0, 0, 80], [200, 0, 0, 150], [200, 0, 0, 255]],
  beauty: [[0, 200, 0, 80], [0, 200, 0, 170], [0, 200, 0, 255]],
  calming: [[0, 200, 0, 80], [0, 200, 0, 170], [0, 200, 0, 255]],
};
// ViewFilters.lua VF_BlackToGold: dark (poor) → light (good), 10 bands.
export const REPAIR_COLOURS: [number, number, number, number][] = [
  [10, 9, 0, 255], [39, 33, 0, 255], [76, 64, 0, 255], [117, 99, 0, 255], [159, 135, 0, 255],
  [199, 168, 0, 255], [234, 198, 0, 255], [254, 215, 0, 255], [255, 232, 104, 255], [255, 249, 216, 255],
];
export const REPAIR_THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
/** 1–10 state-of-repair buckets, drawn only over building footprints. */
export function repairMap(state: GameState, catalog: CatalogItem[]) {
  const values = new Uint8Array(WIDTH * DEPTH);
  for (const building of state.buildings) {
    const item = catalog.find(c => c.id === building.type); if (!item) continue;
    const w = building.rotation % 2 ? item.depth : item.width;
    const d = building.rotation % 2 ? item.width : item.depth;
    let bucket = REPAIR_THRESHOLDS.findIndex(threshold => building.health <= threshold);
    if (bucket < 0) bucket = REPAIR_THRESHOLDS.length - 1;
    for (let z = Math.max(0, building.z); z < Math.min(DEPTH, building.z + d); z++) {
      for (let x = Math.max(0, building.x); x < Math.min(WIDTH, building.x + w); x++) {
        values[z * WIDTH + x] = bucket + 1;
      }
    }
  }
  return values;
}
/** Intensity (1–3) per cell. Bands from each template are cumulative square rings. */
export function influenceMap(state: GameState, catalog: CatalogItem[], type: InfluenceType) {
  const values = new Uint8Array(WIDTH * DEPTH);
  for (const building of state.buildings) {
    const item = catalog.find(c => c.id === building.type);
    if (!item) continue;
    const bands = item.influences?.[type];
    if (!bands?.length) continue;
    const w = building.rotation % 2 ? item.depth : item.width;
    const d = building.rotation % 2 ? item.width : item.depth;
    // Distance 0 is the footprint itself, so the first band starts below zero.
    let previous = -1, total = 0;
    for (let i = 0; i < bands.length; i += 2) {
      const intensity = Math.max(0, Math.min(3, Math.round(bands[i])));
      total += bands[i + 1];
      for (let z = Math.max(0, building.z - total); z < Math.min(DEPTH, building.z + d + total); z++) {
        for (let x = Math.max(0, building.x - total); x < Math.min(WIDTH, building.x + w + total); x++) {
          const dx = Math.max(building.x - x, 0, x - (building.x + w - 1));
          const dz = Math.max(building.z - z, 0, z - (building.z + d - 1));
          const distance = Math.max(dx, dz);
          if (distance <= previous || distance > total) continue;
          const index = z * WIDTH + x;
          if (values[index] < intensity) values[index] = intensity;
        }
      }
      previous = total;
    }
  }
  return values;
}
export function validateInfluences(catalog: CatalogItem[]) {
  for (const item of catalog) {
    for (const [type, bands] of Object.entries(item.influences ?? {})) {
      if (!INFLUENCE_TYPES.includes(type as InfluenceType) || !Array.isArray(bands) || bands.length % 2 ||
        bands.length > 12 || bands.some(value => !Number.isInteger(value) || value < 0 || value > 40) ||
        bands.some((value, index) => index % 2 === 0 && (value < 1 || value > 3)) ||
        bands.some((value, index) => index % 2 === 1 && value < 1)) throw new Error('Invalid influence template data.');
    }
  }
}
