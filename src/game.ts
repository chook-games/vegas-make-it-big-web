import { tutorialBuildError, validateTutorial, type TutorialState } from './tutorial.ts';
import { WIDTH, DEPTH, DAY_SECONDS, ENTRY } from './grid.ts';
import { canPave, pave, hotelRoute, hotelWalkway, buildingRoute, cellKey, validatePaving } from './paving.ts';
import { stepHotel } from './hotel-simulation.ts';
import { validateInfluences } from './influence.ts';
import { hireMechanic, hireElectrician, stepMaintenance, validateMechanic, validateElectrician, type MechanicState } from './maintenance.ts';
export { WIDTH, DEPTH, DAY_SECONDS, ENTRY } from './grid.ts';

export interface CatalogItem {
  id: string;
  name: string;
  category: 'gaming' | 'service' | 'staff' | 'decor';
  width: number;
  depth: number;
  cost: number;
  resale: number;
  capacity: number;
  runningCost: number;
  power: number;
  water: number;
  duration: number;
  thumbnail: string;
  source: string;
  context?: string;
  major?: number;
  minor?: string;
  nameKey?: string;
  descriptionKey?: string;
  entrances?: number[];
  walkable?: number[];
  reserved?: number[];
  pavement?: number[];
  roomPrice?: number;
  salePrice?: number;
  dependency?: { building: string; upgrade: number };
  wear?: number;
  wearByUse?: number;
  repairPoint?: number[];
  repairStaff?: string | null;
  mechanic?: { attentionBase:number; attentionRange:number; skillBase:number; skillRange:number; speedBase:number; speedRange:number; wageBase:number; wageMultiplier:number };
  electrician?: CatalogItem['mechanic'];
  influences?: Partial<Record<'noise'|'smell'|'beauty'|'calming'|'rubbish', number[]>>;
  upgrades?: { id: number; nameKey: string; descriptionKey: string; cost: number; runningCost: number }[];
}
export interface Building {
  uid: number;
  type: string;
  x: number;
  z: number;
  rotation: number;
  health: number;
  income: number;
  visits: number;
  upgrades?: number[];
  repairs?: number;
  broken?: boolean;
}
export interface Guest {
  id: number;
  x: number;
  z: number;
  path: Cell[];
  target: number | null;
  activity: string;
  timer: number;
  cash: number;
  happiness: number;
  served: number;
  leaving: boolean;
}
export interface Cell { x: number; z: number }
export interface GameState {
  version: 1;
  cash: number;
  elapsed: number;
  buildings: Building[];
  guests: Guest[];
  nextId: number;
  income: number;
  expenses: number;
  totalVisitors: number;
  completed: boolean;
  open: boolean;
  tutorial?: TutorialState;
  paving?: number[];
  mechanic?: MechanicState;
  electrician?: MechanicState;
}
export const SAVE_KEY = 'vegas-web-save-v1';

