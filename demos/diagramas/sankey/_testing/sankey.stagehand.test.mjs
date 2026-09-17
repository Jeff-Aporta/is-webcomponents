// sankey.stagehand.test.mjs — test visual del demo sankey.html.
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/sankey/sankey.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama Sankey que aparece en el screenshot.

Checklist:

1. NODOS VISIBLES: cada nodo aparece como una barra vertical claramente identificable.
2. CINTAS FLUIDAS: los enlaces se dibujan como cintas curvas (no como líneas rectas).
3. PROPORCIONALIDAD: el grosor de cada cinta es proporcional al valor (las cintas más anchas representan valores más altos).
4. LABELS LEGIBLES: los nombres de los nodos son legibles.
5. ENCAJA EN VIEWPORT: el diagrama completo cabe dentro del área visible.

Responde SOLO con JSON:
{
  "nodes_visible": "PASS" | "FAIL",
  "ribbons_curved": "PASS" | "FAIL",
  "proportional_widths": "PASS" | "FAIL",
  "labels_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) { console.log('  ⊘ sankey: skipping'); return { skipped: true }; }
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sankey-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-sankey');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    return { skipped: false, rubric: JSON.parse(result?.output ?? result?.text ?? '{}') };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['nodes_visible', 'ribbons_curved', 'proportional_widths', 'labels_legible', 'in_viewport'];
if (r.skipped) report('sankey-stagehand', true, { skipped: true });
else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (!fails.length) console.log('  ✓ sankey: PASS');
  else console.error(`  ✗ sankey: FAIL (${fails.join(', ')})`);
  report('sankey-stagehand', fails.length === 0, { rubric: r.rubric });
}