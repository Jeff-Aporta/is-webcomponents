// data-grid.test.mjs — tests exhaustivos del demo data-grid.html.
// Cobertura: smoke + funcional (rendering, paginación, sort, eventos, valueGetter,
// renderCell) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data/data-grid/data-grid.html`;

const tests = [];

tests.push({
  name: 'smoke: is-data-grid está definido y los 3 grids renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400); // el grid puede tardar en pintar
    const initial = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      return {
        defined: !!customElements.get('is-data-grid'),
        count: grids.length,
        perGrid: grids.map((g) => {
          const sr = g.shadowRoot;
          const base = sr?.querySelector('.grid');
          const toolbar = sr?.querySelector('.grid-toolbar');
          const head = sr?.querySelector('.grid-header');
          const body = sr?.querySelector('.grid-body');
          const headCells = head?.querySelectorAll('.grid-header-cell, [data-field]').length ?? 0;
          const rows = body?.querySelectorAll('.grid-row').length ?? 0;
          return {
            hasBase: !!base,
            hasToolbar: !!toolbar,
            hasHead: !!head,
            hasBody: !!body,
            headCells,
            rows,
          };
        }),
      };
    });
    assert.equal(initial.defined, true, 'is-data-grid debe estar definido');
    assert.equal(initial.count, 3, `esperaba 3 grids, hay ${initial.count}`);
    for (let i = 0; i < initial.perGrid.length; i++) {
      const r = initial.perGrid[i];
      assert.equal(r.hasBase, true, `grid[${i}]: debe tener .grid`);
      assert.equal(r.hasHead, true, `grid[${i}]: debe tener header`);
      assert.equal(r.hasBody, true, `grid[${i}]: debe tener body`);
    }
    // El primer grid tiene toolbar; el segundo y tercero no.
    assert.equal(initial.perGrid[0].hasToolbar, true, 'basic debe tener toolbar');
    await screenshot(page, 'data-grid-smoke');
  },
});

tests.push({
  name: 'funcional: columns / rows cargados via setters JS',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      const g1 = grids[0];
      return {
        columnsCount: g1.columns.length,
        rowsCount: g1.rows.length,
        rowFields: g1.columns.map((c) => c.field),
      };
    });
    // El demo define 7 columns y 8 rows.
    assert.equal(state.columnsCount, 7, `columns debe ser 7, fue ${state.columnsCount}`);
    assert.equal(state.rowsCount, 8, `rows debe ser 8, fue ${state.rowsCount}`);
    assert.ok(state.rowFields.includes('name'), 'debe incluir field "name"');
    assert.ok(state.rowFields.includes('profit'), 'debe incluir field "profit" (valueGetter)');
    assert.ok(state.rowFields.includes('active'), 'debe incluir field "active" (boolean)');
  },
});

tests.push({
  name: 'funcional: paginación muestra hasta pageSize filas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      const g1 = grids[0]; // basic paginado con page-size=5
      const sr = g1.shadowRoot;
      const body = sr.querySelector('.grid-body');
      const rows = body?.querySelectorAll('.grid-row').length ?? 0;
      const paginationModel = g1.paginationModel;
      return { visibleRows: rows, paginationModel };
    });
    // Con 8 rows y page-size=5, debe haber 5 visibles en página 1.
    assert.ok(state.visibleRows <= 5,
      `filas visibles debe ser <= 5, hay ${state.visibleRows}`);
    assert.ok(state.paginationModel, 'debe haber paginationModel');
    assert.equal(state.paginationModel.pageSize, 5,
      `pageSize debe ser 5, fue ${state.paginationModel.pageSize}`);
  },
});

tests.push({
  name: 'funcional: valueGetter calcula profit = gross - costs',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    // Sin toolbar (g2) muestra todas las filas.
    const profits = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      const g2 = grids[1];
      const sr = g2.shadowRoot;
      const body = sr.querySelector('.grid-body');
      const rows = [...(body?.querySelectorAll('.grid-row') ?? [])];
      return rows.map((r) => {
        const cells = [...r.querySelectorAll('[data-field]')];
        const profit = cells.find((c) => c.dataset.field === 'profit');
        return profit?.textContent?.trim() || null;
      }).filter((p) => p != null);
    });
    // r1: 4200 - 1200 = 3000; r2: 3500-900=2600; r3: 5500-800=4700; etc.
    assert.ok(profits.length > 0, 'debe haber al menos 1 profit visible');
    assert.equal(profits[0], '3.000', `profit[0] debe ser "3.000", fue "${profits[0]}"`);
    assert.equal(profits[1], '2.600', `profit[1] debe ser "2.600", fue "${profits[1]}"`);
    assert.equal(profits[2], '4.700', `profit[2] debe ser "4.700", fue "${profits[2]}"`);
  },
});

