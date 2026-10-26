import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Only extracts documented scalar assignments. Never executes the original Lua.
const root = process.argv[2] ?? 'C:/Program Files (x86)/Steam/steamapps/common/Vegas - Make It Big';
const output = path.resolve('public/assets');
const sourceRoot = 'GAMEDATA/Scripts/Objects/Buildings/Source/Interior/';
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
await stat(root);
await mkdir(output, { recursive: true });
const provenance = [];
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
  catalog.push({ id, name, category, width: scalar('_w', 1), depth: scalar('_l', 1),
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
await writeFile(path.join(output, 'game-data.json'), JSON.stringify({ version: 1, catalog, campaign, formats }, null, 2) + '\n');
await writeFile(path.join(output, 'provenance.json'), JSON.stringify({ description: 'Original files used for the first web prototype. Paths relative to the game installation.', files: provenance }, null, 2) + '\n');
console.log(`Imported ${catalog.length} objects, ${campaign.length} campaign names and ${provenance.length} source hashes.`);
