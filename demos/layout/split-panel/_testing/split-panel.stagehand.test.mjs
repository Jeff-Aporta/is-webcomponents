// split-panel.stagehand.test.mjs — verificaciones de calidad visual para is-split-panel.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/split-panel/split-panel.html`, readyAttr: 'data-split-panel-ready', name: 'split-panel' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const sps = [...document.querySelectorAll('main is-split-panel')];
    return sps.map((sp, idx) => {
      const div = sp.shadowRoot?.querySelector('[part="divider"]');
      const startSlot = sp.querySelector('[slot="start"]');
      const endSlot = sp.querySelector('[slot="end"]');
      const divR = div?.getBoundingClientRect();
      const startR = startSlot?.getBoundingClientRect();
      const endR = endSlot?.getBoundingClientRect();
      return {
        idx,
        orientation: sp.getAttribute('orientation'),
        disabled: sp.disabled,
        collapsed: sp.collapse,
        startW: startR?.width ?? 0, startH: startR?.height ?? 0,
        endW: endR?.width ?? 0, endH: endR?.height ?? 0,
        dividerW: divR?.width ?? 0, dividerH: divR?.height ?? 0,
        dividerRole: div?.getAttribute('role'),
      };
    });
  });
  assert.ok(data.length >= 5, `${demo.name}: debe haber >=5 split-panels, hay ${data.length}`);
  for (const d of data) {
    const tag = `${demo.name}#${d.idx} (${d.orientation})`;
    // El divider debe tener role=separator siempre.
    assert.equal(d.dividerRole, 'separator', `${tag}: role="separator"`);
    // Si no está colapsado, ambos paneles deben tener layout.
    if (!d.collapsed) {
      assert.ok(d.startW > 10, `${tag}: start ancho > 10, fue ${d.startW}`);
      assert.ok(d.endW > 10, `${tag}: end ancho > 10, fue ${d.endW}`);
      assert.ok(d.dividerW > 0 || d.dividerH > 0,
        `${tag}: divider debe tener al menos 1px en alguna dimensión, fue w=${d.dividerW} h=${d.dividerH}`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (5 split-panels, divider con role=separator, layout correcto)`);
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
Evalúa la calidad visual del <is-split-panel> en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: los split-panels aparecen con sus dos paneles visibles, separados por un divisor.

2. DIVIDER VISIBLE: el divisor (handle) entre los dos paneles es visible y clickable/arrastrable.

3. LAYOUTS DIFERENCIADOS: el panel horizontal tiene paneles izquierda/derecha; el vertical tiene paneles arriba/abajo.

4. NO SOLAPAMIENTO: los dos paneles no se solapan — el divisor marca claramente la frontera.

5. PANELES CON CONTENIDO: cada panel muestra el contenido (texto "Panel A" / "Panel B" o "Top"/"Bottom").

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "divider_visible": "PASS" | "FAIL",
  "layouts_differentiated": "PASS" | "FAIL",
  "no_overlap": "PASS" | "FAIL",
  "panels_have_content": "PASS" | "FAIL",
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
    const checks = ['renders', 'divider_visible', 'layouts_differentiated', 'no_overlap', 'panels_have_content'];
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
report('split-panel-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
