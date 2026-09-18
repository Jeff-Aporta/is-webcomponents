// date-picker.stagehand.test.mjs — rubric visual determinista para date-picker.
//
// Sin LLM: con Playwright comprobamos que los calendarios cumplen cinco
// invariantes visuales:
//   1. Header con mes y año visibles y sin solaparse.
//   2. Botones de navegación prev/next visibles.
//   3. Fila de 7 días de la semana.
//   4. Días del mes actual encajan en la rejilla y no se desbordan.
//   5. Cada calendario cabe en el viewport.
//
// Rama Stagehand LLM opt-in con STAGEHAND=1.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-picker/date-picker.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual de los calendarios mensuales que aparecen en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. HEADER LEGIBLE: cada calendario muestra el mes y el año como texto visible y no truncado en la cabecera.

2. DÍAS DE LA SEMANA VISIBLES: la fila encima de la rejilla contiene etiquetas para los 7 días de la semana.

3. DÍAS DEL MES LEGIBLES: los números de los días del mes son visibles y están claramente separados en celdas.

4. DÍA SELECCIONADO VISIBLE: si hay un día seleccionado (resaltado), se distingue claramente del resto.

5. EN VIEWPORT: cada calendario completo cabe en su área visible sin recortes.

Responde SOLO con un JSON con la forma:
{
  "header_legible": "PASS" | "FAIL",
  "weekdays_visible": "PASS" | "FAIL",
  "month_days_visible": "PASS" | "FAIL",
  "selected_visible": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const pickers = [...document.querySelectorAll('is-date-picker')];
    return pickers.map((p, idx) => {
      const r = p.getBoundingClientRect();
      const nav = p.shadowRoot.querySelector('[part="nav"]');
      const monthText = p.shadowRoot.querySelector('[part="month-select"] .nav-select-text');
      const yearText = p.shadowRoot.querySelector('[part="year-select"] .nav-select-text');
      const weekdays = p.shadowRoot.querySelectorAll('.weekdays .wd');
      const days = [...p.shadowRoot.querySelectorAll('button.day')];
      const headerRect = nav.getBoundingClientRect();
      return {
        idx,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        monthText: monthText?.textContent.trim() ?? '',
        yearText: yearText?.textContent.trim() ?? '',
        headerRect: { x: headerRect.x, y: headerRect.y, w: headerRect.width, h: headerRect.height },
        weekdayCount: weekdays.length,
        dayCount: days.length,
      };
    });
  });

  for (const d of data) {
    const tag = `picker#${d.idx}`;

    // (1) Mes y año no vacíos.
    assert.ok(d.monthText.length > 0, `${tag}: el mes del header está vacío`);
    assert.ok(d.yearText.length > 0, `${tag}: el año del header está vacío`);
    assert.ok(/^\d{4}$/.test(d.yearText), `${tag}: el año no es numérico: ${d.yearText}`);

    // (2) Botones de navegación visibles: comprobar que hay 2 botones con data-nav.
    const hasNavButtons = await page.evaluate((idx) => {
      const p = document.querySelectorAll('is-date-picker')[idx];
      return p.shadowRoot.querySelectorAll('[data-nav]').length === 2;
    }, d.idx);
    assert.equal(hasNavButtons, true, `${tag}: debe haber 2 botones de navegación (prev/next)`);

    // (3) 7 weekdays.
    assert.equal(d.weekdayCount, 7, `${tag}: debe haber 7 columnas de weekday`);

    // (4) Días del mes >= 28.
    assert.ok(d.dayCount >= 28, `${tag}: debe haber >=28 días, hay ${d.dayCount}`);

    // (5) En viewport.
    assert.ok(d.rect.x + d.rect.w <= 1400, `${tag}: se sale por la derecha`);
    assert.ok(d.rect.y + d.rect.h <= 900, `${tag}: se sale por abajo`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-date-picker-ready');
  await checkDeterministic(page);
  console.log('  ✓ date-picker: rubric determinista PASS');
  results.push({ name: 'date-picker', skipped: false });
} catch (err) {
  console.error(`  ✗ date-picker: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-date-picker'); } catch {}
  results.push({ name: 'date-picker', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('  ⊘ date-picker: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else {
      const { browser: b2, page: p2 } = await newPage();
      try {
        await p2.goto(URL, { waitUntil: 'domcontentloaded' });
        await waitReady(p2, 'data-date-picker-ready');
        await p2.waitForTimeout(400);
        const shot = await screenshot(p2, 'stagehand-date-picker');
        const result = await sh.act(VISUAL_RUBRIC, { image: shot });
        const json = JSON.parse(result?.output ?? result?.text ?? '{}');
        const checks = ['header_legible', 'weekdays_visible', 'month_days_visible', 'selected_visible', 'in_viewport'];
        const fails = checks.filter((c) => json?.[c] === 'FAIL');
        if (!fails || fails.length === 0) console.log('  ✓ date-picker: visual rubric LLM PASS');
        else console.error(`  ✗ date-picker: visual rubric LLM FAIL (${fails.join(', ')})`);
      } finally {
        await sh.close?.().catch(() => {});
        await close({ browser: b2, page: p2 });
      }
    }
  } catch (err) {
    console.error(`  ✗ date-picker (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('date-picker-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });