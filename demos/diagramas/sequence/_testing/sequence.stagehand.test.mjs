// sequence.stagehand.test.mjs — test visual del demo sequence.html.
// Sigue el patrón de ER: si Stagehand no está disponible, SKIP sin fallar.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../ER/_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/sequence/sequence.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama de secuencia que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. LIFELINES SEPARADAS: cada actor (caja en la cabecera) tiene una línea vertical de lifelines claramente separada de las demás. No se solapan.
2. MENSAJES LEGIBLES: las flechas horizontales entre lifelines son visibles y sus etiquetas se leen sin solapes.
3. SELF-LOOP VISIBLE: si hay mensajes self (de un actor a sí mismo), la herradura es distinguible de una línea recta.
4. ENCAJA EN VIEWPORT: el diagrama completo (incluyendo título si existe) cabe dentro del área visible. No hay recortes.
5. TEXTO LEGIBLE: los nombres de actores y mensajes son legibles, sin texto cortado.

Responde SOLO con JSON de la forma:
{
  "lifelines_separated": "PASS" | "FAIL",
  "messages_legible": "PASS" | "FAIL",
  "self_loop_visible": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runOnce() {
  const sh = await maybeStagehand();
  if (!sh) {
    console.log('  ⊘ sequence: stagehand no disponible, skipping');
    return { skipped: true };
  }

  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-sequence');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    return { skipped: false, rubric: json };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

const r = await runOnce();
const checks = ['lifelines_separated', 'messages_legible', 'self_loop_visible', 'in_viewport', 'text_legible'];
if (r.skipped) {
  report('sequence-stagehand', true, { skipped: true });
} else {
  const fails = checks.filter((c) => r.rubric?.[c] === 'FAIL');
  if (fails.length === 0) console.log('  ✓ sequence: visual rubric PASS');
  else console.error(`  ✗ sequence: visual rubric FAIL (${fails.join(', ')})`);
  report('sequence-stagehand', fails.length === 0, { rubric: r.rubric });
}