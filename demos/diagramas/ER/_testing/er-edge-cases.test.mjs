// er-edge-cases.test.mjs — gaps detectados con deep-test-proposals sobre los
// diagramas (er-archify, er-spec, er-diagram, er-editor). Cobertura adicional:
//   - Round-trip JSON (export → import produce el mismo state)
//   - Strict mode rechaza campos desconocidos (comentado en er-archify)
//   - Edge cases visuales (entidad sin atributos, self-loop)
//   - a11y teclado en el editor (Ctrl+Z, Ctrl+Y, Delete, Escape)
//   - Modo connect: dos clicks crean relación, Escape la cancela
//   - Undo/redo multi-paso (cadena de operaciones)
//
// Estas pruebas se descubrieron con la skill deep-test-proposals y son
// tests nuevos (no duplican lo que ya cubren er-editor.test.mjs ni
// er-static.test.mjs).

import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const tests = [];

// ───────────────────────────────────────────────────────────────────────
// 1. Round-trip JSON: exportJson → reasignar produce estado equivalente.
//    Nota: por diseño (handoff), serializeErPayload omite defaults (fromCard:"one",
//    toCard:"many", identifying:true, route:"auto"), por lo que comparamos
//    SEMÁNTICAMENTE (entidades, relaciones no-default), no byte-a-byte.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'round-trip: exportJson → reasignar preserva entidades, ids y labels',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    const result = await page.evaluate(() => {
      const ed = document.querySelector('is-er-editor');
      // Capturar entidades y relaciones no-default antes del round-trip.
      const before = {
        entities: ed.payload.entities.map((e) => ({ id: e.id, name: e.name, attributes: e.attributes.length })),
        relations: ed.payload.relations.map((r) => ({ id: r.id, from: r.from, to: r.to, label: r.label })),
      };
      // Reasignar via exportJson.
      ed.payload = JSON.parse(ed.exportJson());
      const after = {
        entities: ed.payload.entities.map((e) => ({ id: e.id, name: e.name, attributes: e.attributes.length })),
        relations: ed.payload.relations.map((r) => ({ id: r.id, from: r.from, to: r.to, label: r.label })),
      };
      return { before, after };
    });

    assert.deepEqual(result.after, result.before, 'el round-trip debe preservar ids, names, attrs count y labels');
  },
});

// ───────────────────────────────────────────────────────────────────────
// 2. Editor: campos desconocidos en el payload NO crashean (setter permisivo,
//    delega la normalización a <is-er-diagram> que descarta extras). Este es
//    el contrato real observado por el usuario; test de regresión para
//    evitar que un futuro cambio lo rompa silenciosamente.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'regresión: campos desconocidos en payload NO crashean el editor',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    const result = await page.evaluate(async () => {
      try {
        const ed = document.querySelector('is-er-editor');
        ed.payload = {
          entities: [{ id: 'a', name: 'A' }],
          relations: [],
          // Campos "futuros" o heredados de BD que el editor no conoce.
          campo_legacy_desconocido: 'preservar-en-silencio',
          metadata_interna: { id: 42 },
        };
        await new Promise((r) => setTimeout(r, 80));
        return {
          ok: true,
          entities: ed.payload.entities.length,
          entitiesAfter: ed.shadowRoot.querySelector('is-er-diagram')?.shadowRoot?.querySelectorAll('.er-entity').length ?? 0,
        };
      } catch (e) {
        return { ok: false, error: e?.message ?? String(e) };
      }
    });
    assert.ok(result.ok, `no debe crashear con campos desconocidos: ${result.error}`);
    assert.equal(result.entities, 1, 'la entidad válida debe persistir');
    assert.equal(result.entitiesAfter, 1, 'la entidad debe renderizarse a pesar de los extras');
  },
});

// ───────────────────────────────────────────────────────────────────────
// 3. Editor: entidad sin atributos renderiza correctamente.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'edge case: entidad sin atributos renderiza sin errores',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-static.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');

    const ok = await page.evaluate(async () => {
      // Primer demo del fixture: dos <is-er-diagram>. Inyectar en el primero
      // un payload con una entidad sin atributos y esperamos al re-render
      // (payload setter dispara queueRender, que es microtask-asíncrono).
      const host = document.querySelectorAll('is-er-diagram')[0];
      host.payload = {
        title: 'Sin atributos',
        direction: 'LR',
        entities: [{ id: 'solo', name: 'Solo' }],
        relations: [],
      };
      await new Promise((r) => setTimeout(r, 150));
      return {
        entities: host.shadowRoot?.querySelectorAll('.er-entity').length ?? 0,
        relations: host.shadowRoot?.querySelectorAll('.er-rel').length ?? 0,
      };
    });
    assert.equal(ok.entities, 1, `la entidad sin atributos debe renderizar (visto: ${ok.entities})`);
    assert.equal(ok.relations, 0, `sin relaciones (visto: ${ok.relations})`);
  },
});

// ───────────────────────────────────────────────────────────────────────
// 4. Editor: self-loop (from === to) renderiza sin crashear.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'edge case: relación self-loop (from === to) renderiza',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-static.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');

    const result = await page.evaluate(async () => {
      const host = document.querySelectorAll('is-er-diagram')[0];
      try {
        host.payload = {
          title: 'Self-loop',
          direction: 'LR',
          entities: [{ id: 'a', name: 'A' }],
          relations: [{ id: 'r1', from: 'a', to: 'a', label: 'loop' }],
        };
        await new Promise((r) => setTimeout(r, 200));
        const entities = host.shadowRoot?.querySelectorAll('.er-entity').length ?? 0;
        const rels = host.shadowRoot?.querySelectorAll('.er-rel').length ?? 0;
        return { ok: true, entities, rels, error: null };
      } catch (e) {
        return { ok: false, entities: 0, rels: 0, error: e?.message ?? String(e) };
      }
    });
    assert.ok(result.ok, `no debe crashear con self-loop: ${result.error}`);
    assert.equal(result.entities, 1, `debe haber 1 entidad (visto: ${result.entities})`);
    assert.equal(result.rels, 1, `debe haber 1 relación (visto: ${result.rels})`);
  },
});

// ───────────────────────────────────────────────────────────────────────
// 5. a11y teclado: Ctrl+Z deshace la última acción del editor.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'a11y teclado: Ctrl+Z deshace el último cambio',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    // Aislamos el test: capturamos el count inicial (constante), añadimos con
    // el botón (que sí registra history) y disparamos Ctrl+Z por evento nativo.
    const result = await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const before = ed.payload.entities.length;
      const addBtn = ed.shadowRoot.querySelector('[data-action="add-entity"]');
      addBtn?.click();
      await new Promise((r) => setTimeout(r, 80));
      const afterAdd = ed.payload.entities.length;
      // El handler vive en window con capture:true; dispatchEvent normal
      // bubbleando desde document.body funciona.
      const ev = new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true });
      window.dispatchEvent(ev);
      await new Promise((r) => setTimeout(r, 80));
      const afterUndo = ed.payload.entities.length;
      return { before, afterAdd, afterUndo };
    });

    assert.equal(result.afterAdd, result.before + 1, 'add-entity debe aumentar en 1');
    assert.equal(result.afterUndo, result.before, 'Ctrl+Z debe volver al estado original');
  },
});

// ───────────────────────────────────────────────────────────────────────
// 6. a11y teclado: Escape con selección activa limpia la selección.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'a11y teclado: Escape limpia la selección actual',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    const result = await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const addBtn = ed.shadowRoot.querySelector('[data-action="add-entity"]');
      addBtn?.click();
      await new Promise((r) => setTimeout(r, 50));
      const selBefore = ed.shadowRoot.querySelector('[data-selection-info]')?.textContent ?? '';
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      const selAfter = ed.shadowRoot.querySelector('[data-selection-info]')?.textContent ?? '';
      return { selBefore, selAfter };
    });
    assert.match(result.selBefore, /entidad/, 'tras add-entity debe haber una entidad seleccionada');
    assert.match(result.selAfter, /Vacía/, 'Escape debe limpiar la selección');
  },
});

// ───────────────────────────────────────────────────────────────────────
// 7. Modo connect: dos clicks crean relación, Escape la cancela.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'connect mode: dos clicks crean relación; Escape la cancela',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    // Caso A: dos clicks crean relación.
    const okCase = await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      // Asegurar al menos 2 entidades.
      ed.shadowRoot.querySelector('[data-action="add-entity"]')?.click();
      ed.shadowRoot.querySelector('[data-action="add-entity"]')?.click();
      await new Promise((r) => setTimeout(r, 50));
      const before = ed.payload.relations.length;
      // Click en el botón "Conectar" (data-mode="connect")
      ed.shadowRoot.querySelector('[data-mode="connect"]')?.click();
      // Click en dos entidades diferentes.
      const entities = ed.shadowRoot.querySelector('is-er-diagram').shadowRoot.querySelectorAll('.er-entity');
      entities[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      entities[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 50));
      return { before, after: ed.payload.relations.length };
    });
    assert.equal(okCase.after, okCase.before + 1, 'dos clicks en modo connect deben crear 1 relación');

    // Caso B: Escape después del primer click cancela el pending.
    const cancelCase = await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      ed.shadowRoot.querySelector('[data-mode="connect"]')?.click();
      const entities = ed.shadowRoot.querySelector('is-er-diagram').shadowRoot.querySelectorAll('.er-entity');
      entities[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      const relsBeforeEsc = ed.payload.relations.length;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Segundo click NO debe crear relación.
      entities[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 50));
      return { before: relsBeforeEsc, after: ed.payload.relations.length };
    });
    assert.equal(cancelCase.after, cancelCase.before, 'Escape debe cancelar el pending connection');
  },
});

// ───────────────────────────────────────────────────────────────────────
// 8. Undo multi-paso: cadena de 3 add → 3 undo → estado original.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'undo multi-paso: 3 adds + 3 undos vuelven al estado inicial',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-editor.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');

    const result = await page.evaluate(async () => {
      const ed = document.querySelector('is-er-editor');
      const before = ed.payload.entities.length;
      const btn = ed.shadowRoot.querySelector('[data-action="add-entity"]');
      btn?.click();
      btn?.click();
      btn?.click();
      await new Promise((r) => setTimeout(r, 50));
      const after3 = ed.payload.entities.length;
      // 3 undos.
      const undo = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
      undo();
      await new Promise((r) => setTimeout(r, 30));
      undo();
      await new Promise((r) => setTimeout(r, 30));
      undo();
      await new Promise((r) => setTimeout(r, 30));
      return { before, after3, after3undo: ed.payload.entities.length };
    });

    assert.equal(result.after3, result.before + 3, '3 adds deben añadir 3 entidades');
    assert.equal(result.after3undo, result.before, '3 undos deben volver al estado inicial');
  },
});

// ───────────────────────────────────────────────────────────────────────
// 9. ER con relaciones cíclicas (A→B→C→A) no debe crashear.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'edge case: relaciones cíclicas (A→B→C→A) renderizan',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-static.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');

    const result = await page.evaluate(async () => {
      const host = document.querySelectorAll('is-er-diagram')[0];
      try {
        host.payload = {
          title: 'Ciclo',
          direction: 'LR',
          entities: [
            { id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' },
          ],
          relations: [
            { id: 'r1', from: 'a', to: 'b' },
            { id: 'r2', from: 'b', to: 'c' },
            { id: 'r3', from: 'c', to: 'a' },
          ],
        };
        await new Promise((r) => setTimeout(r, 200));
        return { ok: true, count: host.shadowRoot?.querySelectorAll('.er-rel').length ?? 0 };
      } catch (e) {
        return { ok: false, count: 0, error: e?.message ?? String(e) };
      }
    });
    assert.ok(result.ok, `no debe crashear con ciclo: ${result.error}`);
    assert.equal(result.count, 3, `debe renderizar las 3 relaciones (visto: ${result.count})`);
  },
});

// ───────────────────────────────────────────────────────────────────────
// 10. Snapshot determinista: render del mismo payload produce el mismo HTML.
// ───────────────────────────────────────────────────────────────────────
tests.push({
  name: 'snapshot: el mismo payload produce HTML idéntico en dos renders consecutivos',
  run: async (page) => {
    await page.goto(`${BASE_URL}/demos/diagramas/ER/er-static.html`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-static-ready');

    const result = await page.evaluate(async () => {
      const host = document.querySelectorAll('is-er-diagram')[1];
      const payload = {
        title: 'Mix',
        direction: 'LR',
        entities: [
          { id: 'api', name: 'API', attributes: [{ name: 'route', type: 'string' }], pos: [100, 200] },
          { id: 'auth', name: 'Auth', attributes: [{ name: 'token', type: 'string' }], pos: [100, 60] },
          { id: 'cache', name: 'Cache', attributes: [{ name: 'key', type: 'string' }], pos: [420, 60] },
        ],
        relations: [
          { id: 'r1', from: 'api', to: 'auth', label: 'verify' },
          { id: 'r2', from: 'auth', to: 'cache', label: 'session' },
        ],
      };
      host.payload = payload;
      await new Promise((r) => setTimeout(r, 100));
      const svg1 = host.shadowRoot.querySelector('svg').outerHTML;
      host.payload = payload; // reasignar mismo payload
      await new Promise((r) => setTimeout(r, 100));
      const svg2 = host.shadowRoot.querySelector('svg').outerHTML;
      return { same: svg1 === svg2, len1: svg1.length, len2: svg2.length };
    });
    assert.ok(result.same, `el mismo payload debe producir HTML idéntico (len1=${result.len1}, len2=${result.len2})`);
  },
});

// ───────────────────────────────────────────────────────────────────────
// Runner
// ───────────────────────────────────────────────────────────────────────
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

report('er-edge-cases', failures === 0, { total: tests.length, failures });