// details.stagehand.test.mjs — verificaciones de calidad visual.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/details/details.html`, readyAttr: 'data-details-ready', name: 'details' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const details = [...document.querySelectorAll('main is-details')];
    return details.map((d, idx) => {
      const sr = d.shadowRoot;
      const base = sr?.querySelector('[part="base"]');
      const summary = sr?.querySelector('[part="summary"]');
      const content = sr?.querySelector('[part="content"]');
      const baseR = base?.getBoundingClientRect();
      const sumR = summary?.getBoundingClientRect();
      return {
        idx,
        open: d.hasAttribute('open'),
        // Texto del summary: light DOM (slot summary) o atributo summary.
        summaryText: (() => {
          const slot = d.querySelector('[slot="summary"]');
          if (slot) return (slot.textContent ?? '').trim();
          return d.getAttribute('summary') || '';
        })(),
        baseW: baseR?.width ?? 0, baseH: baseR?.height ?? 0,
        sumW: sumR?.width ?? 0, sumH: sumR?.height ?? 0,
        contentHidden: content?.hidden,
        ariaExpanded: summary?.getAttribute('aria-expanded'),
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber details, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx} (${d.open ? 'open' : 'closed'})`;

    assert.ok(d.summaryText.length > 0, `${tag}: summary vacío`);
    assert.ok(d.baseW > 30, `${tag}: ancho base > 30, fue ${d.baseW}`);
    assert.ok(d.sumW > 30, `${tag}: ancho summary > 30, fue ${d.sumW}`);
    assert.ok(d.sumH > 10, `${tag}: alto summary > 10, fue ${d.sumH}`);
    assert.equal(d.ariaExpanded, d.open ? 'true' : 'false',
      `${tag}: aria-expanded debe coincidir con open`);
    if (!d.open) {
      assert.equal(d.contentHidden, true, `${tag}: content debe estar hidden si !open`);
    } else {
      assert.equal(d.contentHidden, false, `${tag}: content NO debe estar hidden si open`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (summary visible, aria-expanded consistente, layout no-cero)`);
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
Evalúa la calidad visual del <is-details> (collapsible disclosure) en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: cada details muestra un summary (header clickable) y un cuerpo cuando está abierto.

2. LAYOUT NO VACÍO: los details tienen tamaño visible (ancho > 0, alto > 0) cuando están abiertos.

3. SUMMARY VISIBLE: el summary de cada details se ve como una fila clickable con texto (no un punto plano).

4. ACCORDION CONSISTENTE: en el grupo de 3 con name="acc1", nunca hay 2 detalles abiertos a la vez.

5. ICONO DISTINGUIBLE: el chevron (icono) está visible y rota 180° cuando el details está abierto vs cerrado.

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "summary_visible": "PASS" | "FAIL",
  "accordion_consistent": "PASS" | "FAIL",
  "icon_distinguishable": "PASS" | "FAIL",
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
    const checks = ['renders', 'non_empty_layout', 'summary_visible', 'accordion_consistent', 'icon_distinguishable'];
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
report('details-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
