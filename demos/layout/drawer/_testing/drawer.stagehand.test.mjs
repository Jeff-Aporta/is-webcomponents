// drawer.stagehand.test.mjs — verificaciones de calidad visual para is-drawer.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/drawer/drawer.html`, readyAttr: 'data-drawer-ready', name: 'drawer' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  // Los 5 drawers arrancan cerrados. Los abrimos uno a uno, capturamos su bbox y verificamos
  // que el placement coincide con la geometría esperada (end → derecha, start → izquierda,
  // top → arriba, bottom → abajo).
  const placements = [
    { id: 'd-end', expect: 'right' },
    { id: 'd-start', expect: 'left' },
    { id: 'd-top', expect: 'top' },
    { id: 'd-bottom', expect: 'bottom' },
  ];
  const viewport = page.viewportSize();

  for (const p of placements) {
    await page.evaluate((id) => document.getElementById(id).show(), p.id);
    await page.waitForTimeout(400);
    const data = await page.evaluate((id) => {
      const d = document.getElementById(id);
      const sr = d.shadowRoot;
      const modal = sr.querySelector('[part="drawer"]');
      const r = modal?.getBoundingClientRect();
      return {
        open: d.open,
        state: d.dataset.state,
        x: r?.x ?? 0, y: r?.y ?? 0, w: r?.width ?? 0, h: r?.height ?? 0,
      };
    }, p.id);
    assert.equal(data.open, true, `${p.id} debe estar abierto`);
    assert.ok(data.w > 50, `${p.id}: ancho > 50, fue ${data.w}`);
    assert.ok(data.h > 50, `${p.id}: alto > 50, fue ${data.h}`);

    // Geometría esperada.
    if (p.expect === 'right') {
      assert.ok(data.x + data.w > viewport.width * 0.6,
        `${p.id}: drawer end debe estar a la derecha del viewport, x+w=${data.x + data.w}, viewport=${viewport.width}`);
    } else if (p.expect === 'left') {
      assert.ok(data.x < viewport.width * 0.4,
        `${p.id}: drawer start debe estar a la izquierda, x=${data.x}`);
    } else if (p.expect === 'top') {
      assert.ok(data.y < viewport.height * 0.4,
        `${p.id}: drawer top debe estar arriba, y=${data.y}`);
    } else if (p.expect === 'bottom') {
      assert.ok(data.y + data.h > viewport.height * 0.6,
        `${p.id}: drawer bottom debe estar abajo, y+h=${data.y + data.h}`);
    }
    // Cerrar antes del siguiente.
    await page.evaluate((id) => document.getElementById(id).hide(), p.id);
    await page.waitForTimeout(400);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (4 placements con geometría correcta: end/start/top/bottom)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del <is-drawer> en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: el drawer aparece desde el borde del viewport correspondiente a su placement (start/end/top/bottom).

2. LAYOUT NO VACÍO: el drawer tiene tamaño visible (ancho > 0, alto > 0) y ocupa una franja del viewport.

3. HEADER + CLOSE VISIBLES: el drawer tiene un header con título y un botón close (X).

4. FOOTER VISIBLE: el footer muestra al menos un botón (OK / Cerrar).

5. BACKDROP PRESENTE: hay un fondo oscuro detrás del drawer que cubre el resto del viewport.

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "header_close_visible": "PASS" | "FAIL",
  "footer_visible": "PASS" | "FAIL",
  "backdrop_present": "PASS" | "FAIL",
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
    // Abrimos el drawer end para el screenshot.
    await page.click('#btn-end');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['renders', 'non_empty_layout', 'header_close_visible', 'footer_visible', 'backdrop_present'];
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
      if (r.llm_skipped) console.log(`  ⊘ ${demo.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
      else if (!r.fails || r.fails.length === 0) console.log(`  ✓ ${demo.name}: visual rubric LLM PASS`);
      else console.error(`  ✗ ${demo.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    } catch (err) {
      console.error(`  ✗ ${demo.name} (LLM): ${String(err?.message ?? err)}`);
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('drawer-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
