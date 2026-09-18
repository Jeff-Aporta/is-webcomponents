// code.test.mjs — tests exhaustivos del demo code.html para <is-code>.
// Cobertura:
//   smoke + render (tokenización, líneas, line numbers, ready event)
//   funcional (edición en textarea, tab indent, lang change, setMarks/
//     clearMarks, format(), code2json(), readonly vs editable)
//   determinismo (round-trip code2json → setDocument preserva lang/value)
//   accesibilidad (aria-readonly refleja el atributo)
//   prefers-color-scheme: dark  → tema oscuro (data-theme="dark" en <html>)
//   prefers-reduced-motion      → render estable y sin animaciones
//
// Mismo patrón que diagramas/ER/_testing/er-editor.test.mjs. Se reusa el
// harness compartido de esa categoría (es genérico: importa solo playwright
// y expone BASE_URL/newPage/close/waitReady/screenshot/report).
import assert from 'node:assert/strict';
// El harness compartido vive en otra categoría (demos/diagramas/ER). Lo
// reusamos para no duplicar 90 líneas de boilerplate de Playwright.
// Resolución desde `demos/code/code/_testing/`:
//   ../..  → demos/code/
//   ../../.. → demos/
//   ../../../diagramas/ER/_testing/lib/harness.mjs
import {
  BASE_URL, newPage, close, waitReady, screenshot, report,
} from '../../../diagramas/ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/code/code/code.html`;
const tests = [];

tests.push({
  name: 'smoke: <is-code> monta, emite is-ready y pinta líneas tokenizadas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const data = await page.evaluate(() => {
      const js = document.getElementById('code-js');
      const shadow = js.shadowRoot;
      const lines = [...shadow.querySelectorAll('.ic-line')];
      const tokens = [...shadow.querySelectorAll('.ic-line span[class^="tok-"]')];
      const seed = shadow.querySelector('.seed');
      const gutter = shadow.querySelector('.ic-gutter');
      const ln = [...shadow.querySelectorAll('.ic-ln')].map((n) => n.textContent.trim());
      return {
        defined: !!customElements.get('is-code'),
        jsDefined: !!customElements.get('is-code'),
        hasShadow: !!shadow,
        hasSeed: !!seed,
        lineCount: lines.length,
        tokenCount: tokens.length,
        hasGutter: !!gutter,
        lineNumbers: ln,
        value: js.value,
      };
    });
    assert.equal(data.defined, true, 'is-code debe estar definido');
    assert.ok(data.hasShadow, 'debe tener shadow root');
    assert.ok(data.hasSeed, 'debe existir la semilla .seed');
    assert.ok(data.lineCount >= 5, `esperaba >=5 líneas, hay ${data.lineCount}`);
    assert.ok(data.tokenCount > 0, 'esperaba tokens resaltados (>0)');
    assert.equal(data.hasGutter, true, 'gutter debe estar presente por defecto');
    assert.deepEqual(data.lineNumbers.slice(0, 5), ['1', '2', '3', '4', '5'],
      'los números de línea deben ir 1,2,3,4,5');
    assert.match(data.value, /greet/, 'el value debe contener el código sembrado');
    await screenshot(page, 'code-smoke');
  },
});

tests.push({
  name: 'funcionalline numbers: line-numbers="false" oculta el gutter',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    await page.evaluate(() => {
      const el = document.getElementById('code-js-readonly');
      el.lineNumbers = false; // setter que refleja en el atributo
    });
    await page.waitForTimeout(50);
    const hasGutter = await page.evaluate(() => {
      const el = document.getElementById('code-js-readonly');
      return !!el.shadowRoot.querySelector('.ic-gutter');
    });
    assert.equal(hasGutter, false, 'no debe haber .ic-gutter con lineNumbers=false');
  },
});

tests.push({
  name: 'funcional: readonly no expone <textarea class="ic-input">',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const data = await page.evaluate(() => {
      const ed = document.getElementById('code-js');
      const ro = document.getElementById('code-js-readonly');
      return {
        editableHasInput: !!ed.shadowRoot.querySelector('textarea.ic-input'),
        readonlyHasInput: !!ro.shadowRoot.querySelector('textarea.ic-input'),
        readonlyAria: ro.getAttribute('aria-readonly'),
        readonlyAttr: ro.hasAttribute('readonly'),
      };
    });
    assert.equal(data.editableHasInput, true, 'modo editable debe exponer textarea.ic-input');
    assert.equal(data.readonlyHasInput, false, 'modo readonly NO debe exponer textarea.ic-input');
    assert.equal(data.readonlyAria, 'true', 'aria-readonly debe reflejar el atributo readonly');
    assert.equal(data.readonlyAttr, true, 'readonly debe estar como atributo');
  },
});

tests.push({
  name: 'funcional: editar el textarea actualiza el highlight y dispara is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const changes = await page.evaluate(async () => {
      const ed = document.getElementById('code-js');
      const ta = ed.shadowRoot.querySelector('textarea.ic-input');
      let count = 0;
      const handler = () => { count++; };
      ed.addEventListener('is-change', handler);
      ta.value = '// hello\nconst x = 42;\nconsole.log(x);';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      // Esperar un microtask para que los handlers asíncronos encolen
      await new Promise((r) => setTimeout(r, 30));
      ed.removeEventListener('is-change', handler);
      const lines = [...ed.shadowRoot.querySelectorAll('.ic-line')].length;
      return { count, lines, value: ed.value };
    });
    assert.ok(changes.count >= 1, `is-change debió dispararse >=1 vez (fue ${changes.count})`);
    assert.equal(changes.lines, 3, `esperaba 3 líneas repintadas, hay ${changes.lines}`);
    assert.equal(changes.value, '// hello\nconst x = 42;\nconsole.log(x);',
      'el value debe reflejar el contenido del textarea');
  },
});

tests.push({
  name: 'funcional: Tab inserta indent según tab-size',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const result = await page.evaluate(async () => {
      const ed = document.getElementById('code-js');
      const ta = ed.shadowRoot.querySelector('textarea.ic-input');
      ta.value = 'a';
      ta.focus();
      ta.setSelectionRange(1, 1);
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
      return { value: ta.value, tabSize: ed.tabSize };
    });
    assert.equal(result.tabSize, 2, 'tabSize debe ser 2 (atributo tab-size)');
    assert.equal(result.value, 'a  ', `Tab debió insertar 2 espacios (value="${result.value}")`);
  },
});

tests.push({
  name: 'funcional: setMarks pinta <span.is-code-mark> y clearMarks los quita',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const data = await page.evaluate(async () => {
      const ed = document.getElementById('code-js');
      const v = ed.value ?? '';
      const idx = v.indexOf('greet');
      ed.setMarks([
        { id: 'm1', from: idx, to: idx + 5, kind: 'underline', tone: 'info',
          title: 'Función', message: 'Definida más abajo.' },
      ]);
      await new Promise((r) => setTimeout(r, 30));
      const before = ed.shadowRoot.querySelectorAll('span.is-code-mark').length;
      ed.clearMarks();
      await new Promise((r) => setTimeout(r, 30));
      const after = ed.shadowRoot.querySelectorAll('span.is-code-mark').length;
      return { before, after };
    });
    assert.ok(data.before >= 1, `setMarks debió pintar >=1 marca (fueron ${data.before})`);
    assert.equal(data.after, 0, `clearMarks debió quitar todas las marcas (quedan ${data.after})`);
  },
});

tests.push({
  name: 'funcional: format() reformatea JavaScript con saltos consistentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const result = await page.evaluate(async () => {
      const ed = document.getElementById('code-js');
      // Pegar un snippet largo (>60 chars) para que el formato JS dispare la
      // rama de "expandir a multi-línea" (mismo umbral que usa formatCode).
      ed.value = [
        'function computePrice(items, tax){',
        '  let total = 0;',
        '  for (const it of items) { total += it.price; }',
        '  return total * (1 + tax);',
        '}',
      ].join('\n');
      await new Promise((r) => setTimeout(r, 30));
      ed.format();
      await new Promise((r) => setTimeout(r, 30));
      return { value: ed.value };
    });
    assert.match(result.value, /\bfunction\b/, 'debe mantener la palabra function');
    assert.match(result.value, /\n/, 'format() debe meter saltos de línea');
    // El formato JS Prettier-like deja ; final tras `return ...;`.
    assert.match(result.value, /;\s*\n?\s*\}\s*$/,
      'format() debe cerrar con `};` al final (value final: ' + JSON.stringify(result.value.slice(-20)) + ')');
  },
});

