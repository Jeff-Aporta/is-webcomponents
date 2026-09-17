// flowchart.stagehand.test.mjs — test visual del demo flowchart.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/flowchart/flowchart.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama de flujo que aparece en el screenshot.

Checklist:

1. FORMAS DISTINGUIBLES: rect, stadium y diamond se ven visualmente distintos (rect=rectángulo, stadium=terminal redondeado, diamond=rombo).
2. FLECHAS CON PUNTA: cada arista termina en una punta de flecha visible.
3. ETIQUETAS LEGIBLES: las etiquetas "sí"/"no" u otras en las aristas son legibles.
4. FLUJO NO SE CRUZA: las aristas no se cruzan en X imposibles (visualmente caótico).
5. ENCAJA EN VIEWPORT: el diagrama completo cabe dentro del área visible.

Responde SOLO con JSON:
{
  "shapes_distinguishable": "PASS" | "FAIL",
  "arrows_have_tips": "PASS" | "FAIL",
  "labels_legible": "PASS" | "FAIL",
  "flow_no_x_crossings": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) { console.log('  ⊘ flowchart: skipping'); return { skipped: true }; }
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-flowchart');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    return { skipped: false, rubric: JSON.parse(result?.output ?? result?.text ?? '{}') };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['shapes_distinguishable', 'arrows_have_tips', 'labels_legible', 'flow_no_x_crossings', 'in_viewport'];
if (r.skipped) report('flowchart-stagehand', true, { skipped: true });
else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (!fails.length) console.log('  ✓ flowchart: PASS');
  else console.error(`  ✗ flowchart: FAIL (${fails.join(', ')})`);
  report('flowchart-stagehand', fails.length === 0, { rubric: r.rubric });
}