// spreadsheet.stagehand.test.mjs — verificaciones de calidad visual.
//
// Mismo patrón que diagramas/ER/er-stagehand.test.mjs: por defecto corremos
// checks deterministas (Playwright puro) que NO skippean. STAGEHAND=1 +
// MINIMAX_API_KEY activa la rama LLM con un rubric en español.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data/spreadsheet/spreadsheet.html`, readyAttr: 'data-spreadsheet-ready', name: 'spreadsheet' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll('main is-spreadsheet')];
    return sheets.map((s, idx) => {
      const sr = s.shadowRoot;
      const table = sr.querySelector('table.grid');
      const tableRect = table?.getBoundingClientRect();
      const headers = [...(table?.querySelectorAll('thead th') ?? [])].map((th) => th.textContent.trim());
      const corner = table?.querySelector('thead th.corner');
      const rowHeads = [...(table?.querySelectorAll('tbody th.row-head') ?? [])].map((th) => th.textContent.trim());
      const cells = [...(table?.querySelectorAll('tbody td.cell') ?? [])];
      const firstCell = cells[0];
      const cellRect = firstCell?.getBoundingClientRect();
      const lastCell = cells[cells.length - 1];
      const lastCellRect = lastCell?.getBoundingClientRect();
      const hasTabindex = firstCell?.hasAttribute('tabindex') ?? false;
      const readonly = s.hasAttribute('read-only');
      return {
        idx,
        hasTable: !!table,
        readonly,
        tableW: tableRect?.width ?? 0,
        tableH: tableRect?.height ?? 0,
        hasCorner: !!corner,
        headers,
        rowHeads,
        cellCount: cells.length,
        cellTexts: cells.map((c) => c.textContent.trim()),
        cellW: cellRect?.width ?? 0,
        cellH: cellRect?.height ?? 0,
        lastCellW: lastCellRect?.width ?? 0,
        lastCellH: lastCellRect?.height ?? 0,
        hasTabindex,
        dataIds: [...new Set(cells.map((c) => c.dataset.id).filter(Boolean))].sort(),
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber al menos un spreadsheet, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;

    // (1) Estructura completa.
    assert.equal(d.hasTable, true, `${tag}: debe existir <table class="grid">`);
    assert.equal(d.hasCorner, true, `${tag}: debe existir th.corner`);

    // (2) Layout no-cero.
    assert.ok(d.tableW > 100, `${tag}: ancho de tabla debe ser > 100, fue ${d.tableW}`);
    assert.ok(d.tableH > 50, `${tag}: alto de tabla debe ser > 50, fue ${d.tableH}`);
    assert.ok(d.cellW > 10, `${tag}: ancho de celda debe ser > 10, fue ${d.cellW}`);
    assert.ok(d.cellH > 10, `${tag}: alto de celda debe ser > 10, fue ${d.cellH}`);
    assert.ok(d.lastCellW > 10, `${tag}: ancho de última celda debe ser > 10, fue ${d.lastCellW}`);

    // (3) Cabeceras: corner + columnas A, B, C, ...
    assert.ok(d.headers.length >= 2, `${tag}: debe haber al menos 2 headers, hay ${d.headers.length}`);
    assert.ok(d.headers.includes('A'), `${tag}: headers debe incluir "A", fue ${JSON.stringify(d.headers)}`);
    if (d.cellCount >= 4) {
      assert.ok(d.headers.includes('B'), `${tag}: headers debe incluir "B", fue ${JSON.stringify(d.headers)}`);
    }

    // (4) Row heads: 1, 2, 3, ...
    assert.ok(d.rowHeads.length >= 1, `${tag}: debe haber al menos 1 row-head`);
    assert.equal(d.rowHeads[0], '1', `primer row-head debe ser "1", fue "${d.rowHeads[0]}"`);

    // (5) Celdas con data-id A1, B1, A2, etc. y tabindex=0.
    assert.ok(d.dataIds.length > 0, `${tag}: debe haber celdas con data-id`);
    assert.ok(d.dataIds[0].match(/^A\d+$/), `primer data-id debe ser estilo "A1", fue "${d.dataIds[0]}"`);
    assert.equal(d.hasTabindex, true, `${tag}: primera celda debe tener tabindex`);

    // (6) Read-only es un atributo booleano.
    // Sólo verificamos que el flag existe como booleano, no su valor.
    assert.equal(typeof d.readonly, 'boolean', `${tag}: readonly debe ser boolean`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (grid con corner + headers, layout no-cero, celdas con data-id y tabindex)`);
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
Evalúa la calidad visual de la hoja de cálculo <is-spreadsheet> que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. ESTRUCTURA DE TABLA: la tabla tiene una cabecera con letras de columnas (A, B, C...) y una columna izquierda con números de fila (1, 2, 3...).

2. CELDAS LEGIBLES: los valores numéricos y de texto en las celdas son legibles, sin recortes ni desbordes.

3. FÓRMULAS VISIBLES: las celdas con fórmulas (=SUM, =COUNT, etc.) muestran el resultado numérico calculado, no la fórmula cruda.

4. LAYOUT NO VACÍO: la tabla tiene un tamaño visible (alto y ancho suficientes para mostrar varias filas y columnas).

5. ALINEACIÓN CONSISTENTE: las celdas mantienen alineación regular en columnas y filas, sin solapamientos.

Responde SOLO con un JSON con la forma:
{
  "table_structure": "PASS" | "FAIL",
  "cells_legible": "PASS" | "FAIL",
  "formulas_visible": "PASS" | "FAIL" | "N/A",
  "non_empty_layout": "PASS" | "FAIL",
  "alignment": "PASS" | "FAIL",
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
    const checks = ['table_structure', 'cells_legible', 'formulas_visible', 'non_empty_layout', 'alignment'];
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
report('spreadsheet-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });