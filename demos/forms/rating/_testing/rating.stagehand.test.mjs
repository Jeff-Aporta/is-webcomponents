// rating.stagehand.test.mjs — verificaciones de calidad visual del rating.
// Mismo patrón que el rubric del ER: checks deterministas con Playwright +
// rama opt-in de Stagehand (LLM) cuando STAGEHAND=1 + credenciales.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/rating/rating.html`;
const READY = 'data-rating-ready';

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const ratings = [...document.querySelectorAll('main is-rating')];
    return ratings.map((r, idx) => {
      const shadow = r.shadowRoot;
      const slider = shadow.querySelector('[role="slider"]');
      const stars = [...shadow.querySelectorAll('[part="star"]')];
      const starRects = stars.map((s) => {
        const rect = s.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      });
      const aria = {
        role: slider.getAttribute('role'),
        min: slider.getAttribute('aria-valuemin'),
        max: slider.getAttribute('aria-valuemax'),
        now: slider.getAttribute('aria-valuenow'),
        text: slider.getAttribute('aria-valuetext'),
      };
      const labelEl = shadow.querySelector('[part="label"]');
      const hasLabel = !!labelEl && !labelEl.hidden;
      const filled = stars.filter((s) => s.hasAttribute('data-filled') || s.hasAttribute('data-half')).length;
      return { idx, name: r.getAttribute('name'), aria, starRects, hasLabel, filled };
    });
  });

  for (const r of data) {
    const tag = `rating#${r.idx} (${r.name})`;

    // (1) Slider semántico: role + aria-valuemin/max/now coherentes.
    assert.equal(r.aria.role, 'slider', `${tag}: role debe ser slider`);
    assert.equal(r.aria.min, '0', `${tag}: aria-valuemin=0`);
    assert.ok(Number(r.aria.max) >= 2 && Number(r.aria.max) <= 10,
      `${tag}: aria-valuemax entre 2 y 10, obtuve ${r.aria.max}`);
    assert.ok(r.aria.now !== null && r.aria.now !== '', `${tag}: aria-valuenow presente`);
    assert.ok(r.aria.text && r.aria.text.length > 0, `${tag}: aria-valuetext no vacío`);

    // (2) Las estrellas tienen tamaño visible y están alineadas (mismo y, anchuras similares).
    if (r.starRects.length > 0) {
      const first = r.starRects[0];
      assert.ok(first.w > 4 && first.h > 4, `${tag}: las estrellas deben tener tamaño visible, obtuve ${JSON.stringify(first)}`);
      const ys = r.starRects.map((s) => s.y);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      assert.ok(maxY - minY < 2, `${tag}: las estrellas deben estar alineadas verticalmente (Δy=${(maxY - minY).toFixed(2)})`);
    }

    // (3) Hay un label visible accesible.
    assert.equal(r.hasLabel, true, `${tag}: el control debe mostrar un label visible`);

    // (4) El número de estrellas rellenas coincide (aprox) con aria-valuenow.
    const numericNow = Math.ceil(Number(r.aria.now));
    assert.ok(Math.abs(r.filled - numericNow) <= 1,
      `${tag}: estrellas rellenas (${r.filled}) ≈ aria-valuenow redondeado (${numericNow})`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, READY);
  await checkDeterministic(page);
  console.log('  ✓ rating: rubric determinista PASS (slider a11y, estrellas alineadas, label visible, relleno coherente)');
  results.push({ name: 'rating', skipped: false });
  await screenshot(page, 'rating-stagehand-pass');
} catch (err) {
  console.error(`  ✗ rating: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-rating'); } catch {}
  results.push({ name: 'rating', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM (sólo si STAGEHAND=1 + credenciales).
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del componente de rating (<is-rating>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. ESTRELLAS VISIBLES: las estrellas (iconos) son claramente visibles en el viewport, con tamaño suficiente para clicar.

2. ALINEACIÓN: todas las estrellas de cada control están alineadas en la misma línea horizontal.

3. LABEL VISIBLE: cada control de rating tiene un label de texto visible encima o al lado.

4. ESTADO RELLENO LEGIBLE: las estrellas rellenas y vacías se distinguen visualmente (color, opacidad o icono distinto).

5. VALOR POR DEFECTO COHERENTE: los ratings inicializados con value > 0 muestran ese número de estrellas rellenas o medio-rellenas.

Responde SOLO con un JSON con la forma:
{
  "stars_visible": "PASS" | "FAIL",
  "alignment": "PASS" | "FAIL",
  "label_visible": "PASS" | "FAIL",
  "fill_state_legible": "PASS" | "FAIL",
  "default_value_coherent": "PASS" | "FAIL" | "N/A",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric() {
  const sh = await maybeStagehand();
  if (!sh) return { llm_skipped: true };
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, READY);
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-rating');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['stars_visible', 'alignment', 'label_visible', 'fill_state_legible', 'default_value_coherent'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const r = await runStagehandRubric();
    if (r.llm_skipped) {
      console.log('  ⊘ rating: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else if (!r.fails || r.fails.length === 0) {
      console.log('  ✓ rating: visual rubric LLM PASS');
    } else {
      console.error(`  ✗ rating: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    }
  } catch (err) {
    console.error(`  ✗ rating (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('rating-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
