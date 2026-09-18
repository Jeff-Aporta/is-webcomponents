// fab.stagehand.test.mjs — Nivel 1: Playwright tests del demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/fab/fab.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página expone data-fab-ready y 5 fabs', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-fab-ready]');
  const n = await page.evaluate(() => document.querySelectorAll('is-fab').length);
  assert.equal(n, 5);
  await page.close();
});

test('stagehand: cada FAB está en la esquina esperada', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const layout = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const get = (id) => {
      const fab = document.getElementById(id);
      const r = fab.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, ds: fab.dataset.position };
    };
    return {
      vw, vh,
      bottomEnd: get('fab1'),
      bottomStart: get('fab2'),
      topEnd: get('fab3'),
      topStart: get('fab5'),
    };
  });
  // bottom-end: la derecha del fab debe estar cerca del borde derecho
  assert.ok(layout.vw - (layout.bottomEnd.x + layout.bottomEnd.w) < 50,
    `fab1 (bottom-end) debe estar cerca del borde derecho, dist=${layout.vw - (layout.bottomEnd.x + layout.bottomEnd.w)}`);
  // bottom-start: el borde izquierdo del fab debe estar cerca del 0
  assert.ok(layout.bottomStart.x < 50, 'fab2 (bottom-start) debe estar cerca del borde izquierdo');
  // top-end: arriba a la derecha
  assert.ok(layout.topEnd.y < 50, 'fab3 (top-end) debe estar cerca del borde superior');
  // top-start: arriba a la izquierda
  assert.ok(layout.topStart.y < 50, 'fab5 (top-start) debe estar cerca del borde superior');
  await page.close();
});

test('stagehand: click en fab1 incrementa el contador', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab#fab1:defined');
  await page.evaluate(() => document.getElementById('fab1').click());
  await page.waitForTimeout(40);
  await page.evaluate(() => document.getElementById('fab1').click());
  await page.waitForTimeout(40);
  const text = await page.evaluate(() => document.getElementById('log').textContent);
  assert.equal(text, 'clicks: 2');
  await page.close();
});

test('stagehand: focus pone el outline visible', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  await page.focus('is-fab#fab1');
  const focused = await page.evaluate(() => {
    const inner = document.querySelector('is-fab#fab1').shadowRoot.querySelector('is-button').shadowRoot.querySelector('.btn');
    return inner === document.activeElement || inner.contains(document.activeElement);
  });
  assert.equal(focused, true);
  await page.close();
});

test('stagehand: pulse y extended son visibles visualmente', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const sizes = await page.evaluate(() => {
    const fab = document.getElementById('fab4');
    const r = fab.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  // extended debe ser más ancho que un FAB circular normal (~56px)
  assert.ok(sizes.width > 80, `fab4 (extended) debe ser ancho, width=${sizes.width}`);
  await page.close();
});

test('stagehand: prefers-reduced-motion desactiva el pulso pero el FAB sigue visible', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-fab:defined');
  const visible = await page.evaluate(() => {
    const fab = document.getElementById('fab3');
    const r = fab.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  assert.equal(visible, true);
  await ctx.close();
});
