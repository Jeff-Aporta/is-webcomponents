// heatmap.stagehand.test.mjs — checks deterministas de calidad visual para
// el demo heatmap.html. Mismo enfoque que er-stagehand.test.mjs: Playwright
// puro + métricas geométricas + atributos del SVG. Cero LLM, cero API keys.
//
// Checklist (cada check debe pasar):
//   (1) CELDAS NO SE SOLAPAN: cada rect.cell ocupa una posición discreta.
//   (2) GRADIENTE LEGIBLE: las celdas usan varios fills distintos dentro
//       de un mismo row (no monocromo).
//   (3) ENCAJA EN VIEWPORT: cada celda cabe dentro del rect del SVG.
//   (4) LEYENDA LEGIBLE: gradiente + al menos 2 ticks numéricos visibles.
//   (5) SHOW-VALUES CONSISTENTE: cuando hay show-values, cada celda tiene
//       su número y no hay texto vacío.
// Rama opt-in con Stagehand LLM (STAGEHAND=1 + credenciales) al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data-viz/Heatmap/heatmap.html`, readyAttr: 'data-heatmap-ready', name: 'heatmap' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('is-heatmap')].map((h, idx) => {
      const shadow = h.shadowRoot;
      const svg = shadow.querySelector('svg[part="canvas"]');
      const svgRect = svg.getBoundingClientRect();
      const cells = [...shadow.querySelectorAll('rect.cell')].map((c) => {
        const r = c.getBoundingClientRect();
        return {
          x: r.x, y: r.y, w: r.width, h: r.height,
          fill: c.getAttribute('fill'),
          dataX: c.getAttribute('data-x'),
          dataY: c.getAttribute('data-y'),
          dataV: c.getAttribute('data-v'),
        };
      });
      // Las celdas están en orden de inserción: matrix.forEach con rows
      // primero, cols dentro. Una "fila" = bloque contiguo de xLabels.length
      // celdas que comparten data-y.
      const xCount = (() => {
        const firstY = cells[0]?.dataY;
        let n = 0;
        for (const c of cells) if (c.dataY === firstY) n++; else break;
        return n;
      })();
      const firstRow = cells.slice(0, xCount);
      const legend = shadow.querySelector('.legend[part="legend"]');
      const grad = shadow.querySelector('.legend-grad');
      const ticks = [...shadow.querySelectorAll('.legend-tick')].map((t) => t.textContent.trim());
      const showValues = h.hasAttribute('show-values');
      const valueTexts = [...shadow.querySelectorAll('text.cell-val')].map((t) => t.textContent.trim());
      return { idx, attrColor: h.getAttribute('color'), svgRect, cells, firstRow, legendVisible: legend && !legend.hasAttribute('hidden'), grad: !!grad, ticks, showValues, valueTexts };
    });
  });

  for (const h of data) {
    const tag = `${demo.name}#${h.idx}`;

    // (1) CELDAS NO SE SOLAPAN dentro del SVG.
    const overlaps = [];
    for (let i = 0; i < h.cells.length; i++) {
      for (let j = i + 1; j < h.cells.length; j++) {
        const a = h.cells[i], b = h.cells[j];
        const ox = a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5;
        const oy = a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
        if (ox && oy) overlaps.push([i, j]);
      }
    }
    assert.equal(overlaps.length, 0, `${tag}: celdas no deben solaparse. Solapes: ${overlaps.length}`);

    // (2) GRADIENTE LEGIBLE: en la primera fila completa, al menos 2 fills distintos.
    if (h.firstRow.length >= 3) {
      const distinct = new Set(h.firstRow.map((c) => c.fill));
      assert.ok(distinct.size >= 2, `${tag}: gradiente debe producir >=2 fills distintos en una fila (hay ${distinct.size})`);
    }

    // (3) ENCAJA EN VIEWPORT.
    const sr = h.svgRect;
    for (const c of h.cells) {
      const inside =
        c.x >= sr.x - 1 && c.x + c.w <= sr.x + sr.width + 1 &&
        c.y >= sr.y - 1 && c.y + c.h <= sr.y + sr.height + 1;
      assert.ok(inside, `${tag}: celda (${c.dataX},${c.dataY}) en (${c.x.toFixed(1)},${c.y.toFixed(1)}) se sale del SVG`);
    }

    // (4) LEYENDA: si está visible debe llevar gradiente + al menos 2 ticks.
    if (h.legendVisible) {
      assert.ok(h.grad, `${tag}: leyenda visible debe incluir gradiente (.legend-grad)`);
      assert.ok(h.ticks.length >= 2, `${tag}: leyenda debe tener >=2 ticks numéricos (hay ${h.ticks.length})`);
      for (const tk of h.ticks) {
        assert.ok(tk && tk.length > 0, `${tag}: tick de leyenda no debe estar vacío ("${tk}")`);
      }
    }

    // (5) SHOW-VALUES CONSISTENTE.
    if (h.showValues) {
      assert.equal(h.valueTexts.length, h.cells.length, `${tag}: con show-values debe haber 1 text por celda (${h.valueTexts.length}/${h.cells.length})`);
      const empty = h.valueTexts.filter((t) => !t);
      assert.equal(empty.length, 0, `${tag}: textos de valor vacíos: ${empty.length}`);
    } else {
      assert.equal(h.valueTexts.length, 0, `${tag}: sin show-values no debe haber text.cell-val (hay ${h.valueTexts.length})`);
    }
  }
}

const results = [];
for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (no overlap, gradiente legible, en viewport, leyenda legible, valores consistentes)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

// ── Rama opt-in con Stagehand LLM ────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del mapa de calor (heatmap) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CELDAS NO SE SOLAPAN: cada rectángulo pintado está visualmente separado de los demás. No hay superposición de celdas adyacentes.

2. GRADIENTE LEGIBLE: dentro de una misma fila, las celdas cambian de color según el valor (de claro a oscuro, o siguiendo una paleta divergente). No se ve monocromo.

3. ENCAJA EN VIEWPORT: el heatmap completo (incluyendo leyenda y títulos de ejes si existen) cabe dentro del área visible.

4. LEYENDA LEGIBLE: la barra de gradiente a la derecha muestra los valores mínimo y máximo con números formateados correctamente.

5. SHOW-VALUES CONSISTENTE: si la opción show-values está activa, los números dentro de cada celda son legibles y no se cortan.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "gradient_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "legend_legible": "PASS" | "FAIL",
  "values_consistent": "PASS" | "FAIL" | "N/A",
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
    const checks = ['no_overlap', 'gradient_legible', 'in_viewport', 'legend_legible', 'values_consistent'];
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
report('heatmap-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
