// share-button.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/share-button/share-button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-share-button-ready y 3 botones', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-share-button-ready]');
  const n = await page.evaluate(() => document.querySelectorAll('is-share-button').length);
  assert.equal(n, 3);
  await page.close();
});

test('stagehand: click en s2 llama a navigator.share o al fallback', async () => {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: () => Promise.resolve(),
      configurable: true,
    });
  });
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  await page.evaluate(() => {
    window.__share = null;
    document.getElementById('s2').addEventListener('is-share', (e) => { window.__share = e.detail; });
  });
  await page.click('is-share-button#s2 is-button');
  // El share-button es un is-button interno
  await page.waitForTimeout(150);
  const detail = await page.evaluate(() => window.__share);
  assert.ok(detail, 'is-share debe haberse emitido');
  await page.close();
});

test('stagehand: el log registra los eventos en orden', async () => {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: () => Promise.resolve(),
      configurable: true,
    });
  });
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  await page.click('is-share-button#s1 is-button');
  await page.waitForTimeout(120);
  const text = await page.evaluate(() => document.getElementById('log').textContent);
  assert.match(text, /share/);
  await page.close();
});

test('stagehand: click en disabled no hace nada', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button[disabled]:defined');
  const beforeText = await page.evaluate(() => document.getElementById('log').textContent);
  await page.click('is-share-button#s3 is-button');
  await page.waitForTimeout(80);
  const afterText = await page.evaluate(() => document.getElementById('log').textContent);
  assert.equal(beforeText, afterText, 'el log no debe cambiar tras click en disabled');
  await page.close();
});

test('stagehand: cada botón tiene su propio title/url/disabled en el DOM', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  const info = await page.evaluate(() => {
    return {
      s1: {
        title: document.getElementById('s1').getAttribute('share-title'),
        url: document.getElementById('s1').getAttribute('url'),
        disabled: document.getElementById('s1').disabled,
      },
      s3: {
        disabled: document.getElementById('s3').disabled,
      },
    };
  });
  assert.equal(info.s1.title, null);
  assert.equal(info.s1.disabled, false);
  assert.equal(info.s3.disabled, true);
  await page.close();
});

test('stagehand: prefers-reduced-motion no afecta el comportamiento', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: () => Promise.resolve(),
      configurable: true,
    });
  });
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  await page.click('is-share-button#s1 is-button');
  await page.waitForTimeout(120);
  const ok = await page.evaluate(() => /share/.test(document.getElementById('log').textContent));
  assert.equal(ok, true);
  await ctx.close();
});
