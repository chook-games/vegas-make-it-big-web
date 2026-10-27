import { mkdir, readFile, readdir, writeFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Only extracts documented scalar assignments. Never executes the original Lua.
const root = process.argv[2] ?? 'C:/Program Files (x86)/Steam/steamapps/common/Vegas - Make It Big';
const output = path.resolve('public/assets');
const localeOutput = path.resolve('src/locales');
const sourceRoot = 'GAMEDATA/Scripts/Objects/Buildings/Source/Interior/';
let previousCatalog = [];
try { previousCatalog = JSON.parse(await readFile(path.join(output, 'game-data.json'), 'utf8')).catalog ?? []; } catch { /* first import */ }
const selected = [
  ['slot', 'Slot machine', 'Gambling/Slot_Type_1.lua', 'slot_thumb.tga', 'gaming'],
  ['blackjack', 'Blackjack', 'Gambling/BlackJack.lua', 'BLACKJACK_thumb.tga', 'gaming'],
  ['roulette', 'Roulette', 'Gambling/Roulette.lua', 'ROLT_thumb.tga', 'gaming'],
  ['poker', 'Video poker', 'Gambling/VideoPoker.lua', 'video_poker_thumb.tga', 'gaming'],
  ['cashier', 'Cashier’s desk', 'CashiersDesk.lua', 'cas_cash_int_thumb.tga', 'service'],
  ['bar', 'Casino bar', 'InteriorBar.lua', 'cas_bar_int_thumb.tga', 'service'],
  ['restroom', 'Restroom', 'Interior MaleToilet.lua', 'cas_loo_m_int_thumb.tga', 'service'],
  ['security', 'Security office', 'SecurityINT.lua', 'cas_sec_int_thumb.tga', 'staff'],
  ['cleaner', 'Cleaner’s closet', 'JanitorINT.lua', 'cas_jan_closet_int_thumb.tga', 'staff'],
  ['mechanic', 'Mechanic’s closet', 'IntMechanic.lua', 'cas_mechanic_closet_int_thumb.tga', 'staff'],
  ['plant', 'Potted tree', 'PotTree1x1_INT.lua', 'pottree1x1_dc_int_thumb.tga', 'decor'],
  ['sofa', 'Sofa', 'Sofa.lua', 'sofa_dc_int_thumb.tga', 'decor'],
];
const provenance = [];
await stat(root);
await mkdir(output, { recursive: true });
await mkdir(path.join(output, 'ui'), { recursive: true });
await mkdir(path.join(output, 'sound'), { recursive: true });
await mkdir(localeOutput, { recursive: true });
const englishBytes = await readFile(path.join(root, 'GAMEDATA/Strings/english.uni'));
const englishText = englishBytes.toString('utf16le').replace(/^\uFEFF/, '');
const englishLines = englishText.split(/\r?\n/);
const englishStrings = {};
for (let index = 0; index < englishLines.length; index++) {
  const key = englishLines[index].trim();
  if (!/^ID_[A-Za-z0-9_]+$/.test(key)) continue;
  let cursor = index + 1;
  while (cursor < englishLines.length && !englishLines[cursor].trim()) cursor++;
  const rawValue = englishLines[cursor]?.trim();
  if (!rawValue?.startsWith('"') || !rawValue.endsWith('"')) continue;
  const quoted = rawValue;
  let value;
  try { value = JSON.parse(quoted); }
  catch { value = quoted.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\\\', '\\'); }
  englishStrings[key] = value;
  index = cursor;
}
if (Object.keys(englishStrings).length < 3000) throw new Error('English localization parser did not find the complete master token list.');
await writeFile(path.join(localeOutput, 'en.json'), JSON.stringify(englishStrings) + '\n');
const languageFiles = [['english.uni', 'English'], ['french.uni', 'French'], ['German.uni', 'German'], ['Italian.uni', 'Italian'], ['Spanish.uni', 'Spanish'], ['usa.uni', 'US English']];
const languageManifest = [];
for (const [file, label] of languageFiles) {
  const bytes = await readFile(path.join(root, 'GAMEDATA/Strings', file));
  languageManifest.push({ label, file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
provenance.push(...languageManifest.map(locale => ({ file: `GAMEDATA/Strings/${locale.file}`, sha256: locale.sha256 })));
const catalog = [];
for (const [id, name, script, thumbnail, category] of selected) {
  const source = sourceRoot + script;
  const raw = await readFile(path.join(root, source));
  const text = raw.toString('latin1').replace(/--[^\r\n]*/g, '');
  function scalar(key, fallback = 0) {
    const match = text.match(new RegExp(`SourceTemplate\\[x\\]\\.${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
    return match ? Number(match[1]) : fallback;
  }
  const imageSource = 'GAMEDATA/GAMEART/TGA Files/Thumbnails/' + thumbnail;
  const image = await readFile(path.join(root, imageSource));
  await writeFile(path.join(output, id + '.tga'), image);
  const minor = text.match(/SourceTemplate\[x\]\._minorgroup\s*=\s*([A-Z0-9_]+)/)?.[1] ?? category;
  const nameKey = text.match(/SourceTemplate\[x\]\._name\s*=\s*(ID_[A-Za-z0-9_]+)/)?.[1];
  const descriptionKey = text.match(/SourceTemplate\[x\]\._description\s*=\s*(ID_[A-Z0-9_]+)/)?.[1];
  catalog.push({ id, name: englishStrings[nameKey] ?? name, nameKey, descriptionKey, category, context: 'interior', major: category === 'gaming' ? 4 : category === 'service' || category === 'staff' ? 5 : 6, minor, width: scalar('_w', 1), depth: scalar('_l', 1),
    cost: scalar('_buildcost'), resale: scalar('_democost'), capacity: scalar('_capacity', 1),
    runningCost: scalar('_baserunningcost'), power: scalar('_basepowerconsumption'),
    water: scalar('_basewaterconsumption'), duration: scalar('_supplies\\.duration', 10),
    thumbnail: id + '.tga', source });
  for (const [file, bytes] of [[source, raw], [imageSource, image]]) {
    provenance.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
const campaignRaw = await readFile(path.join(root, 'GAMEDATA/Scripts/Campaigns/VegasMIB.lua'), 'latin1');
const campaign = [...campaignRaw.match(/_order\s*=\s*\{([^}]+)\}/s)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const formats = {};
async function inventory(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await inventory(file);
    else {
      const ext = path.extname(file).toLowerCase();
      const info = formats[ext] ??= { count: 0, bytes: 0 };
      info.count++;
      info.bytes += (await stat(file)).size;
    }
  }
}
await inventory(path.join(root, 'GAMEDATA'));
const buildingRoot = 'GAMEDATA/Scripts/Objects/Buildings/Source';
const uiFiles = await readdir(path.join(root, 'GAMEDATA/GAMEART/TGA Files/GUI'));
const uiSprites = [];
for (const name of uiFiles.filter(name => /\.(tga|bmp)$/i.test(name))) {
  const relative = `GAMEDATA/GAMEART/TGA Files/GUI/${name}`;
  const bytes = await readFile(path.join(root, relative));
  await writeFile(path.join(output, 'ui', name), bytes);
  uiSprites.push({ name: name.replace(/\.(tga|bmp)$/i, ''), file: name });
  provenance.push({ file: relative, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const groupNames = new Map([
  ['BUILDING_MAJOR_GROUP_EXT_HOTELS_AND_FACILITIES', ['exterior', 0]],
  ['BUILDING_MAJOR_GROUP_EXT_CASINOS_AND_ENTERTAINMENT', ['exterior', 1]],
  ['BUILDING_MAJOR_GROUP_EXT_SHOPS_AND_SERVICES', ['exterior', 2]],
  ['BUILDING_MAJOR_GROUP_EXT_PATHS_SCENERY_AND_FURNITURE', ['exterior', 3]],
  ['BUILDING_MAJOR_GROUP_INT_GAMBLING', ['interior', 4]],
  ['BUILDING_MAJOR_GROUP_INT_MAINTENANCESTAFF_AND_FACILITIES', ['interior', 5]],
  ['BUILDING_MAJOR_GROUP_INT_SHOPS_AND_SERVICES', ['interior', 6]],
  ['BUILDING_MAJOR_GROUP_INT_SCENERY_LIGHTS_AND_FURNITURE', ['interior', 7]],
]);
const groups = {
  exterior: ['Hotels, Staff & Facilities', 'Casinos & Entertainment', 'Shops, Services & Food', 'Paths, Scenery & Furniture'],
  interior: ['Casino Gaming', 'Casino Staff & Facilities', 'Casino Shops & Services', 'Casino Scenery & Furniture'],
};
const aliases = new Map([
  ['slot-type-1', 'slot'], ['videopoker', 'poker'], ['intmechanic', 'mechanic'],
  ['janitorint', 'cleaner'], ['pottree1x1-int', 'plant'], ['interior-male-toilet', 'restroom'],
  ['cashiersdesk', 'cashier'], ['interiorbar', 'bar'], ['securityint', 'security'],
]);
async function walkSource(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walkSource(file); continue; }
    if (!entry.name.toLowerCase().endsWith('.lua')) continue;
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const raw = await readFile(file);
    const text = raw.toString('latin1').replace(/--[^\r\n]*/g, '');
    const scalar = (key, fallback = 0) => {
      const match = text.match(new RegExp(`SourceTemplate\\[x\\]\\.${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
      return match ? Number(match[1]) : fallback;
    };
    const extract = (key) => text.match(new RegExp(`SourceTemplate\\[x\\]\\.${key}\\s*=\\s*([A-Z0-9_]+)`))?.[1] ?? '';
    const major = extract('_majorgroup');
    const mapping = groupNames.get(major);
    if (!mapping) continue;
    const [, originalMajor] = mapping;
    const basename = path.basename(entry.name, '.lua');
    const model = text.match(/SourceTemplate\[x\]\._(?:base)?model\s*=\s*"([^"]+\.tm)"/i)?.[1];
    const thumbStem = model ? path.basename(model).replace(/\.tm$/i, '').toLowerCase() + '_thumb.tga' : '';
    const thumbPath = thumbStem && await stat(path.join(root, 'GAMEDATA/GAMEART/TGA Files/Thumbnails', thumbStem)).then(() => thumbStem, () => null);
    const rawId = basename.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = aliases.get(rawId) ?? rawId;
    if (catalog.some(item => item.id === id)) continue;
    if (thumbPath) {
      const relativeThumb = `GAMEDATA/GAMEART/TGA Files/Thumbnails/${thumbPath}`;
      const bytes = await readFile(path.join(root, relativeThumb));
      await writeFile(path.join(output, id + '.tga'), bytes);
      provenance.push({ file: relativeThumb, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    const minor = extract('_minorgroup') || 'other';
    const selectedTemplate = selected.find(row => row[0] === id);
    const nameKey = text.match(/SourceTemplate\[x\]\._name\s*=\s*(ID_[A-Za-z0-9_]+)/)?.[1];
    const descriptionKey = text.match(/SourceTemplate\[x\]\._description\s*=\s*(ID_[A-Z0-9_]+)/)?.[1];
    const name = englishStrings[nameKey] ?? selectedTemplate?.[1] ?? basename.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
    catalog.push({ id, name, nameKey, descriptionKey,
      category: selectedTemplate?.[4] ?? minor, context: mapping[0], major: originalMajor, minor,
      width: scalar('_w', 1), depth: scalar('_l', 1), cost: scalar('_buildcost'),
      resale: scalar('_democost'), capacity: scalar('_capacity'), runningCost: scalar('_baserunningcost'),
      power: scalar('_basepowerconsumption'), water: scalar('_basewaterconsumption'),
      duration: scalar('_supplies\\.duration', 10), thumbnail: thumbPath ? `${id}.tga` : null, source: relative });
  }
}
await walkSource(path.join(root, buildingRoot));
const currentThumbnails = new Set(catalog.map(item => item.thumbnail).filter(Boolean));
for (const oldName of new Set(previousCatalog.map(item => item.thumbnail).filter(Boolean))) {
  if (!currentThumbnails.has(oldName)) await unlink(path.join(output, oldName)).catch(() => {});
}
// Catalog thumbnails are generated into the top-level assets directory; GUI
// sprites live in assets/ui and are deliberately not affected by this cleanup.
for (const name of await readdir(output)) {
  if (/\.tga$/i.test(name) && !currentThumbnails.has(name)) await unlink(path.join(output, name)).catch(() => {});
}
const sounds = [
  ['ui-click', 'GAMEDATA/Sound/Effects/UserInterface/Click20.ogg'],
  ['casino-ambience', 'GAMEDATA/Sound/Effects/InsideAmbience.ogg'],
  ['casino-machines', 'GAMEDATA/Sound/Effects/InsideAmbienceMachines.ogg'],
  ['win-small', 'GAMEDATA/Sound/Effects/ResultWinSmall.ogg'],
  ['win-medium', 'GAMEDATA/Sound/Effects/ResultWinMedium.ogg'],
  ['win-big', 'GAMEDATA/Sound/Effects/ResultWinBig.ogg'],
  ['lose-small', 'GAMEDATA/Sound/Effects/ResultLoseSmall.ogg'],
  ['lose-medium', 'GAMEDATA/Sound/Effects/ResultLoseMedium.ogg'],
  ['event-positive', 'GAMEDATA/Sound/Effects/UserInterface/Odd23.ogg'],
  ['event-negative', 'GAMEDATA/Sound/Effects/UserInterface/Odd24.ogg'],
];
const soundManifest = [];
for (const [id, relative] of sounds) {
  const bytes = await readFile(path.join(root, relative));
  await writeFile(path.join(output, 'sound', id + '.ogg'), bytes);
  soundManifest.push({ id, file: `sound/${id}.ogg` });
  provenance.push({ file: relative, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(path.join(output, 'game-data.json'), JSON.stringify({ version: 2, catalog, campaign, formats, groups, uiSprites, sounds: soundManifest,
  languages: [{ code: 'en', label: 'English', source: 'game-original', complete: true }, { code: 'el', label: 'Ελληνικά', source: 'community-port', fallback: 'en' },
    { code: 'fr', label: 'Français', source: 'game-original' }, { code: 'de', label: 'Deutsch', source: 'game-original' },
    { code: 'it', label: 'Italiano', source: 'game-original' }, { code: 'es', label: 'Español', source: 'game-original' }] }, null, 2) + '\n');
await writeFile(path.join(output, 'provenance.json'), JSON.stringify({ description: 'Original files used for the first web prototype. Paths relative to the game installation.', files: provenance }, null, 2) + '\n');
console.log(`Imported ${catalog.length} object templates, ${uiSprites.length} original UI sprites, ${sounds.length} sound effects and ${campaign.length} campaign names.`);
