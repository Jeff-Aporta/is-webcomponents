// gantt.test.mjs — tests exhaustivos del demo gantt.html.
// Cobertura: smoke (monta y renderiza filas/ticks/arrows), funcional
// (filas con dataset.rowId, milestone diferenciado), determinismo,
// accesibilidad.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/gantt/gantt.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-gantt> monta y renderiza filas y flechas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-gantt'),
        rows: shadow?.querySelectorAll('[data-row-id]').length ?? 0,
        arrows: shadow?.querySelectorAll('[data-arrow-id]').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.gantt-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-gantt debe estar definido');
    assert.ok(info.rows >= 5, `esperaba >=5 filas, hay ${info.rows}`);
    assert.ok(info.arrows >= 3, `esperaba >=3 flechas de dependencia, hay ${info.arrows}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="gantt-svg">');
    await screenshot(page, 'gantt-smoke');
  },
});

tests.push({
  name: 'filas: cada una tiene dataset.rowId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      return [...el.shadowRoot.querySelectorAll('[data-row-id]')].map((g) => g.dataset.rowId);
    });
    assert.ok(ids.includes('t1'), 'debe haber una fila "t1"');
    assert.ok(ids.includes('t5'), 'debe haber una fila "t5" (milestone)');
  },
});

tests.push({
  name: 'milestone: la fila t5 se dibuja como diamante, no rectángulo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const shapes = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      const t5 = el.shadowRoot.querySelector('[data-row-id="t5"]');
      const t1 = el.shadowRoot.querySelector('[data-row-id="t1"]');
      return {
        t5: t5?.querySelector('rect, polygon, path')?.tagName ?? '',
        t1: t1?.querySelector('rect')?.tagName ?? '',
      };
    });
    assert.notEqual(shapes.t5, 'rect', `t5 (milestone) NO debe ser un rect, es ${shapes.t5}`);
    assert.equal(shapes.t1, 'rect', `t1 (tarea) debe ser un rect`);
  },
});

tests.push({
  name: 'flechas: cada dependencia tiene path con d no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const arrows = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      return [...el.shadowRoot.querySelectorAll('[data-arrow-id] path')].map((p) => ({
        d: p.getAttribute('d'),
      }));
    });
    assert.ok(arrows.length >= 3, `esperaba >=3 flechas, hay ${arrows.length}`);
    for (const a of arrows) {
      assert.ok(a.d && a.d.length > 5, `flecha sin path d: "${a.d}"`);
    }
  },
});

tests.push({
  name: 'eje temporal: hay al menos una marca de tiempo en el SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const ticks = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      // El gantt dibuja los ticks como <text> directos (no agrupados en .gantt-axis).
      return el.shadowRoot.querySelectorAll('svg text').length;
    });
    assert.ok(ticks >= 1, `esperaba >=1 texto en el SVG, hay ${ticks}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      return el.shadowRoot.querySelector('svg.gantt-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      return el.shadowRoot.querySelector('svg.gantt-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-gantt-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-gantt');
      const svg = el.shadowRoot.querySelector('svg.gantt-svg');
      return { aria: svg.getAttribute('aria-label'), role: svg.getAttribute('role') };
    });
    assert.ok(meta.aria && meta.aria.length > 0, 'debe llevar aria-label');
    assert.equal(meta.role, 'img', 'role debe ser img');
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

report('gantt', failures === 0, { total: tests.length, failures });