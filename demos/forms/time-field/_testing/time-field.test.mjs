// time-field.test.mjs — tests exhaustivos del demo time-field.html.
// Cobertura: smoke + funcional (secciones spinbutton, valor inicial,
// setting via API, min/max) + accesibilidad + edge cases (vacío, inválido).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/time-field/time-field.html`;

const tests = [];

tests.push({
  name: 'smoke: el campo se monta y los spinbutton de secciones renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    const info = await page.evaluate(() => {
      const fields = [...document.querySelectorAll('is-time-field')];
      return {
        count: fields.length,
        defined: !!customElements.get('is-time-field'),
        sectionsByField: fields.map((f) => f.shadowRoot.querySelectorAll('[role="spinbutton"]').length),
        hasFormAssociated: 'formAssociated' in fields[0],
        sectionsHaveAriaValue: fields.every((f) => {
          const secs = f.shadowRoot.querySelectorAll('[role="spinbutton"]');
          return [...secs].every((s) => s.hasAttribute('aria-valuenow') || s.getAttribute('aria-valuetext'));
        }),
      };
    });
    assert.equal(info.defined, true, 'is-time-field debe estar definido');
    assert.ok(info.count >= 6, `esperaba >=6 campos en la página, hay ${info.count}`);
    // El campo base (24h sin segundos) tiene 2 secciones: h/M.
    // El campo con segundos tiene 3 secciones; el de AM/PM tiene 3 secciones.
    assert.ok(info.sectionsByField.every((n) => n >= 2),
      `cada campo debe tener >=2 secciones (h/M), hay ${JSON.stringify(info.sectionsByField)}`);
    assert.equal(info.hasFormAssociated, true, 'el campo debe ser form-associated');
    assert.equal(info.sectionsHaveAriaValue, true, 'todas las secciones deben exponer aria-valuenow o aria-valuetext');
    await screenshot(page, 'time-field-smoke');
  },
});

tests.push({
  name: 'funcional: setear value por atributo refleja en shadow DOM y en el host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.setAttribute('value', '15:45');
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
    assert.equal(data.attr, '15:45', 'value debe reflejarse en el atributo');
    assert.equal(data.prop, '15:45', 'value debe reflejarse en la propiedad');
    // h/M → 15 / 45
    assert.equal(data.sectionValues.length, 2, 'debe haber 2 secciones (h/M)');
    assert.equal(data.sectionValues[0].now, '15', 'sección hora = 15');
    assert.equal(data.sectionValues[1].now, '45', 'sección minuto = 45');
  },
});

tests.push({
  name: 'funcional: setear value por propiedad también refleja en el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    await page.evaluate(() => {
      const el = document.getElementById('basic');
      el.value = '09:30';
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
    assert.equal(data.attr, '09:30');
    assert.deepEqual(data.sections, ['9', '30']);
  },
});

tests.push({
  name: 'funcional: con seconds=true aparece una sección extra de segundos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-seconds');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        sectionsCount: secs.length,
        seconds: secs.find((s) => s.getAttribute('aria-label')?.match(/segundo|second/i))?.getAttribute('aria-valuenow'),
      };
    });
    assert.equal(info.sectionsCount, 3, 'con seconds=true debe haber 3 secciones');
    assert.equal(info.seconds, '45', 'sección segundo = 45 (valor inicial 14:30:45)');
  },
});

tests.push({
  name: 'funcional: con ampm aparece una sección AM/PM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('ampm');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        sectionsCount: secs.length,
        ampm: secs.find((s) => s.getAttribute('aria-label')?.match(/AM\/PM|meridiem/i)),
      };
    });
    assert.ok(info.ampm, 'debe existir una sección con aria-label que mencione AM/PM');
    assert.ok(info.sectionsCount >= 3, `esperaba >=3 secciones con ampm (h12/M/dPeriod), hay ${info.sectionsCount}`);
  },
});

tests.push({
  name: 'funcional: is-change emite evento al cambiar valor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    await page.evaluate(() => {
      window.__changes = [];
      document.getElementById('basic').addEventListener('is-change', (e) => {
        window.__changes.push(e.detail?.value ?? '');
      });
    });
    await page.evaluate(() => { document.getElementById('basic').value = '10:30'; });
    await page.waitForTimeout(50);
    const changes = await page.evaluate(() => window.__changes);
    assert.deepEqual(changes, ['10:30'], 'is-change debe emitir el nuevo valor');
  },
});

