// radio.test.mjs — tests exhaustivos del demo radio.html.
// Cobertura: smoke + funcional (click marca el radio, is-radio-select)
// + accesibilidad (role=radio, aria-checked) + edge case (standalone, disabled).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/radio/radio.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-radio> definido, shadow DOM y role=radio',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-ready');
    const data = await page.evaluate(() => {
      const r = document.querySelector('is-radio#demo');
      const sr = r.shadowRoot;
      const control = sr.querySelector('.control');
      const dot = sr.querySelector('.dot');
      const label = sr.querySelector('.label');
      const desc = sr.querySelector('.description');
      return {
        defined: !!customElements.get('is-radio'),
        hasShadow: !!sr,
        hasControl: !!control,
        hasDot: !!dot,
        hasLabel: !!label,
        hasDesc: !!desc,
        role: r.getAttribute('role'),
        ariaChecked: r.getAttribute('aria-checked'),
        tabindex: r.getAttribute('tabindex'),
        text: r.shadowRoot.querySelector('slot')?.assignedNodes({ flatten: true })
          .map((n) => n.textContent || '').join('').trim(),
        descText: r.shadowRoot.querySelector('slot[name="description"]')
          ?.assignedNodes({ flatten: true })
          .map((n) => n.textContent || '').join('').trim(),
      };
    });
    assert.equal(data.defined, true, 'is-radio debe estar definido');
    assert.equal(data.hasShadow, true, 'debe tener shadow DOM');
    assert.equal(data.hasControl, true, 'debe tener .control');
    assert.equal(data.hasDot, true, 'debe tener .dot');
    assert.equal(data.hasLabel, true, 'debe tener label');
    assert.equal(data.hasDesc, true, 'debe tener description');
    assert.equal(data.role, 'radio', 'role debe ser radio');
    assert.equal(data.ariaChecked, 'false', 'aria-checked inicial debe ser false');
    assert.equal(data.tabindex, '0', 'tabindex inicial debe ser 0');
    assert.match(data.text, /Opción/, 'el slot debe contener la etiqueta');
    assert.match(data.descText, /description/, 'el slot description debe poblarse');
    await screenshot(page, 'radio-smoke');
  },
});

tests.push({
  name: 'funcional: click standalone → checked=true y emite is-radio-select',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-ready');
    const data = await page.evaluate(async () => {
      const r = document.querySelector('is-radio#demo');
      const evt = await new Promise((resolve) => {
        r.addEventListener('is-radio-select', (e) => resolve(e.detail), { once: true });
        r.click();
      });
      return {
        checked: r.checked,
        ariaChecked: r.getAttribute('aria-checked'),
        eventDetail: evt,
      };
    });
    assert.equal(data.checked, true, 'click standalone debe poner checked=true');
    assert.equal(data.ariaChecked, 'true', 'aria-checked debe ser true');
    assert.equal(data.eventDetail.value, 'opt-1', 'is-radio-select.detail.value debe ser opt-1');
  },
});

tests.push({
  name: 'accesibilidad: aria-disabled refleja el atributo disabled',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-ready');
    const data = await page.evaluate(() => {
      const r = [...document.querySelectorAll('is-radio[disabled]')][0];
      return {
        ariaDisabled: r.getAttribute('aria-disabled'),
        hasDisabledAttr: r.hasAttribute('disabled'),
      };
    });
    assert.equal(data.hasDisabledAttr, true, 'disabled debe estar presente');
    assert.equal(data.ariaDisabled, 'true', 'aria-disabled debe ser true');
  },
});

tests.push({
  name: 'edge case: standalone (sin grupo) se auto-marca al click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-ready');
    const data = await page.evaluate(() => {
      const r = document.querySelector('is-radio#demo');
      const inGroup = r.closest('is-radio-group') != null;
      const before = r.checked;
      r.click();
      const after = r.checked;
      return { inGroup, before, after };
    });
    assert.equal(data.inGroup, false, 'el demo usa un radio standalone');
    assert.equal(data.before, false, 'estado inicial false');
    assert.equal(data.after, true, 'click standalone debe auto-marcar');
  },
});

tests.push({
  name: 'edge case: disabled bloquea el toggle por click',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-ready');
    const data = await page.evaluate(() => {
      const r = [...document.querySelectorAll('is-radio[disabled]')][0];
      // Quitar disabled para comparar el toggle de un radio disabled.
      const before = r.checked;
      r.click();
      return {
        before,
        after: r.checked,
        ariaDisabled: r.getAttribute('aria-disabled'),
      };
    });
    assert.equal(data.before, data.after, 'click en disabled no debe cambiar checked');
    assert.equal(data.ariaDisabled, 'true', 'aria-disabled debe ser true');
  },
});

tests.push({
  name: 'funcional: value puede ser leído desde atributo o desde el slot',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-radio-ready');
    const data = await page.evaluate(() => {
      const r = document.querySelector('is-radio#demo');
      // value explícito desde atributo.
      const fromAttr = r.value;
      // Sin atributo, value se deriva del texto del slot.
      const derived = [...document.querySelectorAll('is-radio')].find((x) => !x.hasAttribute('value'));
      const derivedValue = derived ? derived.value : null;
      return { fromAttr, derivedValue };
    });
    assert.equal(data.fromAttr, 'opt-1', 'value desde atributo debe ser opt-1');
    assert.ok(data.derivedValue, 'un radio sin atributo value debe derivar uno del texto');
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

report('radio', failures === 0, { total: tests.length, failures });
