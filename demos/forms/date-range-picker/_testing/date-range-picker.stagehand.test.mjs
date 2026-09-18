// date-range-picker.stagehand.test.mjs — rubric visual determinista para date-range-picker.
//
// Sin LLM: con Playwright comprobamos que los range-pickers cumplen:
//   1. Muestran al menos 1 calendario.
//   2. Si tienen atajos, los botones de atajo están en una zona visible.
//   3. Los calendarios no se solapan entre sí.
//   4. El atajo activo se distingue visualmente (variant=filled).
//   5. El range-picker entero cabe en el viewport.
//
// Rama Stagehand LLM opt-in con STAGEHAND=1.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/date-range-picker/date-range-picker.html`;

const VISUAL_RUBRIC = `
Evalúa la calidad visual del calendario de rango de fechas (con uno o varios meses y atajos) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. CALENDARIOS LEGIBLES: cada mes del calendario muestra días claramente organizados en una rejilla.

2. MESES NO SE SOLAPAN: cuando hay varios meses, están claramente separados horizontalmente sin solaparse.

3. ATAJOS VISIBLES: si hay panel de atajos (esta semana, mes actual, etc.), los botones están claramente visibles y son clicables.

4. DÍA SELECCIONADO VISIBLE: si hay un rango seleccionado, los días de inicio y fin se distinguen claramente.

5. EN VIEWPORT: el componente completo cabe en el área visible sin recortes significativos.

Responde SOLO con un JSON con la forma:
{
  "calendars_legible": "PASS" | "FAIL",
  "months_no_overlap": "PASS" | "FAIL" | "N/A",
  "shortcuts_visible": "PASS" | "FAIL" | "N/A",
  "selected_visible": "PASS" | "FAIL" | "N/A",
  "in_viewport": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const ranges = [...document.querySelectorAll('is-date-range-picker')];
    return ranges.map((r, idx) => {
      const rect = r.getBoundingClientRect();
      const pickers = [...r.shadowRoot.querySelectorAll('is-date-picker')];
      const pickerRects = pickers.map((p) => {
        const pr = p.getBoundingClientRect();
        return { x: pr.x, y: pr.y, w: pr.width, h: pr.height };
      });
      const shortcuts = r.shadowRoot.querySelector('[part="shortcuts"]');
      return {
        idx,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        pickers: pickerRects,
        hasShortcuts: shortcuts && !shortcuts.hidden,
      };
    });
  });

  for (const d of data) {
    const tag = `range#${d.idx}`;

    // (1) Al menos 1 calendario.
    assert.ok(d.pickers.length >= 1, `${tag}: debe haber >=1 calendario, hay ${d.pickers.length}`);

    // (2) Calendarios no se solapan horizontalmente (deben estar side-by-side).
    for (let i = 1; i < d.pickers.length; i++) {
      const a = d.pickers[i - 1], b = d.pickers[i];
      const ox = a.x < b.x + b.w && b.x < a.x + a.w;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      assert.equal(ox && oy, false, `${tag}: calendario ${i} se solapa con ${i - 1}`);
    }

    // (3) Tamaño positivo.
    assert.ok(d.pickers.every((p) => p.w > 50 && p.h > 50),
      `${tag}: los calendarios deben tener tamaño positivo`);

    // (4) En viewport.
    assert.ok(d.rect.x + d.rect.w <= 1400, `${tag}: se sale por la derecha`);
    assert.ok(d.rect.y + d.rect.h <= 900, `${tag}: se sale por abajo`);
  }

  // Comprobación del atajo activo: aplicar atajo a "with-shortcuts".
  await page.evaluate(() => {
    const el = document.getElementById('with-shortcuts');
    el.shadowRoot.querySelector('[data-preset="last-7-days"]').click();
  });
  await page.waitForTimeout(50);
  const active = await page.evaluate(() => {
    const el = document.getElementById('with-shortcuts');
    const btn = el.shadowRoot.querySelector('[data-preset="last-7-days"]');
    return {
      hasActive: btn.hasAttribute('data-active'),
      variant: btn.getAttribute('variant'),
    };
  });
  assert.equal(active.hasActive, true, 'el atajo correspondiente al rango debe tener data-active');
  assert.equal(active.variant, 'filled', 'el atajo activo debe cambiar a variant="filled"');
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-date-range-picker-ready');
  await checkDeterministic(page);
  console.log('  ✓ date-range-picker: rubric determinista PASS');
  results.push({ name: 'date-range-picker', skipped: false });
} catch (err) {
  console.error(`  ✗ date-range-picker: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-date-range-picker'); } catch {}
  results.push({ name: 'date-range-picker', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const sh = await maybeStagehand();
    if (!sh) {
      console.log('  ⊘ date-range-picker: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else {
      const { browser: b2, page: p2 } = await newPage();
      try {
        await p2.goto(URL, { waitUntil: 'domcontentloaded' });
        await waitReady(p2, 'data-date-range-picker-ready');
        await p2.waitForTimeout(400);
        const shot = await screenshot(p2, 'stagehand-date-range-picker');
        const result = await sh.act(VISUAL_RUBRIC, { image: shot });
        const json = JSON.parse(result?.output ?? result?.text ?? '{}');
        const checks = ['calendars_legible', 'months_no_overlap', 'shortcuts_visible', 'selected_visible', 'in_viewport'];
        const fails = checks.filter((c) => json?.[c] === 'FAIL');
        if (!fails || fails.length === 0) console.log('  ✓ date-range-picker: visual rubric LLM PASS');
        else console.error(`  ✗ date-range-picker: visual rubric LLM FAIL (${fails.join(', ')})`);
      } finally {
        await sh.close?.().catch(() => {});
        await close({ browser: b2, page: p2 });
      }
    }
  } catch (err) {
    console.error(`  ✗ date-range-picker (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('date-range-picker-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });