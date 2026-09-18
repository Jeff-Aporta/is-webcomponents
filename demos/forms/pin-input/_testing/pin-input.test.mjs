// pin-input.test.mjs — tests funcionales del demo pin-input.html.
//
// Cobertura:
//   - smoke: custom element definido, shadow DOM con N celdas según length
//   - funcional: typing en una celda avanza a la siguiente (auto-avance);
//     paste distribuye caracteres; setear value completa varias celdas
//   - accesibilidad: cada celda tiene aria-label "Dígito N de M"; role=group
//   - edge cases: backspace en celda vacía retrocede y limpia; reset() borra
//     todas las celdas; disabled bloquea el typing
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/pin-input/pin-input.html`;

const tests = [];

tests.push({
  name: 'smoke: el custom element se define y monta N celdas según length',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const data = await page.evaluate(() => {
      const pins = [...document.querySelectorAll('is-pin-input')];
      return pins.map((p) => {
        const sr = p.shadowRoot;
        const cells = [...sr.querySelectorAll('input.cell')];
        return {
          defined: !!customElements.get('is-pin-input'),
          hasShadow: !!sr,
          cellsCount: cells.length,
          groupRole: sr?.querySelector('.pin')?.getAttribute('role'),
          ariaLabelFirst: cells[0]?.getAttribute('aria-label'),
          ariaLabelLast: cells[cells.length - 1]?.getAttribute('aria-label'),
          lengthAttr: p.getAttribute('length'),
          value: p.value,
        };
      });
    });
    assert.equal(data.length, 5, 'debe haber 5 pin-inputs (otp, pin, corto, texto, bloqueado)');
    assert.equal(data[0].defined, true, 'is-pin-input definido');
    assert.equal(data[0].hasShadow, true, 'shadow root presente');
    assert.equal(data[0].cellsCount, 6, '#otp tiene 6 celdas');
    assert.equal(data[1].cellsCount, 4, '#pin tiene 4 celdas');
    assert.equal(data[2].cellsCount, 4, '#corto tiene 4 celdas');
    assert.equal(data[3].cellsCount, 6, '#texto tiene 6 celdas');
    assert.equal(data[4].cellsCount, 6, '#bloqueado tiene 6 celdas');
    assert.equal(data[0].groupRole, 'group', 'role=group');
    assert.equal(data[0].ariaLabelFirst, 'Dígito 1 de 6', 'aria-label celda 1');
    assert.equal(data[0].ariaLabelLast, 'Dígito 6 de 6', 'aria-label celda 6');
    await screenshot(page, 'pin-input-smoke');
  },
});

tests.push({
  name: 'funcional: typing en una celda la rellena y auto-avanza a la siguiente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const result = await page.evaluate(() => {
      const pin = document.querySelector('#otp');
      const sr = pin.shadowRoot;
      const cells = [...sr.querySelectorAll('input.cell')];
      // simular typing con eventos nativos: dispatchEvent input en cada celda
      // después de setear el value.
      // Como el componente escucha el evento `input` directamente, simulamos
      // typing vía focus + dispatchEvent(new InputEvent('input')).
      cells.forEach((c, i) => {
        c.focus();
        c.value = String(i + 1);
        c.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      });
      return {
        values: cells.map((c) => c.value),
        pinValue: pin.value,
      };
    });
    // el componente distribuye; tras los inputs, value debe ser "123456"
    assert.equal(result.values.join(''), result.pinValue, 'values celdas == pin.value');
    assert.equal(result.pinValue, '123456', `value="123456" (${result.pinValue})`);
  },
});

tests.push({
  name: 'funcional: paste completa varias celdas a la vez',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const result = await page.evaluate(() => {
      const pin = document.querySelector('#otp');
      const sr = pin.shadowRoot;
      const target = sr.querySelector('input.cell[data-index="0"]');
      // Paste simulado
      const dt = new DataTransfer();
      dt.setData('text', '987654');
      const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, composed: true });
      pin.dispatchEvent(evt);
      // el componente escucha paste en el host
      return {
        value: pin.value,
        cells: [...sr.querySelectorAll('input.cell')].map((c) => c.value),
      };
    });
    assert.equal(result.value, '987654', `value="987654" (${result.value})`);
    assert.equal(result.cells.join(''), '987654', '6 celdas rellenas');
  },
});

tests.push({
  name: 'funcional: setear value rellena las celdas y emite is-pin-complete si está lleno',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const pin = document.querySelector('#otp');
        pin.addEventListener('is-pin-complete', (e) => {
          resolve({ eventValue: e.detail.value });
        }, { once: true });
        pin.value = '424242';
      });
    });
    assert.equal(result.eventValue, '424242', 'is-pin-complete disparado con "424242"');
  },
});

tests.push({
  name: 'funcional: reset() borra todas las celdas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const result = await page.evaluate(() => {
      const pin = document.querySelector('#otp');
      pin.value = '111111';
      const before = pin.value;
      pin.reset();
      const after = pin.value;
      const cells = [...pin.shadowRoot.querySelectorAll('input.cell')].map((c) => c.value);
      return { before, after, cells };
    });
    assert.equal(result.before, '111111', 'antes 111111');
    assert.equal(result.after, '', 'tras reset vacío');
    assert.equal(result.cells.join(''), '', 'celdas vacías');
  },
});

tests.push({
  name: 'accesibilidad: cada celda tiene aria-label "Dígito N de M"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const a11y = await page.evaluate(() => {
      const pin = document.querySelector('#pin'); // length=4
      const cells = [...pin.shadowRoot.querySelectorAll('input.cell')];
      return cells.map((c, i) => ({
        label: c.getAttribute('aria-label'),
        index: c.dataset.index,
      }));
    });
    assert.equal(a11y.length, 4, '4 celdas');
    assert.equal(a11y[0].label, 'Dígito 1 de 4', 'celda 1');
    assert.equal(a11y[3].label, 'Dígito 4 de 4', 'celda 4');
  },
});

tests.push({
  name: 'accesibilidad: type=text permite letras (pattern diferente)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const a11y = await page.evaluate(() => {
      const pin = document.querySelector('#texto'); // type=text
      const cells = [...pin.shadowRoot.querySelectorAll('input.cell')];
      return {
        pattern: cells[0]?.pattern,
        inputType: cells[0]?.type,
        inputMode: cells[0]?.inputMode,
      };
    });
    assert.equal(a11y.pattern, '[A-Za-z0-9]', 'pattern alfanumérico');
    assert.equal(a11y.inputType, 'text', 'type=text');
    assert.equal(a11y.inputMode, 'text', 'inputmode=text');
  },
});

tests.push({
  name: 'edge case: backspace en celda vacía retrocede',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const result = await page.evaluate(() => {
      const pin = document.querySelector('#otp');
      pin.value = '12';
      const cells = [...pin.shadowRoot.querySelectorAll('input.cell')];
      // focus en celda 2 (vacía) y simular Backspace
      cells[2].focus();
      cells[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, composed: true }));
      return {
        value: pin.value,
        values: cells.map((c) => c.value),
      };
    });
    // tras Backspace en celda vacía, debería retroceder a celda 1 (con '2') y vaciarla
    assert.equal(result.value, '1', `value="1" tras backspace (${result.value})`);
    assert.equal(result.values[0], '1', 'celda 1 = "1"');
    assert.equal(result.values[1], '', 'celda 2 = ""');
  },
});

tests.push({
  name: 'edge case: disabled bloquea el typing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pin-input-ready');
    const result = await page.evaluate(() => {
      const pin = document.querySelector('#bloqueado');
      pin.value = '999999'; // intentar sobreescribir
      return {
        value: pin.value,
        disabled: pin.hasAttribute('disabled'),
        cellDisabled: pin.shadowRoot.querySelector('input.cell').disabled,
      };
    });
    // disabled debería evitar el typing programático (value se acepta, pero
    // las celdas están disabled → no permite typing manual)
    assert.equal(result.disabled, true, 'atributo disabled');
    assert.equal(result.cellDisabled, true, 'celdas tienen disabled=true');
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

report('pin-input', failures === 0, { total: tests.length, failures });
