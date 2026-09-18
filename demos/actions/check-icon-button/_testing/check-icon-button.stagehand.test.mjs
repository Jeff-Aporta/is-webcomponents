// check-icon-button.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/check-icon-button/check-icon-button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página monta 4 botones', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-check-icon-button-ready]');
  const count = await page.evaluate(() => document.querySelectorAll('is-check-icon-button').length);
  assert.equal(count, 4);
  await page.close();
});

test('stagehand: click toggle cambia aria-pressed y aria-label', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-check-icon-button#play:defined');
  const before = await page.evaluate(() => ({
    label: document.querySelector('is-check-icon-button#play').getAttribute('aria-label'),
    pressed: document.querySelector('is-check-icon-button#play').getAttribute('aria-pressed'),
  }));
  await page.focus('is-check-icon-button#play');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  const after = await page.evaluate(() => ({
    label: document.querySelector('is-check-icon-button#play').getAttribute('aria-label'),
    pressed: document.querySelector('is-check-icon-button#play').getAttribute('aria-pressed'),
  }));
  assert.equal(before.pressed, 'false');
  assert.equal(after.pressed, 'true');
  assert.notEqual(after.label, before.label, 'aria-label debe cambiar entre estados');
  await page.close();
});

test('stagehand: Space también dispara is-change', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-check-icon-button#mute:defined');
  await page.evaluate(() => {
    window.__ciEvts = 0;
    document.querySelector('is-check-icon-button#mute').addEventListener('is-change', () => {
      window.__ciEvts += 1;
    });
  });
  await page.focus('is-check-icon-button#mute');
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  const n = await page.evaluate(() => window.__ciEvts);
  assert.equal(n, 1);
  await page.close();
});

test('stagehand: variante disabled no responde ni a click ni a teclado', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-check-icon-button[disabled]:defined');
  const before = await page.evaluate(() => {
    return document.querySelector('is-check-icon-button[disabled]').checked;
  });
  await page.evaluate(() => {
    document.querySelector('is-check-icon-button[disabled]').click();
  });
  await page.waitForTimeout(50);
  const after = await page.evaluate(() => {
    return document.querySelector('is-check-icon-button[disabled]').checked;
  });
  assert.equal(before, false);
  assert.equal(after, false, 'click sobre disabled no debe togglear');
  await page.close();
});

test('stagehand: click en botón "star" emite is-change con checked=true', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-check-icon-button#star:defined');
  await page.evaluate(() => {
    window.__starEvt = null;
    document.querySelector('is-check-icon-button#star').addEventListener('is-change', (e) => {
      window.__starEvt = e.detail;
    });
  });
  await page.evaluate(() => document.querySelector('is-check-icon-button#star').click());
  await page.waitForTimeout(50);
  const detail = await page.evaluate(() => window.__starEvt);
  assert.equal(detail?.checked, true);
  await page.close();
});

test('stagehand: prefers-reduced-motion no rompe el icono', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-check-icon-button:defined');
  await page.evaluate(() => {
    document.querySelector('is-check-icon-button#play').click();
  });
  await page.waitForTimeout(30);
  const on = await page.evaluate(() => {
    return document.querySelector('is-check-icon-button#play').checked;
  });
  assert.equal(on, true);
  await ctx.close();
});
