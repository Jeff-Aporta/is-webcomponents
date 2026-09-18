// option.test.mjs — tests exhaustivos del demo option.html.
// Cobertura: smoke + funcional (selección, aria-selected)
// + accesibilidad (role=option, aria-disabled) + edge case (group label, disabled).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/option/option.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-option> definido, shadow DOM con role=option',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-option-ready');
    const data = await page.evaluate(() => {
      const o = document.querySelector('is-option[value="es"]');
      const sr = o.shadowRoot;
      const root = sr.querySelector('[role="option"]');
      const label = sr.querySelector('.label');
      const desc = sr.querySelector('.description');
      const start = sr.querySelector('.start');
      return {
        defined: !!customElements.get('is-option'),
        hasShadow: !!sr,
        rootRole: root?.getAttribute('role'),
        ariaSelected: root?.getAttribute('aria-selected'),
        ariaDisabled: root?.getAttribute('aria-disabled'),
        hasLabel: !!label,
        hasDesc: !!desc,
        hasStart: !!start,
        labelText: sr.querySelector('slot')?.assignedNodes({ flatten: true })
          .map((n) => n.textContent || '').join('').trim(),
        descText: sr.querySelector('slot[name="description"]')?.assignedNodes({ flatten: true })
          .map((n) => n.textContent || '').join('').trim(),
      };
    });
    assert.equal(data.defined, true, 'is-option debe estar definido');
    assert.equal(data.hasShadow, true, 'debe tener shadow DOM');
    assert.equal(data.rootRole, 'option', 'el root interno debe tener role=option');
    assert.equal(data.ariaSelected, 'true', 'la opción "es" debe estar seleccionada (selected)');
    assert.equal(data.ariaDisabled, 'false', 'aria-disabled inicial debe ser false');
    assert.equal(data.hasLabel, true, 'debe tener .label');
    assert.equal(data.hasDesc, true, 'debe tener .description');
    assert.match(data.labelText, /España/, 'label debe contener España');
    assert.match(data.descText, /Castellano/, 'description debe mencionar Castellano');
    await screenshot(page, 'option-smoke');
  },
});

tests.push({
  name: 'funcional: set selected → aria-selected=true y data-selected',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-option-ready');
    const data = await page.evaluate(() => {
      const opts = [...document.querySelectorAll('is-option')];
      const mx = opts.find((o) => o.value === 'mx');
      mx.selected = true;
      const root = mx.shadowRoot.querySelector('[role="option"]');
      return {
        selected: mx.selected,
        ariaSelected: root.getAttribute('aria-selected'),
        dataSelected: root.hasAttribute('data-selected'),
      };
    });
    assert.equal(data.selected, true, 'la propiedad selected debe ser true');
    assert.equal(data.ariaSelected, 'true', 'aria-selected debe ser true');
    assert.equal(data.dataSelected, true, 'data-selected debe estar presente');
  },
});

tests.push({
  name: 'accesibilidad: aria-disabled y data-disabled cuando disabled',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-option-ready');
    const data = await page.evaluate(() => {
      const o = [...document.querySelectorAll('is-option[disabled]')][0];
      const root = o.shadowRoot.querySelector('[role="option"]');
      return {
        ariaDisabled: root.getAttribute('aria-disabled'),
        dataDisabled: root.hasAttribute('data-disabled'),
      };
    });
    assert.equal(data.ariaDisabled, 'true', 'aria-disabled debe ser true');
    assert.equal(data.dataDisabled, true, 'data-disabled debe estar presente');
  },
});

tests.push({
  name: 'edge case: group expone la cabecera de agrupación',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-option-ready');
    const data = await page.evaluate(() => {
      const opts = [...document.querySelectorAll('is-option[group]')];
      return opts.map((o) => ({ value: o.value, group: o.group }));
    });
    assert.ok(data.length >= 2, 'debe haber opciones con group');
    assert.ok(data.some((d) => d.group === 'España'), 'debe existir el grupo España');
    assert.ok(data.some((d) => d.group === 'México'), 'debe existir el grupo México');
  },
});

tests.push({
  name: 'edge case: click togglea selected (selección mutuamente excluyente)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-option-ready');
    const data = await page.evaluate(async () => {
      const opts = [...document.querySelectorAll('#list is-option')];
      const mx = opts.find((o) => o.value === 'mx');
      const ar = opts.find((o) => o.value === 'ar');
      // Click en mx.
      mx.click();
      const afterMx = opts.map((o) => ({ value: o.value, selected: o.selected }));
      // Click en ar → debe desmarcar mx.
      ar.click();
      const afterAr = opts.map((o) => ({ value: o.value, selected: o.selected }));
      return { afterMx, afterAr };
    });
    const selectedMx = data.afterMx.filter((s) => s.selected).map((s) => s.value);
    const selectedAr = data.afterAr.filter((s) => s.selected).map((s) => s.value);
    assert.deepEqual(selectedMx, ['mx'], 'solo mx debe estar seleccionado');
    assert.deepEqual(selectedAr, ['ar'], 'solo ar debe estar seleccionado');
  },
});

tests.push({
  name: 'edge case: description y label son consultables por propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-option-ready');
    const data = await page.evaluate(() => {
      const opts = [...document.querySelectorAll('is-option')];
      return opts.slice(0, 4).map((o) => ({
        value: o.value,
        label: o.label,
        description: o.description,
      }));
    });
    for (const d of data) {
      assert.ok(d.value, 'cada opción debe tener value');
      assert.match(d.label, /[A-Za-zÀ-ÿ]/, `label debe contener texto: ${d.label}`);
    }
    const ar = data.find((d) => d.value === 'ar');
    assert.match(ar.description, /Castellano/, 'description debe mencionar Castellano');
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

report('option', failures === 0, { total: tests.length, failures });
