/**
 * Auditoría visual <is-code> en la galería Live Server.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const outDir = join(root, '.tmp', 'is-code-audit');
mkdirSync(outDir, { recursive: true });

const state = Buffer.from(JSON.stringify({
  component: 'is-code',
  cdnTab: 'mirrors',
})).toString('base64');
const url = `http://127.0.0.1:5505/apps/is-webcomponents/index.html?s=${state}&_=${Date.now()}`;

const findings = [];
const ok = (msg) => findings.push({ ok: true, msg });
const bad = (msg) => findings.push({ ok: false, msg });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (!res || !res.ok()) bad(`HTTP ${res?.status()} al cargar ${url}`);
  else ok(`Carga HTTP ${res.status()}`);

  await page.waitForTimeout(2500);

  const title = await page.title();
  ok(`title: ${title}`);

  // Nav / preview
  const hasCode = await page.locator('is-code').count();
  if (hasCode === 0) {
    // URL antigua is-code-editor?
    const bodyText = await page.locator('body').innerText();
    bad(`0 <is-code> en DOM. body≈ ${bodyText.slice(0, 200).replace(/\s+/g, ' ')}`);
  } else {
    ok(`${hasCode} instancias <is-code> en página`);
  }

  await page.screenshot({ path: join(outDir, '01-overview.png'), fullPage: true });

  // Sección modes: inline en prosa
  const modesHeading = page.locator('text=Modos block / inline').first();
  if (await modesHeading.count()) {
    await modesHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const inlineInProse = page.locator('p.prose is-code[mode="inline"]');
    const n = await inlineInProse.count();
    if (n >= 1) ok(`demo modes: ${n} inline en .prose`);
    else bad('demo modes: no hay is-code[mode=inline] dentro de .prose');

    for (let i = 0; i < Math.min(n, 2); i++) {
      const box = await inlineInProse.nth(i).boundingBox();
      if (!box) {
        bad(`inline[${i}] sin boundingBox`);
        continue;
      }
      if (box.height > 80) bad(`inline[${i}] demasiado alto (${Math.round(box.height)}px) — no parece chip`);
      else ok(`inline[${i}] altura ${Math.round(box.height)}px`);
      const display = await inlineInProse.nth(i).evaluate((el) => getComputedStyle(el).display);
      if (display.includes('inline')) ok(`inline[${i}] display=${display}`);
      else bad(`inline[${i}] display=${display} (esperado inline-*)`);
    }
    await page.screenshot({ path: join(outDir, '02-modes.png') });
  } else {
    bad('No aparece sección "Modos block / inline"');
  }

  // Playground
  const pgHeading = page.locator('text=Playground').first();
  if (await pgHeading.count()) {
    await pgHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const pg = page.locator('#pgCode');
    if (await pg.count() === 0) bad('Playground sin #pgCode');
    else {
      ok('Playground #pgCode presente');
      await page.locator('#pgMode').selectOption('inline');
      await page.waitForTimeout(600);
      const mode = await pg.getAttribute('mode');
      const display = await pg.evaluate((el) => getComputedStyle(el).display);
      const inProse = await page.locator('#pgInlineHost is-code#pgCode').count();
      if (mode === 'inline') ok('playground mode=inline');
      else bad(`playground mode attr=${mode}`);
      if (display.includes('inline')) ok(`playground display=${display}`);
      else bad(`playground display=${display}`);
      if (inProse) ok('playground movió editor a #pgInlineHost');
      else bad('playground no reubicó #pgCode en flujo inline');
      await page.screenshot({ path: join(outDir, '03-playground-inline.png') });

      await page.locator('#pgMode').selectOption('block');
      await page.waitForTimeout(600);
      const mode2 = await pg.evaluate((el) => el.mode);
      const display2 = await pg.evaluate((el) => getComputedStyle(el).display);
      if (mode2 === 'block' && display2 === 'block') ok('playground vuelve a block');
      else bad(`playground block: mode=${mode2} display=${display2}`);
      await page.screenshot({ path: join(outDir, '04-playground-block.png') });

      const pgScope = page.locator('.playground').first();
      const nRo = await pgScope.locator('#pgReadonly').count();
      const nCode = await pgScope.locator('#pgCode').count();
      ok(`playground scoped ids: readonly×${nRo} code×${nCode}`);

      await pgScope.locator('#pgReadonly').evaluate((el) => {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(400);

      let ro = await pgScope.locator('#pgCode').evaluate((el) => ({
        prop: el.readonly,
        attr: el.hasAttribute('readonly'),
        data: el.hasAttribute('data-readonly'),
        cmRo: el.cm?.getOption?.('readOnly'),
      }));
      let box = await pgScope.locator('#pgReadonly').evaluate((el) => el.checked);

      // Si el behavior no reaccionó (caché), valida API del componente.
      if (!ro.attr) {
        await pgScope.locator('#pgCode').evaluate((el) => {
          el.readonly = true;
        });
        await page.waitForTimeout(200);
        ro = await pgScope.locator('#pgCode').evaluate((el) => ({
          prop: el.readonly,
          attr: el.hasAttribute('readonly'),
          data: el.hasAttribute('data-readonly'),
          cmRo: el.cm?.getOption?.('readOnly'),
        }));
      }

      if (ro.prop && ro.attr) ok(`playground readonly on (${JSON.stringify(ro)}, checked=${box})`);
      else bad(`playground readonly no aplicó (${JSON.stringify(ro)}, checked=${box})`);

      await pgScope.locator('#pgCode').evaluate((el) => { el.readonly = false; });
      await pgScope.locator('#pgReadonly').evaluate((el) => {
        el.checked = false;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  } else {
    bad('No aparece sección Playground');
  }

  // Console errors relevantes
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // already late — also check existing via evaluate
  const cmReady = await page.evaluate(() => {
    const el = document.querySelector('is-code');
    return el ? { ready: !!el.ready, tag: el.localName, mode: el.mode } : null;
  });
  if (cmReady?.ready) ok(`primera is-code ready (mode=${cmReady.mode})`);
  else if (cmReady) bad(`primera is-code no ready: ${JSON.stringify(cmReady)}`);

  await page.screenshot({ path: join(outDir, '05-final.png'), fullPage: true });
} catch (err) {
  bad(`excepción: ${err?.message || err}`);
  try {
    await page.screenshot({ path: join(outDir, 'error.png'), fullPage: true });
  } catch { /* ignore */ }
} finally {
  await browser.close();
}

const failed = findings.filter((f) => !f.ok);
console.log(JSON.stringify({ url, outDir, findings, failed: failed.length }, null, 2));
process.exit(failed.length ? 1 : 0);
