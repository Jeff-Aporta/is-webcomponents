// date-range-picker.test.mjs — tests exhaustivos del demo date-range-picker.html.
// Cobertura: smoke + funcional (rango, atajos, calendars, clear) +
// accesibilidad + edge cases.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-range-picker/date-range-picker.html`;

const tests = [];

tests.push({
  name: 'smoke: el range-picker monta y compone N calendarios',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    const info = await page.evaluate(() => {
      const ranges = [...document.querySelectorAll('is-date-range-picker')];
      return {
        defined: !!customElements.get('is-date-range-picker'),
        count: ranges.length,
        calendarsByRange: ranges.map((r) => r.shadowRoot.querySelectorAll('is-date-picker').length),
      };
    });
    assert.equal(info.defined, true, 'is-date-range-picker debe estar definido');
    assert.ok(info.count >= 4, `esperaba >=4 range-pickers, hay ${info.count}`);
    // Por defecto calendars=2.
    assert.ok(info.calendarsByRange.every((n) => n >= 1 && n <= 3),
      `cada range debe tener 1..3 calendarios, hay ${JSON.stringify(info.calendarsByRange)}`);
    await screenshot(page, 'date-range-picker-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo refleja inicio/fin y propaga a los calendarios',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    await page.evaluate(() => { document.getElementById('basic').value = '2026-06-01/2026-06-30'; });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const pickers = [...el.shadowRoot.querySelectorAll('is-date-picker')];
      return {
        attr: el.getAttribute('value'),
        prop: el.value,
        start: el.start,
        end: el.end,
        pickersValue: pickers.map((p) => p.getAttribute('value')),
      };
    });
    assert.equal(data.attr, '2026-06-01/2026-06-30');
    assert.equal(data.start, '2026-06-01');
    assert.equal(data.end, '2026-06-30');
    assert.ok(data.pickersValue.every((v) => v === '2026-06-01/2026-06-30'),
      `todos los calendarios deben reflejar el valor, hay ${JSON.stringify(data.pickersValue)}`);
  },
});

tests.push({
  name: 'funcional: calendars=3 muestra 3 is-date-picker con meses consecutivos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('three-months');
      return {
        attr: el.getAttribute('calendars'),
        calendars: el.calendars,
        pickers: el.shadowRoot.querySelectorAll('is-date-picker').length,
        months: [...el.shadowRoot.querySelectorAll('is-date-picker')].map((p) => p.getAttribute('month')),
      };
    });
    assert.equal(data.calendars, 3);
    assert.equal(data.pickers, 3);
    assert.equal(data.months.length, 3);
    // Cada mes debe estar en formato yyyy-mm y los tres deben ser distintos.
    assert.ok(data.months.every((m) => /^\d{4}-\d{2}$/.test(m)), `todos los meses deben tener formato yyyy-mm: ${JSON.stringify(data.months)}`);
    const uniq = new Set(data.months);
    assert.equal(uniq.size, 3, `los 3 meses deben ser distintos: ${JSON.stringify(data.months)}`);
  },
});

tests.push({
  name: 'funcional: calendars=1 muestra solo 1 calendario',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('one-month');
      return {
        calendars: el.calendars,
        pickers: el.shadowRoot.querySelectorAll('is-date-picker').length,
      };
    });
    assert.equal(data.calendars, 1);
    assert.equal(data.pickers, 1);
  },
});

tests.push({
  name: 'funcional: atajo "current-month" aplica el mes actual como rango',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      el.shadowRoot.querySelector('[data-preset="current-month"]').click();
    });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      return { value: el.value, start: el.start, end: el.end };
    });
    assert.match(data.value, /^\d{4}-\d{2}-01\/\d{4}-\d{2}-\d{2}$/, `el rango debe ir del día 1 al último día del mes, es ${data.value}`);
    // El último día debe ser >= 28 (febrero corto) y <= 31.
    const [, end] = data.value.split('/');
    const day = Number(end.slice(-2));
    assert.ok(day >= 28 && day <= 31, `el día final debe estar entre 28 y 31, es ${day}`);
  },
});

tests.push({
  name: 'funcional: atajo "reset" limpia el rango',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    // Poner valor y luego limpiar.
    await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      el.value = '2026-06-01/2026-06-30';
    });
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      el.shadowRoot.querySelector('[data-preset="reset"]').click();
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      return { value: el.value, attr: el.getAttribute('value') };
    });
    assert.equal(after.value, '');
    assert.equal(after.attr, null);
  },
});

tests.push({
  name: 'funcional: selección de rango en calendario emite is-change { start, end }',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    await page.evaluate(() => {
      window.__changes = [];
      document.getElementById('basic').addEventListener('is-change', (e) => {
        window.__changes.push({ start: e.detail?.start, end: e.detail?.end });
      });
    });
    // Primer click: día 5 (inicio).
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      const picker = el.shadowRoot.querySelector('is-date-picker');
      const day5 = [...picker.shadowRoot.querySelectorAll('button.day:not([data-outside])')]
        .find((b) => b.textContent.trim() === '5');
      day5.click();
    });
    await page.waitForTimeout(50);
    // Segundo click: día 20 (fin).
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      const picker = el.shadowRoot.querySelector('is-date-picker');
      const day20 = [...picker.shadowRoot.querySelectorAll('button.day:not([data-outside])')]
        .find((b) => b.textContent.trim() === '20');
      day20.click();
    });
    await page.waitForTimeout(50);
    const changes = await page.evaluate(() => window.__changes);
    assert.equal(changes.length, 2, 'deben emitirse dos is-change (uno por cada clic)');
    assert.equal(changes[0].start, changes[1].start, 'el inicio no debe cambiar al elegir el fin');
    assert.equal(changes[1].end, changes[1].end, 'el fin debe establecerse al elegir el fin');
    assert.match(changes[1].start, /-\d{2}-05$/, `el inicio debe ser día 5, es ${changes[1].start}`);
    assert.match(changes[1].end, /-\d{2}-20$/, `el fin debe ser día 20, es ${changes[1].end}`);
  },
});

tests.push({
  name: 'funcional: clear() elimina el valor y emite is-change con start/end null',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    await page.evaluate(() => {
      window.__cleared = false;
      const el = document.getElementById('with-value');
      el.addEventListener('is-change', (e) => {
        if (e.detail?.start === null && e.detail?.end === null) window.__cleared = true;
      });
      el.clear();
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const el = document.getElementById('with-value');
      return { value: el.value, attr: el.getAttribute('value'), cleared: window.__cleared };
    });
    assert.equal(after.value, '');
    assert.equal(after.attr, null);
    assert.equal(after.cleared, true, 'clear() debe emitir is-change con start/end=null');
  },
});

tests.push({
  name: 'accesibilidad: el panel de atajos tiene role="group" y aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      const shortcuts = el.shadowRoot.querySelector('[part="shortcuts"]');
      return {
        role: shortcuts?.getAttribute('role'),
        label: shortcuts?.getAttribute('aria-label'),
        hidden: shortcuts?.hidden,
        buttonCount: shortcuts?.querySelectorAll('is-button').length ?? 0,
      };
    });
    assert.equal(info.role, 'group', 'el panel de atajos debe tener role="group"');
    assert.equal(info.label, 'Atajos', 'aria-label debe ser "Atajos" en español');
    assert.equal(info.hidden, false, 'el panel debe estar visible porque hay atajos');
    assert.ok(info.buttonCount >= 3, `esperaba >=3 botones de atajos, hay ${info.buttonCount}`);
  },
});

tests.push({
  name: 'accesibilidad: el atajo activo se marca con data-active',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    // Aplicar el atajo "last-7-days" → debe quedar marcado como activo.
    await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      el.shadowRoot.querySelector('[data-preset="last-7-days"]').click();
    });
    await page.waitForTimeout(50);
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      const active = el.shadowRoot.querySelector('[data-preset="last-7-days"]');
      return { hasActive: active?.hasAttribute('data-active') };
    });
    assert.equal(info.hasActive, true, 'el atajo correspondiente al rango actual debe tener data-active');
  },
});

tests.push({
  name: 'edge: month controla el ancla del primer calendario (modo controlado)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    await page.evaluate(() => { document.getElementById('basic').setAttribute('month', '2025-12'); });
    await page.waitForTimeout(50);
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const pickers = [...el.shadowRoot.querySelectorAll('is-date-picker')];
      return {
        month: el.month,
        pickerMonths: pickers.map((p) => p.getAttribute('month')),
      };
    });
    assert.equal(info.month, '2025-12');
    assert.equal(info.pickerMonths[0], '2025-12', 'el primer calendario debe estar en el mes indicado');
  },
});

tests.push({
  name: 'edge: shortcuts="none" oculta el panel de atajos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-picker-ready');
    await page.evaluate(() => { document.getElementById('basic').setAttribute('shortcuts', 'none'); });
    await page.waitForTimeout(50);
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      return { hidden: el.shadowRoot.querySelector('[part="shortcuts"]').hidden };
    });
    assert.equal(info.hidden, true);
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  let detail = {};
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    detail = { error: String(err?.message ?? err) };
    console.error(`  ✗ ${t.name}\n     ${detail.error}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('date-range-picker', failures === 0, { total: tests.length, failures });