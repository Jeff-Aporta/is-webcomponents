// timeline.stagehand.test.mjs — test visual del demo timeline.html.
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/timeline/timeline.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual de la línea de tiempo que aparece en el screenshot.

Checklist:

1. EJE HORIZONTAL: hay una línea de tiempo horizontal claramente visible.
2. EVENTOS DISTRIBUIDOS: los eventos aparecen como puntos/círculos a lo largo del eje.
3. TARJETAS LEGIBLES: cada evento tiene una tarjeta con su nombre visible, conectada al eje por una línea.
4. SIN SOLAPES: las tarjetas no se montan unas encima de otras.
5. ENCAJA EN VIEWPORT: la línea de tiempo completa cabe dentro del área visible.

Responde SOLO con JSON:
{
  "horizontal_axis": "PASS" | "FAIL",
  "events_distributed": "PASS" | "FAIL",
  "cards_legible": "PASS" | "FAIL",
  "no_overlap": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) { console.log('  ⊘ timeline: skipping'); return { skipped: true }; }
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-timeline-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-timeline');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    return { skipped: false, rubric: JSON.parse(result?.output ?? result?.text ?? '{}') };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['horizontal_axis', 'events_distributed', 'cards_legible', 'no_overlap', 'in_viewport'];
if (r.skipped) report('timeline-stagehand', true, { skipped: true });
else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (!fails.length) console.log('  ✓ timeline: PASS');
  else console.error(`  ✗ timeline: FAIL (${fails.join(', ')})`);
  report('timeline-stagehand', fails.length === 0, { rubric: r.rubric });
}