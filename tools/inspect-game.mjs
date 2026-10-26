import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.argv[2] ?? 'C:/Program Files (x86)/Steam/steamapps/common/Vegas - Make It Big';
const totals = {};
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else {
      const ext = path.extname(file).toLowerCase() || '(none)';
      const data = totals[ext] ??= { count: 0, bytes: 0, sample: path.relative(root, file) };
      data.count++;
      data.bytes += (await stat(file)).size;
    }
  }
}
await walk(path.join(root, 'GAMEDATA'));
console.log(JSON.stringify(totals, null, 2));
for (const relative of [
  'GAMEDATA/GAMEART/OTM Files/Common/tables/slot.tm',
  'GAMEDATA/GAMEART/OTM Files/Common/tables/blackjack.tm',
  'GAMEDATA/GAMEART/TGA Files/Thumbnails/slot_thumb.tga',
]) {
  const buffer = await readFile(path.join(root, relative));
  console.log(relative, buffer.length, buffer.subarray(0, 160).toString('hex'));
  if (relative.endsWith('.tm')) {
    console.log(buffer.toString('latin1').match(/[\x20-\x7e]{8,}/g)?.slice(0, 25));
  }
}