tests.push({
  name: 'funcional: code2json() devuelve un documento con lang/value/marks',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const doc = await page.evaluate(async () => {
      const ed = document.getElementById('code-js');
      const idx = (ed.value ?? '').indexOf('greet');
      ed.setMarks([
        { id: 'k1', from: idx, to: idx + 5, kind: 'underline', tone: 'info' },
      ]);
      await new Promise((r) => setTimeout(r, 30));
      return ed.code2json();
    });
    assert.equal(typeof doc, 'object', 'code2json() debe devolver un objeto');
    assert.equal(doc.lang, 'javascript', `lang debe ser javascript (fue "${doc.lang}")`);
    assert.match(doc.value, /greet/, 'value debe contener el código');
    assert.ok(Array.isArray(doc.marks) && doc.marks.length >= 1,
      `marks debe ser un array con >=1 entrada (fue ${JSON.stringify(doc.marks)})`);
  },
});

tests.push({
  name: 'determinismo: setDocument con un code2json preserva lang/value/marks',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const result = await page.evaluate(async () => {
      const ed = document.getElementById('code-js');
      const idx = (ed.value ?? '').indexOf('greet');
      ed.setMarks([
        { id: 'k1', from: idx, to: idx + 5, kind: 'underline', tone: 'info' },
      ]);
      await new Promise((r) => setTimeout(r, 30));
      const a = JSON.stringify(ed.code2json());
      // Reconstruir desde JSON
      ed.setDocument(JSON.parse(a));
      await new Promise((r) => setTimeout(r, 30));
      const b = JSON.stringify(ed.code2json());
      return { a, b, lang: ed.lang };
    });
    assert.equal(result.lang, 'javascript', 'lang debe seguir siendo javascript');
    assert.equal(result.a, result.b, 'round-trip code2json → setDocument → code2json debe ser idéntico');
  },
});

tests.push({
  name: 'funcional: cambiar lang re-pinta con tokens del nuevo lenguaje',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const result = await page.evaluate(async () => {
      const ed = document.getElementById('code-html');
      ed.value = '<div class="x">hola</div>';
      ed.lang = 'html';
      await new Promise((r) => setTimeout(r, 30));
      const html = ed.shadowRoot.querySelector('.ic-native').innerHTML;
      const css = document.getElementById('code-css');
      css.value = 'a { color: red; }';
      css.lang = 'css';
      await new Promise((r) => setTimeout(r, 30));
      const cssHtml = css.shadowRoot.querySelector('.ic-native').innerHTML;
      return {
        htmlHasTag: /tok-tag/.test(html),
        cssHasProp: /tok-property/.test(cssHtml),
        htmlLang: ed.lang,
        cssLang: css.lang,
      };
    });
    assert.equal(result.htmlLang, 'html', 'lang debe haberse aplicado a HTML');
    assert.equal(result.cssLang, 'css', 'lang debe haberse aplicado a CSS');
    assert.equal(result.htmlHasTag, true, 'HTML debe pintarse con clase tok-tag');
    assert.equal(result.cssHasProp, true, 'CSS debe pintarse con clase tok-property');
  },
});

tests.push({
  name: 'tema: data-theme="dark" deja el fondo del host en tono oscuro',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    // El demo arranca en dark — verificamos que bg es oscuro.
    const dark = await page.evaluate(() => {
      const ed = document.getElementById('code-js');
      const cs = getComputedStyle(ed);
      return { bg: cs.getPropertyValue('--is-code-bg').trim() };
    });
    // El bundle define --is-code-bg = #1e1e1e en dark.
    assert.match(dark.bg, /#1e1e1e|30,30,30/i,
      `--is-code-bg debe ser oscuro en dark (fue "${dark.bg}")`);

    // Cambiamos a light. <is-code> escucha `is-theme-change` en document para
    // re-aplicar el preset (no se re-monta en cada cambio de atributo).
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
      document.dispatchEvent(new CustomEvent('is-theme-change'));
    });
    await page.waitForTimeout(80);
    const light = await page.evaluate(() => {
      const ed = document.getElementById('code-js');
      const cs = getComputedStyle(ed);
      return { bg: cs.getPropertyValue('--is-code-bg').trim() };
    });
    assert.notEqual(light.bg, dark.bg,
      `--is-code-bg debe cambiar al pasar a light (light="${light.bg}" vs dark="${dark.bg}")`);
    // Volvemos a dark para no contaminar otros tests.
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.dispatchEvent(new CustomEvent('is-theme-change'));
    });
  },
});

tests.push({
  name: 'tema: emulateMedia({ colorScheme: "dark" }) no rompe el componente',
  run: async (page) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const ok = await page.evaluate(() => {
      const ed = document.getElementById('code-js');
      return {
        defined: !!customElements.get('is-code'),
        hasLines: ed.shadowRoot.querySelectorAll('.ic-line').length > 0,
        hasGutter: !!ed.shadowRoot.querySelector('.ic-gutter'),
      };
    });
    assert.equal(ok.defined, true, 'is-code debe seguir definido');
    assert.ok(ok.hasLines, 'debe seguir pintando líneas bajo colorScheme:dark');
    assert.equal(ok.hasGutter, true, 'el gutter debe seguir presente');
  },
});

tests.push({
  name: 'motion: emulateMedia({ reducedMotion: "reduce" }) — render estable y sin animaciones',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const data = await page.evaluate(() => {
      const ed = document.getElementById('code-js');
      const elements = [
        ed,
        ed.shadowRoot.querySelector('.root'),
        ed.shadowRoot.querySelector('.ic-native'),
        ed.shadowRoot.querySelector('.ic-gutter'),
        ed.shadowRoot.querySelector('.ic-line'),
      ].filter(Boolean);
      const motionStates = elements.map((el) => {
        const cs = getComputedStyle(el);
        return {
          animationDuration: cs.animationDuration,
          animationName: cs.animationName,
          transitionDuration: cs.transitionDuration,
        };
      });
      return {
        lineCount: ed.shadowRoot.querySelectorAll('.ic-line').length,
        motionStates,
      };
    });
    assert.ok(data.lineCount > 0, 'debe seguir pintando líneas bajo reducedMotion');
    // El bundle de is-code no define animaciones: las duraciones deberían
    // ser 0s o "none". Comprobamos que ninguna es > 0s en el host visible.
    for (const m of data.motionStates) {
      assert.match(m.animationDuration, /^0s|^none|^0ms|^$/i,
        `animationDuration debe ser 0/none en reducedMotion (fue "${m.animationDuration}")`);
      assert.match(m.transitionDuration, /^0s|^none|^0ms|^$/i,
        `transitionDuration debe ser 0/none en reducedMotion (fue "${m.transitionDuration}")`);
    }
  },
});

tests.push({
  name: 'a11y: el host editable tiene aria-readonly="false" y un textarea accesible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-code-ready');
    const a11y = await page.evaluate(() => {
      const ed = document.getElementById('code-js');
      const ta = ed.shadowRoot.querySelector('textarea.ic-input');
      return {
        ariaReadonly: ed.getAttribute('aria-readonly'),
        hasTextarea: !!ta,
        tabIndex: ta ? ta.tabIndex : null,
      };
    });
    assert.equal(a11y.ariaReadonly, 'false', 'aria-readonly debe ser "false" en editable');
    assert.ok(a11y.hasTextarea, 'textarea accesible debe existir');
    assert.ok(a11y.tabIndex >= -1, 'textarea debe ser focusable (tabIndex >= -1)');
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

report('code', failures === 0, { total: tests.length, failures });
