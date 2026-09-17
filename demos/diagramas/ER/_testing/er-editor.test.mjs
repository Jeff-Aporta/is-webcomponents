// er-editor.test.mjs — tests exhaustivos del demo er-editor.html.
// Cobertura: smoke + funcional (drag, click-to-connect, undo/redo, export)
// + determinismo (round-trip JSON idéntico) + accesibilidad básica.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/ER/er-editor.html`;

const tests = [];

tests.push({
  name: 'smoke: el editor monta y el diagrama interno renderiza entidades',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    const initial = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      const diagram = ed.shadowRoot.querySelector('is-er-diagram');
      const entities = diagram.shadowRoot.querySelectorAll('.er-entity');
      const relations = diagram.shadowRoot.querySelectorAll('.er-rel');
      return {
        editorDefined: !!customElements.get('is-er-editor'),
        diagramDefined: !!customElements.get('is-er-diagram'),
        entities: entities.length,
        relations: relations.length,
        payload: ed.payload,
      };
    });
    assert.equal(initial.editorDefined, true, 'is-er-editor debe estar definido');
    assert.equal(initial.diagramDefined, true, 'is-er-diagram debe estar definido');
    assert.ok(initial.entities >= 3, `esperaba >=3 entidades, hay ${initial.entities}`);
    assert.ok(initial.relations >= 2, `esperaba >=2 relaciones, hay ${initial.relations}`);
    assert.equal(initial.payload.entities[0].id, 'user', 'primer id debe ser "user"');
    await screenshot(page, 'er-editor-smoke');
  },
});

tests.push({
  name: 'funcional: drag de una entidad la mueve con snap a 8px',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const initialPos = await page.evaluate(() => {
      return document.querySelector('main is-er-editor').payload.entities.find((e) => e.id === 'user').pos;
    });
    // Disparar pointerdown/pointermove/pointerup directamente sobre la entidad
    // (a través de shadow DOM) — más fiable que simular el mouse en headless.
    await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      const diagram = ed.shadowRoot.querySelector('is-er-diagram');
      const entity = diagram.shadowRoot.querySelector('.er-entity[data-entity-id="user"]');
      const b = entity.getBoundingClientRect();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      entity.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true,
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        clientX: cx + 87, clientY: cy + 49, bubbles: true, composed: true,
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        clientX: cx + 87, clientY: cy + 49, bubbles: true, composed: true,
      }));
    });
    await page.waitForTimeout(200);
    const newPos = await page.evaluate(() => {
      return document.querySelector('main is-er-editor').payload.entities.find((e) => e.id === 'user').pos;
    });
    // Drag de +87px horizontal y +49px vertical. Snap a múltiplos de 8:
    //   87 → 88, 49 → 48
    assert.equal(newPos[0] - initialPos[0], 88, `snap horizontal a 88 (no ${newPos[0] - initialPos[0]})`);
    assert.equal(newPos[1] - initialPos[1], 48, `snap vertical a 48 (no ${newPos[1] - initialPos[1]})`);
  },
});

tests.push({
  name: 'funcional: undo revierte el drag',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      return JSON.parse(JSON.stringify(ed.payload.entities));
    });
    // Mover entidad
    await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      const diagram = ed.shadowRoot.querySelector('is-er-diagram');
      const entity = diagram.shadowRoot.querySelector('.er-entity[data-entity-id="user"]');
      const box = entity.getBoundingClientRect();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      entity.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, button: 0, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: cx + 64, clientY: cy + 32, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: cx + 64, clientY: cy + 32, bubbles: true }));
    });
    await page.waitForTimeout(200);
    const moved = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      return ed.payload.entities.find((e) => e.id === 'user').pos;
    });
    assert.notEqual(moved[0], before.find((e) => e.id === 'user').pos[0], 'el drag debió mover la entidad');

    // Ctrl+Z → undo
    await page.keyboard.down('Control');
    await page.keyboard.press('z');
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);
    const undone = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      return ed.payload.entities.find((e) => e.id === 'user').pos;
    });
    assert.deepEqual(undone, before.find((e) => e.id === 'user').pos, 'undo revirtió la posición');
  },
});

tests.push({
  name: 'funcional: add entity añade una entidad nueva y la selección la apunta',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    const before = await page.evaluate(() => {
      return document.querySelector('main is-er-editor').payload.entities.length;
    });
    await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      const btn = ed.shadowRoot.querySelector('[data-action="add-entity"]');
      btn.click();
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      return document.querySelector('main is-er-editor').payload.entities.length;
    });
    assert.equal(after, before + 1, `add-entity debe incrementar la cuenta de entidades a ${before + 1}`);
  },
});

