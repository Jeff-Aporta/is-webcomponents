// date-field.test.mjs — tests exhaustivos del demo date-field.html.
// Cobertura: smoke + funcional (secciones spinbutton, valor inicial,
// setting via API, min/max) + accesibilidad + edge cases (vacío, inválido).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-field/date-field.html`;

const tests = [];

tests.push({
  name: 'smoke: el campo se monta y los spinbutton de secciones renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    const info = await page.evaluate(() => {
      const fields = [...document.querySelectorAll('is-date-field')];
      return {
        count: fields.length,
        defined: !!customElements.get('is-date-field'),
        sectionsByField: fields.map((f) => f.shadowRoot.querySelectorAll('[role="spinbutton"]').length),
        hasFormAssociated: 'formAssociated' in fields[0],
        sectionsHaveAriaValue: fields.every((f) => {
          const secs = f.shadowRoot.querySelectorAll('[role="spinbutton"]');
          return [...secs].every((s) => s.hasAttribute('aria-valuenow'));
        }),
      };
    });
    assert.equal(info.defined, true, 'is-date-field debe estar definido');
    assert.ok(info.count >= 5, `esperaba >=5 campos en la página, hay ${info.count}`);
    assert.ok(info.sectionsByField.every((n) => n >= 3),
      `cada campo debe tener >=3 secciones (y/m/d), hay ${JSON.stringify(info.sectionsByField)}`);
    assert.equal(info.hasFormAssociated, true, 'el campo debe ser form-associated');
    assert.equal(info.sectionsHaveAriaValue, true, 'todas las secciones deben exponer aria-valuenow');
    await screenshot(page, 'date-field-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo refleja en shadow DOM y en el host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.setAttribute('value', '2026-08-21');
    });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        attr: el.getAttribute('value'),
        prop: el.value,
        sectionValues: secs.map((s) => ({
          label: s.getAttribute('aria-label'),
          now: s.getAttribute('aria-valuenow'),
          text: s.textContent.replace(/\s+/g, '').trim(),
        })),
      };
    });
    assert.equal(data.attr, '2026-08-21', 'value debe reflejarse en el atributo');
    assert.equal(data.prop, '2026-08-21', 'value debe reflejarse en la propiedad');
    // y/m/d → 2026 / 08 / 21
    assert.equal(data.sectionValues.length, 3, 'debe haber 3 secciones');
    assert.equal(data.sectionValues[0].now, '2026', 'sección año = 2026');
    assert.equal(data.sectionValues[1].now, '8', 'sección mes = 8');
    assert.equal(data.sectionValues[2].now, '21', 'sección día = 21');
  },
});

tests.push({
  name: 'funcional: setear value por propiedad también refleja en el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.value = '2027-02-09';
    });
    await page.waitForTimeout(50);
    const data = await page.evaluate(() => {
      const el = document.getElementById('basic');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        attr: el.getAttribute('value'),
        sections: secs.map((s) => s.getAttribute('aria-valuenow')),
      };
    });
    assert.equal(data.attr, '2027-02-09');
    assert.deepEqual(data.sections, ['2027', '2', '9']);
  },
});

tests.push({
  name: 'funcional: is-change emite evento al cambiar valor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    // Suscribirse ANTES de cambiar el valor.
    await page.evaluate(() => {
      window.__changes = [];
      document.getElementById('basic').addEventListener('is-change', (e) => {
        window.__changes.push(e.detail?.value ?? '');
      });
    });
    await page.evaluate(() => { document.getElementById('basic').value = '2026-01-15'; });
    await page.waitForTimeout(50);
    const changes = await page.evaluate(() => window.__changes);
    assert.deepEqual(changes, ['2026-01-15'], 'is-change debe emitir el nuevo valor');
  },
});

tests.push({
  name: 'funcional: spinbutton de día tiene min/max del componente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    await page.evaluate(() => { document.getElementById('with-hint').value = '2026-06-15'; });
    await page.waitForTimeout(50);
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-hint');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return secs.map((s) => ({
        label: s.getAttribute('aria-label'),
        min: s.getAttribute('aria-valuemin'),
        max: s.getAttribute('aria-valuemax'),
        now: s.getAttribute('aria-valuenow'),
      }));
    });
    // Esperado: año [1..9999], mes [1..12], día [1..31]
    assert.equal(info[0].min, '1');
    assert.equal(info[0].max, '9999');
    assert.equal(info[1].min, '1');
    assert.equal(info[1].max, '12');
    assert.equal(info[2].min, '1');
    assert.equal(info[2].max, '31');
    assert.equal(info[0].now, '2026');
    assert.equal(info[1].now, '6');
    assert.equal(info[2].now, '15');
  },
});

