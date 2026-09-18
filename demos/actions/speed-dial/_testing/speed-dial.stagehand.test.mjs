// speed-dial.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/speed-dial/speed-dial.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-speed-dial-ready y 2 dials', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-speed-dial-ready]');
  const info = await page.evaluate(() => ({
    dials: document.querySelectorAll('is-speed-dial').length,
    actions: document.querySelectorAll('is-speed-dial-action').length,
  }));
  assert.equal(info.dials, 2);
  assert.ok(info.actions >= 7, `esperaba >=7 acciones, hay ${info.actions}`);
  await page.close();
});

test('stagehand: click en el trigger abre/cierra el dial', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-speed-dial#sd-up:defined');
  await page.click('is-speed-dial#sd-up is-check-icon-button');
  await page.waitForTimeout(80);
  let open = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(open, true);
  await page.click('is-speed-dial#sd-up is-check-icon-button');
  await page.waitForTimeout(80);
  open = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(open, false);
  await page.close();
});

test('stagehand: click fuera cierra el dial', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-speed-dial#sd-up:defined');
  await page.evaluate(() => document.getElementById('sd-up').open());
  await page.waitForTimeout(80);
  // Click en el header (fuera del dial)
  await page.click('header');
  await page.waitForTimeout(80);
  const open = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(open, false);
  await page.close();
});

test('stagehand: aria-expanded cambia con el estado del trigger', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-speed-dial#sd-rad:defined');
  await page.evaluate(() => document.getElementById('sd-rad').open());
  await page.waitForTimeout(80);
  const expanded = await page.evaluate(() => {
    return document.getElementById('sd-rad').shadowRoot.querySelector('is-check-icon-button').getAttribute('aria-expanded');
  });
  assert.equal(expanded, 'true');
  await page.evaluate(() => document.getElementById('sd-rad').close());
  await page.waitForTimeout(80);
  const collapsed = await page.evaluate(() => {
    return document.getElementById('sd-rad').shadowRoot.querySelector('is-check-icon-button').getAttribute('aria-expanded');
  });
  assert.equal(collapsed, 'false');
  await page.close();
});

test('stagehand: Escape cierra el dial', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-speed-dial#sd-up:defined');
  await page.evaluate(() => document.getElementById('sd-up').open());
  await page.waitForTimeout(80);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  const open = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(open, false);
  await page.close();
});

test('stagehand: la primera acción queda visualmente alineada según direction', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-speed-dial#sd-up:defined');
  await page.evaluate(() => document.getElementById('sd-up').open());
  await page.waitForTimeout(120);
  const layout = await page.evaluate(() => {
    const trigger = document.getElementById('sd-up').shadowRoot.querySelector('is-check-icon-button').getBoundingClientRect();
    const firstAction = document.querySelector('is-speed-dial#sd-up is-speed-dial-action').getBoundingClientRect();
    return {
      trig: trigger.y,
      act: firstAction.y,
    };
  });
  // direction=up → la primera acción debe estar MÁS ARRIBA que el trigger
  assert.ok(layout.act < layout.trig, `primera acción debe estar arriba del trigger (act=${layout.act}, trig=${layout.trig})`);
  await page.close();
});

test('stagehand: prefers-reduced-motion no afecta la apertura', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-speed-dial:defined');
  await page.evaluate(() => document.getElementById('sd-up').open());
  await page.waitForTimeout(80);
  const open = await page.evaluate(() => document.getElementById('sd-up').isOpen);
  assert.equal(open, true);
  await ctx.close();
});
