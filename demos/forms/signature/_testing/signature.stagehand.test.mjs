// signature.stagehand.test.mjs — verificaciones de calidad visual del pad de firma.
// Mismo patrón: checks deterministas + rama opt-in LLM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/signature/signature.html`;
const READY = 'data-signature-ready';

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const pads = [...document.querySelectorAll('main is-signature')];
    return pads.map((p, idx) => {
      const shadow = p.shadowRoot;
      const canvas = shadow.querySelector('canvas');
      const hint = shadow.querySelector('.hint');
      const canvasRect = canvas.getBoundingClientRect();
      const hintRect = hint ? hint.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
      const hintText = hint ? hint.textContent : '';
      const hintVisible = hint && getComputedStyle(hint).display !== 'none';
      const section = p.closest('section');
      const sectionRect = section.getBoundingClientRect();
      return {
        idx,
        name: p.getAttribute('name'),
        canvasRect,
        hintRect,
        hintText,
        hintVisible,
        sectionRect,
        ariaLabel: canvas.getAttribute('aria-label'),
        hasCanvas: !!canvas,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        cssWidth: canvasRect.width,
        cssHeight: canvasRect.height,
        attrWidth: p.getAttribute('width'),
        attrHeight: p.getAttribute('height'),
      };
    });
  });

  for (const r of data) {
    const tag = `signature#${r.idx} (${r.name})`;

    // (1) Canvas presente y con dimensiones reales.
    assert.equal(r.hasCanvas, true, `${tag}: el shadow DOM debe contener <canvas>`);
    assert.ok(r.canvasWidth > 0 && r.canvasHeight > 0, `${tag}: el canvas debe tener width/height reales`);
    assert.ok(r.cssWidth > 0 && r.cssHeight > 0, `${tag}: el canvas debe tener CSS width/height`);

    // (2) Coherencia atributo ↔ CSS: si width="480", cssWidth debe ser 480.
    if (r.attrWidth) {
      assert.equal(Number(r.cssWidth), Number(r.attrWidth),
        `${tag}: cssWidth (${r.cssWidth}) debe coincidir con atributo width (${r.attrWidth})`);
    }
    if (r.attrHeight) {
      assert.equal(Number(r.cssHeight), Number(r.attrHeight),
        `${tag}: cssHeight (${r.cssHeight}) debe coincidir con atributo height (${r.attrHeight})`);
    }

    // (3) a11y: aria-label presente en el canvas.
    assert.ok(r.ariaLabel && r.ariaLabel.length > 0, `${tag}: canvas debe llevar aria-label`);

    // (4) Hint visible cuando el pad está vacío.
    assert.equal(r.hintVisible, true, `${tag}: el hint debe estar visible cuando el pad está vacío`);
    assert.ok(r.hintText && r.hintText.length > 0, `${tag}: hint debe tener texto`);

    // (5) El canvas no se sale del section que lo contiene.
    const cs = r.canvasRect;
    const ss = r.sectionRect;
    assert.ok(cs.x >= ss.x - 1 && cs.x + cs.width <= ss.x + ss.width + 1,
      `${tag}: canvas se sale del section horizontalmente`);
    assert.ok(cs.y >= ss.y - 1 && cs.y + cs.height <= ss.y + ss.height + 1,
      `${tag}: canvas se sale del section verticalmente`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, READY);
  await checkDeterministic(page);
  console.log('  ✓ signature: rubric determinista PASS (canvas presente y dimensionado, a11y, hint visible, encaja en section)');
  results.push({ name: 'signature', skipped: false });
  await screenshot(page, 'signature-stagehand-pass');
} catch (err) {
  console.error(`  ✗ signature: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-signature'); } catch {}
  results.push({ name: 'signature', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del pad de firma (<is-signature>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CANVAS VISIBLE: el área del canvas es claramente visible con bordes o fondo distinguible.

2. HINT VISIBLE: el texto placeholder ("Firma aquí" o similar) es visible cuando el pad está vacío.

3. TAMAÑO ADECUADO: el canvas tiene altura suficiente para firmar (no es una línea plana).

4. CONTRASTE: si hay fondo personalizado, el trazo contrasta con él.

5. SEPARACIÓN: los tres pads de firma están separados visualmente (no se solapan).

Responde SOLO con un JSON con la forma:
{
  "canvas_visible": "PASS" | "FAIL",
  "hint_visible": "PASS" | "FAIL",
  "adequate_size": "PASS" | "FAIL",
  "contrast": "PASS" | "FAIL" | "N/A",
  "separation": "PASS" | "FAIL",
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
    const shot = await screenshot(page, 'stagehand-signature');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['canvas_visible', 'hint_visible', 'adequate_size', 'contrast', 'separation'];
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
      console.log('  ⊘ signature: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else if (!r.fails || r.fails.length === 0) {
      console.log('  ✓ signature: visual rubric LLM PASS');
    } else {
      console.error(`  ✗ signature: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    }
  } catch (err) {
    console.error(`  ✗ signature (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('signature-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
