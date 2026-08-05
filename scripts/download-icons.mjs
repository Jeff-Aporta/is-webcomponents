/**
 * scripts/download-icons.mjs
 *
 * Descarga todas las colecciones de Iconify y guarda cada icono como
 * SVG individual en `src/assets/icons/<prefix>/<name>.svg`. Tambien genera
 *
 *   src/assets/icons/<prefix>.json    (indice de la coleccion)
 *   src/assets/icons/manifest.json    (manifest global con todas las colecciones)
 *
 * Si la coleccion ya esta descargada (manifest.json la contiene), la salta.
 * Si solo faltan algunos iconos, los descarga sueltos sin re-bajar el resto.
 *
 * Estado persistente en `src/assets/icons/.state/` (ignorado por git).
 *
 * Uso:
 *   node scripts/download-icons.mjs              # descarga todas las colecciones
 *   node scripts/download-icons.mjs --only=mdi   # descarga solo una coleccion
 *   node scripts/download-icons.mjs --no-skip    # re-descarga siempre
 *
 * Output final:
 *   src/assets/icons/<prefix>/<name>.svg   ~13K-300K SVGs
 *   src/assets/icons/<prefix>.json          indice por coleccion
 *   src/assets/icons/manifest.json          manifest global
 *
 * El `<is-icon>` consume el .json para resolver nombres y el .svg para pintar
 * el icono (via <img src="src/assets/icons/<prefix>/<name>.svg">). Si el icono
 * no esta local, cae a https://api.iconify.design/<prefix>/<name>.svg.
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const assetsIcons = join(root, 'src', 'assets', 'icons');
const stateDir = join(assetsIcons, '.state');

const ONLY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  return arg ? arg.slice('--only='.length).split(',') : null;
})();
const NO_SKIP = process.argv.includes('--no-skip');
const CHUNK = 500;
const CONCURRENCY = 32;

const log = (...a) => console.log('[icons]', ...a);
const err = (...a) => console.error('[icons]', ...a);

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`${res.statusCode} ${url}`));
          return;
        }
        try { resolve(JSON.parse(b)); }
        catch (e) { reject(new Error(`bad JSON ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function listCollections() {
  const data = await get('https://api.iconify.design/collections');
  return Object.entries(data).map(([prefix, meta]) => ({
    prefix,
    name: meta.name,
    total: meta.total || 0,
    samples: meta.samples || [],
  })).sort((a, b) => b.total - a.total);
}

async function collectionIcons(prefix) {
  const data = await get(`https://api.iconify.design/collection?prefix=${prefix}`);
  const names = new Set();
  for (const n of data.uncategorized || []) names.add(n);
  for (const arr of Object.values(data.categories || {})) for (const n of arr || []) names.add(n);
  return Array.from(names);
}

async function loadExisting(prefix) {
  try {
    const txt = await readFile(join(assetsIcons, `${prefix}.json`), 'utf8');
    const data = JSON.parse(txt);
    return new Set(data.icons || []);
  } catch {
    return null;
  }
}

async function ensureIcon(prefix, name) {
  const file = join(assetsIcons, prefix, `${name}.svg`);
  try {
    const s = await stat(file);
    if (s.isFile()) return true;
  } catch {}
  return new Promise((resolve, reject) => {
    const url = `https://api.iconify.design/${prefix}/${name}.svg`;
    https.get(url, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => {
        if (res.statusCode !== 200) { reject(new Error(`${res.statusCode} ${url}`)); return; }
        if (!b.includes('<svg')) { reject(new Error(`empty body ${url}`)); return; }
        writeFile(file, b, 'utf8').then(() => resolve(true), reject);
      });
    }).on('error', reject);
  });
}

async function pool(items, limit, fn, onProgress) {
  let next = 0;
  let ok = 0;
  let fail = 0;
  const fails = [];
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        await fn(items[i]);
        ok++;
      } catch (e) {
        fail++;
        if (fails.length < 5) fails.push(e.message);
      }
      if ((ok + fail) % 200 === 0) onProgress?.(ok, fail);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  onProgress?.(ok, fail);
  return { ok, fail, fails };
}

async function processCollection(col) {
  const { prefix, total } = col;
  const indexFile = join(assetsIcons, `${prefix}.json`);
  await mkdir(join(assetsIcons, prefix), { recursive: true });

  const existing = NO_SKIP ? null : await loadExisting(prefix);
  const need = NO_SKIP ? await collectionIcons(prefix) : (await collectionIcons(prefix)).filter((n) => !existing.has(n));

  if (existing && need.length === 0) {
    log(`[skip] ${prefix}: ya tiene ${existing.size} iconos`);
    return { prefix, count: existing.size, ok: 0, fail: 0 };
  }

  if (existing) log(`[diff] ${prefix}: faltan ${need.length} de ${existing.size + need.length} (total api=${total})`);
  else log(`[new] ${prefix}: descargando ${need.length} iconos (total api=${total})`);

  // Escribir/actualizar el .json con TODOS los nombres de la coleccion
  // (combinando existentes + nuevos). El indice se regenera al final.
  const allNames = existing ? Array.from(new Set([...existing, ...need])) : need;

  let acumOk = 0;
  let acumFail = 0;
  // Procesar por chunks para no abrir miles de conexiones simultaneamente.
  for (let i = 0; i < need.length; i += CHUNK) {
    const slice = need.slice(i, i + CHUNK);
    const start = Date.now();
    const res = await pool(slice, CONCURRENCY, (name) => ensureIcon(prefix, name), (ok, fail) => {
      process.stdout.write(`  ${prefix} ${i + ok + fail}/${need.length} (${acumOk + acumFail + ok + fail}/${need.length})\r`);
    });
    acumOk += res.ok;
    acumFail += res.fail;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`  ${prefix} chunk ${i / CHUNK + 1}/${Math.ceil(need.length / CHUNK)} ${res.ok}/${res.fail} en ${elapsed}s`);
  }

  await writeFile(indexFile, JSON.stringify({ prefix, total, icons: allNames }, null, 0) + '\n', 'utf8');
  return { prefix, count: allNames.length, ok: acumOk, fail: acumFail };
}

async function writeManifest(collections) {
  const totalIcons = collections.reduce((n, c) => n + c.count, 0);
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalCollections: collections.length,
    totalIcons,
    collections: collections.map((c) => ({ prefix: c.prefix, total: c.count, ok: c.ok, fail: c.fail })),
  };
  await writeFile(join(assetsIcons, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

async function main() {
  await mkdir(assetsIcons, { recursive: true });
  await mkdir(stateDir, { recursive: true });

  let collections;
  if (ONLY) {
    log(`Procesando ${ONLY.length} colecciones de argumento`);
    collections = await Promise.all(ONLY.map(async (p) => {
      try {
        const data = await get(`https://api.iconify.design/collection?prefix=${p}`);
        return { prefix: p, total: data.total || 0 };
      } catch {
        return { prefix: p, total: 0 };
      }
    }));
  } else {
    log('Listando todas las colecciones de Iconify...');
    const all = await listCollections();
    collections = all;
    log(`${collections.length} colecciones, ${collections.reduce((n, c) => n + c.total, 0)} iconos totales`);
  }

  const results = [];
  const startTotal = Date.now();
  for (let i = 0; i < collections.length; i++) {
    const col = collections[i];
    const start = Date.now();
    const r = await processCollection(col);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`[${i + 1}/${collections.length}] ${r.prefix.padEnd(28)} ${r.ok}/${r.count} ${elapsed}s`);
    results.push(r);
  }

  await writeManifest(results);
  const elapsedTotal = ((Date.now() - startTotal) / 1000).toFixed(0);
  const totalIcons = results.reduce((n, r) => n + r.count, 0);
  const totalOk = results.reduce((n, r) => n + r.ok, 0);
  const totalFail = results.reduce((n, r) => n + r.fail, 0);
  log(`OK. ${results.length} colecciones, ${totalIcons} iconos (${totalOk} ok, ${totalFail} fail). Tiempo total: ${elapsedTotal}s`);
}

main().catch((e) => { err(e); process.exit(1); });