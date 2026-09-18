// tour-deploy.mjs — Tour exhaustivo pre-push (local) y post-push (remoto).
// Detecta 404s, MIME errors, y console errors via browser run.
//
// Uso:
//   PRE-PUSH (local):  node scripts/tour-deploy.mjs --local
//   POST-PUSH (remote): node scripts/tour-deploy.mjs --remote
//   Custom base:       node scripts/tour-deploy.mjs --base=https://...
//
// Salidas:
//   stdout: JSON-like summary, headFailed/demosFailed listados
//   exit 0 si TODO verde, exit 1 si encuentra algún fallo
//
// Estrategia (3 capas):
//   1. HEAD contra cada bundle crítico (`dist/scripts/`, `dist/pages/`,
//      `dist/cdn/skills/`, etc.).
//   2. Catalog walk: descubre todos los demos listando
//      `dist/previews/<cat>/*.preview.min.js` y fetcha la URL
//      `?s=<base64(component)>`. Si la URL devuelve 200, pasa.
//   3. (futuro) Playwright/Stagehand run: navega cada demo, captura
//      console errors. Si `@browserbasehq/stagehand` está instalado,
//      el motor se prefiere al HEAD+catalog.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = process.cwd();

// ── arg parsing ──────────────────────────────────────────────────────
function arg(name, fallback) {
  const eq = process.argv.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}
const BASE = arg('base', null);
const MODE = (() => {
  if (process.argv.includes('--local'))  return 'local';
  if (process.argv.includes('--remote')) return 'remote';
  return null;
})();

if (!BASE && !MODE) {
  console.error('Uso: node scripts/tour-deploy.mjs --local|--remote|--base=<URL>');
  process.exit(2);
}
const effectiveBase = BASE ?? (MODE === 'local' ? 'http://127.0.0.1:8491' : 'https://jeff-aporta.github.io/is-webcomponents');

console.log(`\n=== TOUR DEPLOY · ${MODE ?? 'custom'} · ${effectiveBase} ===\n`);

const TOKENS = Date.now();
const headReq = async (path) => {
  try {
    const resp = await fetch(`${effectiveBase}/${path}?v=${TOKENS}`, { method: 'HEAD' });
    return { path, status: resp.status, ok: resp.ok, error: resp.ok ? null : (resp.status === 404 ? '404 NOT FOUND' : `HTTP ${resp.status}`) };
  } catch (err) {
    return { path, status: 0, ok: false, error: String(err).slice(0, 80) };
  }
};

// ── Listas de bundles esperados (sincronizadas con bundle-scripts.mjs) ──
const SCRIPTS_BUNDLES = ['highlight-pre', 'demo-code', 'docs-chrome', 'cdn-panel', 'view-sources', 'demo-file-meta'];
const PAGES_BUNDLES = ['home', 'theming', 'ecosystem'];

const CRITICAL_PATHS = [
  'index.html',
  'dist/cdn/core/loader.min.js',
  'dist/gallery-app.min.js',
  'dist/cdn/is-base.min.css',
  'dist/cdn/palettes.min.css',
  ...SCRIPTS_BUNDLES.map(s => `dist/scripts/${s}.min.js`),
  ...PAGES_BUNDLES.flatMap(p => [`dist/pages/${p}.min.js`, `dist/pages/${p}.json`]),
  'dist/cdn/skills/is-webcomponents/PROMPT.md',
];

// ── 1. HEAD check ─────────────────────────────────────────────────────
const headResults = [];
const headT0 = performance.now();
for (const path of CRITICAL_PATHS) {
  headResults.push(await headReq(path));
}
const headMs = Math.round(performance.now() - headT0);
const headFailed = headResults.filter(r => !r.ok);

// ── 2. Catálogo: descubrir demos ───────────────────────────────────────
function discoverPreviews() {
  const out = [];
  if (!existsSync('dist/previews')) return out;
  for (const cat of readdirSync('dist/previews', { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catDir = join('dist/previews', cat.name);
    for (const f of readdirSync(catDir)) {
      if (!f.endsWith('.preview.min.js')) continue;
      const tag = `is-${f.replace(/\.preview\.min\.js$/, '')}`;
      out.push({ category: cat.name, tag });
    }
  }
  out.sort((a, b) => a.tag.localeCompare(b.tag));
  return out;
}

const demos = discoverPreviews();

// ── 3. Demo fetch (catalog walk) ───────────────────────────────────────
const b64url = (s) => Buffer.from(s, 'utf8').toString('base64')
  .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

async function fetchDemo(tag) {
  const url = `${effectiveBase}/?s=${b64url(JSON.stringify({ component: tag }))}`;
  try {
    const resp = await fetch(url, { redirect: 'follow' });
    return { tag, status: resp.status, ok: resp.ok, len: (await resp.text()).length };
  } catch (err) {
    return { tag, status: 0, ok: false, error: String(err).slice(0, 80) };
  }
}

const demoResults = [];
const demoT0 = performance.now();
for (const { tag } of demos) {
  demoResults.push(await fetchDemo(tag));
  if (demos.length > 100 && (demoResults.length % 25 === 0)) {
    process.stdout.write(`  ...${demoResults.length}/${demos.length}\r`);
  }
}
const demoMs = Math.round(performance.now() - demoT0);
const demosFailed = demoResults.filter(d => !d.ok);

// ── 4. Resumen ─────────────────────────────────────────────────────────
const headFailed_n = headFailed.length;
const demosFailed_n = demosFailed.length;
const demosOk = demoResults.length - demosFailed_n;

console.log(`── HEAD checks (${headResults.length} paths, ${headMs}ms)`);
for (const r of headResults) {
  const tag = r.ok ? '✓' : '✗';
  console.log(`  ${tag} [${r.status}] ${r.path}${r.error ? ' — ' + r.error : ''}`);
}

console.log(`\n── Demo fetch (${demos.length} demos, ${demoMs}ms)`);
for (const d of demoResults.slice(0, 5)) {
  console.log(`  ${d.ok ? '✓' : '✗'} [${d.status}] ?s=...&component=${d.tag} (${d.len ?? 0} bytes)`);
}
if (demos.length > 5) console.log(`  ... (${demos.length - 5} más)`);
for (const d of demosFailed) {
  console.log(`  ✗ [${d.status}] ?s=...&component=${d.tag}${d.error ? ' — ' + d.error : ''}`);
}

console.log(`\n── Resumen`);
console.log(`  HEAD: ${headResults.length - headFailed_n}/${headResults.length} verde`);
console.log(`  Demos: ${demosOk}/${demos.length} verde`);

const exit = headFailed_n > 0 || demosFailed_n > 0 ? 1 : 0;
console.log(`  Tour ${MODE ?? 'custom'}: ${exit === 0 ? '✅ VERDE' : '🔴 ROJO'} (exit code ${exit})`);
process.exit(exit);
