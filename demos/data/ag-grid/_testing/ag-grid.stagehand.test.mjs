// ag-grid.stagehand.test.mjs — verificaciones de calidad visual.
//
// Mismo patrón que diagramas/ER/er-stagehand.test.mjs: por defecto corremos
// checks deterministas (Playwright puro) que NO skippean. STAGEHAND=1 +
// MINIMAX_API_KEY activa la rama LLM con un rubric en español.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data/ag-grid/ag-grid.html`, readyAttr: 'data-ag-grid-ready', name: 'ag-grid' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const grids = [...document.querySelectorAll('main is-ag-grid')];
    return grids.map((g, idx) => {
      const sr = g.shadowRoot;
      const root = sr.querySelector('.mim-dg');
      const rootRect = root?.getBoundingClientRect();
      const toolbar = sr.querySelector('.mim-dg__toolbar');
      const rows = [...sr.querySelectorAll('.mim-dg__row')];
      const firstRowCells = rows[0] ? [...rows[0].querySelectorAll('.mim-dg__cell')] : [];
      const cellsText = firstRowCells.map((c) => (c.textContent ?? '').trim());
      return {
        idx,
        hasRoot: !!root,
        hasToolbar: !!toolbar,
        rootW: rootRect?.width ?? 0,
        rootH: rootRect?.height ?? 0,
        rowCount: rows.length,
        firstRowCellCount: firstRowCells.length,
        cellsText,
        density: root?.dataset?.density ?? null,
        hasRows: g.rows?.length > 0,
        hasColumns: g.columns?.length > 0,
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber al menos un ag-grid, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;

    // (1) Root renderiza con layout no-cero.
    assert.equal(d.hasRoot, true, `${tag}: debe existir .mim-dg`);
    assert.ok(d.rootW > 100, `${tag}: ancho del grid debe ser > 100, fue ${d.rootW}`);
    assert.ok(d.rootH > 50, `${tag}: alto del grid debe ser > 50, fue ${d.rootH}`);

    // (2) Filas visibles con celdas.
    assert.ok(d.rowCount >= 1, `${tag}: debe haber al menos 1 fila visible, hay ${d.rowCount}`);
    if (d.rowCount > 0) {
      assert.ok(d.firstRowCellCount >= 1, `${tag}: primera fila debe tener al menos 1 celda, tiene ${d.firstRowCellCount}`);
      const emptyCells = d.cellsText.filter((t) => !t);
      assert.equal(emptyCells.length, 0, `${tag}: hay ${emptyCells.length} celdas vacías en la primera fila`);
    }

    // (3) Datos cargados via api.setRows/setColumns.
    assert.equal(d.hasRows, true, `${tag}: rows debe ser > 0`);
    assert.equal(d.hasColumns, true, `${tag}: columns debe ser > 0`);

    // (4) Density: primer grid es default (sin attr density, debería ser 'normal').
    if (d.density) {
      assert.ok(['compact', 'normal', 'comfortable'].includes(d.density),
        `${tag}: data-density="${d.density}" no es compact/normal/comfortable`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (grids renderizan, layout no-cero, datos cargados, density válida)`);
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
Evalúa la calidad visual del data grid (<is-ag-grid>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CABECERAS VISIBLES: la tabla muestra una fila de cabecera con los nombres de las columnas del grid (SKU, Producto, Precio, etc.).

2. FILAS LEGIBLES: debajo de la cabecera hay varias filas con datos (productos, SKUs, precios) y son visualmente distinguibles (filas alternadas o con bordes).

3. TOOLBAR VISIBLE: en la parte superior hay una toolbar con buscador rápido (quick filter) y/o controles de densidad.

4. LAYOUT NO VACÍO: el grid tiene un tamaño visible (alto y ancho suficientes para mostrar varias filas) y no aparece como una línea plana.

5. DENSIDADES DIFERENCIADAS: si hay múltiples grids con densidades distintas (compact, normal, comfortable), se ven visualmente diferentes (alto de fila distinto).

Responde SOLO con un JSON con la forma:
{
  "headers_visible": "PASS" | "FAIL",
  "rows_legible": "PASS" | "FAIL",
  "toolbar_visible": "PASS" | "FAIL" | "N/A",
  "non_empty_layout": "PASS" | "FAIL",
  "densities_differentiated": "PASS" | "FAIL" | "N/A",
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
    const checks = ['headers_visible', 'rows_legible', 'toolbar_visible', 'non_empty_layout', 'densities_differentiated'];
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
report('ag-grid-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });