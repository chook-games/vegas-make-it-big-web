import type { Building, CatalogItem, Cell, GameState } from './game';
import { WIDTH, DEPTH } from './grid.ts';

export const cellKey = (cell: Cell) => cell.z * WIDTH + cell.x;
export const cellFromKey = (key: number): Cell => ({ x: key % WIDTH, z: Math.floor(key / WIDTH) });
export function rotateCell(b: Building, item: CatalogItem, x: number, z: number): Cell {
  // Original lists are one-based. Clockwise object rotation agrees with scene.ts.
  x--; z--;
  if (b.rotation === 1) return { x: b.x + item.depth - 1 - z, z: b.z + x };
  if (b.rotation === 2) return { x: b.x + item.width - 1 - x, z: b.z + item.depth - 1 - z };
  if (b.rotation === 3) return { x: b.x + z, z: b.z + item.width - 1 - x };
  return { x: b.x + x, z: b.z + z };
}
export function hotelWalkway(b: Building, item: CatalogItem): Cell[] {
  const cells: Cell[] = [];
  for (const list of [item.walkable, item.reserved, item.pavement, item.entrances]) {
    for (let i = 0; list && i < list.length; i += 2) cells.push(rotateCell(b, item, list[i], list[i + 1]));
  }
  return cells;
}
export function buildingAt(state: GameState, catalog: CatalogItem[], x: number, z: number) {
  return state.buildings.find(b => {
    const item = catalog.find(c => c.id === b.type)!;
    const w = b.rotation % 2 ? item.depth : item.width, d = b.rotation % 2 ? item.width : item.depth;
    return x >= b.x && x < b.x + w && z >= b.z && z < b.z + d;
  });
}
export function canPave(state: GameState, x: number, z: number, catalog: CatalogItem[]): string | null {
  if (!state.tutorial?.lotOwned) return 'ID_WEB_BUY_LOT_FIRST';
  if (!state.buildings.some(b => b.type === 'smallhotel')) return 'ID_WEB_BUILD_SMALL_HOTEL_FIRST';
  if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || x >= WIDTH || z < 0 || z >= DEPTH) return 'ID_WEB_PAVING_BOUNDS';
  if (buildingAt(state, catalog, x, z)) return 'ID_WEB_PAVING_OCCUPIED';
  if (state.paving?.includes(z * WIDTH + x)) return 'ID_WEB_PAVING_EXISTS';
  if (state.cash < catalog.find(c => c.id === 'path-1')!.cost) return 'ID_WEB_NOT_ENOUGH_CASH';
  return null;
}
export function pave(state: GameState, x: number, z: number, catalog: CatalogItem[]): string | null {
  const error = canPave(state, x, z, catalog); if (error) return error;
  state.cash -= catalog.find(c => c.id === 'path-1')!.cost;
  (state.paving ??= []).push(z * WIDTH + x);
  return null;
}
/** Entrance-to-street route. Only paving and source-template access cells are traversable. */
export function hotelRoute(state: GameState, catalog: CatalogItem[]): Cell[] | null {
  const b = state.buildings.find(b => b.type === 'smallhotel');
  if (!b) return null;
  return buildingRoute(state, catalog, b);
}
export function buildingRoute(state: GameState, catalog: CatalogItem[], b: Building): Cell[] | null {
  const item = catalog.find(c => c.id === b.type)!;
  if (!item.entrances?.length) return null;
  const entrance = rotateCell(b, item, item.entrances[0], item.entrances[1]);
  return routeOnPaving(state, catalog, entrance);
}
export function routeOnPaving(state: GameState, catalog: CatalogItem[], start: Cell, end?: Cell): Cell[] | null {
  const access = state.buildings.flatMap(building => hotelWalkway(building, catalog.find(c => c.id === building.type)!))
    .filter(cell => cell.x >= 0 && cell.x < WIDTH && cell.z >= 0 && cell.z < DEPTH);
  const allowed = new Set([...(state.paving ?? []), ...access.map(cellKey)]);
  if (!allowed.has(cellKey(start))) return null;
  const queue: Cell[] = [start];
  const previous = new Map<number, Cell | null>([[cellKey(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (end ? current.x === end.x && current.z === end.z : current.x === 0 || current.x === WIDTH - 1 || current.z === 0 || current.z === DEPTH - 1) {
      const result: Cell[] = []; let p: Cell | null = current;
      while (p) { result.unshift(p); p = previous.get(cellKey(p)) ?? null; }
      return result;
    }
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next = { x: current.x + dx, z: current.z + dz }; const key = cellKey(next);
      if (next.x >= 0 && next.x < WIDTH && next.z >= 0 && next.z < DEPTH && allowed.has(key) && !previous.has(key)) {
        previous.set(key, current); queue.push(next);
      }
    }
  }
  return null;
}
export function validatePaving(state: GameState, catalog: CatalogItem[]) {
  if (state.paving === undefined) return;
  if (!Array.isArray(state.paving) || state.paving.length > WIDTH * DEPTH || new Set(state.paving).size !== state.paving.length ||
    (state.paving.length > 0 && (!state.tutorial?.lotOwned || !state.buildings.length)) ||
    state.paving.some(key => !Number.isInteger(key) || key < 0 || key >= WIDTH * DEPTH || buildingAt(state, catalog, key % WIDTH, Math.floor(key / WIDTH)))) {
    throw new Error('Invalid saved paving.');
  }
}
