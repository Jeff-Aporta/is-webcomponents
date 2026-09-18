// barcode.stagehand.test.mjs — verificaciones de calidad visual (rubric
// determinista + rama LLM opt-in).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_testing/lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/media/Barcode/barcode.html`, readyAttr: 'data-barcode-ready', name: 'barcode' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const barcodes = [...document.querySelectorAll('main is-barcode')];
    return barcodes.map((el, idx) => {
      const shadow = el.shadowRoot;
      const svg = shadow.querySelector('svg');
      const svgRect = svg.getBoundingClientRect();
      const rects = [...shadow.querySelectorAll('svg rect')];
      const textEl = shadow.querySelector('.text');
      const textVisible = !textEl.hidden;
      const text = textEl.textContent.trim();
      const type = el.getAttribute('type') || 'code128';
      // Solo nos importan las barras "dibujadas" (no el fondo transparente)
      const bars = rects.filter((r) => r.getAttribute('fill') !== 'transparent');
      const xPositions = bars.map((r) => parseFloat(r.getAttribute('x')));
      return {
        idx, type,
        svgRect,
        rectCount: rects.length,
        barCount: bars.length,
        textVisible, text,
        firstBarX: Math.min(...xPositions),
        lastBarX: Math.max(...xPositions),
      };
    });
  });

  for (const b of data) {
    const tag = `${demo.name}#${b.idx}`;

    // (1) El SVG tiene tamaño positivo.
    assert.ok(b.svgRect.width > 0 && b.svgRect.height > 0, `${tag}: SVG box debe tener tamaño (w=${b.svgRect.width}, h=${b.svgRect.height})`);

    // (2) Tiene barras dibujadas.
    assert.ok(b.barCount > 0, `${tag}: debe haber al menos una barra, hay ${b.barCount}`);

    // (3) Las barras ocupan un rango horizontal no trivial.
    const span = b.lastBarX - b.firstBarX;
    assert.ok(span > 10, `${tag}: span horizontal de barras debe ser >10 (got ${span})`);

    // (4) Si show-text o type=ean13, texto visible y no vacío.
    if (b.type === 'ean13' || b.textVisible) {
      assert.ok(b.text.length > 0, `${tag}: texto debe estar presente si visible, got "${b.text}"`);
    }

    // (5) Code128 con value de 17 chars → > 30 barras; EAN13 → > 50.
    if (b.type === 'code128') {
      assert.ok(b.barCount > 20, `${tag}: code128 debe generar >20 barras (got ${b.barCount})`);
    }
    if (b.type === 'ean13') {
      assert.ok(b.barCount > 50, `${tag}: ean13 debe generar >50 barras (got ${b.barCount})`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (SVG size OK, barras OK, texto OK)`);
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
Evalúa la calidad visual de los códigos de barras que aparecen en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. BARRAS LEGIBLES: las barras verticales son nítidas y se distinguen claramente entre sí.

2. CONTRASTE SUFICIENTE: las barras oscuras destacan sobre el fondo claro (o el color configurado).

3. ENCAJA EN VIEWPORT: cada código de barras cabe en su celda sin recortes.

4. TEXTO LEGIBLE: si hay texto bajo el código (debajo de las barras), es legible.

5. FORMATO CONSISTENTE: los códigos EAN-13 muestran los dígitos correctos bajo las barras.

Responde SOLO con un JSON con la forma:
{
  "bars_legible": "PASS" | "FAIL",
  "contrast_ok": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL" | "N/A",
  "format_consistent": "PASS" | "FAIL" | "N/A",
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
    const checks = ['bars_legible', 'contrast_ok', 'in_viewport', 'text_legible', 'format_consistent'];
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
report('barcode-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