tests.push({
  name: 'funcional: spinbutton de hora/minuto tienen aria-valuemin/max correctos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    await page.evaluate(() => { document.getElementById('with-hint').value = '10:30'; });
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
    // Esperado: hora [0..23], minuto [0..59].
    assert.ok(info.some((s) => /hora|hour/i.test(s.label) && s.min === '0' && s.max === '23'),
      'debe haber una sección hora con min=0 max=23');
    assert.ok(info.some((s) => /minuto|minute/i.test(s.label) && s.min === '0' && s.max === '59'),
      'debe haber una sección minuto con min=0 max=59');
  },
});

tests.push({
  name: 'accesibilidad: spinbuttons tienen aria-label, role y aria-readonly',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    await page.evaluate(() => { document.getElementById('readonly-field').value = '17:45'; });
    await page.waitForTimeout(50);
    const info = await page.evaluate(() => {
      const el = document.getElementById('readonly-field');
      const secs = [...el.shadowRoot.querySelectorAll('[role="spinbutton"]')];
      return {
        allSpinbuttons: secs.length,
        labels: secs.map((s) => s.getAttribute('aria-label')),
        readonly: secs.every((s) => s.getAttribute('aria-readonly') === 'true'),
      };
    });
    assert.ok(info.allSpinbuttons >= 2, 'debe haber al menos 2 spinbutton');
    assert.ok(info.labels.every(Boolean), 'todos los spinbutton deben tener aria-label');
    assert.ok(info.labels.some((l) => /hora|hour/i.test(l)), 'debe haber un aria-label de hora');
    assert.ok(info.labels.some((l) => /minuto|minute/i.test(l)), 'debe haber un aria-label de minuto');
    assert.equal(info.readonly, true, 'readonly debe propagarse a las secciones');
  },
});

tests.push({
  name: 'accesibilidad: clearable expone el botón con aria-label="Borrar"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
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
    await waitReady(page, 'data-time-field-ready');
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
    await waitReady(page, 'data-time-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-hint');
      return {
        required: el.hasAttribute('required'),
        valid: el.checkValidity(),
        invalid: el.shadowRoot.host.matches(':invalid'),
      };
    });
    assert.equal(info.required, true, 'el campo debe ser required');
    assert.equal(info.valid, false, 'un campo required sin valor NO debe pasar checkValidity');
    assert.equal(info.invalid, true, 'el campo debe estar en :invalid cuando required y vacío');
  },
});

tests.push({
  name: 'edge: valor fuera de min/max se considera inválido',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-hint');
      el.value = '20:00'; // fuera del rango [08:00 .. 18:00]
      return { valid: el.checkValidity(), invalidAttr: el.hasAttribute('invalid') };
    });
    assert.equal(info.valid, false, 'valor fuera del rango debe fallar checkValidity');
    assert.equal(info.invalidAttr, true, 'valor fuera del rango debe marcar data-invalid');
  },
});

tests.push({
  name: 'edge: valor dentro de min/max pasa checkValidity',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    const info = await page.evaluate(() => {
      const el = document.getElementById('with-hint');
      el.value = '12:00'; // dentro de [08:00 .. 18:00]
      return { valid: el.checkValidity(), invalidAttr: el.hasAttribute('invalid') };
    });
    assert.equal(info.valid, true, 'valor dentro del rango debe pasar checkValidity');
    assert.equal(info.invalidAttr, false, 'valor dentro del rango NO debe marcar data-invalid');
  },
});

tests.push({
  name: 'edge: disabled no permite editar secciones (tabIndex=-1)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
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
    await waitReady(page, 'data-time-field-ready');
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

tests.push({
  name: 'edge: valor inicial con seconds preserva los segundos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-time-field-ready');
    const data = await page.evaluate(() => {
      const el = document.getElementById('with-seconds');
      return { value: el.value, attr: el.getAttribute('value') };
    });
    assert.equal(data.attr, '14:30:45');
    assert.equal(data.value, '14:30:45');
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

report('time-field', failures === 0, { total: tests.length, failures });
