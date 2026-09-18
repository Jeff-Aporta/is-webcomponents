// state.stagehand.test.mjs — test visual del demo state.html.
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/state/state.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama de estados (UML) que aparece en el screenshot.

Checklist:

1. START COMO CÍRCULO RELLENO: el estado inicial se distingue como un círculo pequeño relleno.
2. END COMO CÍRCULO CONCENTRADO: el estado final se distingue como un círculo con otro círculo dentro (bullseye).
3. ESTADOS COMO RECTÁNGULOS: los estados intermedios son rectángulos con su nombre.
4. DECISIONES COMO ROMBOS: los puntos de decisión son rombos distinguibles.
5. FLECHAS LEGIBLES: las transiciones son visibles con sus etiquetas si tienen.
6. ENCAJA EN VIEWPORT: el diagrama completo cabe dentro del área visible.

Responde SOLO con JSON:
{
  "start_filled_circle": "PASS" | "FAIL",
  "end_bullseye": "PASS" | "FAIL",
  "states_as_rects": "PASS" | "FAIL",
  "decisions_as_diamonds": "PASS" | "FAIL" | "N/A",
  "transitions_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) { console.log('  ⊘ state: skipping'); return { skipped: true }; }
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-state-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-state');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    return { skipped: false, rubric: JSON.parse(result?.output ?? result?.text ?? '{}') };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['start_filled_circle', 'end_bullseye', 'states_as_rects', 'decisions_as_diamonds', 'transitions_legible', 'in_viewport'];
if (r.skipped) report('state-stagehand', true, { skipped: true });
else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (!fails.length) console.log('  ✓ state: PASS');
  else console.error(`  ✗ state: FAIL (${fails.join(', ')})`);
  report('state-stagehand', fails.length === 0, { rubric: r.rubric });
}