tests.push({
  name: 'accesibilidad: spinbuttons tienen aria-label, role y aria-readonly',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    await page.evaluate(() => { document.getElementById('readonly-field').value = '2026-12-31'; });
    await page.waitForTimeout(50);
    const info = await page.evaluate(() => {
      const el = document.getElementById('readonly-field');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        allSpinbuttons: secs.length,
        labels: secs.map((s) => s.getAttribute('aria-label')),
        readonly: secs.every((s) => s.getAttribute('aria-readonly') === 'true'),
        tabIndex: secs.every((s) => s.tabIndex === -1 || s.getAttribute('aria-readonly') === 'true'),
      };
    });
    assert.equal(info.allSpinbuttons, 3, 'debe haber 3 spinbutton');
    assert.ok(info.labels.every(Boolean), 'todos los spinbutton deben tener aria-label');
    assert.ok(info.labels.some((l) => /año|year/i.test(l)), 'debe haber un aria-label de año');
    assert.ok(info.labels.some((l) => /mes|month/i.test(l)), 'debe haber un aria-label de mes');
    assert.ok(info.labels.some((l) => /día|day/i.test(l)), 'debe haber un aria-label de día');
    assert.equal(info.readonly, true, 'readonly debe propagarse a las secciones');
  },
});

tests.push({
  name: 'accesibilidad: clearable expone el botón con aria-label="Borrar"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    const clearLabel = await page.evaluate(() => {
      const el = document.getElementById('clearable');
      const btn = el.shadowRoot.querySelector('[part="clear"]');
      return btn?.getAttribute('aria-label') ?? null;
    });
    assert.equal(clearLabel, 'Borrar', 'el botón clear debe tener aria-label="Borrar"');
  },
});

tests.push({
  name: 'edge: clearable limpia el valor al pulsar el botón ×',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    await page.evaluate(() => {
      const el = document.getElementById('clearable');
      el.shadowRoot.querySelector('[part="clear"]').click();
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const el = document.getElementById('clearable');
      return { attr: el.getAttribute('value'), prop: el.value };
    });
    assert.equal(after.attr, null, 'value atributo debe estar ausente tras limpiar');
    assert.equal(after.prop, '', 'value propiedad debe ser "" tras limpiar');
  },
});

tests.push({
  name: 'edge: required sin valor reporta validity.valueMissing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-hint');
      return {
        required: el.hasAttribute('required'),
        valid: el.checkValidity(),
        // El form-associated custom element expone validationMessage via internals.
        message: el.shadowRoot.host.matches(':invalid'),
      };
    });
    assert.equal(info.required, true, 'el campo debe ser required');
    assert.equal(info.valid, false, 'un campo required sin valor NO debe pasar checkValidity');
    assert.equal(info.message, true, 'el campo debe estar en :invalid cuando required y vacío');
  },
});

tests.push({
  name: 'edge: valor fuera de min/max se considera inválido',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-hint');
      el.value = '2030-01-01'; // fuera del rango [2025-01-01 .. 2026-12-31]
      return { valid: el.checkValidity(), invalidAttr: el.hasAttribute('invalid') };
    });
    assert.equal(info.valid, false, 'valor fuera del rango debe fallar checkValidity');
    assert.equal(info.invalidAttr, true, 'valor fuera del rango debe marcar data-invalid');
  },
});

tests.push({
  name: 'edge: disabled no permite editar secciones (tabIndex=-1)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('disabled-field');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return secs.map((s) => ({
        tab: s.tabIndex,
        disabled: s.getAttribute('aria-disabled'),
      }));
    });
    assert.ok(info.every((s) => s.tab === -1), 'las secciones deben tener tabIndex=-1 cuando disabled');
    assert.ok(info.every((s) => s.disabled === 'true'), 'las secciones deben tener aria-disabled=true');
  },
});

tests.push({
  name: 'funcional: focus() mueve el foco al primer spinbutton',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-date-field-ready');
    await page.evaluate(() => { document.getElementById('basic').focus(); });
    await page.waitForTimeout(50);
    const focused = await page.evaluate(() => {
      const sec = document.activeElement?.shadowRoot?.activeElement
        ?? document.activeElement;
      const tag = sec?.tagName?.toLowerCase();
      const role = sec?.getAttribute?.('role');
      return { tag, role };
    });
    assert.equal(focused.role, 'spinbutton', 'el foco debe caer sobre un spinbutton');
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

report('date-field', failures === 0, { total: tests.length, failures });