export function createGame(): GameState {
  return { version: 1, cash: 50000, elapsed: 0, buildings: [], guests: [], nextId: 1,
    income: 0, expenses: 0, totalVisitors: 0, completed: false, open: true };
}
export function dimensions(item: CatalogItem, rotation: number) {
  return rotation % 2 ? { w: item.depth, d: item.width } : { w: item.width, d: item.depth };
}
export function occupied(buildings: Building[], catalog: CatalogItem[]) {
  const cells = new Set<number>();
  for (const b of buildings) {
    const item = catalog.find(c => c.id === b.type)!;
    const { w, d } = dimensions(item, b.rotation);
    for (let z = b.z; z < b.z + d; z++) for (let x = b.x; x < b.x + w; x++) cells.add(z * WIDTH + x);
  }
  return cells;
}
export function pathTo(start: Cell, end: Cell, blocked: Set<number>): Cell[] | null {
  const key = (c: Cell) => c.z * WIDTH + c.x;
  const inside = (c: Cell) => c.x >= 0 && c.x < WIDTH && c.z >= 0 && c.z < DEPTH;
  if (!inside(start) || !inside(end) || blocked.has(key(end))) return null;
  const queue: Cell[] = [{ x: Math.floor(start.x), z: Math.floor(start.z) }];
  const previous = new Map<number, Cell | null>([[key(queue[0]), null]]);
  let found: Cell | undefined;
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (key(current) === key(end)) { found = current; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: current.x + dx, z: current.z + dz };
      if (inside(next) && !blocked.has(key(next)) && !previous.has(key(next))) {
        previous.set(key(next), current);
        queue.push(next);
      }
    }
  }
  if (!found) return null;
  const result: Cell[] = [];
  let current: Cell | null = found;
  while (current) { result.unshift(current); current = previous.get(key(current)) ?? null; }
  return result;
}
export function accessCell(b: Building, item: CatalogItem, blocked: Set<number>): Cell | null {
  const { w, d } = dimensions(item, b.rotation);
  const perimeter: Cell[] = [];
  for (let x = b.x; x < b.x + w; x++) perimeter.push({ x, z: b.z + d }, { x, z: b.z - 1 });
  for (let z = b.z; z < b.z + d; z++) perimeter.push({ x: b.x + w, z }, { x: b.x - 1, z });
  return perimeter.find(c => pathTo(ENTRY, c, blocked) !== null) ?? null;
}
export function canPlace(state: GameState, item: CatalogItem, x: number, z: number,
  rotation: number, catalog: CatalogItem[]): string | null {
  if (item.id === 'path-1' && state.tutorial) return canPave(state, x, z, catalog);
  const tutorialError = tutorialBuildError(state, item);
  if (tutorialError) return tutorialError;
  if (!Number.isInteger(x) || !Number.isInteger(z)) return 'Choose a position on the floor.';
  if (state.cash < item.cost) return 'Not enough money.';
  const { w, d } = dimensions(item, rotation);
  if (x < 0 || z < 0 || x + w > WIDTH || z + d > DEPTH) return 'The object does not fit inside the casino.';
  const blocked = occupied(state.buildings, catalog);
  for (const b of state.buildings) for (const cell of hotelWalkway(b, catalog.find(c => c.id === b.type)!)) {
    if (cell.x >= 0 && cell.x < WIDTH && cell.z >= 0 && cell.z < DEPTH) blocked.add(cellKey(cell));
  }
  for (let zz = z; zz < z + d; zz++) for (let xx = x; xx < x + w; xx++) {
    if (blocked.has(zz * WIDTH + xx)) return 'This space is already occupied.';
    if (state.paving?.includes(zz * WIDTH + xx)) return 'ID_WEB_BUILD_OVER_PAVING';
    if (zz >= DEPTH - 2 && Math.abs(xx - ENTRY.x) < 2) return 'Keep the entrance clear.';
    if (state.guests.some(g => Math.floor(g.x) === xx && Math.floor(g.z) === zz)) return 'Wait for the visitor to pass.';
  }
  const candidate: Building = { uid: -1, type: item.id, x, z, rotation, health: 100, income: 0, visits: 0 };
  const buildings = [...state.buildings, candidate];
  const nextBlocked = occupied(buildings, catalog);
  for (const b of buildings) {
    if (!accessCell(b, catalog.find(c => c.id === b.type)!, nextBlocked)) return 'The building needs clear access from the entrance.';
  }
  return null;
}
export function place(state: GameState, item: CatalogItem, x: number, z: number,
  rotation: number, catalog: CatalogItem[]) {
  if (item.id === 'path-1' && state.tutorial) return pave(state, x, z, catalog);
  const error = canPlace(state, item, x, z, rotation, catalog);
  if (error) return error;
  state.cash -= item.cost;
  state.buildings.push({ uid: state.nextId++, type: item.id, x, z, rotation, health: 100, income: 0, visits: 0 });
  if (state.tutorial && item.id === 'mechanichut') hireMechanic(state, catalog);
  if (state.tutorial && item.id === 'electricianhut') hireElectrician(state, catalog);
  // Recalculate paths after any floorplan change.
  for (const guest of state.guests) { guest.path = []; if (guest.activity === 'walking') guest.timer = 0; }
  return null;
}
export function sell(state: GameState, uid: number, catalog: CatalogItem[]) {
  const b = state.buildings.find(b => b.uid === uid);
  if (!b) return;
  if (state.tutorial) return;
  state.cash += catalog.find(c => c.id === b.type)!.resale;
  state.buildings = state.buildings.filter(b => b.uid !== uid);
  for (const g of state.guests) if (g.target === uid) { g.target = null; g.timer = 0; g.path = []; }
}

export class Simulation {
  private spawnTimer = 0;
  readonly events: { type: 'win' | 'lose' | 'sale'; amount: number }[] = [];
  constructor(public state: GameState, public catalog: CatalogItem[], private random = Math.random) {}

  step(dt: number) {
    const s = this.state;
    const oldDay = Math.floor(s.elapsed / DAY_SECONDS);
    s.elapsed += dt;
    if (Math.floor(s.elapsed / DAY_SECONDS) > oldDay) {
      const cost = this.dailyCost();
      s.cash -= cost;
      s.expenses += cost;
    }
    if (s.tutorial) {
      stepMaintenance(s, this.catalog, dt);
      stepHotel(s, this.catalog, dt, amount => this.events.push({ type: 'sale', amount })); return;
    }
    const has = (type: string) => s.buildings.some(b => b.type === type);
    for (const b of s.buildings) {
      if (has('mechanic') || (b.type === 'slot' && has('cashier'))) b.health = Math.min(100, b.health + dt * 0.1);
      else b.health = Math.max(0, b.health - dt * 0.004);
    }
    const gaming = s.buildings.filter(b => this.item(b).category === 'gaming' && b.health > 0);
    this.spawnTimer += dt;
    if (this.spawnTimer > 2.4 && s.open && gaming.length && s.guests.length < Math.min(90, gaming.length * 5 + 5)) {
      this.spawnTimer = 0;
      s.totalVisitors++;
      s.guests.push({ id: s.nextId++, x: ENTRY.x + .5, z: ENTRY.z + .5, path: [], target: null,
        activity: 'arriving', timer: 0, cash: 100 + this.random() * 900,
        happiness: 65, served: 0, leaving: false });
    }
    const blocked = occupied(s.buildings, this.catalog);
    for (const g of s.guests) {
      if (g.path.length) {
        const point = g.path[0];
        if (blocked.has(point.z * WIDTH + point.x)) { g.path = []; g.timer = 0; continue; }
        const dx = point.x + .5 - g.x, dz = point.z + .5 - g.z;
        const distance = Math.hypot(dx, dz);
        const travel = dt * 3;
        if (distance < travel) { g.x = point.x + .5; g.z = point.z + .5; g.path.shift(); }
        else { g.x += dx / distance * travel; g.z += dz / distance * travel; }
        continue;
      }
      if (g.leaving) { g.activity = 'gone'; continue; }
      g.timer -= dt;
      if (g.timer > 0) continue;
      const previous = s.buildings.find(b => b.uid === g.target);
      if (previous && g.activity !== 'walking') {
        this.visit(g, previous);
        g.served++;
      }
      if (g.served >= 5 || g.cash < 10 || g.happiness < 20 || !s.open) {
        g.leaving = true; g.activity = 'leaving'; g.target = null;
        g.path = pathTo({ x: Math.floor(g.x), z: Math.floor(g.z) }, ENTRY, blocked) ?? [];
        continue;
      }
      if (previous && g.activity === 'walking') {
        g.activity = this.item(previous).category === 'gaming' ? 'playing' : 'visiting';
        g.timer = Math.max(4, this.item(previous).duration);
        continue;
      }
      const facilities = s.buildings.filter(b => ['bar', 'restroom', 'sofa'].includes(b.type));
      const pool = g.served % 3 === 2 && facilities.length ? facilities : gaming;
      const available = pool.filter(b => b.health > 0 && s.guests.filter(other => other.target === b.uid).length < this.item(b).capacity);
      const target = available[Math.floor(this.random() * available.length)];
      if (!target) { g.happiness -= 1; g.timer = 3; g.target = null; g.activity = 'waiting'; continue; }
      const access = accessCell(target, this.item(target), blocked);
      const route = access && pathTo({ x: Math.floor(g.x), z: Math.floor(g.z) }, access, blocked);
      if (!route) { g.happiness -= 5; g.timer = 3; continue; }
      g.target = target.uid; g.path = route; g.activity = 'walking';
    }
    s.guests = s.guests.filter(g => g.activity !== 'gone');
    if (!s.tutorial) s.completed ||= s.totalVisitors >= 50 && s.income >= 1000;
  }
  private item(b: Building) { return this.catalog.find(c => c.id === b.type)!; }
  private visit(g: Guest, b: Building) {
    const item = this.item(b);
    // Prototype economy. Original game win callbacks and house-edge rules are not yet ported.
    let income = 0;
    if (item.category === 'gaming') {
      const bet = Math.min(g.cash, b.type === 'slot' || b.type === 'poker' ? 8 : 30);
      income = this.random() < .72 ? bet : -bet * 1.5;
      this.events.push({ type: income >= 0 ? 'win' : 'lose', amount: Math.abs(income) });
      b.health = Math.max(0, b.health - .15);
    } else if (b.type === 'bar') income = Math.min(12, g.cash);
    g.cash -= income; b.income += income; this.state.cash += income; this.state.income += income;
    b.visits++;
    g.happiness = Math.min(100, g.happiness + (item.category === 'gaming' ? (income > 0 ? -1 : 5) : 8));
    if (!this.state.buildings.some(b => b.type === 'restroom')) g.happiness -= 2;
  }
  dailyCost() {
    return (this.state.mechanic?.wage ?? 0) + (this.state.electrician?.wage ?? 0) + this.state.buildings.reduce((sum, b) => {
      const item = this.item(b);
      const upgrades = item.upgrades?.filter(u => b.upgrades?.includes(u.id)).reduce((cost, u) => cost + u.runningCost, 0) ?? 0;
      return sum + item.runningCost + item.power + item.water + upgrades;
    }, 0);
  }
}

