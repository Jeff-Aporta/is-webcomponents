// swimlane.stagehand.test.mjs — test visual del demo swimlane.html.
// Sigue el patrón de ER: si Stagehand no está disponible, SKIP sin fallar.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/swimlane/swimlane.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama swimlane (cross-functional flowchart) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CARRILES SEPARADOS: cada carril horizontal tiene su etiqueta visible a la izquierda y un fondo alterno.
2. PASOS DENTRO DE CARRIL: cada paso aparece dentro del carril que le corresponde (lane matching).
3. DECISIONES VISIBLES: las cajas de decisión (rombos) son distinguibles de los procesos (rectángulos).
4. FLECHAS LEGIBLES: las flechas conectan pasos sin cruzarse de forma caótica.
5. ENCAJA EN VIEWPORT: el diagrama completo cabe dentro del área visible.

Responde SOLO con JSON de la forma:
{
  "lanes_separated": "PASS" | "FAIL",
  "steps_in_lane": "PASS" | "FAIL",
  "decisions_visible": "PASS" | "FAIL" | "N/A",
  "edges_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) {
    console.log('  ⊘ swimlane: stagehand no disponible, skipping');
    return { skipped: true };
  }

  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-swimlane-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-swimlane');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    return { skipped: false, rubric: json };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['lanes_separated', 'steps_in_lane', 'decisions_visible', 'edges_legible', 'in_viewport'];
if (r.skipped) {
  report('swimlane-stagehand', true, { skipped: true });
} else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (fails.length === 0) console.log('  ✓ swimlane: visual rubric PASS');
  else console.error(`  ✗ swimlane: visual rubric FAIL (${fails.join(', ')})`);
  report('swimlane-stagehand', fails.length === 0, { rubric: r.rubric });
}