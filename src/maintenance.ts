import type { Building, CatalogItem, Cell, GameState } from './game';
import { buildingRoute, rotateCell, routeOnPaving } from './paving.ts';
import { WIDTH, DEPTH } from './grid.ts';

export interface MechanicState {
  uid: number;
  home: number;
  x: number;
  z: number;
  attention: number;
  skill: number;
  speed: number;
  wage: number;
  status: 'idle' | 'outbound' | 'repairing' | 'returning';
  target: number | null;
  path: Cell[];
}
function homeCell(state: GameState, catalog: CatalogItem[]) {
  const hut = state.buildings.find(b => b.type === 'mechanichut'); if (!hut) return null;
  const item = catalog.find(c => c.id === hut.type)!;
  return rotateCell(hut, item, item.entrances![0], item.entrances![1]);
}
export function hireMechanic(state: GameState, catalog: CatalogItem[], random = Math.random) {
  const hut = state.buildings.find(b => b.type === 'mechanichut');
  if (!hut || state.mechanic) return;
  const data = catalog.find(c => c.id === hut.type)!.mechanic!;
  const roll = (base: number, range: number) => Math.max(0, Math.min(100, base + random() * range));
  const attention = roll(data.attentionBase, data.attentionRange), skill = roll(data.skillBase, data.skillRange), speed = roll(data.speedBase, data.speedRange);
  const home = homeCell(state, catalog)!;
  state.mechanic = { uid:state.nextId++, home:hut.uid, x:home.x + .5, z:home.z + .5,
    attention, skill, speed, wage:Math.round(data.wageBase + (attention + skill + speed) / 3 * data.wageMultiplier),
    status:'idle', target:null, path:[] };
}
function repairCell(building: Building, item: CatalogItem) {
  const point = item.repairPoint?.length ? item.repairPoint : item.entrances!;
  return rotateCell(building, item, point[0], point[1]);
}
export function requestRepair(state: GameState, catalog: CatalogItem[], uid: number): string | null {
  const worker = state.mechanic, target = state.buildings.find(b => b.uid === uid);
  if (!worker || !target) return 'ID_WEB_NEED_MECHANIC';
  if (worker.status !== 'idle') return 'ID_WEB_MECHANIC_BUSY';
  const item = catalog.find(c => c.id === target.type)!;
  if (item.repairStaff !== 'MECHANIC') return 'ID_WEB_CANNOT_REPAIR';
  if (target.health >= 100) return 'ID_WEB_NO_REPAIR_NEEDED';
  const hut = state.buildings.find(b => b.uid === worker.home)!;
  if (!buildingRoute(state, catalog, hut) || !buildingRoute(state, catalog, target)) return 'ID_WEB_CONNECT_REPAIR_BUILDINGS';
  const route = routeOnPaving(state, catalog, { x:Math.floor(worker.x), z:Math.floor(worker.z) }, repairCell(target, item));
  if (!route) return 'ID_WEB_REPAIR_PATH_MISSING';
  worker.status = 'outbound'; worker.target = uid; worker.path = route;
  if (state.tutorial && target.type === 'smallhotel') {
    state.tutorial.mechanicConnected = true; state.tutorial.repairRequested = true;
  }
  return null;
}
export function stepMaintenance(state: GameState, catalog: CatalogItem[], dt: number) {
  if (!state.tutorial) return;
  for (const b of state.buildings) {
    const item = catalog.find(c => c.id === b.type)!;
    b.health = Math.max(0, b.health - (item.wear ?? 0) * dt);
  }
  const worker = state.mechanic; if (!worker) return;
  const hut = state.buildings.find(b => b.uid === worker.home)!;
  if (buildingRoute(state, catalog, hut)) state.tutorial.mechanicConnected = true;
  if (worker.path.length) {
    const p = worker.path[0], dx = p.x + .5 - worker.x, dz = p.z + .5 - worker.z;
    const distance = Math.hypot(dx, dz), travel = dt * (2 + worker.speed / 50);
    if (distance <= travel) { worker.x = p.x + .5; worker.z = p.z + .5; worker.path.shift(); }
    else { worker.x += dx / distance * travel; worker.z += dz / distance * travel; }
    return;
  }
  if (worker.status === 'outbound') worker.status = 'repairing';
  if (worker.status === 'repairing') {
    const target = state.buildings.find(b => b.uid === worker.target)!;
    // Original stats, new movement/repair formula until native engine timing is known.
    target.health = Math.min(100, target.health + dt * (4 + worker.skill / 20));
    if (target.health >= 100) {
      if (target.type === 'smallhotel') state.tutorial.repairCompleted = true;
      worker.status = 'returning';
      worker.path = routeOnPaving(state, catalog, { x:Math.floor(worker.x), z:Math.floor(worker.z) }, homeCell(state, catalog)!) ?? [];
    }
  } else if (worker.status === 'returning') { worker.status = 'idle'; worker.target = null; }
}
export function validateMechanic(state: GameState, catalog: CatalogItem[]) {
  const worker = state.mechanic;
  const hut = state.buildings.find(b => b.type === 'mechanichut');
  if (!worker) { if (hut) throw new Error('Missing mechanic state.'); return; }
  const finite = (value: number) => typeof value === 'number' && Number.isFinite(value);
  if (!state.tutorial || !hut || worker.home !== hut.uid || !Number.isInteger(worker.uid) || worker.uid < 1 || worker.uid >= state.nextId ||
    state.buildings.some(b => b.uid === worker.uid) || ![worker.x,worker.z,worker.attention,worker.skill,worker.speed,worker.wage].every(finite) ||
    worker.x < 0 || worker.x >= WIDTH || worker.z < 0 || worker.z >= DEPTH ||
    [worker.attention,worker.skill,worker.speed].some(n => n < 0 || n > 100) || worker.wage < 0 ||
    !['idle','outbound','repairing','returning'].includes(worker.status) || !Array.isArray(worker.path) || worker.path.length > WIDTH * DEPTH ||
    worker.path.some(p => !Number.isInteger(p.x) || !Number.isInteger(p.z) || p.x < 0 || p.x >= WIDTH || p.z < 0 || p.z >= DEPTH)) throw new Error('Invalid mechanic save.');
  const data = catalog.find(c => c.id === 'mechanichut')!.mechanic!;
  if (worker.attention < data.attentionBase || worker.attention > data.attentionBase + data.attentionRange ||
    worker.skill < data.skillBase || worker.skill > data.skillBase + data.skillRange ||
    worker.speed < data.speedBase || worker.speed > data.speedBase + data.speedRange) throw new Error('Invalid mechanic stats.');
  if (worker.wage !== Math.round(data.wageBase + (worker.attention + worker.skill + worker.speed) / 3 * data.wageMultiplier)) throw new Error('Invalid mechanic wage.');
  const home = homeCell(state, catalog)!;
  if (worker.status === 'idle' && (worker.target !== null || worker.path.length || Math.hypot(worker.x - home.x - .5, worker.z - home.z - .5) > .01)) throw new Error('Invalid idle mechanic.');
  if (state.tutorial.repairRequested && !state.tutorial.repairCompleted &&
    (worker.status === 'idle' || state.buildings.find(b => b.uid === worker.target)?.type !== 'smallhotel')) throw new Error('Invalid tutorial repair progress.');
  if (worker.status !== 'idle') {
    const target = state.buildings.find(b => b.uid === worker.target);
    if (!target || catalog.find(c => c.id === target.type)!.repairStaff !== 'MECHANIC' ||
      !routeOnPaving(state, catalog, { x:Math.floor(worker.x), z:Math.floor(worker.z) }, repairCell(target, catalog.find(c => c.id === target.type)!))) throw new Error('Invalid repair target.');
    for (let i = 0; i < worker.path.length; i++) {
      const p = worker.path[i];
      if (!routeOnPaving(state, catalog, p, p) || (i && Math.abs(p.x - worker.path[i-1].x) + Math.abs(p.z - worker.path[i-1].z) !== 1)) throw new Error('Invalid mechanic route.');
    }
    if (worker.path.length && Math.abs(Math.floor(worker.x) - worker.path[0].x) + Math.abs(Math.floor(worker.z) - worker.path[0].z) > 1) throw new Error('Invalid mechanic next step.');
    const destination = worker.status === 'returning' ? home : repairCell(target, catalog.find(c => c.id === target.type)!);
    const end = worker.path.at(-1);
    if (end && (end.x !== destination.x || end.z !== destination.z)) throw new Error('Invalid mechanic destination.');
    if (!end && Math.hypot(worker.x - destination.x - .5, worker.z - destination.z - .5) > .01) throw new Error('Invalid mechanic location.');
    if (worker.status === 'repairing' && (worker.path.length || Math.hypot(worker.x - repairCell(target, catalog.find(c => c.id === target.type)!).x - .5, worker.z - repairCell(target, catalog.find(c => c.id === target.type)!).z - .5) > .01)) throw new Error('Invalid mechanic repair location.');
  }
}
