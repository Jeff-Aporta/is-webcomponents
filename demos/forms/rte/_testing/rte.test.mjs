// rte.test.mjs — tests funcionales del demo rte.html.
// Cobertura: smoke + funcional (toolbar, execCommand-style formatting via exec(),
// source mode) + accesibilidad (role=toolbar) + caso límite (toolbar reducida).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/rte/rte.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-rte> queda definido con toolbar y content editable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const data = await page.evaluate(() => {
      const rtes = [...document.querySelectorAll('main is-rte')];
      const full = rtes[0];
      const shadow = full.shadowRoot;
      return {
        defined: !!customElements.get('is-rte'),
        count: rtes.length,
        toolbar: !!shadow.querySelector('[role="toolbar"]'),
        btns: shadow.querySelectorAll('.toolbar .btn').length,
        content: !!shadow.querySelector('[contenteditable="true"]'),
        placeholder: !!shadow.querySelector('.placeholder'),
        initialText: full.text.slice(0, 30),
      };
    });
    assert.equal(data.defined, true, 'is-rte debe estar definido');
    assert.ok(data.count >= 3, `esperaba >=3 rtes, hay ${data.count}`);
    assert.equal(data.toolbar, true, 'la toolbar debe tener role=toolbar');
    assert.ok(data.btns >= 5, `esperaba >=5 botones en la toolbar por defecto, hay ${data.btns}`);
    assert.equal(data.content, true, 'debe existir un [contenteditable=true]');
    assert.equal(data.placeholder, true, 'debe existir un placeholder visible');
    assert.match(data.initialText, /Bienvenido|editor/i);
    await screenshot(page, 'rte-smoke');
  },
});

tests.push({
  name: 'funcional: la toolbar expone los comandos esperados (bold/italic/h1/ul/link/clear)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const cmds = await page.evaluate(() => {
      const r = document.querySelector('main is-rte');
      return [...r.shadowRoot.querySelectorAll('.toolbar .btn')].map((b) => b.dataset.cmd);
    });
    for (const required of ['bold', 'italic', 'underline', 'h1', 'h2', 'h3', 'ul', 'ol', 'link', 'blockquote', 'code', 'undo', 'redo', 'clear']) {
      assert.ok(cmds.includes(required), `la toolbar por defecto debe incluir "${required}", obtuve ${JSON.stringify(cmds)}`);
    }
  },
});

tests.push({
  name: 'funcional: exec() aplica formato (bold) y queda reflejado en value',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const data = await page.evaluate(() => {
      const r = document.querySelector('main is-rte');
      // Limpia y escribe texto nuevo
      r.clear();
      r.focus();
      r.insertHtml('texto de prueba');
      // Selecciona todo y aplica bold
      try { document.execCommand('selectAll'); } catch {}
      r.exec('bold');
      // Forzar sincronización
      r.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        html: r.value,
        text: r.text,
      };
    });
    assert.ok(/<b>|<strong>/i.test(data.html), `value debe contener <b>/<strong>, obtuve "${data.html.slice(0, 200)}"`);
    assert.match(data.text, /texto de prueba/);
  },
});

tests.push({
  name: 'funcional: insertHtml() añade HTML en la posición del cursor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const data = await page.evaluate(() => {
      const r = document.querySelector('main is-rte');
      r.clear();
      r.focus();
      r.insertHtml('<i>insertado</i>');
      return {
        html: r.value,
        text: r.text,
      };
    });
    assert.ok(/<i>insertado<\/i>/.test(data.html), `value debe contener el HTML insertado, obtuve "${data.html}"`);
    assert.match(data.text, /insertado/);
  },
});

tests.push({
  name: 'funcional: source-mode alterna entre WYSIWYG y <textarea> con HTML crudo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const data = await page.evaluate(() => {
      const r = document.querySelector('main is-rte');
      const before = {
        contentHidden: r.shadowRoot.querySelector('.content').hidden,
        sourceHidden: r.shadowRoot.querySelector('.source').hidden,
      };
      r.sourceMode = true;
      const on = {
        contentHidden: r.shadowRoot.querySelector('.content').hidden,
        sourceHidden: r.shadowRoot.querySelector('.source').hidden,
        sourceValue: r.shadowRoot.querySelector('.source').value,
      };
      r.sourceMode = false;
      const off = {
        contentHidden: r.shadowRoot.querySelector('.content').hidden,
        sourceHidden: r.shadowRoot.querySelector('.source').hidden,
      };
      return { before, on, off };
    });
    assert.equal(data.before.contentHidden, false, 'en WYSIWYG el content debe estar visible');
    assert.equal(data.before.sourceHidden, true, 'en WYSIWYG el source debe estar oculto');
    assert.equal(data.on.contentHidden, true, 'en source-mode el content debe estar oculto');
    assert.equal(data.on.sourceHidden, false, 'en source-mode el source debe estar visible');
    assert.ok(data.on.sourceValue.length > 0, `source textarea debe tener el HTML, obtuve "${data.on.sourceValue.slice(0, 80)}"`);
    assert.equal(data.off.contentHidden, false, 'al volver a WYSIWYG el content debe volver a estar visible');
  },
});

tests.push({
  name: 'funcional: toolbar reducida sólo expone los comandos declarados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const cmds = await page.evaluate(() => {
      const rtes = [...document.querySelectorAll('main is-rte')];
      const mini = rtes.find((r) => r.getAttribute('name') === 'note');
      return [...mini.shadowRoot.querySelectorAll('.toolbar .btn')].map((b) => b.dataset.cmd);
    });
    const expected = ['bold', 'italic', 'underline', 'link', 'clear'];
    assert.deepEqual(cmds, expected, `toolbar reducida debe ser ${JSON.stringify(expected)}, obtuve ${JSON.stringify(cmds)}`);
  },
});

tests.push({
  name: 'accesibilidad: la toolbar tiene role=toolbar y los botones llevan aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const a11y = await page.evaluate(() => {
      const r = document.querySelector('main is-rte');
      const tb = r.shadowRoot.querySelector('.toolbar');
      const buttons = [...r.shadowRoot.querySelectorAll('.toolbar .btn')];
      const allLabelled = buttons.every((b) => b.getAttribute('aria-label'));
      return {
        role: tb.getAttribute('role'),
        btnCount: buttons.length,
        allLabelled,
      };
    });
    assert.equal(a11y.role, 'toolbar', 'toolbar debe tener role="toolbar"');
    assert.ok(a11y.btnCount > 0, 'debe haber al menos un botón');
    assert.equal(a11y.allLabelled, true, 'todos los botones deben llevar aria-label');
  },
});

tests.push({
  name: 'caso límite: clear() deja el editor vacío (sin <b>, <i>, etc.)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const data = await page.evaluate(() => {
      const r = document.querySelector('main is-rte');
      // Rellena con contenido formateado
      r.clear();
      r.focus();
      r.insertHtml('<b>bold</b> <i>italic</i>');
      const before = { html: r.value, text: r.text };
      r.clear();
      const after = { html: r.value, text: r.text };
      return { before, after };
    });
    assert.match(data.before.text, /bold italic/);
    assert.match(data.after.text, /^$/, `tras clear() el texto debe estar vacío, obtuve "${data.after.text}"`);
    assert.ok(!/<b>|<i>/i.test(data.after.html), `tras clear() no debe quedar formato, obtuve "${data.after.html}"`);
  },
});

tests.push({
  name: 'caso límite: readonly desactiva contentEditable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-rte-ready');
    const data = await page.evaluate(() => {
      const rtes = [...document.querySelectorAll('main is-rte')];
      const ro = rtes.find((r) => r.getAttribute('name') === 'docs');
      const content = ro.shadowRoot.querySelector('.content');
      const source = ro.shadowRoot.querySelector('.source');
      return {
        contentEditable: content.getAttribute('contenteditable'),
        sourceReadOnly: source.hasAttribute('readonly'),
      };
    });
    assert.equal(data.contentEditable, 'false', 'readonly debe poner contentEditable=false');
    assert.equal(data.sourceReadOnly, true, 'readonly debe poner source textarea readonly');
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

report('rte', failures === 0, { total: tests.length, failures });
