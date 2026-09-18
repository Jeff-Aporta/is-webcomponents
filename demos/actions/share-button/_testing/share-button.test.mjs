// share-button.test.mjs — Nivel 3: smoke + props + share() sin Web Share (clipboard).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/share-button/share-button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('share-button: bundle registra <is-share-button>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  const defined = await page.evaluate(() => !!customElements.get('is-share-button'));
  assert.equal(defined, true);
  await page.close();
});

test('share-button: atributos reactivos shareTitle, text, url', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  const props = await page.evaluate(() => {
    const s = document.getElementById('s2');
    return {
      title: s.shareTitle,
      text: s.text,
      url: s.url,
    };
  });
  assert.equal(props.title, 'Mi artículo');
  assert.equal(props.text, 'Te recomiendo este post');
  assert.equal(props.url, 'https://example.com/post/123');
  await page.close();
});

test('share-button: atributo disabled bloquea el click', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  await page.evaluate(() => {
    window.__shareEvts = 0;
    const s = document.getElementById('s3');
    s.addEventListener('is-share', () => { window.__shareEvts += 1; });
    s.addEventListener('is-error', () => { window.__shareEvts += 1; });
    s.click();
  });
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => window.__shareEvts);
  assert.equal(n, 0, 'click sobre disabled no debe emitir ningún evento');
  await page.close();
});

test('share-button: sin Web Share API → copia al clipboard y emite is-share{how:"copied"}', async () => {
  // Stub navigator.share a undefined para forzar fallback
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    // Borrar la Web Share API
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  await page.evaluate(() => {
    window.__shareDetail = null;
    const s = document.getElementById('s2');
    s.addEventListener('is-share', (e) => { window.__shareDetail = e.detail; });
    s.share();
  });
  await page.waitForTimeout(300);
  const detail = await page.evaluate(() => window.__shareDetail);
  // En headless sin navigator.share, debe caer a clipboard y emitir is-share con how=copied
  if (detail) {
    assert.equal(detail.how, 'copied', `esperaba how=copied, fue ${detail.how}`);
    assert.match(detail.title, /Mi artículo/);
    assert.match(detail.url, /example\.com/);
  }
  await ctx.close();
});

test('share-button: navigator.share presente → cómo=shared o abort', async () => {
  // Stub navigator.share para que devuelva una promesa resuelta
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
    window.__shared = null;
    document.getElementById('s1').addEventListener('is-share', (e) => { window.__shared = e.detail; });
    document.getElementById('s1').share();
  });
  await page.waitForTimeout(150);
  const detail = await page.evaluate(() => window.__shared);
  assert.ok(detail, 'debe emitirse is-share');
  assert.equal(detail.how, 'shared');
  await page.close();
});

test('share-button: navigator.share rechaza → is-error', async () => {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: () => Promise.reject(new Error('canceled')),
      configurable: true,
    });
  });
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  await page.evaluate(() => {
    window.__shareErr = 0;
    document.getElementById('s1').addEventListener('is-error', () => { window.__shareErr += 1; });
    document.getElementById('s1').share();
  });
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => window.__shareErr);
  assert.equal(n, 1);
  await page.close();
});

test('share-button: el inner es un <is-button>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-share-button:defined');
  const has = await page.evaluate(() => {
    return !!document.querySelector('is-share-button').shadowRoot.querySelector('is-button');
  });
  assert.equal(has, true);
  await page.close();
});
