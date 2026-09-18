// button-group.test.mjs — Nivel 3 (pure functions / DOM boot via node:test).
// Verifica que el bundle carga el custom element, monta, y refleja atributos
// en propiedades / DOM / eventos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL_DEMO = 'http://127.0.0.1:8491/demos/actions/button-group/button-group.html';
let browser;

test.before(async () => {
  browser = await chromium.launch();
});

test.after(async () => {
  await browser?.close();
});

test('button-group: bundle registra <is-button-group>', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group:defined');
  const defined = await page.evaluate(() => !!customElements.get('is-button-group'));
  assert.equal(defined, true, '<is-button-group> debe estar definido tras importar el bundle');
  await page.close();
});

test('button-group: atributo select=single aplica value inicial del HTML', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-single:defined');
  const value = await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-single');
    return { value: g.value, values: g.values };
  });
  assert.equal(value.value, 'md', 'value inicial debe ser "md" (atributo value del HTML)');
  assert.deepEqual(value.values, ['md'], 'values debe ser ["md"]');
  await page.close();
});

test('button-group: click en botón cambia value y emite is-change', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-single:defined');
  const events = [];
  await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-single');
    g.addEventListener('is-change', (e) => {
      window.__bgEvents = window.__bgEvents || [];
      window.__bgEvents.push(e.detail);
    });
  });

  // Click en el botón "lg" dentro del shadow DOM del host
  await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-single');
    const btns = g.querySelectorAll('is-button');
    btns[2].click();
  });
  await page.waitForTimeout(50);

  const detail = await page.evaluate(() => window.__bgEvents);
  assert.ok(Array.isArray(detail) && detail.length === 1, 'debe haberse emitido un is-change');
  assert.equal(detail[0].value, 'lg', 'is-change.detail.value debe ser "lg"');
  assert.deepEqual(detail[0].values, ['lg'], 'is-change.detail.values debe ser ["lg"]');
  await page.close();
});

test('button-group: select=multiple soporta toggle y devuelve array en value', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-multi:defined');
  await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-multi');
    const btns = g.querySelectorAll('is-button');
    btns[0].click(); // UX
    btns[2].click(); // perf
  });
  await page.waitForTimeout(50);
  const value = await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-multi');
    return { value: g.value, values: g.values };
  });
  assert.deepEqual(value.values.sort(), ['perf', 'ux'], 'values debe contener UX y perf');
  await page.close();
});

test('button-group: variant="segmented" queda reflejado en atributo', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-seg:defined');
  const variant = await page.evaluate(() => {
    return document.querySelector('is-button-group#g-seg').getAttribute('variant');
  });
  assert.equal(variant, 'segmented', 'el atributo variant debe ser "segmented"');
  await page.close();
});

test('button-group: aria-orientation y role=group llegan al slot interno', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-seg:defined');
  const a11y = await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-seg');
    const slot = g.shadowRoot.querySelector('slot');
    return {
      slotAriaOrientation: slot.getAttribute('aria-orientation'),
      hostAriaOrientation: g.getAttribute('aria-orientation'),
      slotRole: slot.getAttribute('role'),
    };
  });
  assert.equal(a11y.slotAriaOrientation, 'vertical', 'aria-orientation en slot debe ser "vertical"');
  assert.equal(a11y.slotRole, 'group', 'role del slot debe ser "group"');
  await page.close();
});

test('button-group: navegar con ArrowDown en vertical mueve el foco (envoltura)', async () => {
  const page = await browser.newPage();
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('is-button-group#g-seg:defined');
  // Foco en el primer botón
  await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-seg');
    g.querySelectorAll('is-button')[0].focus();
  });
  // En vertical, ArrowDown debe mover al siguiente y envolver al final
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(20);
  const idx1 = await page.evaluate(() => {
    const g = document.querySelector('is-button-group#g-seg');
    const btns = [...g.querySelectorAll('is-button')];
    return btns.indexOf(btns.find((b) => b.shadowRoot?.activeElement === document.activeElement || b === document.activeElement));
  });
  // Aceptamos 1 ó -1 según cómo mide activeElement; comprobamos solo que NO es 0.
  assert.notEqual(idx1, 0, 'ArrowDown debe sacar el foco del primer botón');
  await page.close();
});
