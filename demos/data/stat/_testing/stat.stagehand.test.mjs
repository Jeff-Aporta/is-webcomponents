// stat.stagehand.test.mjs — verificaciones de calidad visual.
//
// Mismo patrón que diagramas/ER/er-stagehand.test.mjs: por defecto corremos
// checks deterministas (Playwright puro) que NO skippean. STAGEHAND=1 +
// MINIMAX_API_KEY activa la rama LLM con un rubric en español.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data/stat/stat.html`, readyAttr: 'data-stat-ready', name: 'stat' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const stats = [...document.querySelectorAll('main is-stat')];
    return stats.map((s, idx) => {
      const sr = s.shadowRoot;
      const rootRect = sr.querySelector('[part="base"]')?.getBoundingClientRect();
      const valueRect = sr.querySelector('[part="value"]')?.getBoundingClientRect();
      const labelRect = sr.querySelector('[part="label"]')?.getBoundingClientRect();
      const trendEl = sr.querySelector('[part="trend"]');
      const trendRect = trendEl?.getBoundingClientRect();
      return {
        idx,
        hasBase: !!sr.querySelector('[part="base"]'),
        hasValue: !!sr.querySelector('[part="value"]'),
        hasLabel: !!sr.querySelector('[part="label"]'),
        rootW: rootRect?.width ?? 0,
        rootH: rootRect?.height ?? 0,
        valueText: (sr.querySelector('[part="value"]')?.textContent ?? '').trim(),
        labelText: (sr.querySelector('[part="label"]')?.textContent ?? '').trim(),
        trendText: trendEl?.textContent?.trim() || '',
        dataTrend: sr.querySelector('[part="base"]')?.dataset?.trend ?? null,
        dataColor: sr.querySelector('[part="base"]')?.dataset?.color ?? null,
        valueInside: !!valueRect && !!rootRect &&
          valueRect.x >= rootRect.x - 1 &&
          valueRect.x + valueRect.width <= rootRect.x + rootRect.width + 1,
        labelInside: !!labelRect && !!rootRect &&
          labelRect.x >= rootRect.x - 1 &&
          labelRect.x + labelRect.width <= rootRect.x + rootRect.width + 1,
        trendInside: !trendEl || trendEl.hidden ||
          (!!trendRect && !!rootRect &&
            trendRect.x >= rootRect.x - 1 &&
            trendRect.x + trendRect.width <= rootRect.x + rootRect.width + 1),
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber al menos un stat, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;

    // (1) Partes base/label/value renderizan.
    assert.equal(d.hasBase, true, `${tag}: debe existir part="base"`);
    assert.equal(d.hasLabel, true, `${tag}: debe existir part="label"`);
    assert.equal(d.hasValue, true, `${tag}: debe existir part="value"`);

    // (2) Tamaño no-cero: el stat tiene layout.
    assert.ok(d.rootW > 20, `${tag}: ancho del stat debe ser > 20, fue ${d.rootW}`);
    assert.ok(d.rootH > 20, `${tag}: alto del stat debe ser > 20, fue ${d.rootH}`);

    // (3) Label y value con texto no vacío.
    assert.ok(d.labelText.length > 0, `${tag}: label vacío`);
    assert.ok(d.valueText.length > 0, `${tag}: value vacío`);

    // (4) Value y label dentro del bounding box del componente.
    assert.equal(d.valueInside, true, `${tag}: value fuera del card`);
    assert.equal(d.labelInside, true, `${tag}: label fuera del card`);
    assert.equal(d.trendInside, true, `${tag}: trend fuera del card`);

    // (5) Consistencia de data-trend: si hay texto de trend, data-trend existe.
    if (d.trendText && d.trendText !== '↔' && d.trendText.length > 0) {
      assert.ok(['up', 'down', 'flat'].includes(d.dataTrend),
        `${tag}: data-trend="${d.dataTrend}" no es uno de up/down/flat (trend text="${d.trendText}")`);
    }

    // (6) Color es uno de los documentados.
    assert.ok(['brand', 'neutral', 'success', 'warning', 'danger'].includes(d.dataColor),
      `${tag}: data-color="${d.dataColor}" no es brand/neutral/success/warning/danger`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (parts visibles, layout no-cero, texto legible, data-trend/color válidos)`);
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
Evalúa la calidad visual del bloque <is-stat> (KPI card) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. STAT RENDERIZA: cada tarjeta KPI muestra un label, un valor numérico/texto principal, y (cuando aplica) un trend y un helper.

2. LAYOUT NO VACÍO: las tarjetas tienen tamaño visible (alto/ancho > 0) y no aparecen como una línea plana.

3. TEXTO LEGIBLE: los textos (label, valor, trend, helper) son legibles, sin texto cortado ni desbordado.

4. TRENDS DIFERENCIADOS VISUALMENTE: los stats con trend positivo (color success) se ven distintos de los negativos (color danger) y del plano (color neutral).

5. CARD ENCAJA EN VIEWPORT: cada stat cabe dentro de su contenedor y no se sale por los bordes.

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "trends_differentiated": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
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
    const checks = ['renders', 'non_empty_layout', 'text_legible', 'trends_differentiated', 'in_viewport'];
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
report('stat-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });