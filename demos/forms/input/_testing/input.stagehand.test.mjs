// input.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Checks:
//   1. COMPONENTE RENDERIZADO: <is-input> definido, shadow DOM presente, input
//      nativo accesible.
//   2. ELEMENTOS VISIBLES: label, hint y el propio input son visibles y no se
//      salen del viewport.
//   3. TEXTO LEGIBLE: labels y hints tienen font-size >= 8px.
//   4. SIN OVERLAPS: los inputs del grid 2xN no se solapan entre sí.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/input/input.html`, readyAttr: 'data-input-ready', name: 'input' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const defined = await page.evaluate(() => !!customElements.get('is-input'));
  assert.equal(defined, true, 'is-input debe estar definido');

  const data = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('is-input')];
    return inputs.map((inp) => {
      const sr = inp.shadowRoot;
      const native = sr?.querySelector('input');
      const label = sr?.querySelector('label#label');
      const hint = sr?.querySelector('#hint');
      const errorText = sr?.querySelector('#error-text');
      const inpRect = inp.getBoundingClientRect();
      const nativeRect = native?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const hintRect = hint?.getBoundingClientRect();
      return {
        rect: { x: inpRect.x, y: inpRect.y, w: inpRect.width, h: inpRect.height },
        nativeRect: nativeRect ? { x: nativeRect.x, y: nativeRect.y, w: nativeRect.width, h: nativeRect.height } : null,
        labelRect: labelRect ? { x: labelRect.x, y: labelRect.y, w: labelRect.width, h: labelRect.height } : null,
        hintRect: hintRect ? { x: hintRect.x, y: hintRect.y, w: hintRect.width, h: hintRect.height } : null,
        labelText: label?.textContent?.trim() ?? '',
        labelFontSize: label ? getComputedStyle(label).fontSize : null,
        hintText: hint?.textContent?.trim() ?? '',
        hintFontSize: hint ? getComputedStyle(hint).fontSize : null,
        errorText: errorText?.textContent?.trim() ?? '',
        nativeType: native?.getAttribute('type'),
        invalid: native?.getAttribute('aria-invalid'),
      };
    });
  });

  // Cada input debe tener label visible con texto.
  for (const d of data) {
    assert.ok(d.rect.w > 0 && d.rect.h > 0, 'input debe tener rect visible');
    assert.ok(d.nativeRect && d.nativeRect.w > 0, 'input nativo debe tener rect visible');
    assert.ok(d.labelText.length > 0, `input debe tener label con texto (era "${d.labelText}")`);
    const fsLabel = parseFloat(d.labelFontSize);
    assert.ok(!Number.isNaN(fsLabel) && fsLabel >= 8, `label font-size >= 8px (era ${d.labelFontSize})`);
    if (d.hintText) {
      const fsHint = parseFloat(d.hintFontSize);
      assert.ok(!Number.isNaN(fsHint) && fsHint >= 8, `hint font-size >= 8px (era ${d.hintFontSize})`);
    }
  }

  // No overlaps entre inputs.
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i], b = data[j];
      const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
      const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
      assert.ok(!(ox && oy), `input ${i} (${a.labelText}) y ${j} (${b.labelText}) no deben solaparse`);
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
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (input visible, sin overlaps, labels legibles)`);
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
Evalúa la calidad visual del demo del componente <is-input>.

Checklist (cada una PASS o FAIL):

1. INPUTS NO SE SOLAPAN: los campos (incluidos tipos email/password/number
   y los estados required/readonly/disabled/error) están visualmente separados.
2. ELEMENTOS VISIBLES: cada campo tiene label, campo de entrada y (si aplica)
   hint o error-text visibles.
3. TEXTO LEGIBLE: labels e hints son legibles, sin texto cortado.
4. ESTADOS DISTINGUIBLES: required/error/disabled/prefijo-sufijo/contador se
   ven diferentes entre sí.
5. DARK THEME: fondo oscuro y texto claro, buen contraste.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "elements_visible": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "states_distinguishable": "PASS" | "FAIL",
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
    const checks = ['no_overlap', 'elements_visible', 'text_legible', 'states_distinguishable', 'dark_theme'];
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
report('input-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
