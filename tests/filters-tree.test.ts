import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, place, serialize, WIDTH, type CatalogItem, type GameState } from '../src/game.ts';
import { influenceMap, repairMap } from '../src/influence.ts';
import { beginTutorial, purchaseLot, tutorialStage, tutorialBuildError, validateTutorial, TREE_ITEM } from '../src/tutorial.ts';

const { catalog } = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url), 'utf8')) as { catalog: CatalogItem[] };
const item = (id: string) => catalog.find(c => c.id === id)!;
function filtered() {
  const s = beginTutorial(createGame()); s.tutorial!.lotSelected = true; purchaseLot(s, 'Generic');
  s.buildings.push({ uid:1, type:'smallhotel', x:2, z:2, rotation:0, health:80, income:25, visits:1 });
  s.buildings.push({ uid:2, type:'headoffice', x:20, z:2, rotation:0, health:100, income:0, visits:0, upgrades:[2] });
  s.buildings.push({ uid:3, type:'souvenirshop', x:32, z:2, rotation:0, health:100, income:0, visits:0 });
  s.buildings.push({ uid:4, type:'mechanichut', x:40, z:2, rotation:0, health:100, income:0, visits:0 });
  s.buildings.push({ uid:5, type:'cinema', x:20, z:12, rotation:0, health:100, income:0, visits:0 });
  s.buildings.push({ uid:6, type:'electricianhut', x:32, z:12, rotation:0, health:100, income:0, visits:0 });
  s.income = 25;
  Object.assign(s.tutorial!, { pathConnected:true, financeViewed:true, reviewStep:3, statisticsClosed:true, cameraReviewed:true,
    officeConnected:true, shopConnected:true, mechanicConnected:true, repairRequested:true, repairCompleted:true,
    cinemaConnected:true, electricianConnected:true, filterNoise:true, filterSmell:true, filterBeauty:true });
  return s;
}
test('Giant Palm source data and Beauty/Calming maps are imported', () => {
  assert.equal(item(TREE_ITEM).name,'Giant Palm Tree');
  assert.equal(item(TREE_ITEM).cost,340);
  assert.deepEqual(item(TREE_ITEM).influences!.beauty,[2,2,1,3]);
  assert.deepEqual(item(TREE_ITEM).influences!.calming,[2,2,1,5]);
  const s = filtered();
  s.buildings.push({ uid:7, type:TREE_ITEM, x:30, z:30, rotation:0, health:100, income:0, visits:0 });
  const beauty = influenceMap(s, catalog, 'beauty');
  assert.equal(beauty[30 * WIDTH + 30], 2);
  assert.equal(beauty[30 * WIDTH + 32], 2, 'Second ring at distance 2 keeps intensity 2');
  assert.equal(beauty[30 * WIDTH + 33], 1, 'Outer band reaches distance 5');
  assert.equal(beauty[30 * WIDTH + 36], 0);
});
test('State of Repair map paints only footprints with the original gold ramp buckets', () => {
  const s = filtered();
  s.buildings[0].health = 5;
  s.buildings[1].health = 100;
  s.buildings[2].health = 50;
  const map = repairMap(s, catalog);
  assert.equal(map[2 * WIDTH + 2], 1, 'Poor health is the darkest bucket');
  assert.equal(map[2 * WIDTH + 20], 10, 'Full health is the lightest bucket');
  assert.equal(map[2 * WIDTH + 32], 5, 'Fifty percent health is the middle bucket');
  assert.equal(map[35 * WIDTH + 30], 0, 'Empty ground stays clear');
});
test('palm placement and repair filter follow tutorial order and persist', () => {
  const s = filtered();
  assert.equal(tutorialStage(s), 'tree');
  const tree = item(TREE_ITEM);
  assert.equal(tutorialBuildError(s, tree), null);
  assert.equal(place(s, tree, 30, 30, 0, catalog), null);
  assert.equal(s.cash, 250000 - 16000 - 340);
  assert.equal(tutorialStage(s), 'repairFilter');
  assert.equal(place(s, tree, 34, 30, 0, catalog), 'ID_WEB_BUILDING_EXISTS', 'Only one palm is allowed');
  s.tutorial!.repairFilter = true;
  assert.equal(tutorialStage(s), 'next');
  const clone = JSON.parse(serialize(s)) as GameState;
  assert.equal(tutorialStage(clone), 'next');
  assert.ok(clone.buildings.some(b => b.type === TREE_ITEM));
  assert.equal(clone.tutorial!.repairFilter, true);
  assert.equal(clone.completed, false);
});
test('scenery and repair-filter progress are validated against prerequisites', () => {
  const s = filtered();
  assert.throws(() => validateTutorial({ ...s, tutorial:{ ...s.tutorial, repairFilter:true } } as GameState));
  s.buildings.push({ uid:7, type:TREE_ITEM, x:30, z:30, rotation:0, health:100, income:0, visits:0 });
  validateTutorial(s);
  assert.throws(() => validateTutorial({ ...s, tutorial:{ ...s.tutorial, filterBeauty:false, repairFilter:true } } as GameState));
  assert.throws(() => validateTutorial({ ...s, buildings:[...s.buildings, { ...s.buildings[6], uid:9 }] } as GameState));
});
