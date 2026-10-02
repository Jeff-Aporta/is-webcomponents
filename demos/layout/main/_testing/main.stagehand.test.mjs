// main.stagehand.test.mjs — verificaciones de calidad visual para iswc-main.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/main/main.html`, readyAttr: 'data-main-ready', name: 'main' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const mains = [...document.querySelectorAll('main iswc-main')];
    return mains.map((m, idx) => {
      const r = m.getBoundingClientRect();
      // Medimos scrollHeight vs clientHeight para verificar que el contenido es
      // más alto que el viewport → hay scroll.
      return {
        idx,
        role: m.getAttribute('role'),
        rectW: r.width, rectH: r.height,
        scrollable: m.scrollHeight > m.clientHeight,
        scrollHeight: m.scrollHeight,
        clientHeight: m.clientHeight,
      };
    });
  });
  assert.ok(data.length > 0, `${demo.name}: debe haber iswc-main, hay ${data.length}`);
  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;
    assert.equal(d.role, 'main', `${tag}: role="main"`);
    assert.ok(d.rectW > 50, `${tag}: ancho > 50, fue ${d.rectW}`);
    assert.ok(d.rectH > 50, `${tag}: alto > 50, fue ${d.rectH}`);
    // Los contenidos tienen un .filler de 1200px → scrollHeight > clientHeight.
    assert.ok(d.scrollable, `${tag}: debe ser scrollable (scrollHeight=${d.scrollHeight} > clientHeight=${d.clientHeight})`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (role="main", scrollable, layout > 0)`);
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
Evalúa la calidad visual del <iswc-main> en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: los iswc-main aparecen como contenedores con su contenido visible.

2. SCROLLBAR PRESENTE: cada iswc-main tiene scroll (el contenido es más alto que el viewport) y muestra una scrollbar funcional.

3. SEPARACIÓN VISUAL: los iswc-main están separados entre sí y visualmente identificables.

4. LAYOUT NO VACÍO: cada iswc-main tiene tamaño visible (ancho/alto > 0).

5. SCROLL CONSISTENTE: todos los iswc-main siguen el mismo patrón visual (mismo padding, mismo tipo de scrollbar).

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "scrollbar_present": "PASS" | "FAIL",
  "visual_separation": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "scroll_consistent": "PASS" | "FAIL",
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
    const checks = ['renders', 'scrollbar_present', 'visual_separation', 'non_empty_layout', 'scroll_consistent'];
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
report('main-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
