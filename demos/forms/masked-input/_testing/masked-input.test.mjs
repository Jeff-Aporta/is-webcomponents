// masked-input.test.mjs — tests funcionales del demo masked-input.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con <input>, pattern aplicado
//     como placeholder
//   - funcional: cambiar pattern reformatea el valor; setear value aplica
//     la máscara y emite is-input; los literales del patrón aparecen en el
//     valor formateado
//   - accesibilidad: el input interno es accesible; required expone el
//     atributo invalid tras blur
//   - edge cases: pattern vacío no rompe; valor incompleto es válido pero
//     complete=false; valor completo dispara is-complete
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/masked-input/masked-input.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta el input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const data = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('is-masked-input')];
      return inputs.map((i) => {
        const sr = i.shadowRoot;
        const input = sr?.querySelector('input.input');
        return {
          defined: !!customElements.get('is-masked-input'),
          hasShadow: !!sr,
          hasInput: !!input,
          pattern: i.pattern,
          placeholder: input?.placeholder,
          maxLength: input?.maxLength,
        };
      });
    });
    assert.equal(data.length, 5, 'debe haber 5 masked-inputs (tel, card, fecha, placa, req)');
    assert.equal(data[0].defined, true, 'is-masked-input definido');
    assert.equal(data[0].hasShadow, true, 'shadow root presente');
    assert.equal(data[0].hasInput, true, '<input.input> presente');
    assert.equal(data[0].pattern, '+54 9 0000 0000 0000', 'pattern del tel');
    assert.match(data[0].placeholder, /\+/, 'placeholder refleja el pattern');
    await screenshot(page, 'masked-input-smoke');
  },
});

tests.push({
  name: 'funcional: setear value aplica la máscara y emite is-input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const tel = document.querySelector('#tel');
        tel.addEventListener('is-input', (e) => {
          resolve({
            value: tel.value,
            formatted: tel.formatted,
            raw: tel.raw,
          });
        }, { once: true });
        // escribir sin la máscara, debería reformatear
        tel.value = '1145556677';
      });
    });
    // +54 9 ____ ____ ____ (sin completar) – al menos debe contener literales
    assert.ok(result.formatted.startsWith('+54 9'), `comienza con "+54 9" (${result.formatted})`);
    assert.match(result.formatted, / /, 'incluye espacios literales');
    assert.ok(result.raw.length > 0, 'raw no vacío tras setear valor');
  },
});

tests.push({
  name: 'funcional: los literales del patrón aparecen en el valor formateado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const result = await page.evaluate(() => {
      const fecha = document.querySelector('#fecha');
      fecha.value = '15072026';
      const tel = document.querySelector('#tel');
      tel.value = '1145556677';
      const card = document.querySelector('#card');
      card.value = '4111111111111111';
      return {
        fecha: fecha.value,
        tel: tel.value,
        card: card.value,
        rawFecha: fecha.raw,
      };
    });
    assert.equal(result.fecha, '15/07/2026', `fecha con literales "/" (${result.fecha})`);
    assert.match(result.tel, /^\+54 9 /, `tel comienza con literal "+54 9 " (${result.tel})`);
    assert.match(result.card, / /, `card incluye espacios (${result.card})`);
    assert.equal(result.rawFecha, '15072026', 'raw sin literales');
  },
});

tests.push({
  name: 'funcional: cambio de pattern reformatea el valor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const result = await page.evaluate(() => {
      const fecha = document.querySelector('#fecha');
      fecha.value = '15072026';
      const before = fecha.value;
      fecha.pattern = '00-00-0000';
      const after = fecha.value;
      return { before, after };
    });
    assert.equal(result.before, '15/07/2026', 'antes con "/"');
    assert.equal(result.after, '15-07-2026', 'después con "-" (pattern cambió)');
  },
});

tests.push({
  name: 'funcional: is-complete se dispara al llenar todos los slots requeridos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = document.querySelector('#req');
        req.addEventListener('is-complete', () => resolve({ complete: true }), { once: true });
        // simular typing: setear un valor que cubra los 8 slots requeridos
        req.value = '12345678';
      });
    });
    assert.equal(result.complete, true, 'is-complete disparado');
  },
});

tests.push({
  name: 'accesibilidad: required activa invalid tras blur con valor vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const result = await page.evaluate(() => {
      const req = document.querySelector('#req');
      const input = req.shadowRoot.querySelector('input.input');
      // focus y luego blur (vacío)
      input.focus();
      input.blur();
      return {
        required: req.hasAttribute('required'),
        invalid: req.hasAttribute('invalid'),
        inputDisabled: input.disabled,
      };
    });
    assert.equal(result.required, true, 'required attr presente');
    assert.equal(result.invalid, true, 'invalid attr presente tras blur vacío');
  },
});

tests.push({
  name: 'accesibilidad: el input interno es accesible y readonly se aplica',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const a11y = await page.evaluate(() => {
      // crear uno readonly nuevo para verificar
      const i = document.createElement('is-masked-input');
      i.setAttribute('pattern', '0000');
      i.setAttribute('readonly', '');
      document.body.appendChild(i);
      const input = i.shadowRoot.querySelector('input.input');
      const r = { readonly: input.readOnly };
      i.remove();
      return r;
    });
    assert.equal(a11y.readonly, true, 'readonly se propaga al input interno');
  },
});

tests.push({
  name: 'edge case: pattern vacío no rompe',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const result = await page.evaluate(() => {
      const i = document.createElement('is-masked-input');
      i.setAttribute('pattern', '');
      i.value = 'cualquier cosa 123';
      document.body.appendChild(i);
      const v = i.value;
      const f = i.formatted;
      const r = i.raw;
      i.remove();
      return { value: v, formatted: f, raw: r };
    });
    assert.equal(result.value, 'cualquier cosa 123', 'pattern vacío no muta el valor');
    assert.equal(result.raw, 'cualquiercosa123', 'raw sin espacios');
  },
});

tests.push({
  name: 'edge case: valor incompleto es válido pero complete=false',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-masked-input-ready');
    const result = await page.evaluate(() => {
      const req = document.querySelector('#req'); // pattern "0000-0000"
      req.value = '12'; // solo 2 dígitos, faltan 6
      return { value: req.value, complete: req.complete };
    });
    assert.equal(result.value, '12', 'valor preservado aunque incompleto');
    assert.equal(result.complete, false, 'complete=false');
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

report('masked-input', failures === 0, { total: tests.length, failures });
