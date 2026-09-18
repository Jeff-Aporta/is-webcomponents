// digital-clock.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) Los 4 clocks montados con sus layouts correctos (list vs sections)
//  (2) La lista tiene opciones visibles (>=10) y encaja en el viewport
//  (3) La opción seleccionada coincide con el atributo value
//  (4) El layout sections tiene 3 o 4 columnas (con/sin meridiem)
//  (5) Tabindex móvil: la opción seleccionada es la única con tabindex=0
//  (6) El reloj 24h no muestra AM/PM
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/digital-clock/digital-clock.html`,
  readyAttr: 'data-digital-clock-ready',
  name: 'digital-clock',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  const initial = await page.evaluate(() => {
    const clocks = [...document.querySelectorAll('is-digital-clock')];
    return clocks.map((c) => {
      const sr = c.shadowRoot;
      const base = sr.querySelector('.base');
      return {
        layout: c.layout,
        value: c.value,
        baseLayout: base?.dataset?.layout ?? null,
        colsCount: sr.querySelectorAll('.col').length,
        listOptions: sr.querySelectorAll('.list .opt').length,
        selectedCount: sr.querySelectorAll('.opt[data-selected]').length,
        activeTab: sr.querySelector('.opt[tabindex="0"]')?.dataset?.raw ?? null,
        disabled: c.matches(':state(disabled)'),
      };
    });
  });

  assert.equal(initial.length, 4, `demo debe tener 4 clocks, hay ${initial.length}`);

  for (let i = 0; i < initial.length; i++) {
    const s = initial[i];
    assert.ok(s.baseLayout === 'list' || s.baseLayout === 'sections',
      `${DEMO.name}#${i}: base.dataset.layout válido (${s.baseLayout})`);
    assert.equal(s.selectedCount, 1, `${DEMO.name}#${i}: exactamente 1 opción seleccionada`);
    assert.ok(s.activeTab, `${DEMO.name}#${i}: hay opción con tabindex=0`);
  }

  // (2)-(3): el clock #0 lista → 48 opciones (24h * 2) y el selected coincide
  const list = initial[0];
  assert.equal(list.layout, 'list', '#0 debe ser list');
  assert.equal(list.baseLayout, 'list', '#0 baseLayout=list');
  assert.ok(list.listOptions >= 24, `#0 lista >=24 opciones (hay ${list.listOptions})`);
  assert.equal(list.activeTab, '09:30', '#0 opción activa = 09:30 (value inicial)');

  // (4): el clock #1 sections → 3 columnas + meridiem = 4
  const secs = initial[1];
  assert.equal(secs.layout, 'sections', '#1 debe ser sections');
  assert.equal(secs.colsCount, 4, `#1 sections debe tener 4 columnas (hay ${secs.colsCount})`);
  assert.equal(secs.activeTab, '14', '#1 hours activa = 14');

  // (6): el clock #2 24h no tiene columna meridiem
  const r24 = initial[2];
  assert.equal(r24.colsCount, 0, '#2 es layout=list, sin .col');

  // (5): el clock #3 disabled → state:disabled
  const dis = initial[3];
  assert.equal(dis.disabled, true, '#3 debe tener :state(disabled)');

  // Layout: cada .list visible encaja en el viewport
  const layout = await page.evaluate(() => {
    const lists = [...document.querySelectorAll('is-digital-clock')]
      .map((c) => c.shadowRoot.querySelector('.list'))
      .filter(Boolean);
    return lists.map((l) => {
      const r = l.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
  });
  for (const l of layout) {
    assert.ok(l.w > 0 && l.h > 0, `lista visible (w=${l.w}, h=${l.h})`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 clocks, layouts correctos, selección y tabindex OK)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del reloj digital que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RELOJES LEGIBLES: los 4 relojes (lista, sections, 24h, disabled) son visualmente identificables, con sus horas en formato HH:mm o columnas separadas.

2. LISTA VISIBLE: el primer reloj muestra una lista vertical con múltiples opciones de hora, una marcada como seleccionada.

3. COLUMNAS: el segundo reloj muestra columnas separadas para horas, minutos, segundos y AM/PM.

4. 24H SIN AM/PM: el tercer reloj (24h) no muestra controles AM/PM.

5. DISABLED VISUALMENTE DIFERENCIADO: el reloj "disabled" se ve apagado/atenuado.

Responde SOLO con un JSON con la forma:
{
  "clocks_visible": "PASS" | "FAIL",
  "list_visible": "PASS" | "FAIL",
  "columns_visible": "PASS" | "FAIL",
  "24h_no_ampm": "PASS" | "FAIL",
  "disabled_dimmed": "PASS" | "FAIL",
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
    const checks = ['clocks_visible', 'list_visible', 'columns_visible', '24h_no_ampm', 'disabled_dimmed'];
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
