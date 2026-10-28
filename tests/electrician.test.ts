import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, place, restore, serialize, Simulation, type CatalogItem } from '../src/game.ts';
import { beginTutorial, purchaseLot, tutorialStage } from '../src/tutorial.ts';
import { pave } from '../src/paving.ts';
import { enableRetail } from '../src/development.ts';
import { requestRepair } from '../src/maintenance.ts';

const { catalog } = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url), 'utf8')) as { catalog: CatalogItem[] };
const item = (id: string) => catalog.find(c => c.id === id)!;
function tile(s: ReturnType<typeof createGame>, x: number, z: number) {
  if (!s.paving?.includes(z * 48 + x)) assert.equal(pave(s,x,z,catalog),null);
}
function cinemaGame() {
  const s = beginTutorial(createGame()); s.tutorial!.lotSelected = true; purchaseLot(s,'Generic');
  place(s,item('smallhotel'),10,10,0,catalog);
  for (let z = 9; z >= 0; z--) tile(s,16,z);
  const sim = new Simulation(s,catalog); for (let i = 0; i < 250; i++) sim.step(.05);
  Object.assign(s.tutorial!,{ financeViewed:true,reviewStep:3,statisticsClosed:true,cameraReviewed:true });
  place(s,item('headoffice'),30,10,0,catalog); for (let z = 8; z >= 0; z--) tile(s,33,z);
  sim.step(0); enableRetail(s,catalog,s.buildings[1].uid);
  place(s,item('souvenirshop'),24,26,0,catalog); for (let z = 25; z >= 0; z--) tile(s,26,z);
  sim.step(0); place(s,item('mechanichut'),4,24,0,catalog);
  for (let z = 22; z >= 0; z--) tile(s,6,z);
  for (let x = 7; x <= 45; x++) tile(s,x,0);
  sim.step(0); s.buildings[0].health = 20; requestRepair(s,catalog,s.buildings[0].uid);
  assert.equal(tutorialStage(s),'cinema');
  assert.equal(place(s,item('cinema'),37,3,0,catalog),null);
  return s;
}
function staffedCinema() {
  const s = cinemaGame(), sim = new Simulation(s,catalog);
  tile(s,40,1); sim.step(0);
  assert.equal(place(s,item('electricianhut'),3,31,0,catalog),null);
  for (let z = 29; z >= 26; z--) tile(s,4,z);
  for (let x = 5; x <= 8; x++) tile(s,x,26);
  for (let z = 25; z >= 0; z--) tile(s,8,z);
  sim.step(0); return s;
}
test('original Cinema and electrician source data are imported', () => {
  assert.equal(item('cinema').cost,5000); assert.equal(item('cinema').capacity,22);
  assert.equal(item('cinema').salePrice,8); assert.equal(item('cinema').duration,75);
  assert.equal(item('cinema').repairStaff,'ELECTRICIAN'); assert.deepEqual(item('cinema').repairPoint,[5,3]);
  assert.equal(item('cinema').entrances!.length,8);
  assert.equal(item('electricianhut').cost,300); assert.equal(item('electricianhut').runningCost + item('electricianhut').power,70);
  assert.equal(item('electricianhut').electrician!.wageBase,80);
});
test('existing sandbox saves with maintenance buildings still load without exterior staff', () => {
  const s = createGame();
  assert.equal(place(s,item('mechanichut'),2,2,0,catalog),null);
  assert.equal(place(s,item('electricianhut'),12,2,0,catalog),null);
  assert.deepEqual(restore(serialize(s),catalog),s);
});
test('Cinema connection precedes electrician hire and both salaries enter daily costs', () => {
  const s = cinemaGame(), sim = new Simulation(s,catalog);
  assert.equal(tutorialStage(s),'cinemaPaths');
  assert.ok(place(s,item('electricianhut'),3,31,0,catalog));
  tile(s,40,1); sim.step(0); assert.equal(tutorialStage(s),'electrician');
  assert.equal(place(s,item('electricianhut'),3,31,0,catalog),null);
  assert.equal(tutorialStage(s),'electricianPaths');
  assert.notEqual(s.mechanic!.uid,s.electrician!.uid);
  assert.equal(sim.dailyCost(),2235 + s.mechanic!.wage + s.electrician!.wage);
});
test('mechanics cannot service Cinema; two active staff jobs resume independently', () => {
  const s = cinemaGame(), cinema = s.buildings.find(b => b.type === 'cinema')!;
  cinema.health = 0; tile(s,40,1);
  const sim = new Simulation(s,catalog); sim.step(0);
  assert.equal(requestRepair(s,catalog,cinema.uid),'ID_WEB_NEED_ELECTRICIAN');
  assert.equal(s.mechanic!.target,s.buildings[0].uid);
  const full = staffedCinema(), target = full.buildings.find(b => b.type === 'cinema')!;
  target.health = 0; new Simulation(full,catalog).step(0);
  assert.equal(requestRepair(full,catalog,target.uid),null);
  assert.equal(tutorialStage(full),'filterNoise');
  Object.assign(full.tutorial!,{filterNoise:true,filterSmell:true,filterBeauty:true});
  assert.equal(tutorialStage(full),'tree');
  const loaded = restore(serialize(full),catalog);
  assert.deepEqual(loaded.mechanic,full.mechanic); assert.deepEqual(loaded.electrician,full.electrician);
  const resumed = new Simulation(loaded,catalog); let sawElectricalRepair = false;
  const movie = loaded.buildings.find(b => b.type === 'cinema')!;
  for (let i = 0; i < 10000 && (loaded.mechanic!.status !== 'idle' || loaded.electrician!.status !== 'idle'); i++) {
    resumed.step(.05); sawElectricalRepair ||= loaded.electrician!.status === 'repairing';
    if (movie.broken) assert.equal(movie.visits,0,'A broken business stays closed until fully repaired');
  }
  assert.equal(sawElectricalRepair,true); assert.equal(movie.repairs,1); assert.equal(movie.broken,false);
  assert.equal(loaded.electrician!.status,'idle'); assert.equal(loaded.mechanic!.status,'idle');
  for (let i = 0; i < 500; i++) resumed.step(.05);
  assert.ok(movie.visits > 0); assert.equal(movie.income,movie.visits * 8);
  assert.equal(loaded.completed,false);
  assert.deepEqual(restore(serialize(loaded),catalog).electrician,loaded.electrician);
  assert.throws(() => restore(JSON.stringify({ ...loaded, electrician:{ ...loaded.electrician, uid:loaded.mechanic!.uid } }),catalog));
  assert.throws(() => restore(JSON.stringify({ ...loaded, electrician:{ ...loaded.electrician, status:'outbound',target:loaded.buildings[0].uid } }),catalog));
});
