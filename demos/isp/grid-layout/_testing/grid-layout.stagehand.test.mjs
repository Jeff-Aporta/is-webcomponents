// grid-layout.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada grid tiene display:grid, las celdas se distribuyen correctamente,
// no se desbordan y respetan el número de columnas indicado.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/grid-layout/grid-layout.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-grid-ready');
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('is-grid-layout')].map((g, idx) => {
      const cs = getComputedStyle(g);
      const r = g.getBoundingClientRect();
      const items = [...g.children].map((c) => {
        const cr = c.getBoundingClientRect();
        return { x: cr.x, y: cr.y, w: cr.width, h: cr.height };
      });
      // Calcular número de columnas únicas (mismo X).
      const xSet = new Set(items.map((i) => Math.round(i.x)));
      return {
        idx,
        cells: g.cells,
        display: cs.display,
        gridTemplate: cs.gridTemplateColumns,
        hostW: r.width,
        hostH: r.height,
        itemCount: items.length,
        distinctColumns: xSet.size,
        items,
      };
    });
  });

  for (const g of data) {
    const tag = `grid#${g.idx}`;
    assert.equal(g.display, 'grid', `${tag}: display debe ser 'grid'`);
    assert.ok(g.hostW > 0, `${tag}: host width > 0 (${g.hostW})`);
    assert.ok(g.hostH > 0, `${tag}: host height > 0 (${g.hostH})`);
    assert.ok(g.itemCount > 0, `${tag}: debe haber hijos (${g.itemCount})`);
    // Si cells es un número, distinctColumns debe ser <= cells (puede ser menos si las
    // celdas son más anchas que el contenedor y se hizo wrap).
    if (/^\d+$/.test(g.cells)) {
      const cells = parseInt(g.cells, 10);
      assert.ok(g.distinctColumns <= cells, `${tag}: distinctColumns (${g.distinctColumns}) debe ser <= cells (${cells})`);
    }
    // Cada celda debe estar dentro del host.
    for (const c of g.items) {
      assert.ok(c.x + c.w <= g.hostW + 1, `${tag}: celda no debe salirse del host (x=${c.x}, w=${c.w}, hostW=${g.hostW})`);
      assert.ok(c.w > 0, `${tag}: celda width > 0 (${c.w})`);
    }
  }

  console.log(`  ✓ grid-layout: rubric determinista PASS (display:grid correcto, distribución coherente, no overflow)`);
  results.push({ name: 'grid-layout', ok: true });
} catch (err) {
  console.error(`  ✗ grid-layout: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-grid-layout'); } catch {}
  results.push({ name: 'grid-layout', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('grid-layout-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
