// date-input.test.mjs — tests exhaustivos del demo date-input.html.
// Cobertura: smoke + funcional (show/hide, value por attr y propiedad,
// selección en calendario reflejada en el campo) + accesibilidad + edge cases.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-input/date-input.html`;

const tests = [];

tests.push({
  name: 'smoke: el input monta, contiene un campo y un trigger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    const info = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('is-date-input')];
      return {
        defined: !!customElements.get('is-date-input'),
        fieldDefined: !!customElements.get('is-date-field'),
        count: inputs.length,
        firstHasField: !!inputs[0].shadowRoot.querySelector('is-date-field'),
        triggersPerInput: inputs.map((i) => i.shadowRoot.querySelectorAll('[part="trigger"]').length),
        dialogPresent: inputs.every((i) => !!i.shadowRoot.querySelector('dialog')),
      };
    });
    assert.equal(info.defined, true, 'is-date-input debe estar definido');
    assert.equal(info.fieldDefined, true, 'is-date-field debe estar definido (composición)');
    assert.ok(info.count >= 5, `esperaba >=5 inputs, hay ${info.count}`);
    assert.equal(info.firstHasField, true, 'el primer input debe contener un is-date-field');
    assert.ok(info.triggersPerInput.every((n) => n === 1), `cada input debe tener 1 trigger, hay ${JSON.stringify(info.triggersPerInput)}`);
    assert.equal(info.dialogPresent, true, 'cada input debe contener un <dialog>');
    await screenshot(page, 'date-input-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo refleja en el campo interno',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    await page.evaluate(() => { document.getElementById('basic').value = '2026-08-21'; });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const field = el.shadowRoot.querySelector('is-date-field');
      const secs = [...field.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        attr: el.getAttribute('value'),
        prop: el.value,
        fieldAttr: field.getAttribute('value'),
        sections: secs.map((s) => s.getAttribute('aria-valuenow')),
      };
    });
    assert.equal(data.attr, '2026-08-21');
    assert.equal(data.prop, '2026-08-21');
    assert.equal(data.fieldAttr, '2026-08-21', 'el campo interno debe reflejar el value');
    assert.deepEqual(data.sections, ['2026', '8', '21']);
  },
});

tests.push({
  name: 'funcional: show() abre el diálogo y expone is-date-picker dentro',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    await page.evaluate(() => { document.getElementById('demo').show(); });
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const el = document.getElementById('demo');
      const dialog = el.shadowRoot.querySelector('dialog');
      const picker = el.shadowRoot.querySelector('is-date-picker');
      return {
        open: el.open,
        dialogOpen: dialog.open,
        hasPicker: !!picker,
        grid: picker?.shadowRoot?.querySelectorAll('button.day').length ?? 0,
      };
    });
    assert.equal(info.open, true, 'la propiedad open debe ser true');
    assert.equal(info.dialogOpen, true, 'el <dialog> debe estar abierto');
    assert.equal(info.hasPicker, true, 'debe haber un is-date-picker en el panel');
    assert.ok(info.grid >= 28, `la rejilla debe tener >=28 días (puede incluir outside-days), hay ${info.grid}`);
    // Cerrar para dejar el estado limpio
    await page.evaluate(() => { document.getElementById('demo').hide(); });
  },
});

tests.push({
  name: 'funcional: is-show / is-hide emiten eventos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
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
    assert.deepEqual(events, ['show', 'hide'], 'deben emitirse is-show y luego is-hide');
  },
});

tests.push({
  name: 'funcional: trigger abre el panel al hacer click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.shadowRoot.querySelector('[part="trigger"]').click();
    });
    await page.waitForTimeout(150);
    const open = await page.evaluate(() => document.getElementById('basic').open);
    assert.equal(open, true, 'click en el trigger debe abrir el panel');
    await page.evaluate(() => document.getElementById('basic').hide());
  },
});

tests.push({
  name: 'funcional: clic en día del calendario actualiza el campo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    await page.evaluate(() => { document.getElementById('demo').show(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const el = document.getElementById('demo');
      const picker = el.shadowRoot.querySelector('is-date-picker');
      // Hacer click sobre el día 15 (no el de hoy, así podemos distinguirlo)
      const btn = [...picker.shadowRoot.querySelectorAll('button.day:not([data-outside])')]
        .find((b) => b.textContent.trim() === '15');
      btn.click();
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.getElementById('demo');
      return { value: el.value, open: el.open };
    });
    assert.match(after.value, /-\d{2}-15$/, `el valor debe terminar en -15, es ${after.value}`);
    // close-on-select por defecto en kind=date sin action-bar: el panel se cierra.
    assert.equal(after.open, false, 'tras seleccionar, el panel debe cerrarse');
  },
});

tests.push({
  name: 'accesibilidad: trigger tiene aria-haspopup y aria-expanded',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const trigger = el.shadowRoot.querySelector('[part="trigger"]');
      return {
        hasPopup: trigger.getAttribute('aria-haspopup'),
        expanded: trigger.getAttribute('aria-expanded'),
        label: trigger.getAttribute('aria-label'),
      };
    });
    assert.equal(info.hasPopup, 'dialog', 'aria-haspopup debe ser "dialog"');
    assert.equal(info.expanded, 'false', 'aria-expanded debe iniciar en "false"');
    assert.equal(info.label, 'Abrir selector', 'el trigger debe tener aria-label');
  },
});

tests.push({
  name: 'accesibilidad: label y hint se exponen dentro del shadow',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('required');
      const label = el.shadowRoot.querySelector('is-date-field').shadowRoot.querySelector('[part="label"]');
      const hint = el.shadowRoot.querySelector('is-date-field').shadowRoot.querySelector('[part="hint"]');
      return {
        labelText: label.textContent.trim(),
        hintText: hint.textContent.trim(),
      };
    });
    assert.equal(info.labelText, 'Fecha de firma', 'label debe propagarse al campo interno');
    assert.equal(info.hintText, 'Obligatorio', 'hint debe propagarse al campo interno');
  },
});

tests.push({
  name: 'edge: requerido sin valor reporta invalidez',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('required');
      return {
        required: el.hasAttribute('required'),
        valid: el.checkValidity(),
      };
    });
    assert.equal(info.required, true);
    assert.equal(info.valid, false, 'un campo required sin valor debe fallar checkValidity');
  },
});

tests.push({
  name: 'edge: deshabilitado no permite abrir el panel',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    await page.evaluate(() => { document.getElementById('disabled').show(); });
    await page.waitForTimeout(100);
    const open = await page.evaluate(() => document.getElementById('disabled').open);
    assert.equal(open, false, 'show() sobre un input disabled debe ser no-op');
  },
});

tests.push({
  name: 'edge: min/max se propagan al campo y al calendario',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-input-ready');
    await page.evaluate(() => { document.getElementById('ranged').show(); });
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const el = document.getElementById('ranged');
      const field = el.shadowRoot.querySelector('is-date-field');
      const picker = el.shadowRoot.querySelector('is-date-picker');
      return {
        fieldMin: field.getAttribute('min'),
        fieldMax: field.getAttribute('max'),
        pickerMin: picker.getAttribute('min'),
        pickerMax: picker.getAttribute('max'),
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

report('date-input', failures === 0, { total: tests.length, failures });