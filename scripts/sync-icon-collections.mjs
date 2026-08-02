/**
 * sync-icon-collections.mjs — baja los metadatos de las colecciones Iconify y
 * los guarda en `assets/icons/collections.json`, recortados a los prefijos que
 * realmente tenemos en disco.
 *
 * Por que existe: el explorador filtra por categoria, autor/tag, grid, paleta y
 * licencia. Ese metadato NO esta en `<prefix>.json` (solo trae la lista de
 * nombres), asi que sin este archivo los filtros no tienen de donde salir.
 * Se consulta una sola vez y queda offline: el explorador no debe pegarle a la
 * API de Iconify en runtime.
 *
 *   node scripts/sync-icon-collections.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsIcons = join(root, 'assets', 'icons');

const getJson = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`${res.statusCode} ${url}`));
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

const index = JSON.parse(await readFile(join(assetsIcons, 'index.json'), 'utf8'));
const have = index.families.map((f) => f.prefix);
const remote = await getJson('https://api.iconify.design/collections');

const out = {};
let missing = 0;
for (const prefix of have) {
  const c = remote[prefix];
  if (!c) missing++;
  out[prefix] = {
    name: c?.name || prefix,
    category: c?.category || 'Sin categoría',
    author: c?.author?.name || '',
    license: c?.license?.title || '',
    palette: !!c?.palette,
    height: c?.height ?? null,
    samples: c?.samples || [],
    tags: c?.tags || [],
  };
}

await writeFile(join(assetsIcons, 'collections.json'), JSON.stringify(out), 'utf8');
console.log(`collections.json · ${have.length} prefijos · ${missing} sin metadatos remotos`);
