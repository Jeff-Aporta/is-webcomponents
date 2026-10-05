import { hashFile } from '../src/cdn/build/stamp-hashes.ts';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hashesPath = join(root, 'dist', 'cdn', 'asset-hashes.json');
const j = JSON.parse(await readFile(hashesPath, 'utf8'));
for (const rel of [
  'diagrams/component-pack.min.js',
  'diagrams/component-spec.min.js',
  'diagrams/component-diagram.min.js',
]) {
  const h = await hashFile(join(root, 'dist', 'cdn', rel));
  const bucket = j.files ?? j;
  const old = bucket[rel];
  bucket[rel] = h;
  console.log(`${rel}: ${old} -> ${h}`);
}
await writeFile(hashesPath, JSON.stringify(j, null, 2) + '\n');
console.log('hashes updated');
