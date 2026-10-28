import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, WIDTH, type CatalogItem, type GameState } from '../src/game.ts';
import { influenceMap, validateInfluences } from '../src/influence.ts';
import { validateTutorial } from '../src/tutorial.ts';

const { catalog } = JSON.parse(readFileSync(new URL('../public/assets/game-data.json', import.meta.url), 'utf8')) as { catalog: CatalogItem[] };
const item = (id: string) => catalog.find(c => c.id === id)!;
function withHut() {
  const s = createGame();
  s.buildings.push({ uid:1, type:'mechanichut', x:10, z:10, rotation:0, health:100, income:0, visits:0 });
  return s;
}
test('source influence bands are imported without effectors replacing map intensity', () => {
  assert.deepEqual(item('mechanichut').influences!.noise, [3,3,2,2,1,2]);
  assert.deepEqual(item('mechanichut').influences!.smell, [3,2,2,2,1,1]);
  assert.deepEqual(item('slot').influences!.noise, [2,3,1,2]);
  assert.doesNotThrow(() => validateInfluences(catalog));
  assert.throws(() => validateInfluences([{ ...item('slot'), influences: { noise: [4,3] } }]));
  assert.throws(() => validateInfluences([{ ...item('slot'), influences: { noise: [2,3,1] } }]));
});
test('influence map uses cumulative square rings and maximum intensity', () => {
  const s = withHut();
  const noise = influenceMap(s, catalog, 'noise');
  assert.equal(noise[10 * WIDTH + 10], 3, 'Footprint is maximum intensity');
  assert.equal(noise[10 * WIDTH + 17], 2, 'Second band (distance 4–5) is intensity 2');
  assert.equal(noise[10 * WIDTH + 19], 1, 'Outer band (distance 6–7) is intensity 1');
  assert.equal(noise[10 * WIDTH + 21], 0, 'Beyond the cumulative range is empty');
  const smell = influenceMap(s, catalog, 'smell');
  assert.equal(smell[10 * WIDTH + 16], 2, 'Smell second band starts at distance 3');
  assert.equal(smell[10 * WIDTH + 18], 1, 'Smell outer band reaches distance 5');
  assert.ok(influenceMap(s, catalog, 'beauty').every(value => value === 0), 'The hut has no beauty band');
  const combined = withHut();
  combined.buildings.push({ uid:2, type:'slot', x:10, z:10, rotation:0, health:100, income:0, visits:0 });
  assert.equal(influenceMap(combined, catalog, 'noise')[10 * WIDTH + 10], 3, 'Maximum wins when influences overlap');
});
test('filter tutorial flags require electrical completion and ordered viewing', () => {
  const types = ['smallhotel','headoffice','souvenirshop','mechanichut','cinema','electricianhut'];
  const s = createGame();
  s.buildings = types.map((type, index) => ({ uid:index + 1, type, x:2, z:2, rotation:0, health:100, income:0, visits:0,
    ...(type === 'headoffice' ? { upgrades:[2] } : {}) }));
  const tutorial = { scenario:'welcome' as const, lotSelected:true, lotOwned:true, theme:'Generic' as const,
    pathConnected:true, financeViewed:true, reviewStep:3, statisticsClosed:true, cameraReviewed:true, officeConnected:true,
    shopConnected:true, mechanicConnected:true, repairRequested:true, cinemaConnected:true, electricianConnected:true };
  const base = { ...s, tutorial };
  validateTutorial(base as GameState);
  validateTutorial({ ...base, tutorial:{ ...tutorial, filterNoise:true } } as GameState);
  validateTutorial({ ...base, tutorial:{ ...tutorial, filterNoise:true, filterSmell:true, filterBeauty:true } } as GameState);
  assert.throws(() => validateTutorial({ ...base, tutorial:{ ...tutorial, filterNoise:true, filterBeauty:true } } as GameState));
  assert.throws(() => validateTutorial({ ...base, tutorial:{ ...tutorial, electricianConnected:false, filterNoise:true } } as GameState));
  assert.throws(() => validateTutorial({ ...base, tutorial:{ ...tutorial, filterNoise:'yes' } } as unknown as GameState));
});
