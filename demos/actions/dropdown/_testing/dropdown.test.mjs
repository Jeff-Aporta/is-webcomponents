// dropdown.test.mjs — Nivel 3: smoke + open/close + is-select + is-show/hide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/dropdown/dropdown.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('dropdown: bundle registra <is-dropdown>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown:defined');
  const defined = await page.evaluate(() => !!customElements.get('is-dropdown'));
  assert.equal(defined, true);
  await page.close();
});

test('dropdown: el trigger interno queda con aria-haspopup=menu', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown:defined');
  const hasPopup = await page.evaluate(() => {
    return document.querySelector('is-dropdown#d1').querySelector('[slot="trigger"]').getAttribute('aria-haspopup');
  });
  assert.equal(hasPopup, 'menu');
  await page.close();
});

test('dropdown: show()/hide() controlan el atributo open y emiten eventos', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.evaluate(() => {
    window.__dEvents = [];
    const d = document.getElementById('d1');
    ['is-show', 'is-after-show', 'is-hide', 'is-after-hide'].forEach((ev) => {
      d.addEventListener(ev, (e) => window.__dEvents.push(ev));
    });
    d.show();
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => document.getElementById('d1').hide());
  await page.waitForTimeout(80);
  const events = await page.evaluate(() => window.__dEvents);
  assert.ok(events.includes('is-show'), 'debe emitir is-show');
  assert.ok(events.includes('is-after-show'), 'debe emitir is-after-show');
  assert.ok(events.includes('is-hide'), 'debe emitir is-hide');
  assert.ok(events.includes('is-after-hide'), 'debe emitir is-after-hide');
  const open = await page.evaluate(() => document.getElementById('d1').open);
  assert.equal(open, false);
  await page.close();
});

test('dropdown: click en un item emite is-select con detail.item y cierra', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.evaluate(() => {
    document.getElementById('d1').show();
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    window.__dSel = null;
    document.getElementById('d1').addEventListener('is-select', (e) => {
      window.__dSel = { value: e.detail.item.value };
    });
    const items = document.getElementById('d1').items;
    items[0].click();
  });
  await page.waitForTimeout(80);
  const detail = await page.evaluate(() => window.__dSel);
  assert.equal(detail?.value, 'edit');
  const open = await page.evaluate(() => document.getElementById('d1').open);
  assert.equal(open, false, 'seleccionar debe cerrar el menú');
  await page.close();
});

test('dropdown: items getter excluye disabled y elementos no-is-dropdown-item', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d2:defined');
  const items = await page.evaluate(() => {
    return document.getElementById('d2').items.length;
  });
  assert.equal(items, 3, 'd2 debe exponer 3 items');
  await page.close();
});

test('dropdown: is-hide cancelable=true → preventDefault() deja el menú abierto', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown#d1:defined');
  await page.evaluate(() => {
    document.getElementById('d1').show();
    document.getElementById('d1').addEventListener('is-hide', (e) => e.preventDefault(), { once: true });
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => document.getElementById('d1').hide());
  await page.waitForTimeout(50);
  const open = await page.evaluate(() => document.getElementById('d1').open);
  assert.equal(open, true, 'preventDefault en is-hide debe mantener el menú abierto');
  await page.close();
});
