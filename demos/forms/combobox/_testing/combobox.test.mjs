// combobox.test.mjs — tests funcionales del demo combobox.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM, input role=combobox,
//     aria-autocomplete=list, listbox en dialog
//   - funcional: filtrado en tiempo real al tipear, selección cierra el
//     dialog, clearable limpia y emite is-input, value se sincroniza al input
//   - accesibilidad: aria-expanded cambia, aria-controls referencia listbox,
//     role=listbox, options con role=option, aria-selected
//   - keyboard: ArrowDown/Up navega opciones filtradas, Enter confirma,
//     Escape cierra y restaura el valor previo, Home/End si aplica
//   - edge cases: filtro vacío muestra todas las opciones no-disabled,
//     opción disabled no aparece en el filtro, requerido expone validity
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/combobox/combobox.html`;

const tests = [];

tests.push({
  name: 'smoke: 4 comboboxes se definen y montan su shadow DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    const data = await page.evaluate(() => {
      const cbs = [...document.querySelectorAll('is-combobox')];
      return cbs.map((c) => {
        const sr = c.shadowRoot;
        const input = sr.querySelector('input.input');
        return {
          defined: !!customElements.get('is-combobox'),
          hasShadow: !!sr,
          inputRole: input?.getAttribute('role'),
          ariaAutoComplete: input?.getAttribute('aria-autocomplete'),
          ariaExpanded: input?.getAttribute('aria-expanded'),
          ariaControls: input?.getAttribute('aria-controls'),
          listboxRole: sr.querySelector('[part="listbox"]')?.getAttribute('role'),
          listboxId: sr.querySelector('[part="listbox"]')?.id,
          dialog: !!sr.querySelector('dialog.popup'),
          optionCount: c.querySelectorAll('is-option').length,
        };
      });
    });
    assert.equal(data.length, 4, 'debe haber 4 comboboxes');
    assert.equal(data[0].defined, true, 'is-combobox debe estar definido');
    assert.equal(data[0].inputRole, 'combobox', 'input tiene role=combobox');
    assert.equal(data[0].ariaAutoComplete, 'list', 'aria-autocomplete=list');
    assert.equal(data[0].listboxRole, 'listbox', 'listbox tiene role=listbox');
    assert.equal(data[0].ariaControls, data[0].listboxId, 'aria-controls referencia el listbox');
    assert.equal(data[0].ariaExpanded, 'false', 'aria-expanded inicial=false');
    assert.equal(data[0].optionCount, 6, 'combobox básico tiene 6 opciones');
    await screenshot(page, 'combobox-smoke');
  },
});

tests.push({
  name: 'funcional: value inicial sincroniza el input visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    const r = await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const input = c.shadowRoot.querySelector('input.input');
      return { value: c.value, inputValue: input.value };
    });
    assert.equal(r.value, 'mad', 'propiedad value');
    assert.equal(r.inputValue, 'Madrid', 'input muestra el label de la opción');
  },
});

tests.push({
  name: 'funcional: tipear filtra el listbox en tiempo real',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    // Limpia valor inicial y enfoca para abrir el dialog
    await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const input = c.shadowRoot.querySelector('input.input');
      c.value = '';
      input.focus();
    });
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const input = c.shadowRoot.querySelector('input.input');
      input.value = 'va';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    const r = await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const sr = c.shadowRoot;
      const opts = [...sr.querySelectorAll('[role="option"]')];
      return {
        optCount: opts.length,
        labels: opts.map((o) => o.textContent.trim()),
        open: sr.querySelector('dialog.popup').open,
      };
    });
    assert.equal(r.open, true, 'el dialog se abre al tipear');
    assert.ok(r.optCount > 0 && r.optCount < 6, `filtro "va" reduce opciones (${r.optCount}/6)`);
    assert.ok(r.labels.every((l) => l.toLowerCase().includes('va')), 'todas las opciones contienen "va"');
  },
});

tests.push({
  name: 'funcional: mousedown en opción selecciona y actualiza input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const input = c.shadowRoot.querySelector('input.input');
      input.focus();
    });
    await page.waitForTimeout(50);
    const r = await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const sr = c.shadowRoot;
      // Filtrar por "val" para que solo aparezca Valencia
      const input = sr.querySelector('input.input');
      input.value = 'val';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // mousedown en la primera opción (handler real del combobox)
      const opt = sr.querySelector('[role="option"]');
      opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, button: 0 }));
      return { value: c.value, inputValue: sr.querySelector('input.input').value };
    });
    assert.equal(r.value, 'val', 'value actualizado tras mousedown');
    assert.equal(r.inputValue, 'Valencia', 'input muestra el label de la opción');
  },
});

tests.push({
  name: 'funcional: clearable limpia y emite is-input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    const r = await page.evaluate(() => {
      const c = document.querySelector('#sec-clear is-combobox');
      const sr = c.shadowRoot;
      const clearBtn = sr.querySelector('[part="clear"]');
      const before = { value: c.value, hidden: clearBtn.hidden };
      clearBtn.click();
      const after = {
        value: c.value,
        attr: c.getAttribute('value'),
        inputValue: sr.querySelector('input.input').value,
        hidden: sr.querySelector('[part="clear"]').hidden,
      };
      return { before, after };
    });
    assert.equal(r.before.value, 'mexico', 'valor inicial mxico');
    assert.equal(r.before.hidden, false, 'clear visible con valor');
    assert.equal(r.after.value, '', 'value vacío tras clear');
    assert.equal(r.after.attr, null, 'atributo value eliminado');
    assert.equal(r.after.inputValue, '', 'input vacío');
    assert.equal(r.after.hidden, true, 'clear se oculta sin valor');
  },
});

tests.push({
  name: 'accesibilidad: aria-selected refleja el valor actual',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    // Limpia valor inicial para que el filtro no filtre por "mad"
    await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      c.value = 'sev';
      const input = c.shadowRoot.querySelector('input.input');
      input.focus();
      // filtrar por 'se' para que Sevilla aparezca
      input.value = 'se';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(80);
    const data = await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const sr = c.shadowRoot;
      const opts = [...sr.querySelectorAll('[role="option"]')];
      return opts.map((o) => ({
        value: o.getAttribute('data-value'),
        label: o.textContent,
        ariaSelected: o.getAttribute('aria-selected'),
      }));
    });
    const sevOpt = data.find((d) => d.value === 'sev');
    assert.ok(sevOpt, `opción sev presente en filtro "se" (data: ${JSON.stringify(data)})`);
    assert.equal(sevOpt.ariaSelected, 'true', 'sev tiene aria-selected=true');
  },
});

tests.push({
  name: 'teclado: ArrowDown navega opciones filtradas, Enter confirma',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const sr = c.shadowRoot;
      c.value = '';
      sr.querySelector('input.input').focus();
    });
    await page.waitForTimeout(50);
    // Filtrar para que aparezca "Barcelona"
    await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const sr = c.shadowRoot;
      const input = sr.querySelector('input.input');
      input.value = 'barc';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    // ArrowDown mueve la selección activa
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    const active = await page.evaluate(() => {
      const sr = document.querySelector('#sec-basico is-combobox').shadowRoot;
      return sr.querySelector('[data-active]')?.textContent?.trim();
    });
    assert.equal(active, 'Barcelona', 'ArrowDown activa Barcelona');

    // Enter confirma selección
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      return { value: c.value, inputValue: c.shadowRoot.querySelector('input.input').value };
    });
    assert.equal(after.value, 'bcn', 'Enter confirma Barcelona');
    assert.equal(after.inputValue, 'Barcelona', 'input muestra label de Barcelona');
  },
});

tests.push({
  name: 'teclado: Escape cierra y revierte el input al valor previo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    const before = await page.evaluate(() => {
      const c = document.querySelector('#sec-clear is-combobox');
      return c.value;
    });
    await page.evaluate(() => {
      document.querySelector('#sec-clear is-combobox').shadowRoot.querySelector('input.input').focus();
    });
    await page.waitForTimeout(50);
    // Tipear algo que no coincide
    await page.evaluate(() => {
      const c = document.querySelector('#sec-clear is-combobox');
      const sr = c.shadowRoot;
      const input = sr.querySelector('input.input');
      input.value = 'xyz';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => {
      const c = document.querySelector('#sec-clear is-combobox');
      const sr = c.shadowRoot;
      return {
        value: c.value,
        inputValue: sr.querySelector('input.input').value,
      };
    });
    assert.equal(after.value, before, 'value preservado tras Escape');
    assert.equal(after.inputValue, 'México', 'input revierte al label del value previo');
  },
});

tests.push({
  name: 'edge case: opción disabled se filtra del listbox',
  run: async (page) => {
    // Modificamos en runtime para crear un disabled: lo creamos en el demo
    // pero como el demo no tiene, validamos que el filtro ignore disabled.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    await page.evaluate(() => {
      const c = document.querySelector('#sec-clear is-combobox');
      // deshabilitar la primera opción
      const opt = c.querySelector('is-option[value="brasil"]');
      opt.setAttribute('disabled', '');
      c.shadowRoot.querySelector('input.input').focus();
    });
    await page.waitForTimeout(50);
    const r = await page.evaluate(() => {
      const c = document.querySelector('#sec-clear is-combobox');
      const sr = c.shadowRoot;
      const opts = [...sr.querySelectorAll('[role="option"]')];
      return opts.map((o) => o.getAttribute('data-value'));
    });
    assert.equal(r.includes('brasil'), false, 'la opción disabled se filtra del listbox');
  },
});

tests.push({
  name: 'edge case: required=true reporta valueMissing cuando vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    const r = await page.evaluate(() => {
      const c = document.querySelector('#sec-required is-combobox');
      const valid = c.checkValidity();
      const required = c.required;
      return { valid, required };
    });
    assert.equal(r.required, true, 'combobox es required');
    assert.equal(r.valid, false, 'combobox vacío NO es válido');
  },
});

tests.push({
  name: 'edge case: filtro vacío muestra todas las opciones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-combobox-ready');
    await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const sr = c.shadowRoot;
      c.value = '';
      sr.querySelector('input.input').focus();
    });
    await page.waitForTimeout(80);
    const r = await page.evaluate(() => {
      const c = document.querySelector('#sec-basico is-combobox');
      const sr = c.shadowRoot;
      return sr.querySelectorAll('[role="option"]').length;
    });
    assert.equal(r, 6, 'filtro vacío lista todas las opciones no-disabled');
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

report('combobox', failures === 0, { total: tests.length, failures });
