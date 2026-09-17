// use-case.stagehand.test.mjs — test visual del demo use-case.html.
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/use-case/use-case.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama de casos de uso (UML) que aparece en el screenshot.

Checklist:

1. ACTORES VISIBLES: los actores (monigotes) están fuera del recuadro del sistema.
2. CASOS COMO ELIPSES: los casos de uso aparecen como elipses dentro del recuadro del sistema.
3. RECUADRO DEL SISTEMA: hay un rectángulo que delimita los casos de uso con su nombre.
4. RELACIONES LEGIBLES: las líneas entre actores y casos son visibles, con estereotipos "«include»"/"«extend»" legibles si existen.
5. ENCAJA EN VIEWPORT: el diagrama completo cabe dentro del área visible.

Responde SOLO con JSON:
{
  "actors_outside": "PASS" | "FAIL",
  "cases_as_ellipses": "PASS" | "FAIL",
  "system_box": "PASS" | "FAIL" | "N/A",
  "relations_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) { console.log('  ⊘ use-case: skipping'); return { skipped: true }; }
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-use-case-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-use-case');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    return { skipped: false, rubric: JSON.parse(result?.output ?? result?.text ?? '{}') };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['actors_outside', 'cases_as_ellipses', 'system_box', 'relations_legible', 'in_viewport'];
if (r.skipped) report('use-case-stagehand', true, { skipped: true });
else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (!fails.length) console.log('  ✓ use-case: PASS');
  else console.error(`  ✗ use-case: FAIL (${fails.join(', ')})`);
  report('use-case-stagehand', fails.length === 0, { rubric: r.rubric });
}