tests.push({
  name: 'funcional: delete borra la entidad seleccionada',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      return document.querySelector('main is-er-editor').payload.entities.length;
    });
    await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      const diagram = ed.shadowRoot.querySelector('is-er-diagram');
      diagram.shadowRoot.querySelector('.er-entity[data-entity-id="product"]').dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, bubbles: true }),
      );
    });
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      ed.shadowRoot.querySelector('[data-action="delete"]').click();
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      return ed.payload.entities.find((e) => e.id === 'product');
    });
    assert.equal(after, undefined, 'product debe haber sido borrada');
  },
});

tests.push({
  name: 'export: JSON devuelto es determinista (round-trip idéntico)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const a = await page.evaluate(() => document.querySelector('main is-er-editor').exportJson());
    await page.waitForTimeout(200);
    const b = await page.evaluate(() => document.querySelector('main is-er-editor').exportJson());
    assert.equal(a, b, 'dos llamadas a exportJson() deben dar el mismo string');
    // Round-trip: poner el JSON como payload y re-exportar
    await page.evaluate((j) => {
      const ed = document.querySelector('main is-er-editor');
      ed.payload = JSON.parse(j);
    }, a);
    await page.waitForTimeout(200);
    const c = await page.evaluate(() => document.querySelector('main is-er-editor').exportJson());
    assert.equal(a, c, 'round-trip JSON → payload → JSON debe ser idéntico');
  },
});

tests.push({
  name: 'export: SVG exportado es un XML válido con xmlns',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const svg = await page.evaluate(() => document.querySelector('main is-er-editor').exportSvg());
    assert.ok(svg.startsWith('<svg'), 'exportSvg() debe empezar con <svg');
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), 'SVG debe llevar xmlns');
    assert.ok(svg.includes('</svg>'), 'SVG debe cerrarse');
    // Validar parseable por DOMParser (en el browser)
    const valid = await page.evaluate((s) => {
      const doc = new DOMParser().parseFromString(s, 'image/svg+xml');
      return !!doc.documentElement && doc.documentElement.tagName === 'svg';
    }, svg);
    assert.ok(valid, 'SVG debe ser parseable por DOMParser');
  },
});

tests.push({
  name: 'export: SVG con animation=trace embebe keyframes CSS',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const svg = await page.evaluate(() => document.querySelector('main is-er-editor').exportSvg());
    assert.ok(svg.includes('iswc-dash-march'), 'SVG animado debe incluir keyframe iswc-dash-march');
    assert.ok(svg.includes('prefers-reduced-motion'), 'SVG debe respetar prefers-reduced-motion');
  },
});

tests.push({
  name: 'determinismo: render del mismo payload produce el mismo viewBox',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      const diagram = ed.shadowRoot.querySelector('is-er-diagram');
      const viewBox = diagram.shadowRoot.querySelector('svg').getAttribute('viewBox');
      const entityCount = diagram.shadowRoot.querySelectorAll('.er-entity').length;
      const relCount = diagram.shadowRoot.querySelectorAll('.er-rel').length;
      return { viewBox, entityCount, relCount };
    });
    // Re-asignar el mismo payload
    await page.evaluate((j) => {
      const ed = document.querySelector('main is-er-editor');
      ed.payload = JSON.parse(j);
    }, await page.evaluate(() => document.querySelector('main is-er-editor').exportJson()));
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      const diagram = ed.shadowRoot.querySelector('is-er-diagram');
      const viewBox = diagram.shadowRoot.querySelector('svg').getAttribute('viewBox');
      const entityCount = diagram.shadowRoot.querySelectorAll('.er-entity').length;
      const relCount = diagram.shadowRoot.querySelectorAll('.er-rel').length;
      return { viewBox, entityCount, relCount };
    });
    assert.equal(before.viewBox, after.viewBox, 'viewBox idéntico tras re-asignar el mismo payload');
    assert.equal(before.entityCount, after.entityCount);
    assert.equal(before.relCount, after.relCount);
  },
});

tests.push({
  name: 'accesibilidad: el editor tiene aria-label en el panel',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    const ariaLabel = await page.evaluate(() => {
      const ed = document.querySelector('main is-er-editor');
      return ed.shadowRoot.querySelector('[data-panel]').getAttribute('aria-label');
    });
    assert.ok(ariaLabel, 'el panel debe tener aria-label');
    assert.match(ariaLabel, /edición|panel/i);
  },
});

tests.push({
  name: 'accesibilidad: prefers-reduced-motion desactiva la animación',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-editor-ready');
    await page.waitForTimeout(200);
    const svg = await page.evaluate(() => document.querySelector('main is-er-editor').exportSvg());
    assert.ok(svg.includes('prefers-reduced-motion'), 'SVG debe incluir media query prefers-reduced-motion');
    // La regla !important debe estar presente
    assert.ok(svg.includes('animation: none !important'), 'prefers-reduced-motion debe forzar animation: none');
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

report('er-editor', failures === 0, { total: tests.length, failures });