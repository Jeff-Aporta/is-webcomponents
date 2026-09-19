// diagnose-render.mjs — Ground truth del DOM vivo en el gallery SPA.
//
// POR QUÉ EXISTE: el tour borrador (tour-content.mjs) mide `.preview-stage` e
// `iframe.preview-frame`, que SOLO aparecen en shell.css — el chrome del gallery
// pinta en `<is-main class="main">`. Así que su `body=0` puede ser "medí un
// selector que no existe", no "no hay contenido". Este script dumpea el DOM
// REAL para no diagnosticar sobre una métrica falsa.
//
// Uso: node scripts/diagnose-render.mjs --base=http://127.0.0.1:8491 [tag ...]

import { chromium } from 'playwright';

const BASE = (() => {
  const eq = process.argv.find((a) => a.startsWith('--base='));
  return eq ? eq.slice(7) : 'http://127.0.0.1:8491';
})();
const tags = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!tags.length) tags.push('home', 'theming', 'ecosystem', 'is-button', 'is-button-group', 'is-ag-grid');

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')
  .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const urlFor = (tag) => `${BASE}/?s=${b64(JSON.stringify({ component: tag }))}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const tag of tags) {
  const consoleAll = [];
  const pageErrors = [];
  const pageRejections = [];
  const failedRequests = [];
  const badResponses = [];

  const onConsole = (m) => consoleAll.push({ type: m.type(), text: m.text().slice(0, 300) });
  const onPageError = (e) => pageErrors.push(String(e).slice(0, 300));
  const onFailed = (r) => failedRequests.push(`${r.failure()?.errorText ?? '?'} ${r.url().slice(0, 140)}`);
  const onResponse = (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url().slice(0, 140)}`); };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onFailed);
  page.on('response', onResponse);

  console.log(`\n${'='.repeat(78)}\nTAG: ${tag}\nURL: ${urlFor(tag)}\n${'='.repeat(78)}`);

  try {
    await page.goto(urlFor(tag), { waitUntil: 'load', timeout: 20000 });
    // Damos tiempo al SPA + registry (fetch JSON + import behavior) sin asumir networkidle.
    await page.waitForTimeout(4000);

    const dump = await page.evaluate(() => {
      const host = document.querySelector('is-preview-component');
      const main = document.querySelector('is-preview-component is-main, is-preview-component .main');
      const aside = document.querySelector('is-preview-component aside, is-preview-component .sidebar');
      const stage = document.querySelector('.preview-stage');
      const frame = document.querySelector('iframe.preview-frame');

      let previewSections = null;
      let previewTag = null;
      let previewKeys = null;
      try {
        const def = host?.preview?.definition;
        if (def) {
          previewSections = Array.isArray(def.sections) ? def.sections.length : `NO-ARRAY(${typeof def.sections})`;
          previewTag = def.tag ?? null;
          previewKeys = Object.keys(def);
        }
      } catch (e) { previewSections = `THROW:${String(e).slice(0, 80)}`; }

      const mainHtml = main?.innerHTML ?? '';
      return {
        hostPresent: !!host,
        hostTagName: host?.tagName ?? null,
        mainPresent: !!main,
        mainTagName: main?.tagName ?? null,
        mainTextLen: (main?.textContent ?? '').trim().length,
        mainHtmlLen: mainHtml.length,
        mainChildCount: main?.children?.length ?? 0,
        mainFirstChildren: main ? [...main.children].slice(0, 6).map((c) => `${c.tagName.toLowerCase()}.${[...c.classList].join('.')}`) : [],
        asideTextLen: (aside?.textContent ?? '').trim().length,
        sectionEls: document.querySelectorAll('is-preview-component section.section').length,
        h2Count: main ? main.querySelectorAll('h2').length : 0,
        demoBlocks: main ? main.querySelectorAll('.demo-block').length : 0,
        customEls: main ? [...new Set([...main.querySelectorAll('*')].map((e) => e.tagName.toLowerCase()).filter((t) => t.startsWith('is-')))] : [],
        stagePresent: !!stage,
        stageTextLen: (stage?.textContent ?? '').trim().length,
        framePresent: !!frame,
        previewSections,
        previewTag,
        previewKeys,
        bodyTextLen: (document.body?.textContent ?? '').trim().length,
        htmlHead: (main?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
      };
    });

    console.log(JSON.stringify(dump, null, 2));

    const warns = consoleAll.filter((c) => c.type === 'warning');
    const errs = consoleAll.filter((c) => c.type === 'error');
    if (warns.length) { console.log(`\n  CONSOLE.WARN (${warns.length}):`); warns.slice(0, 6).forEach((w) => console.log(`    ! ${w.text}`)); }
    if (errs.length) { console.log(`\n  CONSOLE.ERROR (${errs.length}):`); errs.slice(0, 6).forEach((e) => console.log(`    X ${e.text}`)); }
    if (pageErrors.length) { console.log(`\n  PAGEERROR (${pageErrors.length}):`); pageErrors.slice(0, 4).forEach((e) => console.log(`    X ${e}`)); }
    if (badResponses.length) { console.log(`\n  HTTP>=400 (${badResponses.length}):`); badResponses.slice(0, 8).forEach((r) => console.log(`    ${r}`)); }
    if (failedRequests.length) { console.log(`\n  REQUESTFAILED (${failedRequests.length}):`); failedRequests.slice(0, 8).forEach((r) => console.log(`    ${r}`)); }

    const verdict = dump.previewSections > 0 && dump.mainTextLen > 200 ? 'RENDERIZA' : 'VACIO/ROTO';
    console.log(`\n  >> VERDICT: ${verdict} (sections=${dump.previewSections}, mainTextLen=${dump.mainTextLen})`);
  } catch (err) {
    console.log(`  EXCEPCION: ${String(err).slice(0, 200)}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onFailed);
    page.off('response', onResponse);
  }
}

await browser.close();
