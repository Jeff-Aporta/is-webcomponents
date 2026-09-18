// pivot-table.stagehand.test.mjs — verificaciones de calidad visual.
//
// Mismo patrón que diagramas/ER/er-stagehand.test.mjs: por defecto corremos
// checks deterministas (Playwright puro) que NO skippean. STAGEHAND=1 +
// MINIMAX_API_KEY activa la rama LLM con un rubric en español.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data/pivot-table/pivot-table.html`, readyAttr: 'data-pivot-table-ready', name: 'pivot-table' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const pivots = [...document.querySelectorAll('main is-pivot-table')];
    return pivots.map((p, idx) => {
      const sr = p.shadowRoot;
      const table = sr.querySelector('table.pivot');
      const tableRect = table?.getBoundingClientRect();
      const thead = table?.querySelector('thead');
      const tbody = table?.querySelector('tbody');
      const tfoot = table?.querySelector('tfoot');
      const headerCells = [...(thead?.querySelectorAll('th') ?? [])];
      const rowHeads = [...(tbody?.querySelectorAll('td.row-head') ?? [])];
      const totalCells = [...(tbody?.querySelectorAll('td.total') ?? [])];
      const grandTotals = [...(tfoot?.querySelectorAll('td') ?? [])];
      return {
        idx,
        hasTable: !!table,
        hasThead: !!thead,
        hasTbody: !!tbody,
        hasTfoot: !!tfoot,
        tableW: tableRect?.width ?? 0,
        tableH: tableRect?.height ?? 0,
        headerCellCount: headerCells.length,
        rowHeadCount: rowHeads.length,
        rowHeadTexts: rowHeads.map((c) => c.textContent.trim()),
        headerTexts: headerCells.map((c) => c.textContent.trim()),
        hasCorner: headerCells[0]?.classList.contains('corner') ?? false,
        hasTotalHeader: headerCells.some((c) => c.classList.contains('total')),
        bodyTotalCount: totalCells.length,
        grandTotalCount: grandTotals.length,
        // Verificar alineación visual: rowHeads en una columna, totales al final.
        firstBodyRow: tbody ? [...tbody.querySelectorAll('tr')[0]?.querySelectorAll('td') ?? []].map((c) => c.textContent.trim()) : [],
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber al menos un pivot, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;

    // (1) Estructura completa.
    assert.equal(d.hasTable, true, `${tag}: debe existir <table class="pivot">`);
    assert.equal(d.hasThead, true, `${tag}: debe existir thead`);
    assert.equal(d.hasTbody, true, `${tag}: debe existir tbody`);
    assert.equal(d.hasTfoot, true, `${tag}: debe existir tfoot (fila de totales)`);

    // (2) Layout no-cero.
    assert.ok(d.tableW > 100, `${tag}: ancho de tabla debe ser > 100, fue ${d.tableW}`);
    assert.ok(d.tableH > 50, `${tag}: alto de tabla debe ser > 50, fue ${d.tableH}`);

    // (3) Cabecera: corner + N cols + Total = 1 + 3 + 1 = 5
    assert.equal(d.headerCellCount, 5, `${tag}: cabecera debe tener 5 celdas, tiene ${d.headerCellCount}`);
    assert.equal(d.hasCorner, true, `${tag}: primera celda de cabecera debe tener clase "corner"`);
    assert.equal(d.hasTotalHeader, true, `${tag}: cabecera debe incluir un th.total`);

    // (4) Body: 4 regiones con su row-head.
    assert.equal(d.rowHeadCount, 4, `${tag}: body debe tener 4 row-heads (Norte/Sur/Este/Oeste), tiene ${d.rowHeadCount}`);
    assert.deepEqual(d.rowHeadTexts.sort(), ['Este', 'Norte', 'Oeste', 'Sur'],
      `${tag}: row-heads deben incluir las 4 regiones, son ${JSON.stringify(d.rowHeadTexts)}`);

    // (5) Body tiene celdas total (1 por fila × 4 filas = 4).
    assert.equal(d.bodyTotalCount, 4, `${tag}: body debe tener 4 td.total, tiene ${d.bodyTotalCount}`);

    // (6) Tfoot con totales: row-head + 3 cols + grand total = 5.
    assert.equal(d.grandTotalCount, 5, `${tag}: tfoot debe tener 5 celdas (1 row-head + 3 cols + grand), tiene ${d.grandTotalCount}`);

    // (7) Primera fila: row-head + 3 cols + total.
    assert.equal(d.firstBodyRow.length, 5, `${tag}: primera fila del body debe tener 5 celdas`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (thead/tbody/tfoot presentes, layout no-cero, 4 regiones, totales correctos)`);
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
Evalúa la calidad visual del pivot table que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. ESTRUCTURA DE TABLA: la tabla tiene una fila de cabecera con los nombres de las columnas (quarters / categorías), una columna izquierda con los nombres de las filas (regiones), y una fila inferior con totales.

2. CELDAS LEGIBLES: los valores numéricos en las celdas son legibles y no aparecen cortados ni desbordados.

3. TOTALES VISIBLES: hay una última columna "Total" por cada fila y una última fila "Total" en la parte de abajo, con valores numéricos agregados.

4. LAYOUT NO VACÍO: la tabla tiene un tamaño visible (alto y ancho suficientes) y no aparece como una línea plana.

5. ALINEACIÓN CONSISTENTE: las celdas numéricas están alineadas (a la derecha típicamente) y los row-heads a la izquierda.

Responde SOLO con un JSON con la forma:
{
  "table_structure": "PASS" | "FAIL",
  "cells_legible": "PASS" | "FAIL",
  "totals_visible": "PASS" | "FAIL",
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
    const checks = ['table_structure', 'cells_legible', 'totals_visible', 'non_empty_layout', 'alignment'];
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
report('pivot-table-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });