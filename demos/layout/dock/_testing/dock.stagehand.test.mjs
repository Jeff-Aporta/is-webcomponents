// dock.stagehand.test.mjs — verificaciones de calidad visual para is-dock.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/dock/dock.html`, readyAttr: 'data-dock-ready', name: 'dock' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const docks = [...document.querySelectorAll('main is-dock')];
    const items = [...document.querySelectorAll('main is-dock-item')];
    return {
      docks: docks.length,
      items: items.length,
      // Cada item debe tener al menos label visible (en <a>).
      itemsWithLabel: items.filter((i) => {
        const a = i.shadowRoot?.querySelector('a');
        return a?.getAttribute('aria-label');
      }).length,
      // Cada item debe tener un <is-icon> renderizado dentro del slot icon.
      itemsWithIcon: items.filter((i) => i.shadowRoot?.querySelector('a is-icon, a [is-icon], a span.ico')).length,
      // Cada item debe tener layout (ancho > 0).
      itemsWithLayout: items.filter((i) => i.getBoundingClientRect().width > 10).length,
    };
  });
  assert.equal(data.docks, 3, `${demo.name}: debe haber 3 docks, hay ${data.docks}`);
  assert.equal(data.items, 11, `${demo.name}: debe haber 11 items, hay ${data.items}`);
  assert.equal(data.itemsWithLabel, data.items, 'todos los items deben tener aria-label');
  assert.equal(data.itemsWithLayout, data.items, 'todos los items deben tener layout visible');
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (3 docks, 11 items, todos con label + layout)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del <is-dock> en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: el dock aparece como una fila horizontal de iconos en la parte inferior (o superior) del contenedor.

2. ICONOS VISIBLES: cada dock-item muestra un icono Iconify distinguible.

3. LABELS LEGIBLES: los labels aparecen como tooltip/aria-label y/o se ven al hover.

4. ACTIVE DISTINGUIBLE: el item activo (Inicio) se ve visualmente distinto del resto (color, fondo, opacidad).

5. SEPARACIÓN: los items están espaciados, no se solapan.

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "icons_visible": "PASS" | "FAIL",
  "labels_legible": "PASS" | "FAIL",
  "active_distinguishable": "PASS" | "FAIL",
  "items_separated": "PASS" | "FAIL",
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
    const checks = ['renders', 'icons_visible', 'labels_legible', 'active_distinguishable', 'items_separated'];
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
      if (r.llm_skipped) console.log(`  ⊘ ${demo.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
      else if (!r.fails || r.fails.length === 0) console.log(`  ✓ ${demo.name}: visual rubric LLM PASS`);
      else console.error(`  ✗ ${demo.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    } catch (err) {
      console.error(`  ✗ ${demo.name} (LLM): ${String(err?.message ?? err)}`);
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('dock-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
