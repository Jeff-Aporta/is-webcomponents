// form.test.mjs — tests exhaustivos del demo <is-form>.
// Cobertura: smoke + funcional (fromJSON monta body, submit emite evento con
// values, mode view oculta submit, toJSON round-trip, inline JSON script).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/form/form.html`;

const tests = [];

tests.push({
  name: 'smoke: 3 forms montan con header, content y footer',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-ready');
    const info = await page.evaluate(() => {
      const forms = ['form-a', 'form-b', 'form-c'].map((id) => {
        const f = document.getElementById(id);
        const sr = f?.shadowRoot;
        const submit = sr?.querySelector('.submit, button[type="submit"]');
        const cancel = sr?.querySelector('.cancel');
        const headerSlot = sr?.querySelector('slot[name="header"]');
        const contentSlot = sr?.querySelector('slot[name="content"]');
        return {
          id,
          defined: !!customElements.get('is-form'),
          submitExists: !!submit,
          cancelExists: !!cancel,
          submitHidden: submit?.hidden,
          hasHeaderSlot: !!headerSlot,
          hasContentSlot: !!contentSlot,
          mode: f?.mode,
        };
      });
      return forms;
    });
    for (const f of info) {
      assert.equal(f.defined, true, `${f.id}: <is-form> debe estar definido`);
      assert.equal(f.submitExists, true, `${f.id}: botón submit debe existir`);
      assert.equal(f.cancelExists, true, `${f.id}: botón cancel debe existir`);
      assert.equal(f.hasHeaderSlot, true, `${f.id}: slot header debe existir`);
      assert.equal(f.hasContentSlot, true, `${f.id}: slot content debe existir`);
      assert.equal(f.mode, 'edit', `${f.id}: mode default debe ser 'edit'`);
      assert.equal(f.submitHidden, false, `${f.id}: submit no debe estar oculto en mode=edit`);
    }
    await screenshot(page, 'form-smoke');
  },
});

tests.push({
  name: 'funcional: form-b fue montado por fromJSON con header + inputs',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const f = document.getElementById('form-b');
      // Los slots deben tener contenido asignado.
      const sr = f.shadowRoot;
      const headerSlot = sr.querySelector('slot[name="header"]');
      const contentSlot = sr.querySelector('slot[name="content"]');
      const headerAssigned = headerSlot?.assignedElements({ flatten: true });
      const contentAssigned = contentSlot?.assignedElements({ flatten: true });
      const inputs = contentAssigned?.[0]?.querySelectorAll('is-input') || [];
      const values = f.getValues();
      return {
        headerAssignedCount: headerAssigned?.length || 0,
        inputCount: inputs.length,
        names: [...inputs].map((i) => i.getAttribute('name')),
        submitLabel: f.submitLabel,
        values,
      };
    });
    assert.ok(info.headerAssignedCount >= 1, `form-b header debe tener contenido asignado (${info.headerAssignedCount})`);
    assert.ok(info.inputCount >= 2, `form-b debe tener >=2 is-input en content (${info.inputCount})`);
    assert.equal(info.submitLabel, 'Guardar', `submit-label debe ser 'Guardar'`);
    assert.equal(info.values.nit, '900123456', `values.nit debe estar prellenado`);
    assert.equal(info.values.activo, true, `values.activo debe ser true`);
  },
});

tests.push({
  name: 'funcional: submit emite is-submit con detail.values y detail.json',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-ready');
    await page.waitForTimeout(150);
    const eventDetail = await page.evaluate(async () => {
      const f = document.getElementById('form-a');
      // Setear valores manualmente
      const nit = f.querySelector('[name="icurso"]');
      if (nit) nit.value = 'C-XYZ';
      const titulo = f.querySelector('[name="titulo"]');
      if (titulo) titulo.value = 'Matemáticas';
      const activo = f.querySelector('[name="activo"]');
      if (activo) activo.checked = true;

      return new Promise((resolve) => {
        const handler = (e) => {
          f.removeEventListener('is-submit', handler);
          resolve({
            hasValues: !!e.detail.values,
            values: e.detail.values,
            hasJson: !!e.detail.json,
            jsonMode: e.detail.json?.mode,
            bubbles: e.bubbles,
            composed: e.composed,
          });
        };
        f.addEventListener('is-submit', handler);
        f.requestSubmit();
      });
    });
    assert.equal(eventDetail.hasValues, true, 'detail.values debe existir');
    assert.equal(eventDetail.hasJson, true, 'detail.json debe existir');
    assert.equal(eventDetail.jsonMode, 'edit');
    assert.equal(eventDetail.bubbles, true, 'is-submit debe burbujear');
    assert.equal(eventDetail.composed, true, 'is-submit debe atravesar shadow DOM');
  },
});

tests.push({
  name: 'funcional: mode=view oculta el botón submit',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-ready');
    await page.waitForTimeout(100);
    const state = await page.evaluate(() => {
      const f = document.getElementById('form-b');
      f.mode = 'view';
      const submit = f.shadowRoot.querySelector('.submit');
      const hidden = submit?.hidden;
      f.mode = 'edit';
      const hiddenAfter = f.shadowRoot.querySelector('.submit')?.hidden;
      return { hidden, hiddenAfter };
    });
    assert.equal(state.hidden, true, 'submit debe estar oculto en mode=view');
    assert.equal(state.hiddenAfter, false, 'submit debe mostrarse en mode=edit');
  },
});

tests.push({
  name: 'round-trip: toJSON() → fromJSON() preserva mode + values',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-ready');
    await page.waitForTimeout(150);
    const result = await page.evaluate(() => {
      const f = document.getElementById('form-b');
      const a = f.toJSON();
      // Construir un segundo form idéntico
      const Ctor = customElements.get('is-form');
      const f2 = document.createElement('is-form');
      f2.id = 'form-rt';
      document.body.appendChild(f2);
      f2.fromJSON(JSON.parse(JSON.stringify(a)));
      const b = f2.toJSON();
      f2.remove();
      return { a, b, equal: JSON.stringify(a) === JSON.stringify(b) };
    });
    assert.equal(result.equal, true, `round-trip debe ser idéntico:\na=${JSON.stringify(result.a)}\nb=${JSON.stringify(result.b)}`);
  },
});

tests.push({
  name: 'inline JSON: form-c carga desde <script type="application/json">',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const f = document.getElementById('form-c');
      const sr = f.shadowRoot;
      const headerSlot = sr.querySelector('slot[name="header"]');
      const contentSlot = sr.querySelector('slot[name="content"]');
      const values = f.getValues();
      return {
        hasHeader: (headerSlot?.assignedElements({ flatten: true }) || []).length > 0,
        hasContent: (contentSlot?.assignedElements({ flatten: true }) || []).length > 0,
        values,
        submitLabel: f.submitLabel,
      };
    });
    assert.equal(info.hasHeader, true, 'form-c debe tener header asignado desde <script>');
    assert.equal(info.hasContent, true, 'form-c debe tener content asignado desde <script>');
    assert.equal(info.submitLabel, 'Crear', `submit-label debe ser 'Crear', es '${info.submitLabel}'`);
    assert.equal(info.values.codigo, 'AUTO', `values.codigo debe ser 'AUTO'`);
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('form', failures === 0, { total: tests.length, failures });