export function serialize(state: GameState) { return JSON.stringify(state); }
export function restore(raw: string, catalog: CatalogItem[]): GameState {
  const s = JSON.parse(raw) as GameState;
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  if (s.version !== 1 || !finite(s.cash) || !finite(s.elapsed) || s.elapsed < 0 ||
    !finite(s.income) || !finite(s.expenses) || !Number.isInteger(s.nextId) || s.nextId < 1 ||
    !Number.isInteger(s.totalVisitors) || s.totalVisitors < 0 || typeof s.open !== 'boolean' ||
    typeof s.completed !== 'boolean' || !Array.isArray(s.buildings) || s.buildings.length > WIDTH * DEPTH) {
    throw new Error('Invalid save data.');
  }
  const seen = new Set<number>();
  validateTutorial(s);
  validatePaving(s, catalog);
  if (s.tutorial?.pathConnected && !hotelRoute(s, catalog)) throw new Error('Invalid saved hotel connection.');
  if (s.tutorial?.financeViewed && !s.buildings[0]?.visits) throw new Error('Invalid saved hotel sales progress.');
  if (s.tutorial?.reviewStep && !s.tutorial.financeViewed) throw new Error('Invalid saved hotel information progress.');
  for (const b of s.buildings) {
    const item = catalog.find(c => c.id === b.type);
    if (b.upgrades !== undefined && (!Array.isArray(b.upgrades) || new Set(b.upgrades).size !== b.upgrades.length ||
      b.upgrades.some(id => !Number.isInteger(id) || !item?.upgrades?.some(u => u.id === id)))) throw new Error('Invalid saved upgrades.');
    if (s.tutorial && b.upgrades?.some(id => b.type !== 'headoffice' || id !== 2)) throw new Error('Invalid tutorial upgrade.');
  }
  if (s.tutorial) {
    for (const [type, connected] of [['headoffice', s.tutorial.officeConnected], ['souvenirshop', s.tutorial.shopConnected], ['mechanichut', s.tutorial.mechanicConnected], ['cinema', s.tutorial.cinemaConnected], ['electricianhut', s.tutorial.electricianConnected]] as const) {
      const b = s.buildings.find(b => b.type === type);
      if (connected && (!b || !buildingRoute(s, catalog, b))) throw new Error('Invalid saved road access.');
    }
    const office = s.buildings.find(b => b.type === 'headoffice');
    if ((office?.upgrades?.includes(2) || s.buildings.some(b => b.type === 'souvenirshop')) &&
      (!s.tutorial.officeConnected || !office?.upgrades?.includes(2))) throw new Error('Invalid retail dependency.');
  }
  const check = createGame(); check.cash = Number.MAX_SAFE_INTEGER;
  for (const b of s.buildings) {
    const item = catalog.find(c => c.id === b.type);
    if (!item || !Number.isInteger(b.uid) || b.uid < 1 || b.uid >= s.nextId || seen.has(b.uid) ||
      !Number.isInteger(b.rotation) || b.rotation < 0 || b.rotation > 3 || !finite(b.health) ||
      b.health < 0 || b.health > 100 || !finite(b.income) || !Number.isInteger(b.visits) || b.visits < 0 ||
      (b.repairs !== undefined && (!Number.isInteger(b.repairs) || b.repairs < 0)) ||
      (b.broken !== undefined && typeof b.broken !== 'boolean') ||
      canPlace(check, item, b.x, b.z, b.rotation, catalog)) throw new Error('Invalid casino layout.');
    seen.add(b.uid); check.buildings.push(b);
    if (b.health === 0) b.broken = true;
  }
  validateMechanic(s, catalog);
  validateElectrician(s, catalog);
  validateInfluences(catalog);
  // Visitors restart at the entrance; saves persist the economy and floorplan.
  s.guests = [];
  return s;
}
