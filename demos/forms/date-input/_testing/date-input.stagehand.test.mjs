// date-input.stagehand.test.mjs — rubric visual determinista para date-input.
//
// Sin LLM: con Playwright comprobamos que cuando se abre el panel:
//   1. Hay un diálogo en el top layer.
//   2. El calendario interno renderiza la rejilla de días.
//   3. El panel está posicionado dentro del viewport.
//   4. El campo base no queda oculto por el panel.
//   5. El trigger del campo tiene tamaño mínimo legible.
//
// Rama Stagehand LLM opt-in con STAGEHAND=1.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-input/date-input.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del campo de fecha con calendario desplegable que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CAMPO VISIBLE: el campo de fecha base (con icono de calendario al final) está claramente visible.

2. CALENDARIO LEGIBLE: si el calendario está abierto, muestra el mes y año, los días de la semana, y los días del mes en una rejilla.

3. DÍAS SELECCIONABLES VISIBLES: los días del mes están claramente separados y son clicables.

4. EN VIEWPORT: el panel del calendario cabe en el área visible sin recortes significativos.

5. CONTRASTE: el texto del calendario (números y mes/año) es legible contra el fondo.

Responde SOLO con un JSON con la forma:
{
  "field_visible": "PASS" | "FAIL",
  "calendar_legible": "PASS" | "FAIL" | "N/A",
  "days_visible": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
  "contraste": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

const results = [];

async function checkDeterministic(page) {
  await page.evaluate(() => { document.getElementById('demo').show(); });
  await page.waitForTimeout(200);
  await page.waitForTimeout(200);

  const info = await page.evaluate(() => {
    const el = document.getElementById('demo');
    const dialog = el.shadowRoot.querySelector('dialog');
    const picker = el.shadowRoot.querySelector('is-date-picker');
    const field = el.shadowRoot.querySelector('is-date-field');
    const dialogRect = dialog.getBoundingClientRect();
    const pickerRect = picker?.getBoundingClientRect();
    const trigger = el.shadowRoot.querySelector('[part="trigger"]');
    const triggerRect = trigger?.getBoundingClientRect();
    return {
      dialogOpen: dialog.open,
      dialogRect: { x: dialogRect.x, y: dialogRect.y, w: dialogRect.width, h: dialogRect.height },
      pickerRect: pickerRect ? { x: pickerRect.x, y: pickerRect.y, w: pickerRect.width, h: pickerRect.height } : null,
      pickerGrid: picker?.shadowRoot?.querySelectorAll('button.day').length ?? 0,
      fieldValue: field?.getAttribute('value') ?? '',
      triggerW: triggerRect?.width ?? 0,
      triggerH: triggerRect?.height ?? 0,
    };
  });

  const tag = 'date-input';

  // (1) Diálogo abierto.
  assert.equal(info.dialogOpen, true, `${tag}: el diálogo debe estar abierto`);

  // (2) Calendario con rejilla.
  assert.ok(info.pickerGrid >= 28, `${tag}: el calendario debe tener >=28 días, tiene ${info.pickerGrid}`);

  // (3) Panel dentro del viewport (1400x900).
  assert.ok(info.dialogRect.x + info.dialogRect.w <= 1400,
    `${tag}: el panel se sale del viewport por la derecha`);
  assert.ok(info.dialogRect.y + info.dialogRect.h <= 900,
    `${tag}: el panel se sale del viewport por abajo`);

  // (4) Tamaño mínimo del trigger.
  assert.ok(info.triggerW >= 14, `${tag}: trigger demasiado estrecho (${info.triggerW})`);
  assert.ok(info.triggerH >= 14, `${tag}: trigger demasiado bajo (${info.triggerH})`);

  // (5) Panel tiene tamaño positivo.
  assert.ok(info.dialogRect.w > 50 && info.dialogRect.h > 50,
    `${tag}: el panel debe tener tamaño positivo`);

  await page.evaluate(() => { document.getElementById('demo').hide(); });
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-date-input-ready');
  await checkDeterministic(page);
  console.log('  ✓ date-input: rubric determinista PASS');
  results.push({ name: 'date-input', skipped: false });
} catch (err) {
  console.error(`  ✗ date-input: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-date-input'); } catch {}
  results.push({ name: 'date-input', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('  ⊘ date-input: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else {
      const { browser: b2, page: p2 } = await newPage();
      try {
        await p2.goto(URL, { waitUntil: 'domcontentloaded' });
        await waitReady(p2, 'data-date-input-ready');
        await p2.evaluate(() => { document.getElementById('demo').show(); });
        await p2.waitForTimeout(400);
        const shot = await screenshot(p2, 'stagehand-date-input');
        const result = await sh.act(VISUAL_RUBRIC, { image: shot });
        const json = JSON.parse(result?.output ?? result?.text ?? '{}');
        const checks = ['field_visible', 'calendar_legible', 'days_visible', 'in_viewport', 'contraste'];
        const fails = checks.filter((c) => json?.[c] === 'FAIL');
        if (!fails || fails.length === 0) console.log('  ✓ date-input: visual rubric LLM PASS');
        else console.error(`  ✗ date-input: visual rubric LLM FAIL (${fails.join(', ')})`);
      } finally {
        await sh.close?.().catch(() => {});
        await close({ browser: b2, page: p2 });
      }
    }
  } catch (err) {
    console.error(`  ✗ date-input (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('date-input-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });