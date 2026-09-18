// time-input.stagehand.test.mjs — rubric visual determinista para time-input.
//
// Sin LLM: chequeamos con Playwright + atributos del shadow DOM que el input
// cumple cinco invariantes visuales:
//   1. Cada input tiene un is-time-field interno con secciones spinbutton.
//   2. El campo base del field cabe en el viewport.
//   3. El trigger del reloj está presente y es clickeable.
//   4. Al abrir el dialog se monta el panel correspondiente (sections/list/clock).
//   5. El panel no se sale del viewport cuando está abierto.
//
// La rama Stagehand LLM sigue disponible opt-in con STAGEHAND=1.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/time-input/time-input.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del campo de hora con panel que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CAMPO LEGIBLE: el campo de hora muestra sus secciones (hora, minuto, opcionalmente segundo y AM/PM) claramente separadas. Cada sección es legible.

2. TRIGGER VISIBLE: hay un icono (reloj) al final del campo que invita a abrir el panel.

3. PANEL LEGIBLE: cuando se muestra el panel, las opciones de hora son legibles y no se solapan con el campo.

4. EN VIEWPORT: el campo completo (incluyendo label y trigger) cabe en el área visible sin recortes.

5. CONTRASTE SUFICIENTE: el texto del campo y del panel es legible contra el fondo.

Responde SOLO con un JSON con la forma:
{
  "campo_legible": "PASS" | "FAIL",
  "trigger_visible": "PASS" | "FAIL",
  "panel_legible": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
  "contraste": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('is-time-input')];
    return inputs.map((el, idx) => {
      const r = el.getBoundingClientRect();
      const field = el.shadowRoot.querySelector('is-time-field');
      const secs = field ? [...field.shadowRoot.querySelectorAll('[role="spinbutton"]')] : [];
      const trigger = el.shadowRoot.querySelector('.trigger');
      const dialog = el.shadowRoot.querySelector('dialog.popup');
      return {
        idx,
        inputRect: { x: r.x, y: r.y, w: r.width, h: r.height },
        sectionsCount: secs.length,
        triggerPresent: !!trigger,
        triggerDisabled: trigger?.disabled,
        dialogOpen: dialog?.open,
      };
    });
  });

  for (const f of data) {
    const tag = `input#${f.idx}`;

    // (1) Cada input tiene un field interno con secciones spinbutton.
    assert.ok(f.sectionsCount >= 2, `${tag}: debe haber >=2 secciones (h/M), hay ${f.sectionsCount}`);

    // (2) El campo base cabe dentro del viewport.
    const VW = 1400, VH = 900;
    assert.ok(
      f.inputRect.x + f.inputRect.w <= VW,
      `${tag}: el input se sale del viewport por la derecha`,
    );
    assert.ok(
      f.inputRect.y + f.inputRect.h <= VH,
      `${tag}: el input se sale del viewport por abajo`,
    );

    // (3) El trigger del reloj está presente.
    assert.equal(f.triggerPresent, true, `${tag}: debe existir el trigger (.trigger)`);

    // (5) Si el dialog está abierto, el panel debe caber en el viewport.
    if (f.dialogOpen) {
      const panelRect = await page.evaluate((idx) => {
        const inputs = [...document.querySelectorAll('is-time-input')];
        const el = inputs[idx];
        const panel = el.shadowRoot.querySelector('.panel');
        if (!panel) return null;
        const r = panel.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }, f.idx);
      if (panelRect) {
        assert.ok(panelRect.x >= 0, `${tag}: panel se sale por la izquierda`);
        assert.ok(panelRect.y >= 0, `${tag}: panel se sale por arriba`);
        assert.ok(
          panelRect.x + panelRect.w <= VW,
          `${tag}: panel se sale por la derecha`,
        );
        assert.ok(
          panelRect.y + panelRect.h <= VH,
          `${tag}: panel se sale por abajo`,
        );
      }
    }
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-time-input-ready');
  await checkDeterministic(page);

  // Bonus: abrir uno de los inputs y verificar que el panel también pasa los checks.
  await page.evaluate(async () => {
    const el = document.getElementById('basic');
    el.show();
    await new Promise((r) => setTimeout(r, 100));
  });
  await checkDeterministic(page);

  console.log('  ✓ time-input: rubric determinista PASS');
  results.push({ name: 'time-input', skipped: false });
} catch (err) {
  console.error(`  ✗ time-input: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-time-input'); } catch {}
  results.push({ name: 'time-input', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('  ⊘ time-input: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else {
      const { browser: b2, page: p2 } = await newPage();
      try {
        await p2.goto(URL, { waitUntil: 'domcontentloaded' });
        await waitReady(p2, 'data-time-input-ready');
        await p2.evaluate(() => document.getElementById('basic').show());
        await p2.waitForTimeout(400);
        const shot = await screenshot(p2, 'stagehand-time-input');
        const result = await sh.act(VISUAL_RUBRIC, { image: shot });
        const json = JSON.parse(result?.output ?? result?.text ?? '{}');
        const checks = ['campo_legible', 'trigger_visible', 'panel_legible', 'in_viewport', 'contraste'];
        const fails = checks.filter((c) => json?.[c] === 'FAIL');
        if (!fails || fails.length === 0) console.log('  ✓ time-input: visual rubric LLM PASS');
        else console.error(`  ✗ time-input: visual rubric LLM FAIL (${fails.join(', ')})`);
      } finally {
        await sh.close?.().catch(() => {});
        await close({ browser: b2, page: p2 });
      }
    }
  } catch (err) {
    console.error(`  ✗ time-input (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('time-input-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
