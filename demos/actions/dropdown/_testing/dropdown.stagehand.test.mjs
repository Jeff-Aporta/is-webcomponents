// dropdown.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/dropdown/dropdown.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-dropdown-ready y 2 dropdowns', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-dropdown-ready]');
  const n = await page.evaluate(() => document.querySelectorAll('is-dropdown').length);
  assert.equal(n, 2);
  await page.close();
});

test('stagehand: click en el trigger abre el menú', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.click('is-dropdown#d1 [slot="trigger"]');
  await page.waitForTimeout(80);
  const open = await page.evaluate(() => document.getElementById('d1').open);
  assert.equal(open, true);
  // aria-expanded=true en el trigger
  const aria = await page.evaluate(() => {
    return document.querySelector('is-dropdown#d1 [slot="trigger"]').getAttribute('aria-expanded');
  });
  assert.equal(aria, 'true');
  await page.close();
});

test('stagehand: Escape cierra el menú', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.evaluate(() => document.getElementById('d1').show());
  await page.waitForTimeout(80);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  const open = await page.evaluate(() => document.getElementById('d1').open);
  assert.equal(open, false);
  await page.close();
});

test('stagehand: ArrowDown enfoca el primer item cuando el menú abre', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.click('is-dropdown#d1 [slot="trigger"]');
  await page.waitForTimeout(120);
  // Tras show() el componente hace focus en items[0].
  const firstFocused = await page.evaluate(() => {
    const items = document.getElementById('d1').items;
    return items[0].matches(':focus') || items[0].shadowRoot?.activeElement === document.activeElement;
  });
  assert.equal(firstFocused, true, 'el primer item debe estar enfocado al abrir');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(20);
  const secondFocused = await page.evaluate(() => {
    const items = document.getElementById('d1').items;
    return items[1].matches(':focus') || items[1].shadowRoot?.activeElement === document.activeElement;
  });
  assert.equal(secondFocused, true, 'ArrowDown debe enfocar el segundo item');
  await page.close();
});

test('stagehand: click en item peligroso emite is-select y cierra', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.evaluate(() => {
    document.getElementById('d1').show();
    window.__dEvtSel = null;
    document.getElementById('d1').addEventListener('is-select', (e) => {
      window.__dEvtSel = { value: e.detail.item.value };
    });
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    const items = document.getElementById('d1').items;
    // El último es "Eliminar" (color=danger)
    items[items.length - 1].click();
  });
  await page.waitForTimeout(80);
  const detail = await page.evaluate(() => window.__dEvtSel);
  assert.equal(detail?.value, 'delete');
  const open = await page.evaluate(() => document.getElementById('d1').open);
  assert.equal(open, false);
  await page.close();
});

test('stagehand: checkbox items mantienen su estado entre aperturas', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d2:defined');
  // toggle el segundo checkbox (sidebar, inicialmente false)
  await page.evaluate(() => document.getElementById('d2').items[1].click());
  // close
  await page.evaluate(() => document.getElementById('d2').hide());
  await page.waitForTimeout(80);
  // reopen
  await page.evaluate(() => document.getElementById('d2').show());
  await page.waitForTimeout(80);
  const checked = await page.evaluate(() => document.getElementById('d2').items[1].checked);
  assert.equal(checked, true, 'el toggle debe persistir tras cerrar y reabrir');
  await page.close();
});

test('stagehand: prefers-reduced-motion no afecta la apertura', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.evaluate(() => document.getElementById('d1').show());
  await page.waitForTimeout(80);
  const open = await page.evaluate(() => document.getElementById('d1').open);
  assert.equal(open, true);
  await ctx.close();
});
