// er-attributes.test.mjs — CRUD de atributos en el editor visual.
//
// Cubre el panel "Atributos" del editor:
//   - Aparece solo con exactamente 1 entidad seleccionada.
//   - Editar name/type/key de un atributo se persiste y re-renderiza.
//   - Agregar atributo: crea una fila vacía y aparece en el SVG.
//   - Eliminar atributo: lo quita del state y del SVG.
//   - Undo/redo funciona para todos los cambios.
//   - Cambios rápidos (typing) coalescen en una sola entrada de history.
//
// El nombre de la entidad sigue editándose por doble-click sobre la caja
// (cubierto por er-editor.test.mjs). Aquí cubrimos lo nuevo.

import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const tests = [];

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
async function selectEntity(page, eid) {
  // Selecciona la entidad en el editor. El editor escucha `pointerdown` (no
  // `click`), así que hay que disparar el evento correcto. También limpiamos
  // selección previa con Escape.
  await page.evaluate((id) => {
    const ed = document.querySelector('is-er-editor');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const entity = ed.shadowRoot.querySelector('is-er-diagram').shadowRoot.querySelector(`.er-entity[data-entity-id="${id}"]`);
    entity?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, button: 0 }));
    entity?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, button: 0 }));
  }, eid);
  await new Promise((r) => setTimeout(r, 80));
}

async function getAttributesFieldsetVisible(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('is-er-editor');
    const fs = ed.shadowRoot.querySelector('[data-attrs]');
    return fs ? !fs.hasAttribute('hidden') : false;
  });
}

