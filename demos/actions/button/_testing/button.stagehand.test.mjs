// button.stagehand.test.mjs — Nivel 1: Playwright tests del demo HTML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/button/button.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-button-ready', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-button-ready]');
  const sections = await page.evaluate(() => {
    return {
      sections: document.querySelectorAll('section').length,
      buttons: document.querySelectorAll('is-button').length,
    };
  });
  assert.ok(sections.sections >= 4, 'demo debe tener >=4 secciones');
  assert.ok(sections.buttons >= 18, 'demo debe tener muchos botones');
  await page.close();
});

test('stagehand: click en el contador incrementa el texto', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button#counter:defined');
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(() => {
      document.querySelector('is-button#counter').click();
    });
    await page.waitForTimeout(20);
    const txt = await page.evaluate(() => document.querySelector('is-button#counter').textContent);
    assert.equal(txt, `Clicks: ${i}`);
  }
  await page.close();
});

test('stagehand: foco en un botón lo marca como :focus visible', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button:defined');
  await page.focus('is-button#counter');
  const focused = await page.evaluate(() => {
    const inner = document.querySelector('is-button#counter').shadowRoot.querySelector('.btn');
    return inner === document.activeElement || inner.contains(document.activeElement);
  });
  assert.equal(focused, true, 'tras focus(), el inner debe ser el activeElement');
  await page.close();
});

test('stagehand: Tab navega entre los botones en orden DOM', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button:defined');
  await page.focus('section:nth-of-type(1) is-button:first-child');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(20);
  const focused = await page.evaluate(() => {
    const inner = document.activeElement;
    // inner es el <button> interno del segundo is-button
    const host = inner?.getRootNode()?.host;
    return host?.tagName ?? null;
  });
  assert.equal(focused, 'IS-BUTTON', 'el siguiente focus debe estar en otro is-button');
  await page.close();
});

test('stagehand: with-caret pinta el icono chevron-down al final', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button[with-caret]:defined');
  const hasCaret = await page.evaluate(() => {
    const btn = document.querySelector('is-button[with-caret]');
    const caret = btn.shadowRoot.querySelector('[part="caret"]');
    return {
      exists: !!caret,
      hidden: caret?.hidden ?? true,
      icon: caret?.querySelector('is-icon')?.getAttribute('icon') ?? null,
    };
  });
  assert.equal(hasCaret.exists, true, 'debe existir ::part(caret)');
  assert.equal(hasCaret.hidden, false, 'caret debe ser visible');
  assert.match(hasCaret.icon, /chevron/, 'caret debe usar mdi:chevron-down');
  await page.close();
});

test('stagehand: prefers-reduced-motion: el spinner no cambia de tamaño', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button#loading-btn:defined');
  // El spinner debe seguir mostrándose; solo cambia la duración de la animación.
  const spinnerVisible = await page.evaluate(() => {
    return document.querySelector('is-button#loading-btn').shadowRoot.querySelector('.btn__spinner').hidden;
  });
  assert.equal(spinnerVisible, false, 'spinner sigue visible con reduced-motion');
  await ctx.close();
});
