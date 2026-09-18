// duration-picker.stagehand.test.mjs — verificaciones de calidad visual del duration picker.
// Mismo patrón: checks deterministas + rama opt-in LLM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/duration-picker/duration-picker.html`;
const READY = 'data-duration-picker-ready';

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const pickers = [...document.querySelectorAll('main is-duration-picker')];
    return pickers.map((p, idx) => {
      const shadow = p.shadowRoot;
      const h = shadow.querySelector('#h');
      const m = shadow.querySelector('#m');
      const s = shadow.querySelector('#s');
      const upH = shadow.querySelector('is-button[data-target="h"].up');
      const upM = shadow.querySelector('is-button[data-target="m"].up');
      const upS = shadow.querySelector('is-button[data-target="s"].up');
      const downH = shadow.querySelector('is-button[data-target="h"].down');
      const downM = shadow.querySelector('is-button[data-target="m"].down');
      const downS = shadow.querySelector('is-button[data-target="s"].down');
      const rects = {
        h: h.getBoundingClientRect(),
        m: m.getBoundingClientRect(),
        s: s.getBoundingClientRect(),
        upH: upH.getBoundingClientRect(),
        upM: upM.getBoundingClientRect(),
        upS: upS.getBoundingClientRect(),
        downH: downH.getBoundingClientRect(),
        downM: downM.getBoundingClientRect(),
        downS: downS.getBoundingClientRect(),
      };
      const a11y = {
        hLabel: h.getAttribute('aria-label'),
        mLabel: m.getAttribute('aria-label'),
        sLabel: s.getAttribute('aria-label'),
      };
      return {
        idx,
        name: p.getAttribute('name'),
        rects,
        a11y,
        values: { h: h.value, m: m.value, s: s.value },
      };
    });
  });

  for (const r of data) {
    const tag = `duration-picker#${r.idx} (${r.name})`;

    // (1) Cada celda tiene ancho visible.
    assert.ok(r.rects.h.width > 16, `${tag}: celda horas debe tener ancho > 16px, obtuve ${r.rects.h.width}`);
    assert.ok(r.rects.m.width > 16, `${tag}: celda minutos debe tener ancho > 16px, obtuve ${r.rects.m.width}`);
    assert.ok(r.rects.s.width > 16, `${tag}: celda segundos debe tener ancho > 16px, obtuve ${r.rects.s.width}`);

    // (2) Las celdas están en horizontal: misma y, x monótono creciente.
    assert.ok(Math.abs(r.rects.h.y - r.rects.m.y) < 2 && Math.abs(r.rects.m.y - r.rects.s.y) < 2,
      `${tag}: las celdas deben estar alineadas horizontalmente`);
    assert.ok(r.rects.h.x < r.rects.m.x && r.rects.m.x < r.rects.s.x,
      `${tag}: las celdas deben estar en orden h → m → s`);

    // (3) Cada celda tiene un botón + encima y un botón − debajo.
    assert.ok(r.rects.upH.y < r.rects.h.y,
      `${tag}: el botón + de horas debe estar encima de la celda`);
    assert.ok(r.rects.downH.y > r.rects.h.y,
      `${tag}: el botón − de horas debe estar debajo de la celda`);
    assert.ok(r.rects.upM.y < r.rects.m.y, `${tag}: botón + minutos encima de su celda`);
    assert.ok(r.rects.downM.y > r.rects.m.y, `${tag}: botón − minutos debajo de su celda`);
    assert.ok(r.rects.upS.y < r.rects.s.y, `${tag}: botón + segundos encima de su celda`);
    assert.ok(r.rects.downS.y > r.rects.s.y, `${tag}: botón − segundos debajo de su celda`);

    // (4) Separadores ":" entre celdas (visualmente, los inputs están separados).
    const gapHM = r.rects.m.x - (r.rects.h.x + r.rects.h.width);
    const gapMS = r.rects.s.x - (r.rects.m.x + r.rects.m.width);
    assert.ok(gapHM > 0 && gapMS > 0,
      `${tag}: debe haber separación visual entre celdas (gap h→m=${gapHM.toFixed(1)}, m→s=${gapMS.toFixed(1)})`);

    // (5) a11y: cada celda tiene aria-label significativo.
    assert.ok(r.a11y.hLabel && /hora/i.test(r.a11y.hLabel), `${tag}: celda h debe tener aria-label con "hora"`);
    assert.ok(r.a11y.mLabel && /minuto/i.test(r.a11y.mLabel), `${tag}: celda m debe tener aria-label con "minuto"`);
    assert.ok(r.a11y.sLabel && /segundo/i.test(r.a11y.sLabel), `${tag}: celda s debe tener aria-label con "segundo"`);

    // (6) Valores renderizados consistentes con padStart(2, '0').
    assert.match(r.values.h, /^\d{1,2}$/, `${tag}: valor horas debe ser numérico de 1-2 dígitos`);
    assert.match(r.values.m, /^\d{2}$/, `${tag}: valor minutos debe tener 2 dígitos (zero-padded)`);
    assert.match(r.values.s, /^\d{2}$/, `${tag}: valor segundos debe tener 2 dígitos (zero-padded)`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, READY);
  await checkDeterministic(page);
  console.log('  ✓ duration-picker: rubric determinista PASS (celdas alineadas, botones posicionados, a11y correcto, valores padded)');
  results.push({ name: 'duration-picker', skipped: false });
  await screenshot(page, 'duration-picker-stagehand-pass');
} catch (err) {
  console.error(`  ✗ duration-picker: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-duration-picker'); } catch {}
  results.push({ name: 'duration-picker', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del selector de duración (<is-duration-picker>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. LAYOUT HORIZONTAL: las tres celdas (HH, MM, SS) están alineadas horizontalmente con separadores ":" entre ellas.

2. BOTONES +/− VISIBLES: cada celda tiene botones de incremento y decremento claramente visibles encima y debajo.

3. VALORES LEGIBLES: los números en las celdas (00, 30, 05…) son legibles con buen contraste.

4. SEPARACIÓN VISUAL: las celdas están visualmente separadas (no se tocan, hay separadores ":" entre ellas).

5. CONSISTENCIA: los tres pickers del demo mantienen el mismo estilo visual (mismo tamaño de celda, mismo estilo de botones).

Responde SOLO con un JSON con la forma:
{
  "layout_horizontal": "PASS" | "FAIL",
  "buttons_visible": "PASS" | "FAIL",
  "values_legible": "PASS" | "FAIL",
  "cell_separation": "PASS" | "FAIL",
  "consistency": "PASS" | "FAIL",
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
    const shot = await screenshot(page, 'stagehand-duration-picker');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['layout_horizontal', 'buttons_visible', 'values_legible', 'cell_separation', 'consistency'];
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
      console.log('  ⊘ duration-picker: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else if (!r.fails || r.fails.length === 0) {
      console.log('  ✓ duration-picker: visual rubric LLM PASS');
    } else {
      console.error(`  ✗ duration-picker: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    }
  } catch (err) {
    console.error(`  ✗ duration-picker (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('duration-picker-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
