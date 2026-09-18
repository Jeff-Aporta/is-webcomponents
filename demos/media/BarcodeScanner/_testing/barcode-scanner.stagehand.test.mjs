// barcode-scanner.stagehand.test.mjs — verificaciones de calidad visual
// (rubric determinista + rama LLM opt-in).
//
// NOTA: en Chromium headless sin cámara real, los scanners no muestran
// contenido de video. La rama determinista verifica que la chrome del
// componente (botón + hint) está visible y no se rompe.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_testing/lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/media/BarcodeScanner/barcode-scanner.html`, readyAttr: 'data-barcode-scanner-ready', name: 'barcode-scanner' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const scanners = [...document.querySelectorAll('main is-barcode-scanner')];
    return scanners.map((el, idx) => {
      const shadow = el.shadowRoot;
      const wrapRect = el.getBoundingClientRect();
      const video = shadow.querySelector('video.preview');
      const hint = shadow.querySelector('.hint');
      const btn = shadow.querySelector('button, is-button');
      const btnText = btn?.textContent?.trim() || '';
      return {
        idx,
        wrapRect,
        hasVideo: !!video,
        hasHint: !!hint,
        hintText: hint?.textContent?.trim() || '',
        hasBtn: !!btn,
        btnText,
        disabled: el.disabled,
      };
    });
  });

  for (const s of data) {
    const tag = `${demo.name}#${s.idx}`;

    // (1) El componente ocupa espacio en el layout (no está colapsado).
    assert.ok(s.wrapRect.width > 0 && s.wrapRect.height > 0, `${tag}: componente debe tener tamaño (w=${s.wrapRect.width}, h=${s.wrapRect.height})`);

    // (2) Tiene los elementos estructurales mínimos: video, hint, botón.
    assert.ok(s.hasVideo, `${tag}: debe tener <video.preview>`);
    assert.ok(s.hasHint, `${tag}: debe tener <p.hint>`);
    assert.ok(s.hasBtn, `${tag}: debe tener botón de acción`);

    // (3) El botón tiene texto legible (Escanear / Detener).
    assert.ok(s.btnText.length > 0, `${tag}: el botón debe tener texto, got "${s.btnText}"`);
    assert.match(s.btnText, /escanear|detener/i, `texto del botón debe ser Escanear/Detener, got "${s.btnText}"`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (estructura OK, botón OK)`);
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
Evalúa la calidad visual de los escáneres de códigos de barras en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CHROME LEGIBLE: cada scanner muestra un botón "Escanear" o "Detener" claramente visible.

2. CAJAS ENCAJAN EN VIEWPORT: los scanners caben en sus celdas sin recortes.

3. NO HAY OVERLAP: los distintos scanners no se superponen entre sí.

4. ACCESIBILIDAD VISUAL: el texto del botón y el hint son legibles.

5. ESTADO CONSISTENTE: si un scanner está disabled, su botón debe verse desactivado.

Responde SOLO con un JSON con la forma:
{
  "chrome_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "no_overlap": "PASS" | "FAIL",
  "a11y_visual": "PASS" | "FAIL",
  "state_consistent": "PASS" | "FAIL" | "N/A",
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
    const checks = ['chrome_legible', 'in_viewport', 'no_overlap', 'a11y_visual', 'state_consistent'];
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
report('barcode-scanner-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
