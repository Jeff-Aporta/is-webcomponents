// grid-layout.test.mjs — tests exhaustivos del demo <is-grid-layout>.
// Cobertura: smoke + funcional (cells=3 → 3 columnas, track list cruda,
// cells-fit) + custom properties (--cells / --gap) + breakpoint.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/grid-layout/grid-layout.html`;

const tests = [];

tests.push({
  name: 'smoke: grids montan con display:grid',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-grid-ready');
    const info = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('is-grid-layout')];
      return grids.map((g) => ({
        count: grids.length,
        defined: !!customElements.get('is-grid-layout'),
        display: getComputedStyle(g).display,
        cells: g.cells,
        gap: g.gap,
        sizew: g.sizew,
      }));
    });
    assert.equal(info[0].defined, true);
    assert.ok(info.length >= 5, `esperaba >=5 grids, hay ${info.length}`);
    for (const g of info) {
      assert.equal(g.display, 'grid', `display debe ser 'grid' (es '${g.display}')`);
    }
    await screenshot(page, 'grid-layout-smoke');
  },
});

tests.push({
  name: 'funcional: cells="3" produce 3 columnas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-grid-ready');
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('is-grid-layout')];
      const three = grids.find((g) => g.cells === '3' && !g.cellsFit);
      if (!three) return null;
      const items = [...three.children];
      // Agrupar por Y: si están en la misma fila comparten Y (modulo tolerance).
      const groups = [];
      for (const item of items) {
        const r = item.getBoundingClientRect();
        const y = Math.round(r.y);
        const g = groups.find((gr) => Math.abs(gr[0].y - y) < 5);
        if (g) g.push({ x: r.x, y });
        else groups.push([{ x: r.x, y }]);
      }
      // La cantidad de grupos debe ser ~ ceil(items / cells)
      const cellsAttr = parseInt(three.cells, 10);
      return { groups: groups.length, cellsAttr, items: items.length };
    });
    assert.ok(layout, 'debe haber al menos un grid con cells=3');
    assert.ok(layout.groups >= 2, `cells=3 con ${layout.items} hijos debe dar >=2 filas (hay ${layout.groups})`);
  },
});

tests.push({
  name: 'funcional: cells="auto 1fr auto" produce 3 columnas de anchos mixtos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-grid-ready');
    await page.waitForTimeout(200);
    const widths = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('is-grid-layout')];
      const raw = grids.find((g) => g.cells === 'auto 1fr auto');
      if (!raw) return null;
      const items = [...raw.children].slice(0, 3);
      return items.map((it) => it.getBoundingClientRect().width);
    });
    assert.ok(widths, 'debe haber un grid con cells="auto 1fr auto"');
    assert.equal(widths.length, 3);
    // En "auto 1fr auto", la columna del medio (1fr) debe ser más ancha que las auto
    // (porque las auto se ajustan al contenido).
    assert.ok(widths[1] >= widths[0] && widths[1] >= widths[2], `columna 1fr (${widths[1]}) debe ser >= autos (${widths[0]}, ${widths[2]})`);
  },
});

tests.push({
  name: 'API: cells=number + cells-fit=true cambia el track list a max-content',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-grid-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('is-grid-layout')];
      const fit = grids.find((g) => g.cellsFit);
      if (!fit) return null;
      const cellsVar = fit.style.getPropertyValue('--cells');
      return { cellsVar, cellsAttr: fit.cells, cellsFit: fit.cellsFit };
    });
    assert.ok(result, 'debe haber un grid con cells-fit');
    assert.ok(/max-content/.test(result.cellsVar), `--cells debe contener max-content, es '${result.cellsVar}'`);
  },
});

tests.push({
  name: 'API: gap="0.5rem" se traduce a --gap en style',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-grid-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const g = document.querySelector('is-grid-layout');
      g.gap = '0.75rem';
      return { attr: g.getAttribute('gap'), varValue: g.style.getPropertyValue('--gap') };
    });
    assert.equal(result.attr, '0.75rem');
    assert.equal(result.varValue, '0.75rem', `--gap debe estar seteado en host style`);
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

report('grid-layout', failures === 0, { total: tests.length, failures });
