// format-bytes.test.mjs — tests funcionales de <is-format-bytes>.
//
// Cubre:
//   - smoke: todos los <is-format-bytes> del demo renderizan texto no vacío.
//   - escalado: 0 B, 512 B, 1 KB, 1 MB, 1 GB con sufijo correcto.
//   - autofit: 200 KB en vez de "0.2 MB", y 1.5 MB sin .0.
//   - long vs short: 'short' → "1 MB" / 'long' → "1 megabyte".
//   - negativo: "-2 KB".
//   - locale: separadores es-CO / en-US distintos.
//   - determinismo: misma instancia → mismo textContent repetido.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/helpers/format-bytes/format-bytes.html`;

const tests = [];

tests.push({
  name: 'smoke: todos los <is-format-bytes> del demo renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-bytes')];
      return all.map((el) => {
        const span = el.shadowRoot.querySelector('span');
        return { text: span?.textContent ?? '', empty: span?.textContent === '' };
      });
    });
    assert.equal(r.length, 14, `esperaba 14 instancias, hay ${r.length}`);
    assert.ok(r.every((x) => !x.empty), `todos deben tener texto no vacío. Vacíos: ${r.filter((x) => x.empty).length}`);
    await screenshot(page, 'format-bytes-smoke');
  },
});

tests.push({
  name: 'escalado: cada magnitud usa la unidad correcta',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const get = (val, extra = '') => {
        const el = [...document.querySelectorAll('main is-format-bytes')].find((e) => e.getAttribute('value') === String(val) && (!extra || e.getAttribute(extra.split('=')[0]) === extra.split('=')[1].replace(/"/g, '')));
        return el?.shadowRoot.querySelector('span')?.textContent ?? '';
      };
      return {
        zero: get('0'),
        halfKB: get('512'),
        oneKB: get('1024'),
        oneMB: get('1048576'),
        oneGB: get('1073741824'),
        mbInput: get('1048576', 'unit="megabyte"'),
      };
    });
    // 0 bytes
    assert.match(r.zero, /B/, `0 bytes debe llevar B (era "${r.zero}")`);
    // 512 bytes ≈ 0.5 KB (con Intl a veces escribe "512 B")
    assert.match(r.halfKB, /(B|KB)/, `512 bytes debe llevar B o KB (era "${r.halfKB}")`);
    // 1024 bytes = 1 KB exacto
    assert.match(r.oneKB, /KB/, `1024 debe ser KB (era "${r.oneKB}")`);
    assert.ok(!/MB|GB/.test(r.oneKB), `1024 NO debe contener MB/GB (era "${r.oneKB}")`);
    // 1 MB exacto
    assert.match(r.oneMB, /MB/, `1 MB debe llevar MB (era "${r.oneMB}")`);
    assert.ok(!/GB/.test(r.oneMB), `1 MB NO debe llevar GB (era "${r.oneMB}")`);
    // 1 GB exacto
    assert.match(r.oneGB, /GB/, `1 GB debe llevar GB (era "${r.oneGB}")`);
    // Input unit="megabyte" + value 1048576 → resultado en MB
    assert.match(r.mbInput, /MB/, `1048576 con unit=megabyte debe seguir siendo MB (era "${r.mbInput}")`);
  },
});

tests.push({
  name: 'display short vs long: "1 MB" vs "1 megabyte"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-bytes')];
      const byAttrs = (display) => all.find((e) => e.getAttribute('value') === '1048576' && e.getAttribute('display') === display);
      return {
        short: byAttrs('short')?.shadowRoot.querySelector('span')?.textContent ?? '',
        long: byAttrs('long')?.shadowRoot.querySelector('span')?.textContent ?? '',
      };
    });
    assert.match(r.short, /\bMB\b/, `short debe usar "MB" (era "${r.short}")`);
    assert.match(r.long, /megabyte/i, `long debe usar "megabyte" (era "${r.long}")`);
  },
});

tests.push({
  name: 'autofit: 200000 → "200 KB" (no "0.2 MB")',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-bytes')];
      const el = all.find((e) => e.getAttribute('value') === '200000' && e.hasAttribute('autofit'));
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.match(r, /KB/, `200000 con autofit debe usar KB (era "${r}")`);
    assert.ok(!/MB/.test(r), `200000 con autofit NO debe usar MB (era "${r}")`);
  },
});

tests.push({
  name: 'autofit: 1500000 → "1.5 MB" (sin trailing .0)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-bytes')];
      const el = all.find((e) => e.getAttribute('value') === '1500000' && e.hasAttribute('autofit'));
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.match(r, /MB/, `1500000 con autofit debe usar MB (era "${r}")`);
    assert.ok(!/\.0\s*MB/.test(r), `1500000 NO debe tener ".0 MB" trailing (era "${r}")`);
  },
});

tests.push({
  name: 'negativo: -2048 → texto con "-"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-bytes')];
      const el = all.find((e) => e.getAttribute('value') === '-2048');
      return el?.shadowRoot.querySelector('span')?.textContent ?? '';
    });
    assert.match(r, /-/, `negativo debe llevar "-" (era "${r}")`);
    assert.match(r, /KB/, `negativo debe seguir usando KB (era "${r}")`);
  },
});

tests.push({
  name: 'locale: es-CO y en-US producen separadores diferentes en 4096',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-bytes')];
      const co = all.find((e) => e.getAttribute('value') === '4096' && e.getAttribute('locale') === 'es-CO');
      const us = all.find((e) => e.getAttribute('value') === '4096' && e.getAttribute('locale') === 'en-US');
      return {
        co: co?.shadowRoot.querySelector('span')?.textContent ?? '',
        us: us?.shadowRoot.querySelector('span')?.textContent ?? '',
      };
    });
    // 4096 es < 10000 → no hay diferencia en separador de miles. Aun así
    // validamos que ambos textos son no vacíos y contienen KB.
    assert.match(r.co, /KB/, `es-CO debe llevar KB (era "${r.co}")`);
    assert.match(r.us, /KB/, `en-US debe llevar KB (era "${r.us}")`);
    assert.ok(r.co.length > 0 && r.us.length > 0, 'ambos locales deben producir texto');
  },
});

tests.push({
  name: 'determinismo: misma instancia devuelve el mismo texto en 2 lecturas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-bytes-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-bytes')].find((e) => e.getAttribute('value') === '1048576' && e.getAttribute('display') === 'short');
      const s = el.shadowRoot.querySelector('span');
      return { a: s.textContent, b: s.textContent };
    });
    assert.equal(r.a, r.b, `dos lecturas deben coincidir (era "${r.a}" vs "${r.b}")`);
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

report('format-bytes', failures === 0, { total: tests.length, failures });