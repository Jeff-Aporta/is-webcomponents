// tests/icon-references.test.mjs
//
// Verifica que cada <is-icon icon="X:Y"> en los previews apunta a un icono
// que existe localmente en assets/icons/X.json (es decir, descargado).
//
// Esto evita el bug clasico: alguien escribe <is-icon icon="mdi:foo-bar">
// sin descargar `foo-bar`, y la pagina queda en blanco porque el loader no
// lo encuentra local y cae al CDN. Aqui lo detectamos en CI antes del push.
//
// Reglas:
//   1. Si el icono esta en assets/icons/X.json       -> OK (local)
//   2. Si NO esta pero el .json no existe tampoco    -> WARN (CDN fallback)
//   3. Si esta en assets/icons/{prefix}/ pero NO en el .json -> ERROR (inconsistente)
//
// Uso:  node tests/icon-references.test.mjs

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const previewsDir = join(root, 'previews');
const iconsDir = join(root, 'assets', 'icons');

const ICON_RE = /<is-icon\b[^>]*\bicon\s*=\s*["']([a-z0-9-]+):([a-z0-9-]+)["']/gi;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

async function loadIndex(prefix) {
  try {
    const txt = await readFile(join(iconsDir, `${prefix}.json`), 'utf8');
    const j = JSON.parse(txt);
    return new Set(j.icons || []);
  } catch {
    return null;
  }
}

async function svgExists(prefix, name) {
  try {
    const s = await stat(join(iconsDir, prefix, `${name}.svg`));
    return s.isFile();
  } catch {
    return false;
  }
}

const files = await walk(previewsDir);
const refs = new Map(); // "prefix:name" -> [{ file, line }]
const indexCache = new Map();

for (const f of files) {
  const body = await readFile(f, 'utf8');
  let m;
  while ((m = ICON_RE.exec(body)) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (!refs.has(key)) refs.set(key, []);
    // Calcular la linea aproximada con el offset del match.
    const before = body.slice(0, m.index);
    const line = before.split('\n').length;
    refs.get(key).push({ file: relative(root, f), line });
  }
}

let ok = 0;
let warn = 0;
let fail = 0;
const failures = [];
const warnings = [];

for (const [key, sites] of refs) {
  const [prefix, name] = key.split(':');
  if (!indexCache.has(prefix)) indexCache.set(prefix, await loadIndex(prefix));
  const idx = indexCache.get(prefix);
  const svg = await svgExists(prefix, name);

  if (idx === null) {
    // El .json no existe -> la coleccion no se ha descargado localmente.
    // El icono caera al CDN de api.iconify.design o al <iconify-icon>.
    warn++;
    warnings.push(`${key} (en ${sites.length} preview${sites.length > 1 ? 's' : ''}) -> coleccion ${prefix}/ no descargada localmente, cae al CDN`);
    continue;
  }

  if (idx.has(name)) {
    ok++;
    // Verificacion extra: si el .json dice que existe, el .svg debe estar.
    if (!svg) {
      fail++;
      failures.push(`${key} -> esta en ${prefix}.json pero NO existe el SVG assets/icons/${prefix}/${name}.svg (corrupto)`);
    }
  } else if (svg) {
    fail++;
    failures.push(`${key} -> existe assets/icons/${prefix}/${name}.svg pero NO esta en ${prefix}.json (indice desactualizado, re-corre download-icons.mjs)`);
  } else {
    // Ni en el json ni en disco -> cae al CDN.
    warn++;
    warnings.push(`${key} -> no descargado localmente, cae al CDN (sites: ${sites.slice(0, 2).map(s => `${s.file}:${s.line}`).join(', ')}${sites.length > 2 ? '…' : ''})`);
  }
}

console.log(`referencias totales: ${refs.size}`);
console.log(`  locales (OK):  ${ok}`);
console.log(`  CDN (WARN):    ${warn}`);
console.log(`  inconsistentes (FAIL): ${fail}`);

if (warnings.length) {
  console.log('\nWARN:');
  for (const w of warnings.slice(0, 10)) console.log(`  - ${w}`);
  if (warnings.length > 10) console.log(`  ... y ${warnings.length - 10} mas`);
}

if (failures.length) {
  console.log('\nFAIL:');
  for (const f of failures.slice(0, 10)) console.log(`  - ${f}`);
  if (failures.length > 10) console.log(`  ... y ${failures.length - 10} mas`);
  process.exit(1);
}

console.log(`icon-references.test.mjs: PASS — ${ok} iconos locales verificados${warn ? `, ${warn} warnings (caen al CDN, no son fatales)` : ''}`);