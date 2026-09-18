// date-range-input.stagehand.test.mjs — rubric visual determinista para date-range-input.
//
// Sin LLM: con Playwright comprobamos que los inputs de rango cumplen:
//   1. Muestran dos campos (inicio y fin) separados por un guion.
//   2. Cada campo tiene un trigger de calendario.
//   3. El panel contiene el range-picker con varios meses.
//   4. El input entero cabe en el viewport.
//   5. Los campos no se solapan entre sí.
//
// Rama Stagehand LLM opt-in con STAGEHAND=1.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-range-input/date-range-input.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del campo de rango de fechas (dos campos inicio/fin con un calendario desplegable) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. DOS CAMPOS VISIBLES: hay dos campos de fecha claramente diferenciados, separados por un guion "–" u otro separador.

2. TRIGGERS DE CALENDARIO: cada campo tiene al final un icono de calendario clicable.

3. CALENDARIO LEGIBLE: si el calendario está abierto, muestra los meses y días en una rejilla legible.

4. ATAJOS VISIBLES: si hay atajos (esta semana, mes actual, etc.), están claramente identificados como botones.

5. EN VIEWPORT: el campo completo (con sus dos secciones y label/hint si existen) cabe en el área visible.

Responde SOLO con un JSON con la forma:
{
  "two_fields_visible": "PASS" | "FAIL",
  "triggers_visible": "PASS" | "FAIL",
  "calendar_legible": "PASS" | "FAIL" | "N/A",
  "shortcuts_visible": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('is-date-range-input')];
    return inputs.map((i, idx) => {
      const r = i.getBoundingClientRect();
      const fields = [...i.shadowRoot.querySelectorAll('is-date-field')];
      const triggers = [...i.shadowRoot.querySelectorAll('[part="trigger"]')];
      const fieldRects = fields.map((f) => {
        const fr = f.getBoundingClientRect();
        return { x: fr.x, y: fr.y, w: fr.width, h: fr.height };
      });
      const triggerRects = triggers.map((t) => {
        const tr = t.getBoundingClientRect();
        return { x: tr.x, y: tr.y, w: tr.width, h: tr.height };
      });
      return {
        idx,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        fields: fieldRects,
        triggers: triggerRects,
      };
    });
  });

  for (const d of data) {
    const tag = `input#${d.idx}`;

    // (1) Dos campos.
    assert.equal(d.fields.length, 2, `${tag}: debe haber 2 campos`);
    // (2) Dos triggers.
    assert.equal(d.triggers.length, 2, `${tag}: debe haber 2 triggers`);

    // (3) Campos no se solapan.
    const a = d.fields[0], b = d.fields[1];
    const ox = a.x < b.x + b.w && b.x < a.x + a.w;
    const oy = a.y < b.y + b.h && b.y < a.y + a.h;
    assert.equal(ox && oy, false, `${tag}: los campos se solapan`);

    // (4) Triggers no se solapan con los campos (solo queremos que existan dentro del rect).
    assert.ok(d.triggers.every((t) => t.w > 0 && t.h > 0), `${tag}: los triggers deben tener tamaño positivo`);

    // (5) Input en viewport.
    assert.ok(d.rect.x + d.rect.w <= 1400, `${tag}: se sale por la derecha`);
    assert.ok(d.rect.y + d.rect.h <= 900, `${tag}: se sale por abajo`);
  }

  // Comprobación adicional: abrir uno y verificar el panel.
  await page.evaluate(() => { document.getElementById('demo').show(); });
  await page.waitForTimeout(200);
  const panelInfo = await page.evaluate(() => {
    const el = document.getElementById('demo');
    const range = el.shadowRoot.querySelector('is-date-range-picker');
    const pickers = range ? [...range.shadowRoot.querySelectorAll('is-date-picker')] : [];
    return {
      pickers: pickers.length,
      firstDays: pickers[0]?.shadowRoot?.querySelectorAll('button.day').length ?? 0,
    };
  });
  assert.ok(panelInfo.pickers >= 2, `el range-picker debe contener >=2 calendarios, hay ${panelInfo.pickers}`);
  assert.ok(panelInfo.firstDays >= 28, `el primer calendario debe tener >=28 días, tiene ${panelInfo.firstDays}`);
  await page.evaluate(() => document.getElementById('demo').hide());
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-date-range-input-ready');
  await checkDeterministic(page);
  console.log('  ✓ date-range-input: rubric determinista PASS');
  results.push({ name: 'date-range-input', skipped: false });
} catch (err) {
  console.error(`  ✗ date-range-input: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-date-range-input'); } catch {}
  results.push({ name: 'date-range-input', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('  ⊘ date-range-input: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else {
      const { browser: b2, page: p2 } = await newPage();
      try {
        await p2.goto(URL, { waitUntil: 'domcontentloaded' });
        await waitReady(p2, 'data-date-range-input-ready');
        await p2.evaluate(() => document.getElementById('demo').show());
        await p2.waitForTimeout(400);
        const shot = await screenshot(p2, 'stagehand-date-range-input');
        const result = await sh.act(VISUAL_RUBRIC, { image: shot });
        const json = JSON.parse(result?.output ?? result?.text ?? '{}');
        const checks = ['two_fields_visible', 'triggers_visible', 'calendar_legible', 'shortcuts_visible', 'in_viewport'];
        const fails = checks.filter((c) => json?.[c] === 'FAIL');
        if (!fails || fails.length === 0) console.log('  ✓ date-range-input: visual rubric LLM PASS');
        else console.error(`  ✗ date-range-input: visual rubric LLM FAIL (${fails.join(', ')})`);
      } finally {
        await sh.close?.().catch(() => {});
        await close({ browser: b2, page: p2 });
      }
    }
  } catch (err) {
    console.error(`  ✗ date-range-input (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('date-range-input-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });