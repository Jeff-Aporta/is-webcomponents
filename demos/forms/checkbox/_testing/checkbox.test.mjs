// checkbox.test.mjs — tests exhaustivos del demo checkbox.html.
// Cobertura: smoke + funcional (toggle, indeterminate, change event)
// + accesibilidad (role, aria-checked, aria-disabled) + edge case (form reset, disabled).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/checkbox/checkbox.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-checkbox> definido, shadow DOM y estado inicial visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-checkbox-ready');
    const data = await page.evaluate(() => {
      const cb = document.querySelector('is-checkbox#demo');
      const sr = cb.shadowRoot;
      const control = sr.querySelector('.control');
      const label = sr.querySelector('#label');
      const form = document.querySelector('form#check-form');
      return {
        defined: !!customElements.get('is-checkbox'),
        hasShadow: !!sr,
        hasControl: !!control,
        hasLabel: !!label,
        role: cb.getAttribute('role'),
        ariaChecked: cb.getAttribute('aria-checked'),
        tabindex: cb.getAttribute('tabindex'),
        inForm: !!form && form.contains(cb),
        text: cb.shadowRoot.querySelector('slot')?.assignedNodes({ flatten: true })
          .map((n) => n.textContent || '').join('').trim(),
      };
    });
    assert.equal(data.defined, true, 'is-checkbox debe estar definido');
    assert.equal(data.hasShadow, true, 'debe tener shadow DOM');
    assert.equal(data.hasControl, true, 'debe tener .control');
    assert.equal(data.hasLabel, true, 'debe tener label');
    assert.equal(data.role, 'checkbox', 'role debe ser checkbox');
    assert.equal(data.ariaChecked, 'false', 'aria-checked inicial debe ser false');
    assert.equal(data.tabindex, '0', 'tabindex inicial debe ser 0');
    assert.match(data.text, /Acepto/, 'el slot debe contener la etiqueta');
    await screenshot(page, 'checkbox-smoke');
  },
});

tests.push({
  name: 'funcional: set checked → aria-checked=true y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-checkbox-ready');
    // Escuchar el evento is-change disparado por la propiedad checked.
    const triggered = await page.evaluate(() => new Promise((resolve) => {
      const cb = document.querySelector('is-checkbox#demo');
      cb.addEventListener('is-change', (e) => resolve({ ok: true, detail: e.detail }), { once: true });
      cb.checked = true;
    }));
    assert.equal(triggered.ok, true, 'is-change debe dispararse');
    assert.equal(triggered.detail.checked, true, 'detail.checked debe ser true');
    assert.equal(triggered.detail.value, 'accepted', 'detail.value debe ser el value del componente');

    const ariaChecked = await page.evaluate(() =>
      document.querySelector('is-checkbox#demo').getAttribute('aria-checked'),
    );
    assert.equal(ariaChecked, 'true', 'aria-checked debe reflejar checked');
  },
});

tests.push({
  name: 'accesibilidad: aria-checked="mixed" cuando indeterminate',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-checkbox-ready');
    const data = await page.evaluate(() => {
      const cb = document.querySelector('is-checkbox#demo');
      cb.indeterminate = true;
      return {
        ariaChecked: cb.getAttribute('aria-checked'),
        indeterminateAttr: cb.hasAttribute('indeterminate'),
      };
    });
    assert.equal(data.ariaChecked, 'mixed', 'aria-checked debe ser "mixed" con indeterminate');
    assert.equal(data.indeterminateAttr, true, 'atributo indeterminate debe estar presente');
  },
});

tests.push({
  name: 'edge case: disabled bloquea toggle y refleja aria-disabled',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-checkbox-ready');
    const data = await page.evaluate(() => {
      const cb = document.querySelector('is-checkbox#demo');
      cb.disabled = true;
      const before = cb.checked;
      // Disparar click no debe alternar el estado.
      cb.click();
      return {
        ariaDisabled: cb.getAttribute('aria-disabled'),
        tabindex: cb.getAttribute('tabindex'),
        before,
        after: cb.checked,
      };
    });
    assert.equal(data.ariaDisabled, 'true', 'aria-disabled debe ser "true"');
    assert.equal(data.tabindex, '-1', 'tabindex debe ser -1 cuando disabled');
    assert.equal(data.after, data.before, 'click en disabled no debe togglear');
  },
});

tests.push({
  name: 'edge case: required sin checked → validity.valueMissing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-checkbox-ready');
    const data = await page.evaluate(() => {
      const cb = document.querySelector('is-checkbox#demo');
      cb.required = true;
      cb.checked = false;
      const v = cb.validity;
      return {
        valueMissing: v?.valueMissing,
        ariaRequired: cb.getAttribute('aria-required'),
      };
    });
    assert.equal(data.valueMissing, true, 'valueMissing debe ser true');
    assert.equal(data.ariaRequired, 'true', 'aria-required debe ser "true"');
  },
});

tests.push({
  name: 'edge case: form.reset() restaura el valor inicial',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-checkbox-ready');
    const data = await page.evaluate(async () => {
      const form = document.querySelector('form#check-form');
      const cb = form.querySelector('is-checkbox[name="tos"]');
      // Capturar el estado inicial (sin checked).
      const initial = cb.checked;
      // Marcar y resetear.
      cb.checked = true;
      form.reset();
      // Esperar al próximo tick (formResetCallback es síncrono pero la propagación puede tardar).
      await new Promise((r) => setTimeout(r, 50));
      return { initial, after: cb.checked, ariaChecked: cb.getAttribute('aria-checked') };
    });
    assert.equal(data.initial, false, 'estado inicial debe ser false');
    assert.equal(data.after, false, 'form.reset() debe restaurar checked=false');
    assert.equal(data.ariaChecked, 'false', 'aria-checked debe volver a false');
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

report('checkbox', failures === 0, { total: tests.length, failures });
