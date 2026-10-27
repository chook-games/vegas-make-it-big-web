import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, place, restore, serialize, Simulation, WIDTH, DEPTH, type CatalogItem } from '../src/game.ts';
import { beginTutorial, purchaseLot, tutorialStage } from '../src/tutorial.ts';
import { canPave, cellKey, hotelRoute, hotelWalkway, pave, rotateCell } from '../src/paving.ts';

const { catalog } = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url), 'utf8')) as { catalog: CatalogItem[] };
const hotelItem = catalog.find(c => c.id === 'smallhotel')!;
function hotelGame(rotation = 0) {
  const s = beginTutorial(createGame()); s.tutorial!.lotSelected = true;
  assert.equal(purchaseLot(s, 'Generic'), null);
  assert.equal(place(s, hotelItem, 10, 10, rotation, catalog), null);
  return s;
}
function connect(s: ReturnType<typeof hotelGame>) {
  const hotel = s.buildings[0];
  const p = rotateCell(hotel, hotelItem, 7, 1);
  const [dx,dz] = [[0,-1],[1,0],[0,1],[-1,0]][hotel.rotation];
  for (p.x += dx, p.z += dz; p.x >= 0 && p.x < WIDTH && p.z >= 0 && p.z < DEPTH; p.x += dx, p.z += dz) {
    assert.equal(pave(s, p.x, p.z, catalog), null);
  }
}
test('source import preserves original hotel entrance, forecourt, paving cost and motel price', () => {
  assert.deepEqual(hotelItem.entrances, [7,7]);
  assert.deepEqual(hotelItem.pavement, [6,1,7,1,8,1]);
  assert.equal(hotelItem.roomPrice, 25);
  assert.equal(hotelItem.duration, 90);
  assert.equal(catalog.find(c => c.id === 'path-1')!.cost, 10);
});
test('only a continuous entrance-to-street route opens the hotel, in all rotations', () => {
  for (let rotation = 0; rotation < 4; rotation++) {
    const s = hotelGame(rotation);
    assert.equal(hotelRoute(s, catalog), null);
    assert.equal(pave(s, 1, 0, catalog), null, 'Unconnected paving island');
    assert.equal(hotelRoute(s, catalog), null);
    connect(s);
    const route = hotelRoute(s, catalog)!;
    assert.deepEqual(route[0], rotateCell(s.buildings[0], hotelItem, 7, 7));
    const allowed = new Set([...(s.paving ?? []), ...hotelWalkway(s.buildings[0], hotelItem).map(cellKey)]);
    assert.ok(route.every(c => allowed.has(cellKey(c))));
    for (let i = 1; i < route.length; i++) assert.equal(Math.abs(route[i].x - route[i-1].x) + Math.abs(route[i].z - route[i-1].z), 1);
    assert.ok([0,WIDTH-1].includes(route.at(-1)!.x) || [0,DEPTH-1].includes(route.at(-1)!.z));
  }
});
test('paving is charged once per valid cell and corrupt paving/progress saves are rejected', () => {
  const s = hotelGame();
  assert.equal(pave(s, 16, 9, catalog), null);
  assert.equal(s.cash, 230990);
  assert.ok(pave(s, 16, 9, catalog)); assert.ok(canPave(s, 10, 10, catalog));
  assert.ok(pave(s, -1, 5, catalog)); assert.ok(pave(s, 48, 0, catalog));
  assert.equal(s.cash, 230990);
  assert.throws(() => restore(JSON.stringify({ ...s, paving: [1,1] }), catalog));
  assert.throws(() => restore(JSON.stringify({ ...s, paving: [10 * WIDTH + 10] }), catalog));
  assert.throws(() => restore(JSON.stringify({ ...s, tutorial: { ...s.tutorial, pathConnected: true } }), catalog));
});
test('guests cannot arrive without paths; connected hotel checks guests in at $25 and persists sales', () => {
  const s = hotelGame(); const sim = new Simulation(s, catalog);
  for (let i = 0; i < 100; i++) sim.step(.05);
  assert.equal(s.totalVisitors, 0); assert.equal(s.buildings[0].visits, 0);
  connect(s); const openingCash = s.cash;
  for (let i = 0; i < 1000; i++) sim.step(.05);
  assert.equal(tutorialStage(s), 'finance');
  assert.ok(s.buildings[0].visits > 0);
  assert.equal(s.buildings[0].income, 25 * s.buildings[0].visits);
  assert.equal(s.cash, openingCash + s.buildings[0].income);
  assert.ok(s.guests.filter(g => !g.leaving).length <= hotelItem.capacity);
  const restored = restore(serialize(s), catalog);
  assert.equal(tutorialStage(restored), 'finance');
  assert.deepEqual(restored.paving, s.paving);
  assert.equal(restored.buildings[0].income, s.buildings[0].income);
  assert.equal(restored.completed, false, 'Opening slice must not award a full scenario win');
});
