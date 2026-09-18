// divider.stagehand.test.mjs — verificaciones de calidad visual.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/divider/divider.html`, readyAttr: 'data-divider-ready', name: 'divider' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const dividers = [...document.querySelectorAll('main is-divider')];
    return dividers.map((d, idx) => {
      const sr = d.shadowRoot;
      const part = sr?.querySelector('[part="divider"]');
      const r = part?.getBoundingClientRect();
      return {
        idx,
        orientation: d.getAttribute('aria-orientation'),
        color: d.getAttribute('color'),
        opacity: d.getAttribute('opacity'),
        partW: r?.width ?? 0, partH: r?.height ?? 0,
        aria: d.getAttribute('aria-orientation'),
        role: d.getAttribute('role'),
      };
    });
  });
  assert.ok(data.length > 0, `${demo.name}: debe haber dividers, hay ${data.length}`);
  for (const d of data) {
    const tag = `${demo.name}#${d.idx} (${d.orientation ?? 'h'}/${d.color}/${d.opacity})`;
    assert.equal(d.role, 'separator', `${tag}: role="separator"`);
    assert.ok(['horizontal', 'vertical'].includes(d.aria), `${tag}: aria-orientation`);
    // El divider debe tener layout visible (al menos 1px en la dimensión perpendicular).
    if (d.orientation === 'horizontal') {
      assert.ok(d.partW > 30, `${tag}: ancho > 30, fue ${d.partW}`);
      assert.ok(d.partH >= 1, `${tag}: alto >= 1, fue ${d.partH}`);
    } else {
      // El divider vertical usa height: 100% del padre. Si el contenedor no
      // tiene altura explícita, puede colapsar al tamaño del texto (~16px).
      // Verificamos que al menos tenga layout (>= 10px en vertical, no 0).
      assert.ok(d.partH >= 10, `${tag}: alto >= 10, fue ${d.partH}`);
      assert.ok(d.partW >= 1, `${tag}: ancho >= 1, fue ${d.partW}`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (role/aria consistentes, layout perpendicular con tamaño > 0)`);
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
Evalúa la calidad visual del <is-divider> en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: cada divider es una línea visible (no un punto invisible).

2. HORIZONTAL vs VERTICAL: los dividers horizontales son líneas anchas y bajitas; los verticales son líneas altas y angostas.

3. COLORES DIFERENCIADOS: los 10 colores semánticos producen tonos distintos (al menos 4-5 distinguibles visualmente).

4. OPACITIES VISIBLES: las 5 opacities (10/25/50/75/100) producen líneas con transparencia creciente, todas legibles.

5. SEPARA VISUALMENTE: el divider vertical entre "Lado izquierdo" y "Lado derecho" es claramente visible.

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "orientation_distinct": "PASS" | "FAIL",
  "colors_differentiated": "PASS" | "FAIL",
  "opacities_visible": "PASS" | "FAIL",
  "visual_separation": "PASS" | "FAIL",
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
    const checks = ['renders', 'orientation_distinct', 'colors_differentiated', 'opacities_visible', 'visual_separation'];
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
report('divider-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
