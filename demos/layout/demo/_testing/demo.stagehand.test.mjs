// demo.stagehand.test.mjs — checks deterministas para is-demo (light DOM shell).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/demo/demo.html`, readyAttr: 'data-demo-ready', name: 'demo' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const demos = [...document.querySelectorAll('main is-demo')];
    return demos.map((d, idx) => {
      const r = d.getBoundingClientRect();
      const heading = d.querySelector(':scope > .demo__heading');
      return {
        idx,
        rectW: r.width, rectH: r.height,
        hasDemoClass: d.classList.contains('demo'),
        hasHeadingEl: !!heading,
        hasShadow: !!d.shadowRoot,
        text: (d.textContent ?? '').trim(),
      };
    });
  });
  assert.ok(data.length > 0, `${demo.name}: debe haber demos, hay ${data.length}`);
  for (const d of data) {
    const tag = `${demo.name}#${d.idx}`;
    assert.equal(d.hasDemoClass, true, `${tag}: clase "demo" auto-aplicada`);
    assert.equal(d.hasShadow, false, `${tag}: light DOM (shadowRoot=null)`);
    assert.ok(d.rectW > 20, `${tag}: ancho > 20, fue ${d.rectW}`);
    assert.ok(d.rectH > 20, `${tag}: alto > 20, fue ${d.rectH}`);
    assert.ok(d.text.length > 0, `${tag}: contenido light DOM vacío`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (clase demo, light DOM, layout no-cero)`);
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
Evalúa la calidad visual del shell <is-demo> en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: cada <is-demo> muestra su contenido (heading opcional + cuerpo) en el DOM visible.

2. LAYOUT NO VACÍO: los shells tienen tamaño visible (alto/ancho > 0).

3. HEADING PRESENTE: el demo con heading tiene un texto pequeño en mayúsculas (uppercase + letter-spacing).

4. HEADING AUSENTE: el demo sin heading no tiene ese texto pequeño encima del cuerpo.

5. SEPARACIÓN VISUAL: cada shell está visualmente separado (borde dashed o sólido).

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "heading_present": "PASS" | "FAIL",
  "heading_absent_when_no_attr": "PASS" | "FAIL",
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
    const checks = ['renders', 'non_empty_layout', 'heading_present', 'heading_absent_when_no_attr', 'visual_separation'];
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
report('demo-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
