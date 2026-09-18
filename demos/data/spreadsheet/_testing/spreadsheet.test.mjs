// spreadsheet.test.mjs — tests exhaustivos del demo spreadsheet.html.
// Cobertura: smoke + funcional (rendering, fórmulas SUM/COUNT/MIN/MAX, edición,
// eventos, read-only) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data/spreadsheet/spreadsheet.html`;

const tests = [];

tests.push({
  name: 'smoke: is-spreadsheet está definido y los 4 spreadsheets renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    const initial = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      return {
        defined: !!customElements.get('is-spreadsheet'),
        count: sheets.length,
        perSheet: sheets.map((s) => {
          const sr = s.shadowRoot;
          const table = sr?.querySelector('table.grid');
          const cells = table?.querySelectorAll('td.cell').length ?? 0;
          const headers = table?.querySelectorAll('thead th').length ?? 0;
          return {
            hasTable: !!table,
            hasPartRoot: !!sr.querySelector('[part="root"]'),
            hasPartGrid: !!sr.querySelector('[part="grid"]'),
            cells,
            headers,
            rows: s.getAttribute('rows'),
            cols: s.getAttribute('cols'),
          };
        }),
      };
    });
    assert.equal(initial.defined, true, 'is-spreadsheet debe estar definido');
    assert.equal(initial.count, 4, `esperaba 4 spreadsheets, hay ${initial.count}`);
    for (let i = 0; i < initial.perSheet.length; i++) {
      const r = initial.perSheet[i];
      assert.equal(r.hasTable, true, `sheet[${i}]: debe tener <table class="grid">`);
      assert.equal(r.hasPartRoot, true, `sheet[${i}]: debe tener part="root"`);
      assert.equal(r.hasPartGrid, true, `sheet[${i}]: debe tener part="grid"`);
      const expectedCells = Number(r.rows) * Number(r.cols);
      assert.equal(r.cells, expectedCells, `sheet[${i}]: ${r.cells} celdas, esperaba ${expectedCells}`);
      // Headers: corner + N cols (letras A, B, ...)
      assert.equal(r.headers, 1 + Number(r.cols), `sheet[${i}]: headers debe ser ${1 + Number(r.cols)}, fue ${r.headers}`);
    }
    await screenshot(page, 'spreadsheet-smoke');
  },
});

tests.push({
  name: 'funcional: fórmulas =SUM(A1:A5), =SUM(B1:B5), =SUM(C1:C5) en fila 6',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    const sums = await page.evaluate(() => {
      const s = document.querySelector('main is-spreadsheet'); // el primero (formulas)
      const sr = s.shadowRoot;
      const rows = [...sr.querySelectorAll('tbody tr')];
      // Fila 6 (índice 5) — primera fila de fórmulas
      const formulasRow = rows[5];
      const cells = [...formulasRow.querySelectorAll('td.cell')].map((c) => c.textContent.trim());
      return { cells };
    });
    // A1:A5 = 10+40+70+100+130 = 350
    // B1:B5 = 20+50+80+110+140 = 400
    // C1:C5 = 30+60+90+120+150 = 450
    assert.equal(sums.cells[0], '350', `SUM(A1:A5) debe ser "350", fue "${sums.cells[0]}"`);
    assert.equal(sums.cells[1], '400', `SUM(B1:B5) debe ser "400", fue "${sums.cells[1]}"`);
    assert.equal(sums.cells[2], '450', `SUM(C1:C5) debe ser "450", fue "${sums.cells[2]}"`);
  },
});

tests.push({
  name: 'funcional: fórmula =COUNT(B2:B5) en mixed devuelve 4 (4 numéricos)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    const result = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      const mixed = sheets[1]; // segundo: mixed
      const rows = [...mixed.shadowRoot.querySelectorAll('tbody tr')];
      // Fila 6 (índice 5): ['=COUNT(B2:B5)', '=SUM(B2:B5)']
      const lastRow = rows[5];
      const cells = [...lastRow.querySelectorAll('td.cell')].map((c) => c.textContent.trim());
      return cells;
    });
    // B2:B5 son 10,20,30,40 → count=4, sum=100
    assert.equal(result[1], '4', `COUNT(B2:B5) debe ser "4", fue "${result[1]}"`);
    assert.equal(result[2], '100', `SUM(B2:B5) debe ser "100", fue "${result[2]}"`);
  },
});

tests.push({
  name: 'funcional: fórmula =MIN(A1:C1) y =MAX(A1:C1) en empty',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    const result = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      const empty = sheets[3]; // el cuarto
      const rows = [...empty.shadowRoot.querySelectorAll('tbody tr')];
      // Fila 2 (índice 1): ['', '=MIN(A1:C1)', '=MAX(A1:C1)']
      const targetRow = rows[1];
      const cells = [...targetRow.querySelectorAll('td.cell')].map((c) => c.textContent.trim());
      return cells;
    });
    // A1, B1, C1 son todos vacíos (''). MIN/MAX de vacío se interpretan como 0.
    // El código del componente hace min(...arr.map(Number)) y si arr vacío → 0.
    assert.equal(result[1], '0', `MIN(A1:C1) debe ser "0" (vacío), fue "${result[1]}"`);
    assert.equal(result[2], '0', `MAX(A1:C1) debe ser "0" (vacío), fue "${result[2]}"`);
  },
});

tests.push({
  name: 'funcional: edición de celda actualiza el DOM y emite is-change',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    await page.waitForTimeout(100);
    // Suscribirse y editar cell A1 del cuarto (empty) que está vacío.
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const sheets = [...document.querySelectorAll('main is-spreadsheet')];
        const empty = sheets[3];
        let detail = null;
        empty.addEventListener('is-change', (e) => { detail = e.detail; });

        // Buscar la celda data-r=0 data-c=0 (A1)
        const cell = empty.shadowRoot.querySelector('td.cell[data-r="0"][data-c="0"]');
        cell.click();
        // Después del click, hay un input.cell-input. Cambiamos el valor y Enter.
        setTimeout(() => {
          const input = empty.shadowRoot.querySelector('input.cell-input');
          if (!input) {
            resolve({ error: 'no input after click' });
            return;
          }
          input.value = '99';
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          setTimeout(() => {
            // Re-leer la celda.
            const newCell = empty.shadowRoot.querySelector('td.cell[data-r="0"][data-c="0"]');
            resolve({
              cellText: newCell?.textContent.trim() || null,
              detailKeys: detail ? Object.keys(detail).sort() : [],
              row: detail?.row ?? null,
              col: detail?.col ?? null,
              raw: detail?.raw ?? null,
              value: detail?.value ?? null,
            });
          }, 80);
        }, 80);
      });
    });
    assert.equal(captured.cellText, '99', `celda A1 debe mostrar "99", fue "${captured.cellText}"`);
    assert.deepEqual(captured.detailKeys, ['col', 'raw', 'row', 'value'],
      `detail debe tener keys [col, raw, row, value], tuvo ${JSON.stringify(captured.detailKeys)}`);
    assert.equal(captured.row, 0);
    assert.equal(captured.col, 0);
    assert.equal(captured.raw, '99');
    assert.equal(captured.value, '99');
  },
});

tests.push({
  name: 'funcional: read-only bloquea la edición (no se crea input.cell-input)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      const ro = sheets[2]; // tercero: read-only
      assert(ro.hasAttribute('read-only'), 'el sheet debe tener atributo read-only');
      const cell = ro.shadowRoot.querySelector('td.cell[data-r="1"][data-c="1"]');
      cell.click();
      return {
        hasInput: !!ro.shadowRoot.querySelector('input.cell-input'),
        cellText: cell.textContent.trim(),
      };
    });
    assert.equal(result.hasInput, false, 'read-only no debe abrir un input al hacer click');
    // El cell text no debe cambiar.
    assert.ok(result.cellText.length > 0, `cell text debe estar intacto, fue "${result.cellText}"`);
  },
});

tests.push({
  name: 'funcional: Esc cancela la edición y revierte el valor',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const sheets = [...document.querySelectorAll('main is-spreadsheet')];
        const empty = sheets[3];
        const cell = empty.shadowRoot.querySelector('td.cell[data-r="0"][data-c="0"]');
        cell.click();
        setTimeout(() => {
          const input = empty.shadowRoot.querySelector('input.cell-input');
          input.value = '777';
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
          setTimeout(() => {
            const newCell = empty.shadowRoot.querySelector('td.cell[data-r="0"][data-c="0"]');
            resolve({ cellText: newCell?.textContent.trim() || null });
          }, 80);
        }, 80);
      });
    });
    // A1 estaba vacío, debe seguir vacío tras Esc.
    assert.equal(result.cellText, '', `tras Esc A1 debe seguir "", fue "${result.cellText}"`);
  },
});

tests.push({
  name: 'funcional: fórmula inválida (#ERR) se muestra tal cual',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const s = document.createElement('is-spreadsheet');
      s.setAttribute('rows', '2');
      s.setAttribute('cols', '2');
      s.setAttribute('value', JSON.stringify([
        [10, '=BADFN(A1)'],
      ]));
      document.body.appendChild(s);
      const cell = s.shadowRoot.querySelector('td.cell[data-r="0"][data-c="1"]');
      const text = cell.textContent.trim();
      s.remove();
      return text;
    });
    // BADFN no existe → #ERR
    assert.equal(result, '#ERR', `fórmula inválida debe mostrar "#ERR", fue "${result}"`);
  },
});

tests.push({
  name: 'determinismo: cambiar el atributo value re-renderiza la tabla',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    await page.waitForTimeout(100);
    const a = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      const empty = sheets[3];
      return [...empty.shadowRoot.querySelectorAll('td.cell[data-r="1"][data-c]')]
        .map((c) => c.textContent.trim());
    });
    // Re-asignar el mismo value attribute
    await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      const empty = sheets[3];
      const v = empty.getAttribute('value');
      empty.removeAttribute('value');
      empty.setAttribute('value', v);
    });
    await page.waitForTimeout(80);
    const b = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      const empty = sheets[3];
      return [...empty.shadowRoot.querySelectorAll('td.cell[data-r="1"][data-c]')]
        .map((c) => c.textContent.trim());
    });
    assert.deepEqual(a, b, 'mismo value attribute debe producir el mismo render');
  },
});

tests.push({
  name: 'accesibilidad: la tabla tiene role="grid"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spreadsheet-ready');
    const role = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('main is-spreadsheet')];
      const table = sheets[0].shadowRoot.querySelector('table.grid');
      return table?.getAttribute('role');
    });
    assert.equal(role, 'grid', `role de la tabla debe ser "grid", fue "${role}"`);
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

report('spreadsheet', failures === 0, { total: tests.length, failures });