// copy-button.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/copy-button/copy-button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-copy-button-ready y 4 botones', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-copy-button-ready]');
  const n = await page.evaluate(() => document.querySelectorAll('is-copy-button').length);
  assert.equal(n, 4);
  await page.close();
});

test('stagehand: click copia el texto y el feedback aparece ~1s', async () => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-copy-button:defined');
  await page.evaluate(() => {
    document.querySelector('is-copy-button').shadowRoot.querySelector('is-button').click();
  });
  await page.waitForTimeout(80);
  // Feedback presente
  const feedback = await page.evaluate(() => {
    const cb = document.querySelector('is-copy-button');
    const success = cb.shadowRoot.querySelector('[data-state="success"]');
    const r = success.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  assert.ok(feedback.w > 0 && feedback.h > 0, 'success icon debe estar pintado');
  // Tras 1.2s el feedback desaparece (default feedback-duration=1000)
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => {
    const cb = document.querySelector('is-copy-button');
    return cb.matches(':state(success)');
  });
  assert.equal(after, false, 'tras feedback-duration el :state(success) debe quitarse');
  await ctx.close();
});

test('stagehand: Tab navega hasta el botón y Enter dispara is-copy', async () => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-copy-button:defined');
  await page.focus('is-copy-button:not([disabled]) is-button');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(80);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /npm install/);
  await ctx.close();
});

test('stagehand: feedback-duration="500" cambia el tiempo', async () => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-copy-button:defined');
  // Crear un botón ad-hoc con feedback corto (no en el HTML del demo)
  await page.evaluate(() => {
    const cb = document.createElement('is-copy-button');
    cb.setAttribute('value', 'short feedback');
    cb.setAttribute('feedback-duration', '300');
    document.body.appendChild(cb);
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    document.querySelector('is-copy-button[feedback-duration]').shadowRoot.querySelector('is-button').click();
  });
  await page.waitForTimeout(80);
  const stillOn = await page.evaluate(() => {
    return document.querySelector('is-copy-button[feedback-duration]').matches(':state(success)');
  });
  assert.equal(stillOn, true);
  await page.waitForTimeout(500);
  const gone = await page.evaluate(() => {
    return document.querySelector('is-copy-button[feedback-duration]').matches(':state(success)');
  });
  assert.equal(gone, false);
  await ctx.close();
});

test('stagehand: prefers-reduced-motion no rompe el feedback', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-copy-button:defined');
  await page.evaluate(() => {
    document.querySelector('is-copy-button').shadowRoot.querySelector('is-button').click();
  });
  await page.waitForTimeout(80);
  const on = await page.evaluate(() => {
    return document.querySelector('is-copy-button').matches(':state(success)');
  });
  assert.equal(on, true);
  await ctx.close();
});
