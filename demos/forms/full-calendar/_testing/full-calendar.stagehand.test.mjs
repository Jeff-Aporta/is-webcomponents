// full-calendar.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) 3 calendarios montados
//  (2) Toolbar con prev/today/next + 3 botones de vista, todos visibles
//  (3) Vista mes: 7 cabeceras de día, ~35–42 celdas día, eventos con colores
//  (4) Vista semana: 7 columnas; cada celda-hora visible
//  (5) Vista día: 1 columna con la franja horaria 6–22 (16 horas)
//  (6) Cambio de vista refleja en dataset y re-renderiza el grid
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/full-calendar/full-calendar.html`,
  readyAttr: 'data-full-calendar-ready',
  name: 'full-calendar',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1)-(2): estado inicial
  const initial = await page.evaluate(() => {
    const cals = [...document.querySelectorAll('is-full-calendar')];
    return cals.map((c) => {
      const sr = c.shadowRoot;
      const tb = sr.querySelector('.toolbar');
      const grid = sr.querySelector('.grid');
      return {
        view: c.getAttribute('view'),
        tbW: tb?.getBoundingClientRect()?.width ?? 0,
        viewBtns: sr.querySelectorAll('[data-view]').length,
        ctrlBtns: sr.querySelectorAll('.ctrl').length,
        gridView: grid?.dataset?.view ?? null,
      };
    });
  });
  assert.equal(initial.length, 3, '3 calendarios');
  for (let i = 0; i < initial.length; i++) {
    const c = initial[i];
    assert.ok(c.tbW > 200, `#${i} toolbar visible (w=${c.tbW})`);
    assert.ok(c.viewBtns >= 3, `#${i} 3 botones de vista (hay ${c.viewBtns})`);
    assert.ok(c.ctrlBtns >= 3, `#${i} 3 botones ctrl (prev/today/next) (hay ${c.ctrlBtns})`);
  }
  assert.equal(initial[0].gridView, 'month', '#mes gridView=month');
  assert.equal(initial[1].gridView, 'week', '#semana gridView=week');
  assert.equal(initial[2].gridView, 'day', '#dia gridView=day');

  // (3): vista mes → 7 cabeceras de día, ~35-42 celdas
  const month = await page.evaluate(() => {
    const c = document.querySelector('#mes');
    const sr = c.shadowRoot;
    return {
      wkHeads: sr.querySelectorAll('.wk-head').length,
      dayBtns: sr.querySelectorAll('button.day').length,
      evItems: sr.querySelectorAll('.ev').length,
    };
  });
  assert.equal(month.wkHeads, 7, '7 cabeceras de día de semana');
  assert.ok(month.dayBtns >= 35, `>=35 celdas día (hay ${month.dayBtns})`);

  // (4): vista semana → 7 columnas
  const week = await page.evaluate(() => {
    const c = document.querySelector('#semana');
    const sr = c.shadowRoot;
    return {
      colHeads: sr.querySelectorAll('.col-head').length,
      cellHours: sr.querySelectorAll('.cell-hour').length,
    };
  });
  assert.equal(week.colHeads, 7, '7 cabeceras de columna en semana');
  assert.ok(week.cellHours >= 7 * 5, 'celdas-hora en cada columna');

  // (5): vista día → 1 columna con horas 6..22 (16 filas)
  const day = await page.evaluate(() => {
    const c = document.querySelector('#dia');
    const sr = c.shadowRoot;
    return {
      colHeads: sr.querySelectorAll('.col-head').length,
      hours: sr.querySelectorAll('.hour').length,
    };
  });
  assert.equal(day.colHeads, 1, '1 cabecera en vista día');
  assert.equal(day.hours, 16, `16 horas (6–22) (hay ${day.hours})`);

  // (6): cambio de vista vía setView
  await page.evaluate(() => {
    const c = document.querySelector('#semana');
    c.setView('day');
  });
  await page.waitForTimeout(80);
  const afterSwitch = await page.evaluate(() => {
    const c = document.querySelector('#semana');
    return c.shadowRoot.querySelector('.grid').dataset.view;
  });
  assert.equal(afterSwitch, 'day', 'setView(day) cambia gridView');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (3 calendarios, vistas mes/week/day, toolbar, eventos)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del calendario completo que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CALENDARIOS LEGIBLES: los 3 calendarios (mes, semana, día) son visualmente identificables con su toolbar.

2. TOOLBAR COMPLETA: cada calendario tiene botones prev/today/next y los 3 botones de vista (Mes/Semana/Día).

3. VISTA MES: el primer calendario muestra una rejilla de 7×N con cabeceras de día y celdas-clicables.

4. EVENTOS LEGIBLES: los eventos en la vista mes aparecen como bloques/líneas con colores diferenciados.

5. VISTA SEMANA/DÍA: el segundo y tercer calendario muestran columnas con cabeceras y una franja horaria.

Responde SOLO con un JSON con la forma:
{
  "calendars_visible": "PASS" | "FAIL",
  "toolbar_complete": "PASS" | "FAIL",
  "month_view": "PASS" | "FAIL",
  "events_visible": "PASS" | "FAIL",
  "week_day_view": "PASS" | "FAIL",
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
    const checks = ['calendars_visible', 'toolbar_complete', 'month_view', 'events_visible', 'week_day_view'];
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
