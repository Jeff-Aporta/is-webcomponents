// input.test.mjs — tests exhaustivos del demo input.html.
// Cobertura: smoke + funcional (value sync, tipos, clearable, password-toggle)
// + accesibilidad (aria-describedby, aria-invalid) + edge case (required, error).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/input/input.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-input> definido, shadow DOM e input nativo visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-input-ready');
    const data = await page.evaluate(() => {
      const inp = document.querySelector('is-input#demo');
      const sr = inp.shadowRoot;
      const native = sr.querySelector('input');
      const label = sr.querySelector('label#label');
      const hint = sr.querySelector('#hint');
      return {
        defined: !!customElements.get('is-input'),
        hasShadow: !!sr,
        nativeType: native?.getAttribute('type'),
        nativeId: native?.id,
        hasLabel: !!label,
        labelText: label?.textContent?.trim(),
        hasHint: !!hint,
        hintText: hint?.textContent?.trim(),
      };
    });
    assert.equal(data.defined, true, 'is-input debe estar definido');
    assert.equal(data.hasShadow, true, 'debe tener shadow DOM');
    assert.equal(data.nativeType, 'text', 'tipo por defecto debe ser text');
    assert.equal(data.nativeId, 'input', 'el input nativo debe tener id=input');
    assert.equal(data.hasLabel, true, 'debe tener label');
    assert.match(data.labelText, /Nombre/, 'el label debe contener la palabra Nombre');
    assert.match(data.hintText, /documento/, 'el hint debe mencionar documento');
    await screenshot(page, 'input-smoke');
  },
});

tests.push({
  name: 'funcional: set .value → input nativo refleja y emite is-input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-input-ready');
    const triggered = await page.evaluate(() => new Promise((resolve) => {
      const inp = document.querySelector('is-input#demo');
      inp.addEventListener('is-input', (e) => resolve({ ok: true, value: e.detail.value }), { once: true });
      // Simular tecleo: escribir vía native input + dispatch.
      const native = inp.shadowRoot.getElementById('input');
      native.value = 'Hola mundo';
      native.dispatchEvent(new Event('input', { bubbles: true }));
    }));
    assert.equal(triggered.ok, true, 'is-input debe dispararse');
    assert.equal(triggered.value, 'Hola mundo', 'detail.value debe coincidir');

    const mirrored = await page.evaluate(() => ({
      property: document.querySelector('is-input#demo').value,
      native: document.querySelector('is-input#demo').shadowRoot.getElementById('input').value,
    }));
    assert.equal(mirrored.property, 'Hola mundo', 'la propiedad value debe reflejar');
    assert.equal(mirrored.native, 'Hola mundo', 'el input nativo debe reflejar');
  },
});

tests.push({
  name: 'accesibilidad: type="email" se refleja en el input nativo y aria-describedby',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-input-ready');
    const data = await page.evaluate(() => {
      const email = document.querySelector('is-input[type="email"]');
      const native = email.shadowRoot.getElementById('input');
      return {
        propType: email.type,
        nativeType: native.getAttribute('type'),
        describedBy: native.getAttribute('aria-describedby'),
      };
    });
    assert.equal(data.propType, 'email', 'la propiedad type debe ser email');
    assert.equal(data.nativeType, 'email', 'el input nativo debe tener type=email');
    assert.match(data.describedBy, /hint|error/, 'aria-describedby debe referenciar hint/error');
  },
});

tests.push({
  name: 'funcional: clearable muestra el botón cuando hay valor y limpia',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-input-ready');
    const data = await page.evaluate(() => {
      const inp = document.querySelector('is-input#demo');
      const clear = inp.shadowRoot.querySelector('#clear');
      // Sin valor → botón oculto.
      const hiddenWhenEmpty = clear.hidden;
      inp.value = 'algo';
      const hiddenWhenFilled = clear.hidden;
      // Pulsar el botón clear.
      clear.click();
      return {
        hiddenWhenEmpty,
        hiddenWhenFilled,
        valueAfterClear: inp.value,
      };
    });
    assert.equal(data.hiddenWhenEmpty, true, 'clear debe estar oculto sin valor');
    assert.equal(data.hiddenWhenFilled, false, 'clear debe verse con valor');
    assert.equal(data.valueAfterClear, '', 'clear debe vaciar el valor');
  },
});

tests.push({
  name: 'funcional: password-toggle cambia el tipo nativo entre password y text',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-input-ready');
    const data = await page.evaluate(() => {
      const pwd = document.querySelector('is-input[type="password"]');
      const native = pwd.shadowRoot.getElementById('input');
      const toggle = pwd.shadowRoot.querySelector('#toggle');
      const before = native.getAttribute('type');
      // Disparar is-change con checked=true (lo que hace el botón toggle).
      toggle.dispatchEvent(new CustomEvent('is-change', { detail: { checked: true }, bubbles: true, composed: true }));
      const afterOn = native.getAttribute('type');
      toggle.dispatchEvent(new CustomEvent('is-change', { detail: { checked: false }, bubbles: true, composed: true }));
      const afterOff = native.getAttribute('type');
      return { before, afterOn, afterOff };
    });
    assert.equal(data.before, 'password', 'inicial debe ser password');
    assert.equal(data.afterOn, 'text', 'con checked=true debe pasar a text');
    assert.equal(data.afterOff, 'password', 'con checked=false vuelve a password');
  },
});

tests.push({
  name: 'edge case: required vacío → aria-invalid y validity.valueMissing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-input-ready');
    const data = await page.evaluate(() => {
      const inp = document.querySelector('is-input[name="required1"]');
      inp.value = '';
      const native = inp.shadowRoot.getElementById('input');
      return {
        valueMissing: inp.validity?.valueMissing,
        ariaInvalid: native.getAttribute('aria-invalid'),
      };
    });
    assert.equal(data.valueMissing, true, 'required vacío → valueMissing');
    assert.equal(data.ariaInvalid, 'true', 'aria-invalid debe ser true');
  },
});

tests.push({
  name: 'edge case: form.reset() restaura el valor por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-input-ready');
    // Crear un form temporal para poder hacer reset.
    const data = await page.evaluate(async () => {
      const inp = document.querySelector('is-input#demo');
      // Seteamos el default vía atributo para que formResetCallback restaure ese valor.
      inp.setAttribute('value', 'POR_DEFECTO');
      inp.value = 'OTRO';
      // Necesitamos un form que lo envuelva para que reset() funcione.
      const form = document.createElement('form');
      inp.parentNode.insertBefore(form, inp);
      form.appendChild(inp);
      form.reset();
      await new Promise((r) => setTimeout(r, 50));
      return { value: inp.value, native: inp.shadowRoot.getElementById('input').value };
    });
    assert.equal(data.value, 'POR_DEFECTO', 'form.reset debe restaurar a POR_DEFECTO');
    assert.equal(data.native, 'POR_DEFECTO', 'el input nativo debe reflejar POR_DEFECTO');
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

report('input', failures === 0, { total: tests.length, failures });
