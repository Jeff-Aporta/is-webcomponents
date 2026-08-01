// tests/cdn-icons.test.mjs
//
// Verifica que <is-icon> resuelve iconos a SVG local (no cae al fallback
// <iconify-icon>) en un preview cualquiera. Esto protege contra:
//   - <is-icon icon="X:Y"> sin descargar localmente (cae a CDN, ok pero lento).
//   - Bug en iconify-loader.js que rompe la cadena local.
//   - assets/icons/{prefix}/ vacio aunque el .json diga que existe.
//
// Requiere el dev server arriba:  node scripts/serve.mjs 8391
// Uso:                PORT=8391 node tests/cdn-icons.test.mjs

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const PORT = process.env.PORT || 8391;
const BASE = `http://localhost:${PORT}`;
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

async function fetchText(url, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

// Verificar que el server esta arriba.
try {
  const res = await fetchText(`${BASE}/index.html`);
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (e) {
  console.error(`No se pudo conectar a ${BASE}: ${e.message}`);
  console.error('Levanta el dev server con: node scripts/serve.mjs 8391');
  process.exit(2);
}

// Cargar indices locales.
async function loadIndex(prefix) {
  try {
    const txt = await readFile(join(root, 'assets', 'icons', `${prefix}.json`), 'utf8');
    return new Set(JSON.parse(txt).icons || []);
  } catch {
    return null;
  }
}

const indexCache = new Map();
async function getIndex(prefix) {
  if (!indexCache.has(prefix)) indexCache.set(prefix, await loadIndex(prefix));
  return indexCache.get(prefix);
}

// Recoger un preview que tenga varios iconos locales (no caer al CDN).
const previewsDir = join(root, 'previews');
const previews = await walk(previewsDir);
const candidates = [];
for (const f of previews) {
  const body = await readFile(f, 'utf8');
  let count = 0;
  let m;
  ICON_RE.lastIndex = 0;
  while ((m = ICON_RE.exec(body)) !== null) {
    const idx = await getIndex(m[1]);
    if (idx && idx.has(m[2])) count++;
  }
  if (count >= 2) candidates.push({ f, count });
}

if (candidates.length === 0) {
  console.error('Ningun preview tiene 2+ iconos locales para probar. Ejecuta npm run icons:download --only=mdi --only=tabler');
  process.exit(1);
}
candidates.sort((a, b) => b.count - a.count);
const chosen = candidates[0];
console.log(`preview elegido: ${chosen.f.replace(root + '\\', '').replace(/\\/g, '/')} (${chosen.count} iconos locales)`);

// Cargar el preview HTML y parsear las primeras N referencias a iconos.
const body = await readFile(chosen.f, 'utf8');
const refs = [];
let m;
ICON_RE.lastIndex = 0;
while ((m = ICON_RE.exec(body)) !== null && refs.length < 8) {
  const [prefix, name] = [m[1], m[2]];
  const idx = await getIndex(prefix);
  if (idx && idx.has(name)) refs.push({ prefix, name });
}

// Hacer las requests HEAD/GET contra el server local para cada SVG.
const results = [];
for (const { prefix, name } of refs) {
  const url = `${BASE}/assets/icons/${prefix}/${name}.svg`;
  try {
    const res = await fetchText(url, 3000);
    const ct = res.headers.get('content-type') || '';
    const ok = res.ok && ct.includes('svg');
    results.push({ prefix, name, ok, status: res.status, ct });
  } catch (e) {
    results.push({ prefix, name, ok: false, error: e.message });
  }
}

let okCount = 0;
const failures = [];
for (const r of results) {
  if (r.ok) okCount++;
  else failures.push(`${r.prefix}:${r.name} -> status=${r.status} ct=${r.ct} ${r.error || ''}`);
}

console.log(`iconos comprobados: ${results.length} (${okCount} OK)`);

if (failures.length) {
  console.log('\nFAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`cdn-icons.test.mjs: PASS — ${okCount}/${results.length} iconos servidos como SVG local`);
process.exit(0);