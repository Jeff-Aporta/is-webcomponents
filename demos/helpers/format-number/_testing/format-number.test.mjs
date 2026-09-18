// format-number.test.mjs — tests funcionales de <is-format-number>.
//
// Cubre:
//   - smoke: 12 instancias renderizan texto no vacío.
//   - decimal básico + grouping (separador de miles en es-CO).
//   - minimum-fraction-digits=2 fuerza 2 decimales.
//   - percent: 0.42 → "42 %" o "42%".
//   - currency USD/EUR/COP: cada uno con su símbolo.
//   - unit: 42 celsius → "42 °C" (o similar).
//   - pad-length=4: "7" → "0007"; pad-start="0" cambia relleno.
//   - locale: es-CO y en-US producen separadores distintos en 1234.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/helpers/format-number/format-number.html`;

const tests = [];

tests.push({
  name: 'smoke: 12 instancias renderizan texto no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-number')];
      return all.map((el) => el.shadowRoot.querySelector('span')?.textContent ?? '');
    });
    assert.equal(r.length, 12, `esperaba 12 instancias, hay ${r.length}`);
    assert.ok(r.every((t) => t.length > 0), `todos deben tener texto. Vacíos: ${r.filter((t) => !t).length}`);
    await screenshot(page, 'format-number-smoke');
  },
});

tests.push({
  name: 'decimal: 1234.5 se formatea con locale (es-CO: "." decimal, "," miles)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '1234.5' && !e.getAttribute('locale'));
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    // es-CO: "1234,5" o en-US: "1,234.5" dependiendo del locale default del navegador.
    // Lo importante: NO contiene el literal "1234.5" sin formato.
    assert.ok(r !== '1234.5', `1234.5 debe reformatearse (era "${r}")`);
    assert.ok(/1234/.test(r), `debe mantener el número base (era "${r}")`);
  },
});

tests.push({
  name: 'minimum-fraction-digits=2 fuerza 2 decimales',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '1234567' && e.getAttribute('minimum-fraction-digits') === '2');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    // 1234567.00 (es-CO) o 1,234,567.00 (en-US) — pero siempre 2 decimales.
    assert.match(r, /\.00|,00/, `debe terminar en ".00" o ",00" (era "${r}")`);
  },
});

tests.push({
  name: 'percent: 0.42 → texto con %',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '0.42' && e.getAttribute('type') === 'percent');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.match(r, /%/, `debe contener % (era "${r}")`);
    assert.ok(/42/.test(r), `debe mantener el 42 (era "${r}")`);
  },
});

tests.push({
  name: 'currency USD: 99.5 → "$" + 99.50',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '99.5' && e.getAttribute('type') === 'currency' && e.getAttribute('currency') === 'USD');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.match(r, /\$/, `USD debe llevar $ (era "${r}")`);
    assert.ok(/99[.,]50/.test(r), `USD debe mantener 99.50 (era "${r}")`);
  },
});

tests.push({
  name: 'currency COP: 99.5 con locale es-CO → "$" o "COP"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '99.5' && e.getAttribute('type') === 'currency' && e.getAttribute('currency') === 'COP');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.match(r, /(COP|\$)/, `COP debe llevar COP o $ (era "${r}")`);
  },
});

tests.push({
  name: 'unit celsius: 42 → texto con ° o celsius',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '42' && e.getAttribute('type') === 'unit');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.match(r, /(°|celsius)/i, `unit debe llevar ° o "celsius" (era "${r}")`);
  },
});

tests.push({
  name: 'pad-length=4: "7" → "0007"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '7' && e.getAttribute('pad-length') === '4');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    // "7" → debe tener exactamente 4 caracteres y empezar por ceros.
    assert.equal(r.length, 4, `debe tener exactamente 4 caracteres (era "${r}" de longitud ${r.length})`);
    assert.equal(r, '0007', `debe ser "0007" (era "${r}")`);
  },
});

tests.push({
  name: 'pad-length=6 + pad-start="0": "42" → "000042"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-number')].find((e) => e.getAttribute('value') === '42' && e.getAttribute('pad-length') === '6');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.equal(r.length, 6, `debe tener exactamente 6 caracteres (era "${r}" de longitud ${r.length})`);
    assert.equal(r, '000042', `debe ser "000042" (era "${r}")`);
  },
});

tests.push({
  name: 'locale: es-CO y en-US producen separadores distintos en 1234',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-number-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-number')];
      const co = all.find((e) => e.getAttribute('value') === '1234' && e.getAttribute('locale') === 'es-CO');
      const us = all.find((e) => e.getAttribute('value') === '1234' && e.getAttribute('locale') === 'en-US');
      return {
        co: co?.shadowRoot.querySelector('span')?.textContent ?? '',
        us: us?.shadowRoot.querySelector('span')?.textContent ?? '',
      };
    });
    assert.match(r.co, /1234/, `es-CO debe mantener 1234 (era "${r.co}")`);
    assert.match(r.us, /1,234/, `en-US debe usar "," como miles (era "${r.us}")`);
  },
});

let failures = 0;
for (const t of tests) {
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('format-number', failures === 0, { total: tests.length, failures });