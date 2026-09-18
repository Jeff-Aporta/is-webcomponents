// ag-grid.test.mjs — tests exhaustivos del demo ag-grid.html.
// Cobertura: smoke + funcional (rendering, paginación, density, eventos,
// api.setRows/setColumns) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data/ag-grid/ag-grid.html`;

const tests = [];

tests.push({
  name: 'smoke: is-ag-grid está definido y todos los grids renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300); // el grid puede tardar en pintar
    const initial = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-ag-grid')];
      return {
        defined: !!customElements.get('is-ag-grid'),
        count: grids.length,
        perGrid: grids.map((g) => {
          const sr = g.shadowRoot;
          const headerCells = sr?.querySelectorAll('.mim-dg__head .mim-dg__cell, .mim-dg__header-cell')?.length ?? 0;
          const rowEls = sr?.querySelectorAll('.mim-dg__row')?.length ?? 0;
          return {
            hasRoot: !!sr?.querySelector('.mim-dg'),
            hasToolbar: !!sr?.querySelector('.mim-dg__toolbar'),
            headerCells,
            rowEls,
          };
        }),
      };
    });
    assert.equal(initial.defined, true, 'is-ag-grid debe estar definido');
    assert.equal(initial.count, 6, `esperaba 6 grids (1 + 3 densities + 2 plain), hay ${initial.count}`);
    // El primer grid (basic) debe tener toolbar; el último (plain) no.
    assert.equal(initial.perGrid[0].hasToolbar, true, 'basic debe tener toolbar');
    // El g3 (sin toolbar) debe tener toolbar=null
    const g3 = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-ag-grid')];
      return all[all.length - 1].shadowRoot.querySelector('.mim-dg__toolbar');
    });
    assert.equal(g3, null, 'plain (toolbar="false") no debe tener toolbar');
    await screenshot(page, 'ag-grid-smoke');
  },
});

tests.push({
  name: 'funcional: api.setRows / setColumns cargan los datos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-ag-grid')];
      const g1 = grids[0];
      const sr = g1.shadowRoot;
      // Buscar celdas con valores de la primera fila.
      const rowEls = [...sr.querySelectorAll('.mim-dg__row')];
      return {
        rowCount: rowEls.length,
        columnsCount: g1.columns.length,
        rowsCount: g1.rows.length,
        skuTexts: rowEls.map((r) => r.querySelector('.mim-dg__cell')?.textContent?.trim() || ''),
      };
    });
    // El basic tiene 8 rows y 6 columns, page-size=5 → 5 rows visibles.
    assert.equal(state.rowsCount, 8, `rows debe ser 8, fue ${state.rowsCount}`);
    assert.equal(state.columnsCount, 6, `columns debe ser 6, fue ${state.columnsCount}`);
    assert.ok(state.rowCount > 0, `debe haber al menos 1 row visible, hay ${state.rowCount}`);
    // La primera celda de cada fila debe ser uno de los SKUs conocidos.
    const expected = ['A-001', 'A-002', 'B-101', 'B-102', 'C-300'];
    const actual = state.skuTexts.slice(0, 5);
    assert.deepEqual(actual, expected, `primeros 5 SKUs deben ser ${JSON.stringify(expected)}, fueron ${JSON.stringify(actual)}`);
  },
});

tests.push({
  name: 'funcional: atributo density se aplica como data-density en el root',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(200);
    const densities = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-ag-grid')];
      // grids[1]=compact, grids[2]=normal, grids[3]=comfortable
      return grids.slice(1, 4).map((g) => ({
        attr: g.getAttribute('density'),
        rootData: g.shadowRoot.querySelector('.mim-dg')?.dataset?.density ?? null,
      }));
    });
    assert.equal(densities[0].attr, 'compact');
    assert.equal(densities[0].rootData, 'compact');
    assert.equal(densities[1].attr, 'normal');
    assert.equal(densities[1].rootData, 'normal');
    assert.equal(densities[2].attr, 'comfortable');
    assert.equal(densities[2].rootData, 'comfortable');
  },
});

tests.push({
  name: 'funcional: paginación muestra hasta pageSize filas y la API va a página 2',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300);
    const page1 = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-ag-grid')];
      const g1 = grids[0];
      const sr = g1.shadowRoot;
      const rows = [...sr.querySelectorAll('.mim-dg__row')];
      return {
        visibleRows: rows.length,
        pageSize: g1.getAttribute('page-size'),
        // Buscar el indicador de página actual (en el footer / toolbar)
        toolbarText: sr.querySelector('.mim-dg__toolbar')?.textContent || '',
      };
    });
    assert.equal(page1.pageSize, '5');
    // No debe haber más de 5 filas visibles.
    assert.ok(page1.visibleRows <= 5, `filas visibles debe ser <= 5, hay ${page1.visibleRows}`);

    // Llamar a goToPage(2) y verificar que se dispara is-page-change.
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-ag-grid')];
        const g1 = grids[0];
        let detail = null;
        g1.addEventListener('is-page-change', (e) => { detail = e.detail; });
        g1.api.goToPage(2);
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            page: detail?.page ?? null,
            pageSize: detail?.pageSize ?? null,
          });
        }, 80);
      });
    });
    assert.deepEqual(captured.detailKeys, ['page', 'pageSize']);
    assert.equal(captured.page, 2, `page debe ser 2, fue ${captured.page}`);
    assert.equal(captured.pageSize, 5, `pageSize debe ser 5, fue ${captured.pageSize}`);
  },
});

tests.push({
  name: 'funcional: selectAll emite is-row-select con detail.rows.length = 8',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300);
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-ag-grid')];
        const g1 = grids[0];
        let detail = null;
        g1.addEventListener('is-row-select', (e) => { detail = e.detail; });
        g1.api.selectAll();
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            rowsCount: detail?.rows?.length ?? 0,
            hasRows: Array.isArray(detail?.rows),
          });
        }, 80);
      });
    });
    assert.deepEqual(captured.detailKeys, ['rows']);
    assert.equal(captured.hasRows, true, 'detail.rows debe ser un array');
    assert.equal(captured.rowsCount, 8, `tras selectAll rows debe ser 8, fue ${captured.rowsCount}`);
  },
});

tests.push({
  name: 'funcional: api.setQuickFilter filtra las filas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-ag-grid')];
        const g3 = grids[grids.length - 1]; // sin paginación
        g3.api.setQuickFilter('HDMI');
        setTimeout(() => {
          const displayed = g3.api.getDisplayedRows();
          resolve({
            count: displayed.length,
            names: displayed.map((r) => r.name),
          });
        }, 120);
      });
    });
    // Sólo "Cable HDMI 2m" contiene "HDMI".
    assert.equal(result.count, 1, `quickFilter "HDMI" debe dejar 1 fila, hay ${result.count}`);
    assert.ok(result.names[0]?.includes('HDMI'), `la fila debe contener "HDMI", fue "${result.names[0]}"`);
  },
});

tests.push({
  name: 'funcional: evento is-cell-click emite detail { row, column, value }',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300);
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-ag-grid')];
        const g1 = grids[0];
        let detail = null;
        g1.addEventListener('is-cell-click', (e) => { detail = e.detail; });
        // Buscar la primera celda visible y hacer click
        const sr = g1.shadowRoot;
        const cell = sr.querySelector('.mim-dg__row .mim-dg__cell');
        if (!cell) {
          resolve({ error: 'no cell found' });
          return;
        }
        cell.click();
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            hasRow: !!(detail && detail.row),
            hasColumn: !!(detail && detail.column),
            columnField: detail?.column?.field ?? null,
            value: detail?.value ?? null,
          });
        }, 80);
      });
    });
    assert.deepEqual(captured.detailKeys, ['column', 'row', 'value'],
      `detail debe tener keys [column, row, value], tuvo ${JSON.stringify(captured.detailKeys)}`);
    assert.equal(captured.hasRow, true);
    assert.equal(captured.hasColumn, true);
    assert.equal(captured.columnField, 'sku', `primera columna debe ser "sku", fue "${captured.columnField}"`);
    assert.equal(captured.value, 'A-001', `valor primera celda debe ser "A-001", fue "${captured.value}"`);
  },
});

tests.push({
  name: 'funcional: exportCSV genera un Blob y dispara descarga (no lanza errores)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300);
    // Capturar creación de <a download="..."> en el DOM.
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const grids = [...document.querySelectorAll('main is-ag-grid')];
        const g1 = grids[0];
        let downloadName = null;
        const origCreate = document.createElement.bind(document);
        document.createElement = (tag) => {
          const el = origCreate(tag);
          if (tag.toLowerCase() === 'a') {
            const origClick = el.click;
            el.click = () => { downloadName = el.download; };
          }
          return el;
        };
        try {
          g1.api.exportCSV('test-export.csv');
        } catch (e) {
          document.createElement = origCreate;
          resolve({ error: String(e?.message ?? e) });
          return;
        }
        setTimeout(() => {
          document.createElement = origCreate;
          resolve({ downloadName });
        }, 80);
      });
    });
    assert.equal(captured.error, undefined, `exportCSV no debe lanzar, lanzó "${captured.error}"`);
    assert.equal(captured.downloadName, 'test-export.csv',
      `download filename debe ser "test-export.csv", fue "${captured.downloadName}"`);
  },
});

tests.push({
  name: 'determinismo: getState() es estable tras setRows/setColumns con los mismos datos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-ag-grid-ready');
    await page.waitForTimeout(300);
    const a = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-ag-grid')];
      return JSON.stringify(grids[0].api.getState());
    });
    await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-ag-grid')];
      const g = grids[0];
      g.api.setColumns(g.columns);
      g.api.setRows(g.rows);
    });
    await page.waitForTimeout(100);
    const b = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('main is-ag-grid')];
      return JSON.stringify(grids[0].api.getState());
    });
    assert.equal(a, b, 'round-trip setColumns + setRows debe producir el mismo estado');
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

report('ag-grid', failures === 0, { total: tests.length, failures });