tests.push({
  name: 'funcional: renderCell custom produce el HTML del chip (no solo texto)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const result = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      const g3 = grids[2]; // custom
      const sr = g3.shadowRoot;
      const body = sr.querySelector('.grid-body');
      const rows = [...(body?.querySelectorAll('.grid-row') ?? [])];
      // Buscar la celda "active" de la primera fila
      const firstRow = rows[0];
      const activeCell = firstRow?.querySelector('[data-field="active"]');
      return {
        cellHTML: activeCell?.innerHTML || '',
        hasSpan: !!activeCell?.querySelector('span'),
        spanText: activeCell?.querySelector('span')?.textContent?.trim() || null,
      };
    });
    assert.equal(result.hasSpan, true, 'renderCell debe inyectar un <span>');
    assert.match(result.cellHTML, /background:\s*rgba/, 'el span debe llevar estilo inline con background');
    assert.ok(['activo', 'baja'].includes(result.spanText),
      `spanText debe ser "activo" o "baja", fue "${result.spanText}"`);
  },
});

tests.push({
  name: 'funcional: evento is-cell-click emite detail { id, field, row }',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-data-grid')];
        const g2 = grids[1]; // sin paginación, 8 filas
        let detail = null;
        g2.addEventListener('is-cell-click', (e) => { detail = e.detail; });
        const sr = g2.shadowRoot;
        const body = sr.querySelector('.grid-body');
        const firstRow = body.querySelector('.grid-row');
        const firstCell = firstRow?.querySelector('[data-field]');
        if (!firstCell) {
          resolve({ error: 'no cell found' });
          return;
        }
        firstCell.click();
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            id: detail?.id ?? null,
            field: detail?.field ?? null,
            hasRow: !!(detail && detail.row),
          });
        }, 80);
      });
    });
    assert.deepEqual(captured.detailKeys, ['field', 'id', 'row'],
      `detail debe tener keys [field, id, row], tuvo ${JSON.stringify(captured.detailKeys)}`);
    assert.equal(captured.id, 'r1', `id debe ser "r1", fue "${captured.id}"`);
    assert.ok(captured.field, `field no debe estar vacío, fue "${captured.field}"`);
    assert.equal(captured.hasRow, true);
  },
});

tests.push({
  name: 'funcional: evento is-page-change emite al cambiar página',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-data-grid')];
        const g1 = grids[0];
        let detail = null;
        g1.addEventListener('is-page-change', (e) => { detail = e.detail; });
        g1.paginationModel = { ...g1.paginationModel, page: 1 };
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            page: detail?.page ?? null,
            pageSize: detail?.pageSize ?? null,
          });
        }, 100);
      });
    });
    assert.deepEqual(captured.detailKeys, ['page', 'pageSize']);
    assert.equal(captured.page, 1, `page debe ser 1, fue ${captured.page}`);
    assert.equal(captured.pageSize, 5);
  },
});

tests.push({
  name: 'funcional: evento is-sort-change emite al ordenar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-data-grid')];
        const g1 = grids[0];
        let detail = null;
        g1.addEventListener('is-sort-change', (e) => { detail = e.detail; });
        // Aplicar sort via API
        g1.sortModel = [{ field: 'gross', sort: 'asc' }];
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            sortModel: detail?.sortModel ?? null,
          });
        }, 100);
      });
    });
    assert.deepEqual(captured.detailKeys, ['sortModel']);
    assert.deepEqual(captured.sortModel, [{ field: 'gross', sort: 'asc' }]);
  },
});

tests.push({
  name: 'funcional: show-toolbar="false" oculta la toolbar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const toolbars = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      return grids.map((g) => ({
        attr: g.getAttribute('show-toolbar'),
        hasToolbar: !!g.shadowRoot?.querySelector('.grid-toolbar'),
      }));
    });
    assert.equal(toolbars[0].hasToolbar, true, 'primer grid (show-toolbar) debe tener toolbar');
    assert.equal(toolbars[1].hasToolbar, false, 'segundo grid (show-toolbar="false") no debe tener toolbar');
    assert.equal(toolbars[2].hasToolbar, false, 'tercer grid (show-toolbar="false") no debe tener toolbar');
  },
});

tests.push({
  name: 'determinismo: round-trip columns/rows produce el mismo render',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-data-grid-ready');
    await page.waitForTimeout(400);
    const a = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      const g2 = grids[1];
      const cols = g2.columns;
      const rows = g2.rows;
      g2.columns = cols;
      g2.rows = rows;
      const body = g2.shadowRoot.querySelector('.grid-body');
      return [...(body?.querySelectorAll('.grid-row') ?? [])].map((r) => r.textContent.trim());
    });
    await page.waitForTimeout(50);
    const b = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-data-grid')];
      const g2 = grids[1];
      const body = g2.shadowRoot.querySelector('.grid-body');
      return [...(body?.querySelectorAll('.grid-row') ?? [])].map((r) => r.textContent.trim());
    });
    assert.deepEqual(a, b, 'round-trip mismo columns/rows → mismo textContent de filas');
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

report('data-grid', failures === 0, { total: tests.length, failures });