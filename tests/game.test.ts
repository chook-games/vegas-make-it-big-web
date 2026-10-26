import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation, createGame, canPlace, place, sell, pathTo, serialize, restore,
  DAY_SECONDS, WIDTH, DEPTH, type CatalogItem } from '../src/game.ts';

const { catalog } = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url), 'utf8')) as { catalog: CatalogItem[] };
const item = (id: string) => catalog.find(c => c.id === id)!;

test('original Lua values are preserved in the imported catalog', () => {
  assert.equal(item('slot').cost, 120);
  assert.equal(item('slot').width, 1);
  assert.equal(item('slot').depth, 3);
  assert.equal(item('blackjack').capacity, 7);
  assert.equal(item('roulette').cost, 700);
  assert.equal(item('cashier').runningCost, 105);
});
test('placement handles rotated footprints, overlap, cash and entry protection', () => {
  const s = createGame();
  assert.equal(place(s, item('blackjack'), 4, 4, 1, catalog), null);
  assert.equal(s.cash, 49600);
  assert.ok(canPlace(s, item('slot'), 9, 10, 0, catalog));
  assert.equal(canPlace(s, item('slot'), 10, 10, 0, catalog), null);
  assert.ok(canPlace(s, item('slot'), 24, 38, 1, catalog));
  assert.ok(canPlace(s, item('roulette'), WIDTH - 1, DEPTH - 1, 0, catalog));
  s.cash = 0;
  assert.ok(canPlace(s, item('slot'), 1, 1, 0, catalog));
});
test('pathfinding walks around obstructions and rejects sealed destinations', () => {
  const blocked = new Set([1, WIDTH + 1]);
  const route = pathTo({ x: 0, z: 0 }, { x: 2, z: 0 }, blocked)!;
  assert.ok(route.length > 3);
  assert.ok(route.every(c => !blocked.has(c.z * WIDTH + c.x)));
  assert.equal(pathTo({ x: 0, z: 0 }, { x: 2, z: 0 }, new Set([1, WIDTH])), null);
});
test('visitors reach games, generate revenue and daily expenses are charged', () => {
  const s = createGame();
  place(s, item('blackjack'), 20, 30, 0, catalog);
  const sim = new Simulation(s, catalog, () => .3);
  const cash = s.cash;
  for (let i = 0; i < DAY_SECONDS * 20 + 1; i++) sim.step(.05);
  assert.ok(s.totalVisitors > 0);
  assert.ok(s.buildings[0].visits > 0);
  assert.ok(s.income > 0);
  assert.equal(s.expenses, item('blackjack').runningCost);
  assert.equal(s.cash, cash + s.income - s.expenses);
  assert.ok(s.guests.every(g => Number.isFinite(g.x) && Number.isFinite(g.z)));
});
test('selling releases occupants and refunds original resale amount', () => {
  const s = createGame();
  place(s, item('slot'), 10, 10, 0, catalog);
  const uid = s.buildings[0].uid;
  sell(s, uid, catalog);
  assert.equal(s.cash, 50000 - 120 + 60);
  assert.equal(s.buildings.length, 0);
});
test('saves roundtrip economy, reject corrupt data and overlapping footprints', () => {
  const s = createGame();
  place(s, item('slot'), 10, 10, 0, catalog);
  const restored = restore(serialize(s), catalog);
  assert.deepEqual(restored, s);
  assert.throws(() => restore('{broken', catalog));
  assert.throws(() => restore(JSON.stringify({ ...s, cash: 'NaN' }), catalog));
  assert.throws(() => restore(JSON.stringify({ ...s, buildings: [{ ...s.buildings[0], type: 'missing' }] }), catalog));
  assert.throws(() => restore(JSON.stringify({ ...s, nextId: 10, buildings: [s.buildings[0], { ...s.buildings[0], uid: 9 }] }), catalog));
});
