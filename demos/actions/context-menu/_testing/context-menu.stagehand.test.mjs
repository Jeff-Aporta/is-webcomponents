// context-menu.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/context-menu/context-menu.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-context-menu-ready', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-context-menu-ready]');
  const items = await page.evaluate(() => document.querySelectorAll('.item').length);
  assert.ok(items >= 4, 'demo debe tener al menos 4 items');
  await page.close();
});

test('stagehand: clic derecho sobre el target abre el menú', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu:defined');
  // Simular contextmenu (no click normal)
  await page.click('#target', { button: 'right' });
  await page.waitForTimeout(80);
  const isOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(isOpen, true, 'clic derecho debe abrir el menú');
  await page.close();
});

test('stagehand: Escape cierra el menú (vía listener del demo)', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu:defined');
  await page.evaluate(() => document.getElementById('cm').openAtElement());
  await page.waitForTimeout(50);
  const wasOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(wasOpen, true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  const isOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(isOpen, false);
  await page.close();
});

test('stagehand: openAtElement ancla el menú al target', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu:defined');
  await page.evaluate(() => document.getElementById('cm').openAtElement());
  await page.waitForTimeout(80);
  const layout = await page.evaluate(() => {
    const cm = document.getElementById('cm');
    const target = document.getElementById('target');
    const tRect = target.getBoundingClientRect();
    const dRect = cm.shadowRoot.querySelector('dialog').getBoundingClientRect();
    return { tx: tRect.x, dx: dRect.x };
  });
  // bottom-start: el panel queda alineado al borde izquierdo del target
  assert.ok(Math.abs(layout.dx - layout.tx) < 4, `panel debe estar cerca del borde izq del target, tx=${layout.tx}, dx=${layout.dx}`);
  await page.close();
});

test('stagehand: clic fuera cierra el menú (popup-dismiss)', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu:defined');
  await page.evaluate(() => document.getElementById('cm').openAt(200, 200));
  await page.waitForTimeout(50);
  // Click fuera del panel (en el body, lejos del panel)
  await page.mouse.click(20, 20);
  await page.waitForTimeout(80);
  const isOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(isOpen, false);
  await page.close();
});

test('stagehand: prefers-reduced-motion no afecta la apertura del menú', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-context-menu:defined');
  await page.evaluate(() => document.getElementById('cm').openAt(150, 150));
  await page.waitForTimeout(50);
  const isOpen = await page.evaluate(() => document.getElementById('cm').isOpen);
  assert.equal(isOpen, true);
  await ctx.close();
});
