// format-date.test.mjs — tests funcionales de <is-format-date>.
//
// Cubre:
//   - smoke: renderiza todas las fechas del demo.
//   - weekday: weekday=long añade el nombre del día.
//   - hour-format=24 vs 12: el primero NO debe contener "AM"/"PM".
//   - hour-format=12: el texto debe contener "AM" o "PM".
//   - locale es-CO y en-US producen textos distintos (el día en-US es "August 15",
//     es-CO es "15 de agosto de 2026" — depende de browser).
//   - timestamp numérico: acepta timestamp en ms.
//   - fecha inválida → textContent vacío.
//   - atributo datetime del <time> queda con ISO string.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/helpers/format-date/format-date.html`;

const tests = [];

tests.push({
  name: 'smoke: todas las filas renderizan <time> no vacío (excepto inválida)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-date')];
      return all.map((el, i) => {
        const t = el.shadowRoot.querySelector('time');
        return { i, date: el.getAttribute('date'), text: t?.textContent ?? '', dt: t?.getAttribute('datetime') ?? '' };
      });
    });
    assert.equal(r.length, 11, `esperaba 11 instancias, hay ${r.length}`);
    // 10 válidas + 1 inválida vacía
    const validas = r.filter((x) => x.date !== 'no-válida');
    const invalida = r.find((x) => x.date === 'no-válida');
    assert.ok(validas.every((x) => x.text.length > 0), `todas las válidas deben tener texto. Vacías: ${validas.filter((x) => x.text.length === 0).map((x) => x.i)}`);
    assert.equal(invalida.text, '', `fecha inválida debe tener texto vacío (era "${invalida.text}")`);
    await screenshot(page, 'format-date-smoke');
  },
});

tests.push({
  name: 'weekday: weekday=long añade el nombre del día (en-US tiene "Saturday" o similar)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-date')].find((e) => e.getAttribute('weekday') === 'long');
      return el?.shadowRoot.querySelector('time')?.textContent ?? '';
    });
    // Espera un día de la semana en minúscula (lunes, martes…) o formato largo
    assert.match(r, /sábado|sabado|saturday|viernes|domingo|lunes|martes|miércoles|miercoles|jueves|sábado|sabado|saturday|friday|sunday|monday|tuesday|wednesday|thursday/i, `weekday=long debe incluir nombre del día (era "${r}")`);
  },
});

tests.push({
  name: 'hour-format=24: NO contiene AM/PM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-date')].find((e) => e.getAttribute('hour-format') === '24');
      return el?.shadowRoot.querySelector('time')?.textContent ?? '';
    });
    assert.ok(!/(AM|PM|am|pm)/.test(r), `hour-format=24 NO debe contener AM/PM (era "${r}")`);
    assert.match(r, /14|2/, `hour-format=24 debe mostrar la hora en formato 24h (era "${r}")`);
  },
});

tests.push({
  name: 'hour-format=12: contiene AM o PM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-date')].find((e) => e.getAttribute('hour-format') === '12');
      return el?.shadowRoot.querySelector('time')?.textContent ?? '';
    });
    assert.match(r, /(AM|PM|am|pm|a\.\s*m\.|p\.\s*m\.)/, `hour-format=12 debe contener AM/PM (era "${r}")`);
  },
});

tests.push({
  name: 'locale: es-CO y en-US producen textos diferentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-format-date')];
      const co = all.find((e) => e.getAttribute('locale') === 'es-CO' && e.getAttribute('date') === '2026-08-15');
      const us = all.find((e) => e.getAttribute('locale') === 'en-US' && e.getAttribute('date') === '2026-08-15');
      return {
        co: co?.shadowRoot.querySelector('time')?.textContent ?? '',
        us: us?.shadowRoot.querySelector('time')?.textContent ?? '',
      };
    });
    assert.ok(r.co.length > 0 && r.us.length > 0, `ambos locales deben producir texto (es-CO: "${r.co}", en-US: "${r.us}")`);
    assert.notEqual(r.co, r.us, `es-CO y en-US deben ser textos distintos (ambos: "${r.co}")`);
  },
});

tests.push({
  name: 'timestamp numérico: 1752864000000 → fecha válida',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-date')].find((e) => e.getAttribute('date') === '1752864000000');
      const t = el?.shadowRoot.querySelector('time');
      return { text: t?.textContent ?? '', dt: t?.getAttribute('datetime') ?? '' };
    });
    assert.ok(r.text.length > 0, `timestamp debe renderizarse (era "${r.text}")`);
    assert.match(r.dt, /^2025-07-19/, `datetime ISO debe empezar por 2025-07-19 (era "${r.dt}")`);
  },
});

tests.push({
  name: 'fecha inválida: textContent vacío y datetime ausente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-date')].find((e) => e.getAttribute('date') === 'no-válida');
      const t = el?.shadowRoot.querySelector('time');
      return { text: t?.textContent ?? '', dt: t?.getAttribute('datetime') };
    });
    assert.equal(r.text, '', `texto debe ser vacío (era "${r.text}")`);
    assert.equal(r.dt, null, `datetime debe estar ausente (era "${r.dt}")`);
  },
});

tests.push({
  name: 'fecha válida: atributo datetime del <time> es ISO 8601',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-format-date-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-format-date')].find((e) => e.getAttribute('date') === '2026-08-15');
      const t = el?.shadowRoot.querySelector('time');
      return t?.getAttribute('datetime') ?? '';
    });
    assert.match(r, /^2026-08-15T/, `datetime debe ser ISO 8601 empezando por 2026-08-15T (era "${r}")`);
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

report('format-date', failures === 0, { total: tests.length, failures });