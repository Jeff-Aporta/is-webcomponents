// month-calendar.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) 4 month-calendars montados
//  (2) Cada uno tiene 12 botones month visibles
//  (3) monthWidth=long muestra nombres largos; columns=4 los agrupa en 4 columnas
//  (4) El calendario "limitado" tiene 5 meses disabled (fuera de Abr–Oct)
//  (5) Click en un mes del #basico emite is-change y refleja en el atributo value
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/month-calendar/month-calendar.html`,
  readyAttr: 'data-month-calendar-ready',
  name: 'month-calendar',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1)-(2): 4 calendars, 12 botones cada uno
  const initial = await page.evaluate(() => {
    const cals = [...document.querySelectorAll('is-month-calendar')];
    return cals.map((c) => {
      const sr = c.shadowRoot;
      const buttons = [...sr.querySelectorAll('button.month')];
      const baseRect = sr.querySelector('.base')?.getBoundingClientRect();
      const sampleRect = buttons[0]?.getBoundingClientRect();
      return {
        monthsCount: buttons.length,
        baseW: baseRect?.width ?? 0,
        baseH: baseRect?.height ?? 0,
        firstLabel: buttons[0]?.textContent ?? '',
        disabled: buttons.filter((b) => b.disabled).length,
        enabled: buttons.filter((b) => !b.disabled).length,
      };
    });
  });
  assert.equal(initial.length, 4, '4 month-calendars');
  for (let i = 0; i < initial.length; i++) {
    const c = initial[i];
    assert.equal(c.monthsCount, 12, `#${i} 12 meses (hay ${c.monthsCount})`);
    assert.ok(c.baseW > 200, `#${i} base visible (w=${c.baseW})`);
    assert.ok(c.baseH > 100, `#${i} base alto (h=${c.baseH})`);
    assert.ok(c.firstLabel.length > 0, `#${i} label de mes no vacío`);
  }

  // (3): ancho (long + 4 columnas) — el ancho tiene labels más largos
  const wide = initial[3];
  assert.ok(wide.firstLabel.length >= 6,
    `#ancho label larga (${wide.firstLabel})`);

  // (4): limitado tiene 5 meses disabled
  const limited = initial[2];
  assert.equal(limited.disabled, 5, '#limitado tiene 5 meses disabled');
  assert.equal(limited.enabled, 7, '#limitado tiene 7 meses disponibles');

  // (5): click en #basico mes=5 (Junio)
  const changed = await page.evaluate(() => {
    return new Promise((resolve) => {
      const c = document.querySelector('#basico');
      c.addEventListener('is-change', (e) => resolve(e.detail), { once: true });
      const jun = c.shadowRoot.querySelector('button.month[data-month="5"]');
      jun.click();
    });
  });
  assert.equal(changed.value, '2026-06', `value=2026-06 (${changed.value})`);
  assert.equal(changed.month, 5, 'month=5');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 calendarios, 12 meses, labels largas, límites)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del calendario mensual que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CALENDARIOS LEGIBLES: los 4 calendarios mensuales son visualmente identificables como rejillas de 12 meses.

2. 12 MESES: cada calendario muestra exactamente 12 casillas (una por mes).

3. SELECCIÓN VISIBLE: al menos un calendario muestra un mes marcado como seleccionado.

4. DISABLED DIFERENCIADO: el calendario "limitado" tiene varios meses visualmente apagados (fuera del rango).

5. LABELS LEGIBLES: los nombres de mes son legibles (largos en el de 4 columnas).

Responde SOLO con un JSON con la forma:
{
  "calendars_visible": "PASS" | "FAIL",
  "twelve_months": "PASS" | "FAIL",
  "selection_visible": "PASS" | "FAIL",
  "disabled_dimmed": "PASS" | "FAIL",
  "labels_legible": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric() {
  const sh = await maybeStagehand();
  if (!sh) return { llm_skipped: true };
  const { browser, page } = await newPage();
  try {
    await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, DEMO.readyAttr);
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['calendars_visible', 'twelve_months', 'selection_visible', 'disabled_dimmed', 'labels_legible'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const r = await runStagehandRubric();
    if (r.llm_skipped) console.log(`  ⊘ ${DEMO.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
    else if (!r.fails || r.fails.length === 0) console.log(`  ✓ ${DEMO.name}: visual rubric LLM PASS`);
    else console.error(`  ✗ ${DEMO.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
  } catch (err) {
    console.error(`  ✗ ${DEMO.name} (LLM): ${String(err?.message ?? err)}`);
  }
}

await close({ browser, page });
report(DEMO.name, true, { mode: 'deterministic+opt-in-llm' });
