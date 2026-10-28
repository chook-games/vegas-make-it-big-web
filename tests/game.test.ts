import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulation, createGame, canPlace, place, sell, pathTo, serialize, restore,
  DAY_SECONDS, WIDTH, DEPTH, type CatalogItem } from '../src/game.ts';
import { beginTutorial, purchaseLot, tutorialStage } from '../src/tutorial.ts';

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
test('the complete template/UI/audio manifests import source fidelity data', () => {
  const data = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url), 'utf8'));
  assert.equal(data.catalog.length, 164);
  assert.equal(data.uiSprites.length, 372);
  assert.equal(data.sounds.length, 12);
  assert.ok(data.catalog.some((entry: { major: number }) => entry.major === 0));
  assert.ok(data.catalog.some((entry: { major: number }) => entry.major === 7));
  assert.equal(data.campaign.length, 10);
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
  assert.ok(sim.events.some(event => event.type === 'win' || event.type === 'lose'));
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
test('opening tutorial enforces ownership, theme, single hotel and saved progression', () => {
  const s = beginTutorial(createGame());
  assert.equal(s.cash, 250000);
  assert.equal(tutorialStage(s), 'lot');
  assert.ok(place(s, item('smallhotel'), 10, 10, 0, catalog));
  assert.ok(purchaseLot(s, 'Generic'));
  s.tutorial!.lotSelected = true;
  assert.ok(purchaseLot(s, 'unknown'));
  assert.equal(s.cash, 250000);
  assert.equal(purchaseLot(s, 'Greece'), null);
  assert.equal(s.cash, 234000);
  assert.ok(purchaseLot(s, 'Generic'));
  assert.equal(tutorialStage(s), 'hotel');
  assert.ok(place(s, item('slot'), 4, 4, 0, catalog));
  assert.equal(place(s, item('smallhotel'), 10, 10, 1, catalog), null);
  assert.equal(s.cash, 231000);
  assert.equal(tutorialStage(s), 'paths');
  assert.ok(place(s, item('smallhotel'), 26, 10, 0, catalog));
  sell(s, s.buildings[0].uid, catalog);
  assert.equal(s.buildings.length, 1, 'Required hotel cannot be sold');
  const loaded = restore(serialize(s), catalog);
  assert.equal(tutorialStage(loaded), 'paths');
  assert.equal(loaded.tutorial!.theme, 'Greece');
  assert.equal(loaded.cash, 231000);
  assert.throws(() => restore(JSON.stringify({ ...s, tutorial: { ...s.tutorial, lotOwned: false } }), catalog));
});
