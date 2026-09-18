// dropdown-item.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/dropdown-item/dropdown-item.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-dropdown-item-ready y 7 items', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-dropdown-item-ready]');
  const n = await page.evaluate(() => document.querySelectorAll('is-dropdown-item').length);
  // 3 standalone + 3 checkbox + 1 con submenú + 3 submenú = 10
  assert.ok(n >= 7, `esperaba >=7 items, hay ${n}`);
  await page.close();
});

test('stagehand: Tab navega por items standalone', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  await page.focus('#i1');
  const focus1 = await page.evaluate(() => document.activeElement?.id);
  assert.equal(focus1, 'i1');
  await page.keyboard.press('Tab');
  const focus2 = await page.evaluate(() => document.activeElement?.id);
  assert.equal(focus2, 'i2');
  await page.close();
});

test('stagehand: Enter/Space en item normal emite is-dropdown-item-select', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  await page.evaluate(() => {
    window.__diKey = 0;
    document.getElementById('i1').addEventListener('is-dropdown-item-select', () => {
      window.__diKey += 1;
    });
  });
  await page.focus('#i1');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(30);
  const n = await page.evaluate(() => window.__diKey);
  assert.equal(n, 1);
  await page.close();
});

test('stagehand: ArrowRight abre el submenú', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item#sub1:defined');
  await page.focus('#sub1');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(50);
  const opened = await page.evaluate(() => document.getElementById('sub1').submenuOpen);
  assert.equal(opened, true);
  // Y ArrowLeft lo cierra
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(50);
  const closed = await page.evaluate(() => document.getElementById('sub1').submenuOpen);
  assert.equal(closed, false);
  await page.close();
});

test('stagehand: items checkbox tienen checkmark visible en el shadow DOM', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  const visible = await page.evaluate(() => {
    return [...document.querySelectorAll('is-dropdown-item[type="checkbox"]')].every((it) => {
      return !it.shadowRoot.querySelector('.checkmark').hidden;
    });
  });
  assert.equal(visible, true, 'todos los checkboxes deben tener checkmark visible');
  await page.close();
});

test('stagehand: prefers-reduced-motion no afecta al checkbox', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-dropdown-item:defined');
  await page.evaluate(() => document.getElementById('c3').click());
  await page.waitForTimeout(30);
  const checked = await page.evaluate(() => document.getElementById('c3').checked);
  assert.equal(checked, true);
  await ctx.close();
});
