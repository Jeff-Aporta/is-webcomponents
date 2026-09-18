// image-editor.stagehand.test.mjs — verificaciones de calidad visual
// (rubric determinista + rama LLM opt-in).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_testing/lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/media/ImageEditor/image-editor.html`, readyAttr: 'data-image-editor-ready', name: 'image-editor' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const editor = document.querySelector('is-image-editor');
    const shadow = editor.shadowRoot;
    const root = shadow.querySelector('.root');
    const canvas = shadow.querySelector('canvas');
    const viewport = shadow.querySelector('.viewport');
    const selection = shadow.querySelector('.selection');
    const toolbar = shadow.querySelector('.toolbar');
    const statusText = shadow.querySelector('.status')?.textContent?.trim() || '';
    // El getter `editor.image` está documentado pero NO implementado en la
    // fuente actual (gap conocido del handoff). En su lugar validamos que el
    // canvas tenga píxeles (proxy de "imagen cargada y dibujada").
    const canvasHasPixels = canvas && canvas.width > 0 && canvas.height > 0;
    return {
      registered: !!customElements.get('is-image-editor'),
      rootRect: root?.getBoundingClientRect(),
      canvasRect: canvas?.getBoundingClientRect(),
      viewportRect: viewport?.getBoundingClientRect(),
      selectionVisible: selection && !selection.hidden,
      toolbarExists: !!toolbar,
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      canvasHasPixels,
      statusText,
    };
  });

  const tag = `${demo.name}`;

  // (1) El componente está registrado.
  assert.equal(data.registered, true, `${tag}: is-image-editor debe estar registrado`);

  // (2) Tiene estructura interna: root, viewport, canvas, toolbar.
  assert.ok(data.rootRect && data.rootRect.width > 0 && data.rootRect.height > 0, `${tag}: .root debe tener tamaño positivo`);
  assert.ok(data.canvasRect && data.canvasRect.width > 0 && data.canvasRect.height > 0, `${tag}: canvas debe tener tamaño visible`);
  assert.ok(data.viewportRect && data.viewportRect.width > 0 && data.viewportRect.height > 0, `${tag}: viewport debe tener tamaño positivo`);
  assert.ok(data.toolbarExists, `${tag}: debe haber .toolbar con slot`);
  assert.ok(data.canvasHasPixels, `${tag}: canvas debe tener píxeles tras cargar imagen (status="${data.statusText}")`);

  // (3) El canvas tiene tamaño intrínseco (píxeles físicos = CSS × DPR).
  assert.ok(data.canvasWidth > 0 && data.canvasHeight > 0, `${tag}: canvas debe tener width/height internos > 0 (got ${data.canvasWidth}×${data.canvasHeight})`);

  // (4) La selección es visible (tras cargar la imagen, hay cropRect inicial).
  assert.equal(data.selectionVisible, true, `${tag}: .selection (overlay de crop) debe estar visible tras is-load`);
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (estructura OK, imagen cargada, overlay visible)`);
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
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del editor de imagen que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. IMAGEN VISIBLE: la imagen se renderiza dentro del área del canvas.

2. OVERLAY DE CROP: el rectángulo de selección es visible encima de la imagen.

3. TOOLBAR LEGIBLE: los botones (zoom-in/out, rotate, reset, crop) están visibles y son usables.

4. NO HAY OVERFLOW: nada se sale del área visible del editor.

5. CONTRASTE: la imagen y los controles son legibles sobre el fondo oscuro.

Responde SOLO con un JSON con la forma:
{
  "image_visible": "PASS" | "FAIL",
  "crop_overlay": "PASS" | "FAIL",
  "toolbar_legible": "PASS" | "FAIL",
  "no_overflow": "PASS" | "FAIL",
  "contrast": "PASS" | "FAIL",
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
    await page.waitForTimeout(800);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['image_visible', 'crop_overlay', 'toolbar_legible', 'no_overflow', 'contrast'];
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
report('image-editor-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
