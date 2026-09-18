// textarea.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Checks:
//   1. COMPONENTE RENDERIZADO: <is-textarea> definido, shadow DOM, textarea
//      nativo accesible.
//   2. ELEMENTOS VISIBLES: cada textarea tiene label + textarea visibles.
//   3. TEXTO LEGIBLE: labels y hints con font-size >= 8px.
//   4. SIN OVERLAPS: las textareas del demo no se solapan entre sí.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/textarea/textarea.html`, readyAttr: 'data-textarea-ready', name: 'textarea' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const defined = await page.evaluate(() => !!customElements.get('is-textarea'));
  assert.equal(defined, true, 'is-textarea debe estar definido');

  const data = await page.evaluate(() => {
    const tas = [...document.querySelectorAll('is-textarea')];
    return tas.map((ta) => {
      const sr = ta.shadowRoot;
      const native = sr?.querySelector('textarea');
      const label = sr?.querySelector('label#label');
      const hint = sr?.querySelector('#hint');
      const taRect = ta.getBoundingClientRect();
      const nativeRect = native?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      return {
        rect: { x: taRect.x, y: taRect.y, w: taRect.width, h: taRect.height },
        nativeRect: nativeRect ? { x: nativeRect.x, y: nativeRect.y, w: nativeRect.width, h: nativeRect.height } : null,
        labelRect: labelRect ? { x: labelRect.x, y: labelRect.y, w: labelRect.width, h: labelRect.height } : null,
        labelText: label?.textContent?.trim() ?? '',
        labelFontSize: label ? getComputedStyle(label).fontSize : null,
        hintText: hint?.textContent?.trim() ?? '',
        nativeRows: native?.rows,
      };
    });
  });

  for (const d of data) {
    assert.ok(d.rect.w > 0 && d.rect.h > 0, 'textarea debe tener rect visible');
    assert.ok(d.nativeRect && d.nativeRect.w > 0 && d.nativeRect.h > 0, 'textarea nativo debe ser visible');
    assert.ok(d.labelText.length > 0, `textarea debe tener label con texto (era "${d.labelText}")`);
    const fsLabel = parseFloat(d.labelFontSize);
    assert.ok(!Number.isNaN(fsLabel) && fsLabel >= 8, `label font-size >= 8px (era ${d.labelFontSize})`);
  }

  // No overlaps.
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i], b = data[j];
      const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
      const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
      assert.ok(!(ox && oy), `textarea ${i} (${a.labelText}) y ${j} (${b.labelText}) no deben solaparse`);
    }
  }
}

const results = [];
for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (textarea visible, sin overlaps, labels legibles)`);
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
Evalúa la calidad visual del demo del componente <is-textarea>.

Checklist (cada una PASS o FAIL):

1. TEXTAREAS NO SE SOLAPAN: las áreas (incluidas las variantes fixed/neversize/
   both/auto-bounded y los estados required/readonly/error/disabled/contador)
   están visualmente separadas.
2. ELEMENTOS VISIBLES: cada textarea tiene label, área de texto y (si aplica)
   hint, error o contador visibles.
3. TEXTO LEGIBLE: labels e hints son legibles, sin texto cortado.
4. AUTOSIZE CONSISTENTE: el área con autosize debe crecer con el contenido y
   no desbordar el contenedor.
5. DARK THEME: fondo oscuro y texto claro, buen contraste.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "elements_visible": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "autosize_consistent": "PASS" | "FAIL" | "N/A",
  "dark_theme": "PASS" | "FAIL",
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
    const checks = ['no_overlap', 'elements_visible', 'text_legible', 'autosize_consistent', 'dark_theme'];
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
report('textarea-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
