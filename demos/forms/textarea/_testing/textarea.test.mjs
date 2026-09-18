// textarea.test.mjs — tests exhaustivos del demo textarea.html.
// Cobertura: smoke + funcional (value sync, autosize, rows)
// + accesibilidad (aria-invalid) + edge case (required, maxlength, error).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/textarea/textarea.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-textarea> definido, shadow DOM y textarea nativa visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-textarea-ready');
    const data = await page.evaluate(() => {
      const ta = document.querySelector('is-textarea#demo');
      const sr = ta.shadowRoot;
      const native = sr.querySelector('textarea');
      const label = sr.querySelector('label#label');
      const hint = sr.querySelector('#hint');
      return {
        defined: !!customElements.get('is-textarea'),
        hasShadow: !!sr,
        nativeRows: native?.rows,
        nativeId: native?.id,
        hasLabel: !!label,
        labelText: label?.textContent?.trim(),
        hasHint: !!hint,
        hintText: hint?.textContent?.trim(),
      };
    });
    assert.equal(data.defined, true, 'is-textarea debe estar definido');
    assert.equal(data.hasShadow, true, 'debe tener shadow DOM');
    assert.equal(data.nativeId, 'textarea', 'el textarea nativo debe tener id=textarea');
    assert.equal(data.hasLabel, true, 'debe tener label');
    assert.match(data.labelText, /Mensaje/, 'el label debe mencionar Mensaje');
    assert.match(data.hintText, /Cuéntanos/, 'el hint debe mencionar Cuéntanos');
    await screenshot(page, 'textarea-smoke');
  },
});

tests.push({
  name: 'funcional: set .value → textarea nativo refleja y emite is-input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-textarea-ready');
    const triggered = await page.evaluate(() => new Promise((resolve) => {
      const ta = document.querySelector('is-textarea#demo');
      ta.addEventListener('is-input', (e) => resolve({ ok: true, value: e.detail.value }), { once: true });
      const native = ta.shadowRoot.getElementById('textarea');
      native.value = 'Línea 1\nLínea 2';
      native.dispatchEvent(new Event('input', { bubbles: true }));
    }));
    assert.equal(triggered.ok, true, 'is-input debe dispararse');
    assert.equal(triggered.value, 'Línea 1\nLínea 2', 'detail.value debe coincidir');
    const mirrored = await page.evaluate(() => ({
      property: document.querySelector('is-textarea#demo').value,
      native: document.querySelector('is-textarea#demo').shadowRoot.getElementById('textarea').value,
    }));
    assert.equal(mirrored.property, 'Línea 1\nLínea 2', 'la propiedad value debe reflejar');
    assert.equal(mirrored.native, 'Línea 1\nLínea 2', 'el textarea nativo debe reflejar');
  },
});

tests.push({
  name: 'funcional: autosize=true aumenta la altura al crecer el contenido',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-textarea-ready');
    const data = await page.evaluate(async () => {
      const ta = document.querySelector('is-textarea#demo');
      const native = ta.shadowRoot.getElementById('textarea');
      // Esperar al refit inicial.
      await new Promise((r) => setTimeout(r, 100));
      const before = native.getBoundingClientRect().height;
      // Añadir mucho contenido para forzar el crecimiento.
      native.value = 'línea\nlínea\nlínea\nlínea\nlínea\nlínea\nlínea\nlínea';
      native.dispatchEvent(new Event('input', { bubbles: true }));
      // Esperar al refit (ResizeObserver + nextTick).
      await new Promise((r) => setTimeout(r, 150));
      const after = native.getBoundingClientRect().height;
      return { before, after, autosize: ta.autosize };
    });
    assert.equal(data.autosize, true, 'autosize debe estar activo');
    assert.ok(data.after > data.before, `altura debe crecer (before=${data.before}, after=${data.after})`);
  },
});

tests.push({
  name: 'funcional: rows=4 fija la altura inicial del textarea',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-textarea-ready');
    const data = await page.evaluate(() => {
      const ta = document.querySelector('is-textarea[name="fixed"]');
      const native = ta.shadowRoot.querySelector('textarea');
      return {
        rows: ta.rows,
        nativeRows: native.rows,
        resize: ta.resize,
        cssResize: native.style.resize,
      };
    });
    assert.equal(data.rows, 4, 'rows debe ser 4');
    assert.equal(data.nativeRows, 4, 'el textarea nativo debe tener rows=4');
    assert.equal(data.resize, 'vertical', 'resize debe ser vertical');
    assert.equal(data.cssResize, 'vertical', 'css resize debe ser vertical');
  },
});

tests.push({
  name: 'accesibilidad: error → aria-invalid y error-text visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-textarea-ready');
    const data = await page.evaluate(() => {
      const ta = document.querySelector('is-textarea[name="err"]');
      const native = ta.shadowRoot.getElementById('textarea');
      const errEl = ta.shadowRoot.getElementById('error-text');
      return {
        ariaInvalid: native.getAttribute('aria-invalid'),
        errorVisible: !errEl.hidden,
        errorText: errEl.textContent?.trim(),
      };
    });
    assert.equal(data.ariaInvalid, 'true', 'aria-invalid debe ser true');
    assert.equal(data.errorVisible, true, 'el error-text debe verse');
    assert.match(data.errorText, /corto|inválid/i, 'el texto debe mencionar el error');
  },
});

tests.push({
  name: 'edge case: required vacío → validity.valueMissing',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-textarea-ready');
    const data = await page.evaluate(() => {
      const ta = document.querySelector('is-textarea[name="rq"]');
      ta.value = '';
      return {
        valueMissing: ta.validity?.valueMissing,
        ariaInvalid: ta.shadowRoot.getElementById('textarea').getAttribute('aria-invalid'),
      };
    });
    assert.equal(data.valueMissing, true, 'valueMissing debe ser true');
    assert.equal(data.ariaInvalid, 'true', 'aria-invalid debe ser true');
  },
});

tests.push({
  name: 'edge case: show-count muestra el contador',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-textarea-ready');
    const data = await page.evaluate(() => {
      const ta = document.querySelector('is-textarea[name="count"]');
      const count = ta.shadowRoot.getElementById('count');
      ta.value = 'abcdef';
      // Forzar sync (count se actualiza en #syncSupport que se llama en #update).
      ta.shadowRoot.getElementById('textarea').dispatchEvent(new Event('input', { bubbles: true }));
      return {
        visible: !count.hidden,
        text: count.textContent?.trim(),
      };
    });
    assert.equal(data.visible, true, 'el contador debe verse');
    assert.equal(data.text, '6/50', 'el contador debe mostrar 6/50');
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

report('textarea', failures === 0, { total: tests.length, failures });
