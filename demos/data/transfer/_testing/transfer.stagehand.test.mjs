// transfer.stagehand.test.mjs — verificaciones de calidad visual.
//
// Mismo patrón que diagramas/ER/er-stagehand.test.mjs: por defecto corremos
// checks deterministas (Playwright puro) que NO skippean. STAGEHAND=1 +
// MINIMAX_API_KEY activa la rama LLM con un rubric en español.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data/transfer/transfer.html`, readyAttr: 'data-transfer-ready', name: 'transfer' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const transfers = [...document.querySelectorAll('main is-transfer')];
    return transfers.map((t, idx) => {
      const sr = t.shadowRoot;
      const base = sr.querySelector('[part="base"]');
      const baseRect = base?.getBoundingClientRect();
      const sourcePane = sr.querySelector('.pane.source');
      const targetPane = sr.querySelector('.pane.target');
      const sourceListRect = sr.querySelector('.pane.source .list')?.getBoundingClientRect();
      const targetListRect = sr.querySelector('.pane.target .list')?.getBoundingClientRect();
      const items = [...sr.querySelectorAll('.list .item')];
      const disabledItems = items.filter((it) => it.classList.contains('disabled'));
      const enabledItems = items.filter((it) => !it.classList.contains('disabled'));
      return {
        idx,
        hasBase: !!base,
        hasSourcePane: !!sourcePane,
        hasTargetPane: !!targetPane,
        hasSourceList: !!sourceListRect,
        hasTargetList: !!targetListRect,
        baseW: baseRect?.width ?? 0,
        baseH: baseRect?.height ?? 0,
        sourceItems: items.filter((it) => it.closest('.pane.source')).length,
        targetItems: items.filter((it) => it.closest('.pane.target')).length,
        disabledCount: disabledItems.length,
        enabledCount: enabledItems.length,
        ariaDisabled: disabledItems.filter((it) => it.getAttribute('aria-disabled') === 'true').length,
        text: items.map((it) => (it.textContent ?? '').trim()),
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber al menos un transfer, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;

    // (1) Partes base + 2 panes renderizan.
    assert.equal(d.hasBase, true, `${tag}: debe existir part="base"`);
    assert.equal(d.hasSourcePane, true, `${tag}: debe existir pane.source`);
    assert.equal(d.hasTargetPane, true, `${tag}: debe existir pane.target`);
    assert.equal(d.hasSourceList, true, `${tag}: debe existir list en source`);
    assert.equal(d.hasTargetList, true, `${tag}: debe existir list en target`);

    // (2) Layout no-cero: el transfer tiene un tamaño visible.
    assert.ok(d.baseW > 100, `${tag}: ancho del transfer debe ser > 100, fue ${d.baseW}`);
    assert.ok(d.baseH > 50, `${tag}: alto del transfer debe ser > 50, fue ${d.baseH}`);

    // (3) Items repartidos source/target.
    assert.ok(d.sourceItems + d.targetItems > 0,
      `${tag}: debe haber al menos 1 item repartido, hay ${d.sourceItems + d.targetItems}`);

    // (4) Items deshabilitados marcados con aria-disabled.
    if (d.disabledCount > 0) {
      assert.equal(d.ariaDisabled, d.disabledCount,
        `${tag}: ${d.disabledCount} items disabled deben llevar aria-disabled="true", hay ${d.ariaDisabled}`);
    }

    // (5) Texto de items no vacío.
    const empty = d.text.filter((t) => !t);
    assert.equal(empty.length, 0, `${tag}: hay ${empty.length} items con texto vacío`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (panes visibles, layout no-cero, items repartidos, aria-disabled correcto)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM. Sólo corre si STAGEHAND=1 + credenciales.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del doble selector <is-transfer> (lista origen + lista destino + botones centrales).

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. DOS PANELES VISIBLES: la UI muestra una lista a la izquierda (origen), unos botones de movimiento en el centro, y una lista a la derecha (destino).

2. ITEMS REPARTIDOS: los items se reparten entre las dos listas según su estado de selección inicial, sin quedar vacíos por error.

3. ITEMS DESHABILITADOS DIFERENCIADOS: los items con estado "disabled" se ven visualmente distintos (atenuados / no clicables) de los habilitados.

4. LAYOUT NO VACÍO: el componente tiene tamaño visible y los paneles no aparecen como una línea plana.

5. BUSCADOR VISIBLE: cuando el transfer tiene el atributo "searchable", se ve una caja de búsqueda en cada panel.

Responde SOLO con un JSON con la forma:
{
  "two_panels": "PASS" | "FAIL",
  "items_distributed": "PASS" | "FAIL",
  "disabled_differentiated": "PASS" | "FAIL" | "N/A",
  "non_empty_layout": "PASS" | "FAIL",
  "search_visible": "PASS" | "FAIL" | "N/A",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric(demo) {
  const sh = await maybeStagehand();
  if (!sh) return { name: demo.name, llm_skipped: true };

  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['two_panels', 'items_distributed', 'disabled_differentiated', 'non_empty_layout', 'search_visible'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { name: demo.name, llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  for (const demo of DEMOS) {
    try {
      const r = await runStagehandRubric(demo);
      if (r.llm_skipped) {
        console.log(`  ⊘ ${demo.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
      } else if (!r.fails || r.fails.length === 0) {
        console.log(`  ✓ ${demo.name}: visual rubric LLM PASS`);
      } else {
        console.error(`  ✗ ${demo.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
      }
    } catch (err) {
      console.error(`  ✗ ${demo.name} (LLM): ${String(err?.message ?? err)}`);
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('transfer-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });