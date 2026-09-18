// data-grid.stagehand.test.mjs — verificaciones de calidad visual.
//
// Mismo patrón que diagramas/ER/er-stagehand.test.mjs: por defecto corremos
// checks deterministas (Playwright puro) que NO skippean. STAGEHAND=1 +
// MINIMAX_API_KEY activa la rama LLM con un rubric en español.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data/data-grid/data-grid.html`, readyAttr: 'data-data-grid-ready', name: 'data-grid' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(400);

  const data = await page.evaluate(() => {
    const grids = [...document.querySelectorAll('main is-data-grid')];
    return grids.map((g, idx) => {
      const sr = g.shadowRoot;
      const base = sr.querySelector('.grid');
      const baseRect = base?.getBoundingClientRect();
      const toolbar = sr.querySelector('.grid-toolbar');
      const head = sr.querySelector('.grid-header');
      const body = sr.querySelector('.grid-body');
      const headCells = [...(head?.querySelectorAll('[data-field]') ?? [])];
      const bodyRows = [...(body?.querySelectorAll('.grid-row') ?? [])];
      const firstRowCells = bodyRows[0] ? [...bodyRows[0].querySelectorAll('[data-field]')] : [];
      const cellsText = firstRowCells.map((c) => (c.textContent ?? '').trim());
      const pagination = g.paginationModel;
      return {
        idx,
        hasBase: !!base,
        hasHead: !!head,
        hasBody: !!body,
        hasToolbar: !!toolbar,
        baseW: baseRect?.width ?? 0,
        baseH: baseRect?.height ?? 0,
        headFieldCount: headCells.length,
        headFieldNames: headCells.map((c) => c.dataset.field),
        rowCount: bodyRows.length,
        firstRowCellCount: firstRowCells.length,
        cellsText,
        columnCount: g.columns?.length ?? 0,
        rowTotal: g.rows?.length ?? 0,
        paginationPage: pagination?.page ?? null,
        paginationPageSize: pagination?.pageSize ?? null,
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber al menos un data-grid, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;

    // (1) Layout no-cero.
    assert.equal(d.hasBase, true, `${tag}: debe existir .grid`);
    assert.equal(d.hasHead, true, `${tag}: debe existir .grid-header`);
    assert.equal(d.hasBody, true, `${tag}: debe existir .grid-body`);
    assert.ok(d.baseW > 100, `${tag}: ancho del grid debe ser > 100, fue ${d.baseW}`);
    assert.ok(d.baseH > 50, `${tag}: alto del grid debe ser > 50, fue ${d.baseH}`);

    // (2) Header con cells correspondientes a columns.
    assert.equal(d.headFieldCount, d.columnCount,
      `${tag}: header cells (${d.headFieldCount}) debe coincidir con columns (${d.columnCount})`);

    // (3) Filas visibles con celdas y texto no vacío.
    if (d.rowCount > 0) {
      assert.ok(d.firstRowCellCount >= 1,
        `${tag}: primera fila debe tener al menos 1 celda, tiene ${d.firstRowCellCount}`);
      const empty = d.cellsText.filter((t) => !t);
      // Permitimos celdas vacías (por ejemplo, columns sin valueGetter).
      assert.ok(empty.length < d.cellsText.length,
        `${tag}: la primera fila debe tener al menos una celda con texto, todas vacías (${empty.length}/${d.cellsText.length})`);
    }

    // (4) Datos cargados via columns/rows setters.
    assert.ok(d.columnCount > 0, `${tag}: columns debe ser > 0`);
    assert.ok(d.rowTotal > 0, `${tag}: rows debe ser > 0`);

    // (5) Paginación consistente.
    if (d.paginationPageSize != null) {
      assert.ok(d.paginationPageSize > 0, `${tag}: pageSize debe ser > 0, fue ${d.paginationPageSize}`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (grids renderizan, layout no-cero, headers+filas correctos)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM. Sólo corre si STAGEHAND=1 + credenciales.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del data grid (<is-data-grid>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CABECERAS VISIBLES: la tabla muestra una fila de cabecera con los nombres de las columnas del grid (Nombre, Rol, Bruto, etc.).

2. FILAS LEGIBLES: debajo de la cabecera hay varias filas con datos (nombres, roles, números) y son visualmente distinguibles (filas alternadas o con bordes).

3. TOOLBAR VISIBLE: en la parte superior hay una toolbar con buscador rápido (quick filter) y/o controles visibles.

4. LAYOUT NO VACÍO: el grid tiene un tamaño visible (alto y ancho suficientes para mostrar varias filas) y no aparece como una línea plana.

5. PAGINACIÓN VISIBLE: si el grid está paginado, se ven los controles de paginación (página actual, total, navegación).

Responde SOLO con un JSON con la forma:
{
  "headers_visible": "PASS" | "FAIL",
  "rows_legible": "PASS" | "FAIL",
  "toolbar_visible": "PASS" | "FAIL" | "N/A",
  "non_empty_layout": "PASS" | "FAIL",
  "pagination_visible": "PASS" | "FAIL" | "N/A",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric(demo) {
  const sh = await maybeStagehand();
  if (!sh) return { name: demo.name, llm_skipped: true };

  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['headers_visible', 'rows_legible', 'toolbar_visible', 'non_empty_layout', 'pagination_visible'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { name: demo.name, llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  for (const demo of DEMOS) {
    try {
      const r = await runStagehandRubric(demo);
      if (r.llm_skipped) {
        console.log(`  ⊘ ${demo.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
      } else if (!r.fails || r.fails.length === 0) {
        console.log(`  ✓ ${demo.name}: visual rubric LLM PASS`);
      } else {
        console.error(`  ✗ ${demo.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
      }
    } catch (err) {
      console.error(`  ✗ ${demo.name} (LLM): ${String(err?.message ?? err)}`);
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('data-grid-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });