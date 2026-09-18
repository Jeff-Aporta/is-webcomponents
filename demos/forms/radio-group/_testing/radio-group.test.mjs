// radio-group.test.mjs — tests exhaustivos del demo radio-group.html.
// Cobertura: smoke + funcional (selección, is-change, roving tabindex)
// + accesibilidad (role=radiogroup, aria-orientation) + edge case (teclado, required, form reset).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/radio-group/radio-group.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-radio-group> definido, radiogroup y radios internos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(() => {
      const g = document.querySelector('is-radio-group#group');
      const sr = g.shadowRoot;
      const base = sr.querySelector('.base');
      const radios = [...g.querySelectorAll('is-radio')];
      return {
        defined: !!customElements.get('is-radio-group'),
        hasShadow: !!sr,
        baseRole: base.getAttribute('role'),
        baseOrient: base.getAttribute('aria-orientation'),
        radiosCount: radios.length,
        value: g.value,
        required: g.required,
        radiosTabindex: radios.map((r) => r.getAttribute('tabindex')),
      };
    });
    assert.equal(data.defined, true, 'is-radio-group debe estar definido');
    assert.equal(data.hasShadow, true, 'debe tener shadow DOM');
    assert.equal(data.baseRole, 'radiogroup', 'el contenedor interno debe tener role=radiogroup');
    assert.equal(data.baseOrient, 'vertical', 'orientación por defecto debe ser vertical');
    assert.equal(data.radiosCount, 4, 'el grupo principal debe tener 4 radios');
    assert.equal(data.value, 'uno', 'value inicial debe ser "uno"');
    assert.equal(data.required, true, 'required debe ser true');
    // Roving tabindex: solo el radio con value=uno debe tener tabindex=0.
    assert.equal(data.radiosTabindex[0], '0', 'el radio checked debe tener tabindex=0');
    assert.equal(data.radiosTabindex[1], '-1', 'los demás deben tener tabindex=-1');
    await screenshot(page, 'radio-group-smoke');
  },
});

tests.push({
  name: 'funcional: click en un radio → group.value refleja y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(async () => {
      const g = document.querySelector('is-radio-group#group');
      const target = [...g.querySelectorAll('is-radio')].find((r) => r.value === 'dos');
      const evt = await new Promise((resolve) => {
        g.addEventListener('is-change', (e) => resolve(e.detail), { once: true });
        target.click();
      });
      await new Promise((r) => setTimeout(r, 20));
      return {
        groupValue: g.value,
        radioChecked: target.checked,
        othersChecked: [...g.querySelectorAll('is-radio')]
          .filter((r) => r.value !== 'dos').map((r) => r.checked),
        eventValue: evt.value,
      };
    });
    assert.equal(data.groupValue, 'dos', 'group.value debe ser "dos"');
    assert.equal(data.radioChecked, true, 'el radio "dos" debe estar checked');
    assert.ok(data.othersChecked.every((c) => c === false), 'los demás radios deben estar desmarcados');
    assert.equal(data.eventValue, 'dos', 'is-change.detail.value debe ser "dos"');
  },
});

tests.push({
  name: 'funcional: set group.value → el radio correspondiente se marca',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(async () => {
      const g = document.querySelector('is-radio-group#group');
      g.value = 'tres';
      await new Promise((r) => setTimeout(r, 20));
      const checkedRadios = [...g.querySelectorAll('is-radio')]
        .filter((r) => r.checked)
        .map((r) => r.value);
      return { groupValue: g.value, checkedRadios };
    });
    assert.equal(data.groupValue, 'tres', 'group.value debe ser "tres"');
    assert.deepEqual(data.checkedRadios, ['tres'], 'solo "tres" debe estar checked');
  },
});

tests.push({
  name: 'accesibilidad: aria-orientation refleja orientation=horizontal',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(() => {
      const g = document.querySelector('is-radio-group#group-h');
      const base = g.shadowRoot.querySelector('.base');
      return {
        propOrient: g.orientation,
        ariaOrient: base.getAttribute('aria-orientation'),
      };
    });
    assert.equal(data.propOrient, 'horizontal', 'orientation debe ser horizontal');
    assert.equal(data.ariaOrient, 'horizontal', 'aria-orientation debe ser horizontal');
  },
});

tests.push({
  name: 'edge case: ArrowDown navega al siguiente radio y lo marca',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    // Focus en el primer radio.
    await page.focus('is-radio-group#group is-radio[value="uno"]');
    await page.keyboard.press('ArrowDown');
    const data = await page.evaluate(async () => {
      // Esperar al próximo tick.
      await new Promise((r) => setTimeout(r, 30));
      const g = document.querySelector('is-radio-group#group');
      const checked = [...g.querySelectorAll('is-radio')].find((r) => r.checked);
      return { value: g.value, checkedValue: checked?.value };
    });
    assert.equal(data.value, 'dos', 'después de ArrowDown el value debe ser "dos"');
    assert.equal(data.checkedValue, 'dos', 'el radio "dos" debe estar marcado');
  },
});

tests.push({
  name: 'edge case: required sin value → validity.valueMissing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(() => {
      const g = document.querySelector('is-radio-group#group');
      g.value = '';
      return {
        valueMissing: g.validity?.valueMissing,
        ariaRequired: g.shadowRoot.querySelector('.base').getAttribute('aria-required'),
      };
    });
    assert.equal(data.valueMissing, true, 'valueMissing debe ser true');
    assert.equal(data.ariaRequired, 'true', 'aria-required debe ser true');
  },
});

tests.push({
  name: 'edge case: disabled bloquea la selección por click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(() => {
      const g = document.querySelector('is-radio-group#group-dis');
      const before = g.value;
      const target = [...g.querySelectorAll('is-radio')].find((r) => r.value === 'b');
      target.click();
      return {
        before,
        after: g.value,
        ariaDisabled: g.shadowRoot.querySelector('.base').getAttribute('aria-disabled'),
      };
    });
    assert.equal(data.before, data.after, 'disabled no debe permitir cambiar el value');
    assert.equal(data.ariaDisabled, 'true', 'aria-disabled debe ser true');
  },
});

tests.push({
  name: 'edge case: error-text activa aria-invalid',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(() => {
      const g = document.querySelector('is-radio-group#group-err');
      const base = g.shadowRoot.querySelector('.base');
      const errEl = g.shadowRoot.getElementById('error');
      return {
        ariaInvalid: base.getAttribute('aria-invalid'),
        errorVisible: !errEl.hidden,
        errorText: errEl.textContent?.trim(),
      };
    });
    assert.equal(data.ariaInvalid, 'true', 'aria-invalid debe ser true con error');
    assert.equal(data.errorVisible, true, 'el error-text debe verse');
    assert.match(data.errorText, /opci/i, 'el texto debe mencionar opción');
  },
});

tests.push({
  name: 'edge case: form.reset() restaura el value inicial',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-group-ready');
    const data = await page.evaluate(async () => {
      const g = document.querySelector('is-radio-group#group');
      g.value = 'tres';
      const form = document.createElement('form');
      g.parentNode.insertBefore(form, g);
      form.appendChild(g);
      form.reset();
      await new Promise((r) => setTimeout(r, 50));
      return { value: g.value, checked: [...g.querySelectorAll('is-radio')].find((r) => r.checked)?.value };
    });
    assert.equal(data.value, 'uno', 'form.reset debe restaurar el value inicial');
    assert.equal(data.checked, 'uno', 'el radio "uno" debe volver a estar checked');
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

report('radio-group', failures === 0, { total: tests.length, failures });
