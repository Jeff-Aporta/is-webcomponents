// org-chart.stagehand.test.mjs — test visual del demo org-chart.html.
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/org-chart/org-chart.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del organigrama que aparece en el screenshot.

Checklist:

1. JERARQUÍA CLARA: hay una raíz (CEO) en la parte superior y los subordinados en niveles inferiores.
2. TARJETAS LEGIBLES: cada persona tiene una tarjeta con su nombre y cargo visible.
3. ARISTAS VISIBLES: las líneas que conectan jefe→subordinado son visibles y no se cruzan de forma caótica.
4. SIN SOLAPES: las tarjetas no se montan unas encima de otras.
5. ENCAJA EN VIEWPORT: el organigrama completo cabe dentro del área visible.

Responde SOLO con JSON:
{
  "hierarchy_clear": "PASS" | "FAIL",
  "cards_legible": "PASS" | "FAIL",
  "edges_visible": "PASS" | "FAIL",
  "no_overlap": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) { console.log('  ⊘ org-chart: skipping'); return { skipped: true }; }
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-org-chart');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    return { skipped: false, rubric: JSON.parse(result?.output ?? result?.text ?? '{}') };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['hierarchy_clear', 'cards_legible', 'edges_visible', 'no_overlap', 'in_viewport'];
if (r.skipped) report('org-chart-stagehand', true, { skipped: true });
else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (!fails.length) console.log('  ✓ org-chart: PASS');
  else console.error(`  ✗ org-chart: FAIL (${fails.join(', ')})`);
  report('org-chart-stagehand', fails.length === 0, { rubric: r.rubric });
}
