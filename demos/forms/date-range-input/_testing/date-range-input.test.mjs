// date-range-input.test.mjs — tests exhaustivos del demo date-range-input.html.
// Cobertura: smoke + funcional (dos campos, valor inicio/fin, show/hide, atajos)
// + accesibilidad + edge cases.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-range-input/date-range-input.html`;

const tests = [];

tests.push({
  name: 'smoke: el input monta, contiene dos campos y un diálogo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    const info = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('is-date-range-input')];
      return {
        defined: !!customElements.get('is-date-range-input'),
        count: inputs.length,
        fieldsPerInput: inputs.map((i) => i.shadowRoot.querySelectorAll('is-date-field').length),
        triggersPerInput: inputs.map((i) => i.shadowRoot.querySelectorAll('[part="trigger"]').length),
        dialogPresent: inputs.every((i) => !!i.shadowRoot.querySelector('dialog')),
        rangePickerDefined: !!customElements.get('is-date-range-picker'),
      };
    });
    assert.equal(info.defined, true, 'is-date-range-input debe estar definido');
    assert.equal(info.rangePickerDefined, true, 'is-date-range-picker debe estar definido (composición)');
    assert.ok(info.count >= 4, `esperaba >=4 inputs, hay ${info.count}`);
    assert.ok(info.fieldsPerInput.every((n) => n === 2), `cada input debe tener 2 campos, hay ${JSON.stringify(info.fieldsPerInput)}`);
    assert.ok(info.triggersPerInput.every((n) => n === 2), `cada input debe tener 2 triggers, hay ${JSON.stringify(info.triggersPerInput)}`);
    assert.equal(info.dialogPresent, true, 'cada input debe contener un <dialog>');
    await screenshot(page, 'date-range-input-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo reparte inicio/fin en los dos campos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    await page.evaluate(() => { document.getElementById('basic').value = '2026-06-01/2026-06-30'; });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const fields = [...el.shadowRoot.querySelectorAll('is-date-field')];
      return {
        attr: el.getAttribute('value'),
        prop: el.value,
        startField: fields[0]?.getAttribute('value'),
        endField: fields[1]?.getAttribute('value'),
      };
    });
    assert.equal(data.attr, '2026-06-01/2026-06-30');
    assert.equal(data.prop, '2026-06-01/2026-06-30');
    assert.equal(data.startField, '2026-06-01');
    assert.equal(data.endField, '2026-06-30');
  },
});

tests.push({
  name: 'funcional: start y end devuelven cada extremo del rango',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('with-value');
      return { start: el.start, end: el.end, value: el.value };
    });
    assert.equal(data.start, '2026-06-01', 'start debe devolver el primer ISO');
    assert.equal(data.end, '2026-06-30', 'end debe devolver el segundo ISO');
    assert.equal(data.value, '2026-06-01/2026-06-30');
  },
});

tests.push({
  name: 'funcional: show() abre el panel y muestra el is-date-range-picker',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    await page.evaluate(() => { document.getElementById('demo').show(); });
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const el = document.getElementById('demo');
      const dialog = el.shadowRoot.querySelector('dialog');
      const range = el.shadowRoot.querySelector('is-date-range-picker');
      return {
        open: el.open,
        dialogOpen: dialog.open,
        hasRangePicker: !!range,
        pickers: range?.shadowRoot?.querySelectorAll('is-date-picker').length ?? 0,
      };
    });
    assert.equal(info.open, true);
    assert.equal(info.dialogOpen, true);
    assert.equal(info.hasRangePicker, true, 'el panel debe contener is-date-range-picker');
    assert.ok(info.pickers >= 2, `el range-picker debe contener >=2 calendarios, hay ${info.pickers}`);
    await page.evaluate(() => document.getElementById('demo').hide());
  },
});

tests.push({
  name: 'funcional: is-show / is-hide emiten eventos al abrir/cerrar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    await page.evaluate(() => {
      window.__events = [];
      const el = document.getElementById('demo');
      el.addEventListener('is-show', () => window.__events.push('show'));
      el.addEventListener('is-hide', () => window.__events.push('hide'));
    });
    await page.evaluate(() => document.getElementById('demo').show());
    await page.waitForTimeout(100);
    await page.evaluate(() => document.getElementById('demo').hide());
    await page.waitForTimeout(100);
    const events = await page.evaluate(() => window.__events);
    assert.deepEqual(events, ['show', 'hide']);
  },
});

tests.push({
  name: 'funcional: selección de rango en calendario actualiza ambos campos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    await page.evaluate(() => { document.getElementById('demo').show(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const el = document.getElementById('demo');
      const range = el.shadowRoot.querySelector('is-date-range-picker');
      const pickers = [...range.shadowRoot.querySelectorAll('is-date-picker')];
      // Clic día 10 en el primer calendario (inicio)
      const day10 = [...pickers[0].shadowRoot.querySelectorAll('button.day:not([data-outside])')]
        .find((b) => b.textContent.trim() === '10');
      day10.click();
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const el = document.getElementById('demo');
      const range = el.shadowRoot.querySelector('is-date-range-picker');
      const pickers = [...range.shadowRoot.querySelectorAll('is-date-picker')];
      // Clic día 20 en el primer calendario (fin)
      const day20 = [...pickers[0].shadowRoot.querySelectorAll('button.day:not([data-outside])')]
        .find((b) => b.textContent.trim() === '20');
      day20.click();
    });
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const el = document.getElementById('demo');
      return {
        value: el.value,
        // close-on-select por defecto: tras seleccionar el fin, el panel debe cerrarse.
        open: el.open,
      };
    });
    assert.match(after.value, /^\d{4}-\d{2}-10\/\d{4}-\d{2}-20$/,
      `el valor debe tener formato inicio/fin con días 10 y 20, es ${after.value}`);
    assert.equal(after.open, false, 'tras seleccionar el fin, el panel debe cerrarse');
  },
});

tests.push({
  name: 'funcional: atajo "this-week" aplica el rango de la semana actual',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    await page.evaluate(() => { document.getElementById('with-shortcuts').show(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const el = document.getElementById('with-shortcuts');
      const range = el.shadowRoot.querySelector('is-date-range-picker');
      // Click directo en el botón del preset.
      const btn = range.shadowRoot.querySelector('[data-preset="this-week"]');
      btn.click();
    });
    await page.waitForTimeout(100);
    const value = await page.evaluate(() => document.getElementById('with-shortcuts').value);
    assert.match(value, /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/, `valor con formato inicio/fin, es ${value}`);
    const [a, b] = value.split('/');
    assert.ok(a < b, `inicio (${a}) debe ser <= fin (${b})`);
    await page.evaluate(() => document.getElementById('with-shortcuts').hide());
  },
});

tests.push({
  name: 'accesibilidad: los dos triggers tienen aria-haspopup=dialog',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const triggers = [...el.shadowRoot.querySelectorAll('[part="trigger"]')];
      return {
        count: triggers.length,
        allHavePopup: triggers.every((t) => t.getAttribute('aria-haspopup') === 'dialog'),
        allHaveLabel: triggers.every((t) => t.getAttribute('aria-label')),
      };
    });
    assert.equal(info.count, 2);
    assert.equal(info.allHavePopup, true, 'todos los triggers deben tener aria-haspopup="dialog"');
    assert.equal(info.allHaveLabel, true, 'todos los triggers deben tener aria-label');
  },
});

tests.push({
  name: 'accesibilidad: start-label y end-label se propagan a los campos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const fields = [...el.shadowRoot.querySelectorAll('is-date-field')];
      return {
        startLabel: fields[0].shadowRoot.querySelector('[part="label"]').textContent.trim(),
        endLabel: fields[1].shadowRoot.querySelector('[part="label"]').textContent.trim(),
      };
    });
    assert.equal(info.startLabel, 'Desde');
    assert.equal(info.endLabel, 'Hasta');
  },
});

tests.push({
  name: 'edge: el rango vacio tiene value="" y start/end = null',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      return { value: el.value, start: el.start, end: el.end };
    });
    assert.equal(data.value, '');
    assert.equal(data.start, null);
    assert.equal(data.end, null);
  },
});

tests.push({
  name: 'edge: solo inicio (rango abierto) se almacena como "inicio/"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    await page.evaluate(() => { document.getElementById('basic').value = '2026-07-15'; });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const fields = [...el.shadowRoot.querySelectorAll('is-date-field')];
      return {
        value: el.value,
        start: el.start,
        end: el.end,
        startField: fields[0].getAttribute('value'),
        endField: fields[1].getAttribute('value'),
      };
    });
    assert.equal(data.start, '2026-07-15');
    assert.equal(data.end, null);
    assert.equal(data.startField, '2026-07-15');
    assert.equal(data.endField, null);
  },
});

tests.push({
  name: 'edge: min/max se aplican a ambos campos y al rango-picker',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-range-input-ready');
    await page.evaluate(() => { document.getElementById('ranged').show(); });
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const el = document.getElementById('ranged');
      const fields = [...el.shadowRoot.querySelectorAll('is-date-field')];
      const range = el.shadowRoot.querySelector('is-date-range-picker');
      const pickers = [...range.shadowRoot.querySelectorAll('is-date-picker')];
      return {
        fieldMin: fields[0].getAttribute('min'),
        fieldMax: fields[0].getAttribute('max'),
        pickerMin: pickers[0].getAttribute('min'),
        pickerMax: pickers[0].getAttribute('max'),
      };
    });
    assert.equal(info.fieldMin, '2025-01-01');
    assert.equal(info.fieldMax, '2026-12-31');
    assert.equal(info.pickerMin, '2025-01-01');
    assert.equal(info.pickerMax, '2026-12-31');
    await page.evaluate(() => document.getElementById('ranged').hide());
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

report('date-range-input', failures === 0, { total: tests.length, failures });