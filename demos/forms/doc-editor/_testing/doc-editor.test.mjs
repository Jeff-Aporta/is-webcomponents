// doc-editor.test.mjs — tests funcionales del demo doc-editor.html.
// Cobertura: smoke + funcional (value, addBlock, updateBlock, removeBlock,
// JSON seed inline) + accesibilidad (contenteditable en bloques) + caso límite
// (vacío: 1 bloque por defecto).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/doc-editor/doc-editor.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-doc-editor> queda definido y renderiza los bloques iniciales',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      const docs = [...document.querySelectorAll('main is-doc-editor')];
      const d1 = docs[0];
      const shadow = d1.shadowRoot;
      const blocks = [...shadow.querySelectorAll('.block')];
      return {
        defined: !!customElements.get('is-doc-editor'),
        count: docs.length,
        blockCount: blocks.length,
        types: blocks.map((b) => b.className.match(/block-(\S+)/)?.[1]),
        blockNames: docs.map((d) => d.getAttribute('name')),
      };
    });
    assert.equal(data.defined, true, 'is-doc-editor debe estar definido');
    assert.ok(data.count >= 3, `esperaba >=3 doc-editors, hay ${data.count}`);
    assert.ok(data.blockCount >= 7, `el primer doc debe tener >=7 bloques, tiene ${data.blockCount}`);
    assert.ok(data.types.includes('heading-1'), 'debe haber un bloque heading-1');
    assert.ok(data.types.includes('paragraph'), 'debe haber un bloque paragraph');
    assert.ok(data.types.includes('todo'), 'debe haber un bloque todo');
    assert.ok(data.types.includes('quote'), 'debe haber un bloque quote');
    assert.ok(data.types.includes('code'), 'debe haber un bloque code');
    assert.deepEqual(data.blockNames.sort(), ['inline-json', 'meeting', 'scratch'], 'los 3 doc-editors deben tener name únicos');
    await screenshot(page, 'doc-editor-smoke');
  },
});

tests.push({
  name: 'funcional: get value() devuelve JSON serializable de los bloques',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      const d = document.querySelector('is-doc-editor[name="meeting"]');
      const valueStr = d.value;
      let parsed = null;
      try { parsed = JSON.parse(valueStr); } catch {}
      return { valueStr, parsed, blocks: d.blocks };
    });
    assert.ok(data.valueStr && data.valueStr.length > 0, 'value debe ser un string no vacío');
    assert.ok(Array.isArray(data.parsed), 'value parseado debe ser un array');
    assert.ok(data.parsed.length >= 7, `array debe tener >=7 bloques, tiene ${data.parsed.length}`);
    assert.equal(data.parsed[0].type, 'heading-1', 'primer bloque debe ser heading-1');
    assert.equal(data.parsed[0].text, 'Notas de la reunión', 'texto del heading-1');
    // blocks debe ser el array vivo
    assert.ok(Array.isArray(data.blocks), 'blocks debe ser array');
    assert.equal(data.blocks.length, data.parsed.length);
  },
});

tests.push({
  name: 'funcional: addBlock() añade un nuevo bloque y dispara is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(async () => {
      const d = document.querySelector('is-doc-editor[name="scratch"]');
      const before = d.blocks.length;
      const changePromise = new Promise((resolve) => {
        d.addEventListener('is-change', (e) => resolve(e.detail?.blocks?.length), { once: true });
      });
      d.addBlock('paragraph');
      const afterRender = d.blocks.length;
      const changed = await Promise.race([
        changePromise,
        new Promise((res) => setTimeout(() => res(-1), 500)),
      ]);
      return { before, afterRender, changed };
    });
    assert.equal(data.before, 1, 'el doc vacío debe tener 1 bloque por defecto');
    assert.equal(data.afterRender, 2, 'addBlock debe incrementar a 2 bloques');
    assert.ok(data.changed >= 2, `is-change debe emitirse con blocks.length >= 2, obtuve ${data.changed}`);
  },
});

tests.push({
  name: 'funcional: updateBlock() modifica text y checked de un bloque existente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      const d = document.querySelector('is-doc-editor[name="meeting"]');
      const todoBlock = d.blocks.find((b) => b.type === 'todo' && b.text.startsWith('Enviar'));
      const id = todoBlock.id;
      d.updateBlock(id, { text: 'Enviar el informe mensual', checked: true });
      const after = d.blocks.find((b) => b.id === id);
      return {
        id,
        newText: after.text,
        newChecked: after.checked,
      };
    });
    assert.equal(data.newText, 'Enviar el informe mensual', 'text debe estar actualizado');
    assert.equal(data.newChecked, true, 'checked debe estar actualizado');
  },
});

tests.push({
  name: 'funcional: removeBlock() elimina un bloque por id',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      const d = document.querySelector('is-doc-editor[name="meeting"]');
      const before = d.blocks.length;
      const target = d.blocks.find((b) => b.type === 'code');
      const id = target.id;
      d.removeBlock(id);
      const afterLen = d.blocks.length;
      const stillThere = d.blocks.find((b) => b.id === id);
      const stillInDom = !!d.shadowRoot.querySelector(`.block[data-id="${id}"]`);
      return { before, afterLen, stillThere: !!stillThere, stillInDom };
    });
    assert.equal(data.afterLen, data.before - 1, `blocks debe decrecer en 1 (before=${data.before}, after=${data.afterLen})`);
    assert.equal(data.stillThere, false, 'el bloque eliminado no debe estar en blocks');
    assert.equal(data.stillInDom, false, 'el bloque eliminado no debe estar en el DOM');
  },
});

tests.push({
  name: 'funcional: el menú "/" muestra todas las opciones de tipo de bloque',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(async () => {
      const d = document.querySelector('is-doc-editor[name="scratch"]');
      // Simular pulsar "/" en el primer bloque (vacío)
      const first = d.shadowRoot.querySelector('.block [contenteditable="true"]');
      first.focus();
      first.textContent = '/';
      // Disparar keydown con key='/' — el handler comprueba selectionStart
      try {
        document.getSelection().removeAllRanges();
      } catch {}
      // Asegurar selectionStart en 1
      Object.defineProperty(first, 'selectionStart', { configurable: true, get: () => 1 });
      Object.defineProperty(first, 'selectionEnd', { configurable: true, get: () => 1 });
      first.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
      // Esperar al siguiente frame para que se renderice el menú
      await new Promise((r) => requestAnimationFrame(() => r()));
      const menu = d.shadowRoot.querySelector('.menu');
      return {
        menuHidden: menu ? menu.hidden : true,
        options: menu ? [...menu.querySelectorAll('.opt')].map((o) => o.textContent.trim()) : [],
      };
    });
    assert.equal(data.menuHidden, false, 'el menú debe estar visible tras pulsar "/"');
    assert.ok(data.options.length >= 7, `el menú debe ofrecer al menos 7 tipos, obtuve ${data.options.length}: ${JSON.stringify(data.options)}`);
    for (const required of ['paragraph', 'heading-1', 'bullet-list', 'todo', 'quote', 'code', 'divider']) {
      assert.ok(data.options.includes(required), `el menú debe incluir "${required}"`);
    }
  },
});

tests.push({
  name: 'funcional: el documento sembrado con <script type="application/json"> lee los bloques',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      const d = document.querySelector('is-doc-editor[name="inline-json"]');
      const blocks = d.blocks;
      return {
        count: blocks.length,
        types: blocks.map((b) => b.type),
        texts: blocks.map((b) => b.text),
      };
    });
    assert.ok(data.count >= 3, `debe tener >=3 bloques desde el script inline, tiene ${data.count}`);
    assert.ok(data.types.includes('paragraph'), 'primer bloque debe ser paragraph');
    assert.ok(data.types.includes('numbered-list'), 'debe incluir numbered-list');
    const first = data.texts.find((t) => t.includes('script inline JSON'));
    assert.ok(first, 'el texto del script inline debe aparecer');
  },
});

tests.push({
  name: 'accesibilidad: cada bloque editable expone contentEditable=true',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      const d = document.querySelector('is-doc-editor[name="meeting"]');
      const editables = [...d.shadowRoot.querySelectorAll('[contenteditable="true"]')];
      return {
        count: editables.length,
        allTrue: editables.every((el) => el.getAttribute('contenteditable') === 'true'),
        todosHaveCheckboxes: d.shadowRoot.querySelectorAll('.block-todo input[type="checkbox"]').length,
      };
    });
    assert.ok(data.count >= 5, `debe haber al menos 5 elementos editables, hay ${data.count}`);
    assert.equal(data.allTrue, true, 'todos los bloques editables deben tener contentEditable=true');
    // El bloque todo debe tener un checkbox para marcarse
    assert.ok(data.todosHaveCheckboxes >= 1, `los bloques todo deben llevar checkbox, hay ${data.todosHaveCheckboxes}`);
  },
});

tests.push({
  name: 'caso límite: doc vacío (sin value, sin script inline) crea 1 bloque paragraph vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      // Creamos un doc-editor aislado sin value ni script
      const d = document.createElement('is-doc-editor');
      document.body.appendChild(d);
      // forzar render
      const blocks = d.blocks;
      const types = blocks.map((b) => b.type);
      const texts = blocks.map((b) => b.text);
      d.remove();
      return { count: blocks.length, types, texts };
    });
    assert.equal(data.count, 1, 'doc vacío debe tener exactamente 1 bloque');
    assert.equal(data.types[0], 'paragraph', 'el bloque inicial debe ser de tipo paragraph');
    assert.equal(data.texts[0], '', 'el bloque inicial debe estar vacío');
  },
});

tests.push({
  name: 'caso límite: set value() con JSON inválido no rompe el editor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-doc-editor-ready');
    const data = await page.evaluate(() => {
      const d = document.createElement('is-doc-editor');
      document.body.appendChild(d);
      // Asignar value inválido
      d.setAttribute('value', '{esto no es json válido');
      const after = {
        count: d.blocks.length,
        defined: !!customElements.get('is-doc-editor'),
        type: d.blocks[0]?.type,
      };
      d.remove();
      return after;
    });
    assert.equal(data.defined, true, 'el editor debe seguir definido tras value inválido');
    assert.equal(data.count, 1, 'tras JSON inválido debe haber 1 bloque fallback');
    assert.equal(data.type, 'paragraph', 'el bloque fallback debe ser paragraph');
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

report('doc-editor', failures === 0, { total: tests.length, failures });
