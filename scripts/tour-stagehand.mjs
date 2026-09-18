// tour-stagehand.mjs — Tour browser real via playwright (captures console
// errors + network 404s). Capa 3 del tour-deploy. Run via:
//   node scripts/tour-stagehand.mjs --remote
//   node scripts/tour-stagehand.mjs --local --base=http://127.0.0.1:8491

import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (() => {
  if (process.argv.includes('--remote')) return 'https://jeff-aporta.github.io/is-webcomponents';
  if (process.argv.includes('--local')) return 'http://127.0.0.1:8491';
  const eq = process.argv.find(a => a.startsWith('--base='));
  if (eq) return eq.slice(7);
  return 'https://jeff-aporta.github.io/is-webcomponents';
})();
const TAG_LIST_LIMIT = Number(process.env.TOUR_LIMIT ?? 64);

console.log(`\n=== TOUR STAGEHAND · ${BASE} · max ${TAG_LIST_LIMIT} demos ===\n`);

// ── Discover demos from dist/previews/<cat>/*.preview.min.js ────────
function discoverTags() {
  if (!existsSync('dist/previews')) return [];
  const out = [];
  for (const cat of readdirSync('dist/previews', { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const f of readdirSync(join('dist/previews', cat.name))) {
      if (f.endsWith('.preview.min.js')) {
        out.push(`is-${f.replace(/\.preview\.min\.js$/, '')}`);
      }
    }
  }
  out.sort();
  return out.slice(0, TAG_LIST_LIMIT);
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

const tags = discoverTags();
console.log(`Discovered ${tags.length} demos in dist/previews/`);

// ── Browser run ──────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Track network 404s + console errors
const issues = []; // [{tag, kind, source, text, url?}]

page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error') {
    issues.push({ kind: 'console', text: msg.text() });
  }
});
page.on('pageerror', (err) => {
  issues.push({ kind: 'pageerror', text: err.message });
});
page.on('response', async (resp) => {
  if (resp.status() === 404 || resp.status() === 403) {
    issues.push({ kind: 'network', status: resp.status(), url: resp.url() });
  }
});

const demoIssues = [];
let i = 0;
for (const tag of tags) {
  i++;
  const url = `${BASE}/?s=${b64(JSON.stringify({ component: tag }))}`;
  const before = issues.length;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 8000 });
    // Wait for custom elements to upgrade
    await page.waitForTimeout(200);
  } catch (err) {
    demoIssues.push({ tag, error: err.message });
  }
  const newIssues = issues.slice(before);
  if (newIssues.length > 0) {
    for (const iss of newIssues) {
      demoIssues.push({ tag, ...iss });
    }
  }
  if (i % 10 === 0 || i === tags.length) {
    process.stdout.write(`  ${i}/${tags.length}\r`);
  }
}
console.log('');

// Group issues by tag
const byTag = {};
for (const di of demoIssues) {
  const t = di.tag ?? '_global';
  if (!byTag[t]) byTag[t] = [];
  byTag[t].push(di);
}

const globals = byTag._global ?? [];
const failedDemos = Object.entries(byTag).filter(([t]) => t !== '_global');

console.log(`\n── Browser console errors (${issues.length} total)`);
if (globals.length === 0) {
  console.log('  ✓ No console errors during navigation');
}
for (const g of globals.slice(0, 10)) {
  console.log(`  ✗ ${g.kind}: ${g.text?.slice(0, 120)} ${g.url ? '— ' + g.url : ''}`);
}

console.log(`\n── Demos con errores (${failedDemos.length}/${tags.length})`);
for (const [tag, errs] of failedDemos.slice(0, 15)) {
  console.log(`  ✗ ${tag}:`);
  for (const e of errs.slice(0, 5)) {
    console.log(`      ${e.kind}${e.status ? ' [HTTP ' + e.status + ']' : ''}: ${(e.text || e.url || e.error || '').slice(0, 100)}`);
  }
}
if (failedDemos.length > 15) {
  console.log(`  ... (${failedDemos.length - 15} más demos con errores)`);
}

await browser.close();

const exit = failedDemos.length > 0 || globals.length > 0 ? 1 : 0;
console.log(`\n── Resumen`);
console.log(`  Demos cargados: ${tags.length}`);
console.log(`  Demos con errores: ${failedDemos.length}`);
console.log(`  Console errors globales: ${globals.length}`);
console.log(`  Stagehand tour: ${exit === 0 ? '✅ VERDE' : '🔴 ROJO'} (exit ${exit})`);

// Print JSON summary to stdout for downstream tooling
console.log('\n--- JSON SUMMARY ---');
console.log(JSON.stringify({ exit, totalDemos: tags.length, demosFailed: failedDemos.length, globalErrors: globals.length, byTag }, null, 2));

process.exit(exit);
