// context-menu.test.mjs — Nivel 3: smoke + open/close + is-select + is-open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/context-menu/context-menu.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('context-menu: bundle registra <is-context-menu>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu:defined');
  const defined = await page.evaluate(() => !!customElements.get('is-context-menu'));
  assert.equal(defined, true);
  await page.close();
});

test('context-menu: openAt() muestra el panel y emite is-open', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu#cm:defined');
  await page.evaluate(() => {
    window.__cmEvts = [];
    document.getElementById('cm').addEventListener('is-open', (e) => {
      window.__cmEvts.push({ type: 'open', detail: e.detail });
    });
    const cm = document.getElementById('cm');
    cm.openAt(100, 100);
  });
  await page.waitForTimeout(80);
  const evts = await page.evaluate(() => window.__cmEvts);
  const isOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(isOpen, true);
  assert.ok(evts.length === 1 && evts[0].type === 'open');
  assert.equal(evts[0].detail.x, 100);
  await page.close();
});

test('context-menu: close() emite is-close y oculta el panel', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu#cm:defined');
  await page.evaluate(() => {
    window.__cmClose = 0;
    document.getElementById('cm').addEventListener('is-close', () => { window.__cmClose += 1; });
    const cm = document.getElementById('cm');
    cm.openAt(120, 120);
    setTimeout(() => cm.close(), 30);
  });
  await page.waitForTimeout(150);
  const close = await page.evaluate(() => window.__cmClose);
  const isOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(close, 1);
  assert.equal(isOpen, false);
  await page.close();
});

test('context-menu: click en un item emite is-select con value del dataset', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu#cm:defined');
  await page.evaluate(() => {
    window.__cmSel = null;
    document.getElementById('cm').addEventListener('is-select', (e) => { window.__cmSel = e.detail; });
    document.getElementById('cm').openAt(80, 80);
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    // Click en el botón "Copiar" dentro del shadow DOM
    const cm = document.getElementById('cm');
    const items = cm.shadowRoot.querySelectorAll('.item');
    items[1].click();
  });
  await page.waitForTimeout(50);
  const detail = await page.evaluate(() => window.__cmSel);
  assert.equal(detail?.value, 'copy');
  const isOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(isOpen, false, 'tras seleccionar, el menú debe cerrarse');
  await page.close();
});

test('context-menu: atributo for=#target se enlaza al elemento target', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu#cm:defined');
  const forAttr = await page.evaluate(() => {
    return document.querySelector('is-context-menu').getAttribute('for');
  });
  assert.equal(forAttr, '#target');
  await page.close();
});

test('context-menu: panel es un <dialog> dentro del shadow', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu#cm:defined');
  const hasDialog = await page.evaluate(() => {
    return !!document.querySelector('is-context-menu#cm').shadowRoot.querySelector('dialog');
  });
  assert.equal(hasDialog, true);
  await page.close();
});
