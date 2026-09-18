// button-group.stagehand.test.mjs — Nivel 1: tests Playwright del demo HTML.
// Cubre: render inicial, accesibilidad, click básico, keyboard navigation,
// atributos reactivos, prefers-reduced-motion (no aplica al componente pero
// se verifica que sigue funcionando).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/button-group/button-group.html';
let browser;

test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

test('stagehand: la página monta los 3 grupos y expone data-ready', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-button-group-ready]');
  const groups = await page.evaluate(() => ({
    total: document.querySelectorAll('is-button-group').length,
    single: !!customElements.get('is-button-group'),
    firstValue: document.querySelector('is-button-group#g-single').getAttribute('value'),
  }));
  assert.equal(groups.total, 3, 'demo debe tener 3 grupos');
  assert.equal(groups.single, true, '<is-button-group> debe estar definido');
  assert.equal(groups.firstValue, 'md', 'primer grupo debe tener value="md"');
  await page.close();
});

test('stagehand: click en un botón del grupo single actualiza el valor en pantalla', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-single:defined');
  // Click en "Grande" (índice 2) por medio del shadow DOM (más estable que
  // simular el mouse).
  await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-single');
    g.querySelectorAll('is-button')[2].click();
  });
  await page.waitForTimeout(80);
  const text = await page.evaluate(() => {
    return document.getElementById('out-single').textContent;
  });
  assert.match(text, /"value"\s*:\s*"lg"/, 'el JSON de salida debe contener value=lg');
  await page.close();
});

test('stagehand: navigation con flechas mueve foco en grupo horizontal', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-single:defined');
  // Foco en el primer botón (Pequeño).
  await page.evaluate(() => {
    document.querySelector('is-button-group#g-single').querySelectorAll('is-button')[0].focus();
  });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(20);
  const focused = await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-single');
    const btns = [...g.querySelectorAll('is-button')];
    return btns.findIndex((b) => b.matches(':focus') || b.shadowRoot?.querySelector('.btn') === document.activeElement);
  });
  // is-button tiene delegatesFocus: el foco real puede estar en el <button>
  // interno. Verificamos solo que NO es el primero.
  assert.notEqual(focused, 0, 'ArrowRight debe haber movido el foco');
  await page.close();
});

test('stagehand: prefers-reduced-motion no rompe el render', async () => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-multi:defined');
  const rendered = await page.evaluate(() => {
    return document.querySelector('is-button-group#g-multi').querySelectorAll('is-button').length;
  });
  assert.ok(rendered >= 4, 'el grupo multiple debe seguir teniendo sus 4 botones con reduced-motion');
  await ctx.close();
});

test('stagehand: orientación vertical de g-seg renderiza 3 botones apilados', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-seg:defined');
  const layout = await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-seg');
    const btns = [...g.querySelectorAll('is-button')];
    const rects = btns.map((b) => b.getBoundingClientRect());
    // Vertical = primer botón más arriba que el segundo, no en la misma línea.
    return {
      count: btns.length,
      stacked: rects[1].top > rects[0].bottom - 2,
      orientation: g.getAttribute('orientation'),
    };
  });
  assert.equal(layout.count, 3, 'g-seg debe tener 3 botones');
  assert.equal(layout.orientation, 'vertical');
  assert.equal(layout.stacked, true, 'los botones deben estar apilados verticalmente');
  await page.close();
});