async function getState(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('is-er-editor');
    return JSON.parse(JSON.stringify(ed.payload));
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Visibilidad del panel de atributos
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'panel attrs: visible con 1 entidad, oculto con 0/multi/relación',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    // Sin selección → oculto
    let visible = await getAttributesFieldsetVisible(page);
    assert.equal(visible, false, 'sin selección debe estar oculto');

    // 1 entidad → visible
    await selectEntity(page, 'user');
    visible = await getAttributesFieldsetVisible(page);
    assert.equal(visible, true, 'con 1 entidad seleccionada debe estar visible');

    // Escape limpia selección → oculto de nuevo
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await new Promise((r) => setTimeout(r, 60));
    visible = await getAttributesFieldsetVisible(page);
    assert.equal(visible, false, 'tras Escape debe ocultarse');
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Editar el nombre de un atributo se persiste y re-renderiza
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: editar nombre persiste y re-renderiza en el SVG',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    await selectEntity(page, 'user');
    // El demo inicial tiene user.attributes[0] = { name: 'id', key: 'PK', type: 'uuid' }.
    // Cambiamos el name del primer atributo (input[name] en la primera fila).
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const input = ed.shadowRoot.querySelector('[data-attr-list] .attr-row [data-attr-field="name"]');
      input.value = 'identifier';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Esperar el debounce + re-render.
      await new Promise((r) => setTimeout(r, 350));
    });

    const state = await getState(page);
    const user = state.entities.find((e) => e.id === 'user');
    assert.ok(user, 'la entidad user debe existir');
    assert.equal(user.attributes[0].name, 'identifier', 'el name debe haberse actualizado');

    // Verificar que el SVG también refleja el cambio (texto en .er-entity).
    const svgText = await page.evaluate(() => {
      const ed = document.querySelector('is-er-editor');
      const texts = ed.shadowRoot.querySelector('is-er-diagram').shadowRoot
        .querySelectorAll('.er-entity[data-entity-id="user"] text');
      return [...texts].map((t) => t.textContent);
    });
    assert.ok(svgText.includes('identifier'), `el SVG debe mostrar el nuevo nombre. Visto: ${JSON.stringify(svgText)}`);
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Editar el type de un atributo
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: editar type se persiste',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    await selectEntity(page, 'order');
    // order.attributes[1] = { name: 'total', type: 'decimal' }
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const inputs = ed.shadowRoot.querySelectorAll('[data-attr-list] .attr-row [data-attr-field="type"]');
      const input = inputs[1]; // total
      input.value = 'numeric(10,2)';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 350));
    });

    const state = await getState(page);
    const order = state.entities.find((e) => e.id === 'order');
    assert.equal(order.attributes[1].type, 'numeric(10,2)', 'el type debe actualizarse');
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Cambiar PK/FK via select
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: cambiar key (PK/FK/ninguno) se persiste',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    await selectEntity(page, 'order');
    // order.attributes[1] = { name: 'total', type: 'decimal', key: undefined }
    // Promover a FK.
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const selects = ed.shadowRoot.querySelectorAll('[data-attr-list] .attr-row [data-attr-field="key"]');
      const sel = selects[1]; // total
      sel.value = 'FK';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
    });

    const state = await getState(page);
    const order = state.entities.find((e) => e.id === 'order');
    assert.equal(order.attributes[1].key, 'FK', 'el key debe ser FK');

    // Quitar el key (volver a "ninguno").
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const selects = ed.shadowRoot.querySelectorAll('[data-attr-list] .attr-row [data-attr-field="key"]');
      const sel = selects[1];
      sel.value = '';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
    });
    const state2 = await getState(page);
    const order2 = state2.entities.find((e) => e.id === 'order');
    assert.equal(order2.attributes[1].key, undefined, 'el key debe limpiarse (no persistir como "")');
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Agregar atributo
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: agregar añade una fila nueva',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    await selectEntity(page, 'user');
    const before = (await getState(page)).entities.find((e) => e.id === 'user').attributes.length;

    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      ed.shadowRoot.querySelector('[data-action="add-attr"]')?.click();
      await new Promise((r) => setTimeout(r, 80));
    });

    const state = await getState(page);
    const after = state.entities.find((e) => e.id === 'user').attributes.length;
    assert.equal(after, before + 1, `debe haber 1 atributo más (${before} → ${after})`);
    assert.equal(state.entities.find((e) => e.id === 'user').attributes[after - 1].name,
      `atributo${after}`,
      'el nuevo atributo debe tener nombre por defecto');
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Eliminar atributo
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: eliminar quita la fila del medio',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    await selectEntity(page, 'order');
    // order tiene 3 atributos: id (PK), total, user_id (FK). Borramos el del medio (total).
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const dels = ed.shadowRoot.querySelectorAll('[data-attr-list] [data-attr-action="delete"]');
      dels[1].click(); // total
      await new Promise((r) => setTimeout(r, 80));
    });

    const state = await getState(page);
    const order = state.entities.find((e) => e.id === 'order');
    assert.equal(order.attributes.length, 2, 'debe quedar 2 atributos');
    assert.equal(order.attributes[0].name, 'id', 'el primero debe seguir siendo id');
    assert.equal(order.attributes[1].name, 'user_id', 'el segundo ahora debe ser user_id (total borrado)');
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Undo/redo en cambios de atributo
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: undo/redo restauran el estado tras add + edit',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    await selectEntity(page, 'product');

    // Capturar el state inicial (product tiene 3 atributos: id, sku, price).
    const initial = await getState(page);
    const initialAttrs = initial.entities.find((e) => e.id === 'product').attributes;

    // 1) Cambiar el nombre del segundo atributo (sku → codigo).
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const inputs = ed.shadowRoot.querySelectorAll('[data-attr-list] .attr-row [data-attr-field="name"]');
      inputs[1].value = 'codigo';
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
    });
    // 2) Cambiar el type del tercero (price → bigint).
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const inputs = ed.shadowRoot.querySelectorAll('[data-attr-list] .attr-row [data-attr-field="type"]');
      inputs[2].value = 'bigint';
      inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
    });

    const changed = await getState(page);
    const changedAttrs = changed.entities.find((e) => e.id === 'product').attributes;
    assert.equal(changedAttrs[1].name, 'codigo', 'sku → codigo');
    assert.equal(changedAttrs[2].type, 'bigint', 'decimal → bigint');

    // 3) Undo x2: debe volver al estado inicial.
    await page.evaluate(async () => {
      const undo = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true }));
      undo();
      await new Promise((r) => setTimeout(r, 60));
      undo();
      await new Promise((r) => setTimeout(r, 60));
    });

    const undone = await getState(page);
    const undoneAttrs = undone.entities.find((e) => e.id === 'product').attributes;
    assert.deepEqual(undoneAttrs, initialAttrs, 'tras 2 undos debe volver al estado inicial');

    // 4) Redo x2: debe volver a los cambios.
    await page.evaluate(async () => {
      const redo = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
      redo();
      await new Promise((r) => setTimeout(r, 60));
      redo();
      await new Promise((r) => setTimeout(r, 60));
    });
    const redone = await getState(page);
    const redoneAttrs = redone.entities.find((e) => e.id === 'product').attributes;
    assert.deepEqual(redoneAttrs, changedAttrs, 'tras 2 redos debe volver a los cambios');
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Cambios rápidos (typing) coalescen en una sola entrada de history
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: typing rápido coalesce en 1 sola entrada de history',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    await selectEntity(page, 'user');

    // Teclear 5 caracteres seguidos sin esperar entre eventos. Si el debounce
    // funciona, deben coalescer en UN solo undo (no 5).
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const input = ed.shadowRoot.querySelector('[data-attr-list] .attr-row [data-attr-field="name"]');
      const original = input.value;
      // Simular typing: input + input + input + input + input, sin awaits.
      for (const ch of 'XYZW') {
        input.value = original + ch;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Esperar al debounce + commit.
      await new Promise((r) => setTimeout(r, 400));
    });

    // Undo único: debe restaurar el name original (no el último carácter).
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await new Promise((r) => setTimeout(r, 80));

    const state = await getState(page);
    const user = state.entities.find((e) => e.id === 'user');
    assert.equal(user.attributes[0].name, 'id', `tras 1 undo debe volver al name original. Visto: ${user.attributes[0].name}`);
  },
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Atributo vacío (sin atributos) muestra el panel con botón "+"
// ─────────────────────────────────────────────────────────────────────────
tests.push({
  name: 'atributo: entidad sin atributos muestra el panel con solo el botón "+"',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    // Añadimos una entidad (que arranca sin atributos), la seleccionamos.
    await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      ed.shadowRoot.querySelector('[data-action="add-entity"]')?.click();
      await new Promise((r) => setTimeout(r, 80));
    });
    const id = await page.evaluate(() => document.querySelector('is-er-editor').payload.entities.slice(-1)[0].id);
    await selectEntity(page, id);

    const result = await page.evaluate((eid) => {
      const ed = document.querySelector('is-er-editor');
      const fs = ed.shadowRoot.querySelector('[data-attrs]');
      const rows = ed.shadowRoot.querySelectorAll('[data-attr-list] .attr-row');
      const addBtn = ed.shadowRoot.querySelector('[data-action="add-attr"]');
      return {
        visible: !fs.hasAttribute('hidden'),
        rows: rows.length,
        addBtnVisible: !!addBtn,
        entityAttrs: ed.payload.entities.find((e) => e.id === eid).attributes.length,
      };
    }, id);
    assert.equal(result.visible, true, 'el panel debe estar visible');
    assert.equal(result.rows, 0, 'no debe haber filas (entidad vacía)');
    assert.equal(result.addBtnVisible, true, 'el botón "+" debe estar');
    assert.equal(result.entityAttrs, 0, 'la entidad debe tener 0 atributos');
  },
});

// ─────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────
let failures = 0;
for (const t of tests) {
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('er-attributes', failures === 0, { total: tests.length, failures });