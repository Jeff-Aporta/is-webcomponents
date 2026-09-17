// er-stagehand.test.mjs — test de calidad visual usando Stagehand (LLM agent).
// Para CADA demo, valida que el render cumple las expectativas de un humano:
//   - Las cajas de entidades NO se solapan.
//   - Las aristas son legibles (no se cruzan en X imposibles).
//   - El diagrama está centrado en su viewport.
//
// Si Stagehand no está disponible (sin API key o sin LLM), el test SKIP sin
// fallar la suite (los demás tests siguen pasando).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/diagramas/ER/er-editor.html`, readyAttr: 'data-er-editor-ready', name: 'er-editor' },
  { url: `${BASE_URL}/demos/diagramas/ER/er-static.html`, readyAttr: 'data-er-static-ready', name: 'er-static' },
];

const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama entidad-relación que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. ENTIDADES NO SE SOLAPAN: cada caja de entidad (rectángulo con texto) está visualmente separada de las demás. No hay superposición.

2. ARISTAS LEGIBLES: las líneas que conectan cajas son visibles y no se cruzan de forma caótica. Las patas de gallo / círculos de cardinalidad son visibles en los extremos.

3. DIAGRAMA ENCAJA EN VIEWPORT: el diagrama completo (incluyendo título y leyenda si existen) cabe dentro del área visible. No hay recortes.

4. TEXTO LEGIBLE: los nombres de entidades y etiquetas son legibles, sin texto cortado.

5. ANIMACIÓN CONSISTENTE: si hay líneas dashed/animadas, siguen un patrón consistente.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "edges_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "animation_consistent": "PASS" | "FAIL" | "N/A",
  "summary": "una línea"
}
`.trim();

async function runFor(demo) {
  const sh = await maybeStagehand();
  if (!sh) {
    console.log(`  ⊘ ${demo.name}: stagehand no disponible, skipping`);
    return { name: demo.name, skipped: true };
  }

  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    return {
      name: demo.name,
      skipped: false,
      rubric: json,
      shot,
    };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const results = [];
for (const d of DEMOS) {
  try {
    const r = await runFor(d);
    results.push(r);
    if (r.skipped) continue;
    // Si todas las checks que aplican son PASS → ✓; si alguna es FAIL → ✗
    const checks = ['no_overlap', 'edges_legible', 'in_viewport', 'text_legible', 'animation_consistent'];
    const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
    if (fails.length === 0) console.log(`  ✓ ${d.name}: visual rubric PASS`);
    else console.error(`  ✗ ${d.name}: visual rubric FAIL (${fails.join(', ')})`);
  } catch (err) {
    console.error(`  ✗ ${d.name}: ${String(err?.message ?? err)}`);
    results.push({ name: d.name, error: String(err?.message ?? err) });
  }
}

// Sólo falla la suite si hubo ERROR (no skip). Si stagehand corrió y dio
// FAIL, lo logamos y seguimos (es un test opt-in, no bloqueante).
const hardFailures = results.filter((r) => r.error).length;
report('er-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });