// pivot-table.test.mjs — tests exhaustivos del demo pivot-table.html.
// Cobertura: smoke + funcional (rendering, sum/count/avg, totales, click event)
// + determinismo (round-trip de script JSON).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data/pivot-table/pivot-table.html`;

const tests = [];

tests.push({
  name: 'smoke: is-pivot-table está definido y los 4 pivots renderizan tablas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const initial = await page.evaluate(() => {
      const pivots = [...document.querySelectorAll('main is-pivot-table')];
      return {
        defined: !!customElements.get('is-pivot-table'),
        count: pivots.length,
        perPivot: pivots.map((p) => {
          const sr = p.shadowRoot;
          const table = sr?.querySelector('table.pivot');
          const headerCells = table?.querySelectorAll('thead th').length ?? 0;
          const bodyRows = table?.querySelectorAll('tbody tr').length ?? 0;
          const totalRows = table?.querySelectorAll('tfoot tr').length ?? 0;
          return {
            hasTable: !!table,
            headerCells,
            bodyRows,
            totalRows,
            hasPartRoot: !!sr.querySelector('[part="root"]'),
            hasPartTable: !!sr.querySelector('[part="table"]'),
          };
        }),
      };
    });
    assert.equal(initial.defined, true, 'is-pivot-table debe estar definido');
    assert.equal(initial.count, 4, `esperaba 4 pivots, hay ${initial.count}`);
    for (let i = 0; i < initial.perPivot.length; i++) {
      const r = initial.perPivot[i];
      assert.equal(r.hasTable, true, `pivot[${i}]: debe tener <table class="pivot">`);
      assert.equal(r.hasPartRoot, true, `pivot[${i}]: debe tener part="root"`);
      assert.equal(r.hasPartTable, true, `pivot[${i}]: debe tener part="table"`);
      // 1 corner + 3 cols (Q1, Q2, Q3) + 1 Total = 5 header cells
      assert.equal(r.headerCells, 5, `pivot[${i}]: header debe tener 5 celdas, tiene ${r.headerCells}`);
      // 4 regiones
      assert.equal(r.bodyRows, 4, `pivot[${i}]: body debe tener 4 filas, tiene ${r.bodyRows}`);
      // 1 fila de totales
      assert.equal(r.totalRows, 1, `pivot[${i}]: tfoot debe tener 1 fila, tiene ${r.totalRows}`);
    }
    await screenshot(page, 'pivot-table-smoke');
  },
});

tests.push({
  name: 'funcional: SUM agrega correctamente Norte+Q1 = 120 (Norte tiene 1 fila en Q1)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    // Recoger el texto de la celda Norte × Q1.
    const cellValue = await page.evaluate(() => {
      const pivots = [...document.querySelectorAll('main is-pivot-table')];
      // El primero es el SUM.
      const sum = pivots[0];
      const sr = sum.shadowRoot;
      const tbody = sr.querySelector('tbody');
      // Buscar la fila cuyo primer td (row-head) diga "Norte".
      const rows = [...tbody.querySelectorAll('tr')];
      const norteRow = rows.find((r) => r.querySelector('td.row-head')?.textContent.trim() === 'Norte');
      // Las celdas en orden: row-head, Q1, Q2, Q3, total
      const cells = [...norteRow.querySelectorAll('td')];
      return {
        q1: cells[1]?.textContent.trim() || null,
        q2: cells[2]?.textContent.trim() || null,
        q3: cells[3]?.textContent.trim() || null,
        total: cells[4]?.textContent.trim() || null,
      };
    });
    // Norte: Q1=120, Q2=180, Q3=90 → Total=390
    assert.equal(cellValue.q1, '120', `Norte Q1 debe ser "120", fue "${cellValue.q1}"`);
    assert.equal(cellValue.q2, '180');
    assert.equal(cellValue.q3, '90');
    assert.equal(cellValue.total, '390', `Norte Total debe ser "390", fue "${cellValue.total}"`);
  },
});

tests.push({
  name: 'funcional: AVG produce 1 decimal por el atributo decimals="1"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const cellValue = await page.evaluate(() => {
      const pivots = [...document.querySelectorAll('main is-pivot-table')];
      // El segundo es AVG con decimals=1.
      const avg = pivots[1];
      const tbody = avg.shadowRoot.querySelector('tbody');
      const rows = [...tbody.querySelectorAll('tr')];
      const norteRow = rows.find((r) => r.querySelector('td.row-head')?.textContent.trim() === 'Norte');
      const cells = [...norteRow.querySelectorAll('td')];
      return {
        q1: cells[1]?.textContent.trim() || null,
        // Verificamos que el texto tiene un decimal (formato "x.y")
        hasDecimal: !!(cells[1]?.textContent.trim().match(/^\d+\.\d$/)),
      };
    });
    // Norte tiene 1 fila por Q → avg = mismo valor: 120.0
    assert.match(cellValue.q1, /^120\.0$/, `Norte Q1 avg debe ser "120.0", fue "${cellValue.q1}"`);
    assert.equal(cellValue.hasDecimal, true, 'el formato debe incluir 1 decimal');
  },
});

tests.push({
  name: 'funcional: COUNT no requiere measure y devuelve 1 por celda con dato',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const counts = await page.evaluate(() => {
      const pivots = [...document.querySelectorAll('main is-pivot-table')];
      // El tercero es COUNT.
      const cnt = pivots[2];
      const tbody = cnt.shadowRoot.querySelector('tbody');
      const rows = [...tbody.querySelectorAll('tr')];
      const norteRow = rows.find((r) => r.querySelector('td.row-head')?.textContent.trim() === 'Norte');
      const cells = [...norteRow.querySelectorAll('td')];
      // row-head + Q1..Q3 + total
      return cells.map((c) => c.textContent.trim());
    });
    // Norte: 1 fila por Q → 1, 1, 1, total=3
    assert.equal(counts[1], '1', `Norte Q1 count debe ser "1", fue "${counts[1]}"`);
    assert.equal(counts[2], '1');
    assert.equal(counts[3], '1');
    assert.equal(counts[4], '3', `Norte Total count debe ser "3", fue "${counts[4]}"`);
  },
});

tests.push({
  name: 'funcional: evento is-cell-click emite detail { row, col, value }',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const pivots = [...document.querySelectorAll('main is-pivot-table')];
        const sum = pivots[0];
        let detail = null;
        sum.addEventListener('is-cell-click', (e) => { detail = e.detail; });
        // Click en la celda Norte × Q2
        const tbody = sum.shadowRoot.querySelector('tbody');
        const rows = [...tbody.querySelectorAll('tr')];
        const norteRow = rows.find((r) => r.querySelector('td.row-head')?.textContent.trim() === 'Norte');
        const cells = [...norteRow.querySelectorAll('td.cell')];
        cells[1].click(); // Q2
        setTimeout(() => {
          resolve({
            detailKeys: detail ? Object.keys(detail).sort() : [],
            row: detail?.row ?? null,
            col: detail?.col ?? null,
            value: detail?.value ?? null,
          });
        }, 80);
      });
    });
    assert.deepEqual(captured.detailKeys, ['col', 'row', 'value'],
      `detail debe tener keys [col, row, value], tuvo ${JSON.stringify(captured.detailKeys)}`);
    assert.equal(captured.row, 'Norte');
    assert.equal(captured.col, 'Q2');
    assert.equal(captured.value, 180, `value debe ser 180 (norte×Q2), fue ${captured.value}`);
  },
});

tests.push({
  name: 'funcional: celdas vacías se renderizan con "—"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    // Crear un pivot con un dataset que tenga huecos: Oeste sin Q2.
    const gapsData = [
      { region: 'Norte', q: 'Q1', sales: 10 },
      { region: 'Sur', q: 'Q1', sales: 20 },
      // Oeste no tiene datos en Q1.
    ];
    const cellText = await page.evaluate((data) => {
      const p = document.createElement('is-pivot-table');
      p.setAttribute('rows', 'region');
      p.setAttribute('cols', 'q');
      p.setAttribute('measure', 'sales');
      p.setAttribute('agg', 'sum');
      const s = document.createElement('script');
      s.type = 'application/json';
      s.textContent = JSON.stringify(data);
      p.appendChild(s);
      document.body.appendChild(p);
      const tbody = p.shadowRoot.querySelector('tbody');
      const rows = [...tbody.querySelectorAll('tr')];
      const cells = rows.map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent.trim()));
      p.remove();
      return cells;
    }, gapsData);
    // Oeste debe tener "—" en Q1.
    const oeste = cellText.find((r) => r[0] === 'Oeste');
    assert.ok(oeste, 'debe existir la fila Oeste');
    assert.equal(oeste[1], '—', `Oeste Q1 debe ser "—", fue "${oeste[1]}"`);
  },
});

tests.push({
  name: 'funcional: agg inválido cae al default sum sin lanzar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const ok = await page.evaluate(() => {
      const data = [
        { region: 'A', q: 'Q1', v: 10 },
        { region: 'B', q: 'Q1', v: 20 },
      ];
      const p = document.createElement('is-pivot-table');
      p.setAttribute('rows', 'region');
      p.setAttribute('cols', 'q');
      p.setAttribute('measure', 'v');
      p.setAttribute('agg', 'sum-not-a-fn');
      const s = document.createElement('script');
      s.type = 'application/json';
      s.textContent = JSON.stringify(data);
      p.appendChild(s);
      document.body.appendChild(p);
      const tbody = p.shadowRoot.querySelector('tbody');
      const rows = [...tbody.querySelectorAll('tr')];
      const cells = rows.map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent.trim()));
      p.remove();
      return { ok: true, cells };
    });
    // agg inválido → fallback sum.
    const a = ok.cells.find((r) => r[0] === 'A');
    const b = ok.cells.find((r) => r[0] === 'B');
    assert.equal(a[1], '10', `A Q1 debe ser "10" (fallback sum), fue "${a[1]}"`);
    assert.equal(b[1], '20', `B Q1 debe ser "20", fue "${b[1]}"`);
  },
});

tests.push({
  name: 'funcional: rows y cols faltantes muestran mensaje de error',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const msg = await page.evaluate(() => {
      const p = document.createElement('is-pivot-table');
      // Sin rows ni cols.
      document.body.appendChild(p);
      const tfoot = p.shadowRoot.querySelector('tfoot');
      const text = tfoot?.textContent?.trim() || '';
      p.remove();
      return text;
    });
    assert.match(msg, /rows.*cols|cols.*rows/i, `mensaje de error debe mencionar rows/cols, fue "${msg}"`);
  },
});

tests.push({
  name: 'determinismo: el mismo dataset produce la misma tabla (textContent idéntico)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const a = await page.evaluate(() => {
      const sum = document.querySelector('main is-pivot-table');
      return sum.shadowRoot.querySelector('table').textContent.replace(/\s+/g, ' ').trim();
    });
    // Re-asignar el mismo script
    await page.evaluate(() => {
      const sum = document.querySelector('main is-pivot-table');
      const script = sum.querySelector('script[type="application/json"]');
      const json = script.textContent;
      sum.removeChild(script);
      const newScript = document.createElement('script');
      newScript.type = 'application/json';
      newScript.textContent = json;
      sum.appendChild(newScript);
    });
    await page.waitForTimeout(50);
    const b = await page.evaluate(() => {
      const sum = document.querySelector('main is-pivot-table');
      return sum.shadowRoot.querySelector('table').textContent.replace(/\s+/g, ' ').trim();
    });
    assert.equal(a, b, 'round-trip mismo JSON → mismo textContent de tabla');
  },
});

tests.push({
  name: 'accesibilidad: la tabla tiene role="table"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-pivot-table-ready');
    const role = await page.evaluate(() => {
      const sum = document.querySelector('main is-pivot-table');
      const table = sum.shadowRoot.querySelector('table.pivot');
      return table?.getAttribute('role');
    });
    assert.equal(role, 'table', `role de la tabla debe ser "table", fue "${role}"`);
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

report('pivot-table', failures === 0, { total: tests.length, failures });