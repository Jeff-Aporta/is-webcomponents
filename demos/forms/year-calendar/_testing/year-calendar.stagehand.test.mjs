// year-calendar.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) 4 year-calendars montados
//  (2) #basico tiene 13 años (2020-2032)
//  (3) #historico tiene 21 años (1990-2010)
//  (4) El año value=2026 está marcado como data-selected y aria-checked=true
//  (5) Click en otro año emite is-change y lo marca como selected
//  (6) El #bloqueado tiene todos los botones disabled
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/year-calendar/year-calendar.html`,
  readyAttr: 'data-year-calendar-ready',
  name: 'year-calendar',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1)-(3): 4 calendarios con conteos correctos
  const initial = await page.evaluate(() => {
    const cals = [...document.querySelectorAll('is-year-calendar')];
    return cals.map((c) => {
      const sr = c.shadowRoot;
      const buttons = [...sr.querySelectorAll('button.year')];
      const baseRect = sr.querySelector('.base')?.getBoundingClientRect();
      return {
        count: buttons.length,
        minYear: Math.min(...buttons.map((b) => Number(b.dataset.year))),
        maxYear: Math.max(...buttons.map((b) => Number(b.dataset.year))),
        baseW: baseRect?.width ?? 0,
        baseH: baseRect?.height ?? 0,
        selected: buttons.find((b) => b.hasAttribute('data-selected'))?.dataset?.year,
        allDisabled: buttons.every((b) => b.disabled),
      };
    });
  });
  assert.equal(initial.length, 4, '4 year-calendars');
  assert.equal(initial[0].count, 13, '#basico 13 años (2020-2032)');
  assert.equal(initial[0].minYear, 2020, '#basico min 2020');
  assert.equal(initial[0].maxYear, 2032, '#basico max 2032');
  assert.equal(initial[0].selected, '2026', '#basico seleccionado 2026');
  assert.equal(initial[1].count, 21, '#historico 21 años (1990-2010)');
  assert.equal(initial[1].minYear, 1990, '#historico min 1990');
  assert.equal(initial[1].maxYear, 2010, '#historico max 2010');

  // layout
  for (let i = 0; i < initial.length; i++) {
    assert.ok(initial[i].baseW > 100, `#${i} base visible (w=${initial[i].baseW})`);
    assert.ok(initial[i].baseH > 100, `#${i} base alto (h=${initial[i].baseH})`);
  }

  // (4): #basico 2026 aria-checked=true
  const a11y = await page.evaluate(() => {
    const c = document.querySelector('#basico');
    const sel = c.shadowRoot.querySelector('button.year[data-selected]');
    return {
      ariaChecked: sel?.getAttribute('aria-checked'),
      role: sel?.getAttribute('role'),
    };
  });
  assert.equal(a11y.ariaChecked, 'true', '2026 aria-checked=true');
  assert.equal(a11y.role, 'radio', '2026 role=radio');

  // (5): click en 2030 → is-change y selected
  const changed = await page.evaluate(() => {
    return new Promise((resolve) => {
      const c = document.querySelector('#basico');
      c.addEventListener('is-change', (e) => resolve(e.detail), { once: true });
      const btn = c.shadowRoot.querySelector('button.year[data-year="2030"]');
      btn.click();
    });
  });
  assert.equal(changed.value, '2030', `value="2030" (${changed.value})`);
  const sel2030 = await page.evaluate(() => {
    return document.querySelector('#basico').shadowRoot
      .querySelector('button.year[data-selected]')?.dataset?.year;
  });
  assert.equal(sel2030, '2030', '2030 marcado como data-selected');

  // (6): #bloqueado todo disabled
  assert.equal(initial[3].allDisabled, true, '#bloqueado todos disabled');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 calendarios, rangos correctos, selección, disabled)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del calendario anual que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CALENDARIOS LEGIBLES: los 4 calendarios anuales (básico, histórico, readonly, disabled) son visualmente identificables.

2. AÑOS VISIBLES: cada calendario muestra sus años como una rejilla de celdas-clickables.

3. AÑO SELECCIONADO: al menos un calendario tiene un año marcado como seleccionado (más visible).

4. AÑOS DESHABILITADOS: el calendario "disabled" tiene sus celdas visualmente apagadas.

5. RANGO HISTÓRICO: el calendario "histórico" muestra años de la década del 2000 (1990–2010).

Responde SOLO con un JSON con la forma:
{
  "calendars_visible": "PASS" | "FAIL",
  "years_visible": "PASS" | "FAIL",
  "year_selected": "PASS" | "FAIL",
  "disabled_dimmed": "PASS" | "FAIL",
  "historic_range": "PASS" | "FAIL",
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
    const checks = ['calendars_visible', 'years_visible', 'year_selected', 'disabled_dimmed', 'historic_range'];
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
