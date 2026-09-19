// probe-icons.mjs — ¿Los iconos de is-ag-grid llegan a cargar o solo se abortan?
//
// Contexto: el diagnóstico marca ~50 net::ERR_ABORTED sobre
// dist/assets/icons/mdi/{checkbox-blank-outline,pencil,delete}.svg al abrir
// is-ag-grid. ERR_ABORTED es cancelación CLIENTE, no error de servidor: hay que
// distinguir "el icono nunca carga" (bug real) de "se pidió, se dedupeó/abortó y
// otro intento sí resolvió" (churn benigno).
//
// Uso: node scripts/probe-icons.mjs --base=http://127.0.0.1:8491 is-ag-grid

import { chromium } from 'playwright';

const BASE = (() => {
  const eq = process.argv.find((a) => a.startsWith('--base='));
  return eq ? eq.slice(7) : 'http://127.0.0.1:8491';
})();
const tags = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!tags.length) tags.push('is-ag-grid');

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')
  .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const tag of tags) {
  const byUrl = new Map();      // url -> { ok, aborted, failed }
  const onResponse = (r) => {
    if (!r.url().includes('/assets/icons/')) return;
    const e = byUrl.get(r.url()) ?? { ok: 0, aborted: 0, failed: 0, status: null };
    e.ok++; e.status = r.status();
    byUrl.set(r.url(), e);
  };
  const onFailed = (r) => {
    if (!r.url().includes('/assets/icons/')) return;
    const e = byUrl.get(r.url()) ?? { ok: 0, aborted: 0, failed: 0, status: null };
    const txt = r.failure()?.errorText ?? '';
    if (txt.includes('ABORTED')) e.aborted++; else e.failed++;
    byUrl.set(r.url(), e);
  };
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);

  console.log(`\n=== ${tag} ===`);
  await page.goto(`${BASE}/?s=${b64(JSON.stringify({ component: tag }))}`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(5000);

  // ¿Quedaron iconos sin pintar en el DOM?
  const iconState = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('is-icon')];
    const main = document.querySelector('is-preview-component is-main');
    const scoped = main ? [...main.querySelectorAll('is-icon')] : hosts;
    let withSvg = 0, withoutSvg = 0;
    for (const h of scoped) {
      const sr = h.shadowRoot;
      if (sr && sr.querySelector('svg')) withSvg++; else withoutSvg++;
    }
    return { total: scoped.length, withSvg, withoutSvg };
  });

  const entries = [...byUrl.entries()].sort((a, b) => b[1].aborted - a[1].aborted);
  for (const [u, e] of entries.slice(0, 8)) {
    console.log(`  ${u.split('/').pop().padEnd(34)} ok=${String(e.ok).padStart(3)} aborted=${String(e.aborted).padStart(3)} failed=${e.failed} lastStatus=${e.status}`);
  }
  const totals = entries.reduce((a, [, e]) => ({ ok: a.ok + e.ok, aborted: a.aborted + e.aborted, failed: a.failed + e.failed }), { ok: 0, aborted: 0, failed: 0 });
  console.log(`  TOTAL url=${byUrl.size} ok=${totals.ok} aborted=${totals.aborted} failed=${totals.failed}`);
  console.log(`  <is-icon> en main: total=${iconState.total} conSvg=${iconState.withSvg} sinSvg=${iconState.withoutSvg}`);
  console.log(`  >> ${iconState.withoutSvg === 0 && totals.failed === 0 ? 'ICONOS OK (aborts = churn de re-render)' : 'POSIBLE BUG DE ICONOS'}`);

  page.off('response', onResponse);
  page.off('requestfailed', onFailed);
}

await browser.close();
