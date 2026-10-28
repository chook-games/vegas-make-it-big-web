import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, place, restore, serialize, Simulation, type CatalogItem } from '../src/game.ts';
import { beginTutorial, purchaseLot, tutorialStage } from '../src/tutorial.ts';
import { pave } from '../src/paving.ts';
import { enableRetail } from '../src/development.ts';
import { hireMechanic, requestRepair } from '../src/maintenance.ts';

const { catalog } = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url), 'utf8')) as { catalog: CatalogItem[] };
const item = (id: string) => catalog.find(c => c.id === id)!;
function retailGame() {
  const s = beginTutorial(createGame()); s.tutorial!.lotSelected = true; purchaseLot(s, 'Generic');
  place(s, item('smallhotel'), 10,10,0,catalog);
  for (let z = 9; z >= 0; z--) pave(s,16,z,catalog);
  const sim = new Simulation(s,catalog); for (let i = 0; i < 250; i++) sim.step(.05);
  s.tutorial!.financeViewed = true; s.tutorial!.reviewStep = 3; s.tutorial!.statisticsClosed = true; s.tutorial!.cameraReviewed = true;
  place(s,item('headoffice'),30,10,0,catalog);
  for (let z = 8; z >= 0; z--) pave(s,33,z,catalog);
  sim.step(0); enableRetail(s,catalog,s.buildings[1].uid);
  place(s,item('souvenirshop'),24,26,0,catalog);
  for (let z = 25; z >= 0; z--) pave(s,26,z,catalog);
  sim.step(0); return s;
}
function hutGame() {
  const s = retailGame();
  assert.equal(place(s,item('mechanichut'),4,24,0,catalog),null);
  for (let z = 22; z >= 0; z--) pave(s,6,z,catalog);
  new Simulation(s,catalog).step(0); return s;
}
test('source maintenance values and automatically hired mechanic wages are preserved', () => {
  const hut = item('mechanichut');
  assert.equal(hut.cost,350); assert.equal(hut.runningCost + hut.power + hut.water,70);
  assert.deepEqual(hut.entrances,[3,1]);
  assert.equal(item('smallhotel').wear,.04); assert.equal(item('smallhotel').wearByUse,.08);
  assert.deepEqual(item('smallhotel').repairPoint,[7,7]);
  const s = hutGame(), worker = s.mechanic!;
  assert.equal(worker.status,'idle'); assert.ok(worker.skill >= 30 && worker.skill <= 60);
  assert.equal(worker.wage,Math.round(80 + (worker.attention + worker.skill + worker.speed) / 3 * .4));
  assert.equal(new Simulation(s,catalog).dailyCost(),1880 + worker.wage);
  const nextId = s.nextId; hireMechanic(s,catalog); assert.equal(s.nextId,nextId);
  assert.equal(tutorialStage(s),'repair');
});
test('dispatch rejects disconnected networks and busy staff without charging repair fees', () => {
  const s = hutGame(), target = s.buildings[0]; target.health = 20;
  const cash = s.cash;
  assert.equal(requestRepair(s,catalog,target.uid),'ID_WEB_REPAIR_PATH_MISSING');
  assert.equal(s.mechanic!.status,'idle'); assert.equal(s.cash,cash);
  for (let x = 7; x < 16; x++) pave(s,x,0,catalog);
  const before = s.cash; assert.equal(requestRepair(s,catalog,target.uid),null);
  assert.equal(s.cash,before); assert.equal(target.health,20,'Dispatch cannot repair remotely');
  assert.equal(tutorialStage(s),'next','Original objective advances on pressing Call Mechanic');
  assert.equal(requestRepair(s,catalog,target.uid),'ID_WEB_MECHANIC_BUSY');
  assert.equal(s.mechanic!.target,target.uid);
});
test('walking repair job survives save/load, repairs on site and returns to its hut', () => {
  const s = hutGame(); for (let x = 7; x < 16; x++) pave(s,x,0,catalog);
  s.buildings[0].health = 20; requestRepair(s,catalog,s.buildings[0].uid);
  const sim = new Simulation(s,catalog); for (let i = 0; i < 20; i++) sim.step(.05);
  assert.equal(s.mechanic!.status,'outbound'); assert.ok(s.mechanic!.z < 24.5);
  const loaded = restore(serialize(s),catalog); assert.deepEqual(loaded.mechanic,s.mechanic);
  const resumed = new Simulation(loaded,catalog);
  let sawRepair = false;
  for (let i = 0; i < 4000 && loaded.mechanic!.status !== 'idle'; i++) {
    resumed.step(.05); sawRepair ||= loaded.mechanic!.status === 'repairing';
  }
  assert.equal(sawRepair,true); assert.equal(loaded.mechanic!.status,'idle');
  assert.equal(loaded.tutorial!.repairCompleted,true); assert.ok(loaded.buildings[0].health > 98);
  assert.equal(loaded.mechanic!.target,null); assert.equal(loaded.completed,false);
  assert.deepEqual(restore(serialize(loaded),catalog).mechanic,loaded.mechanic);
});
test('wear closes broken hotels, and corrupt staff salaries/targets are rejected', () => {
  const s = hutGame(); s.open = false;
  const sim = new Simulation(s,catalog), health = s.buildings[0].health;
  sim.step(1); assert.ok(Math.abs(s.buildings[0].health - (health - .04)) < 1e-8);
  s.buildings[0].health = 0; const visits = s.buildings[0].visits;
  for (let i = 0; i < 200; i++) sim.step(.05);
  assert.equal(s.buildings[0].visits,visits);
  assert.throws(() => restore(JSON.stringify({ ...s, mechanic:{...s.mechanic,wage:0} }),catalog));
  assert.throws(() => restore(JSON.stringify({ ...s, mechanic:{...s.mechanic,status:'repairing',target:9999} }),catalog));
  assert.throws(() => restore(JSON.stringify({ ...s, mechanic:undefined }),catalog));
});
