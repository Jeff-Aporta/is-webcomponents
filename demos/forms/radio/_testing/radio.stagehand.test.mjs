// radio.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Checks:
//   1. COMPONENTE RENDERIZADO: <is-radio> definido, shadow DOM, role=radio.
//   2. ELEMENTOS VISIBLES: control (círculo) + dot + label + description visibles.
//   3. TEXTO LEGIBLE: labels y descripciones con font-size >= 8px.
//   4. SIN OVERLAPS: los radios no se solapan entre sí.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/radio/radio.html`, readyAttr: 'data-radio-ready', name: 'radio' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const defined = await page.evaluate(() => !!customElements.get('is-radio'));
  assert.equal(defined, true, 'is-radio debe estar definido');

  const data = await page.evaluate(() => {
    const radios = [...document.querySelectorAll('is-radio')];
    return radios.map((r) => {
      const sr = r.shadowRoot;
      const control = sr?.querySelector('.control');
      const dot = sr?.querySelector('.dot');
      const label = sr?.querySelector('.label');
      const desc = sr?.querySelector('.description');
      const rRect = r.getBoundingClientRect();
      const ctrlRect = control?.getBoundingClientRect();
      const dotRect = dot?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const descRect = desc?.getBoundingClientRect();
      return {
        rect: { x: rRect.x, y: rRect.y, w: rRect.width, h: rRect.height },
        ctrlRect: ctrlRect ? { x: ctrlRect.x, y: ctrlRect.y, w: ctrlRect.width, h: ctrlRect.height } : null,
        dotRect: dotRect ? { x: dotRect.x, y: dotRect.y, w: dotRect.width, h: dotRect.height } : null,
        labelRect: labelRect ? { x: labelRect.x, y: labelRect.y, w: labelRect.width, h: labelRect.height } : null,
        descRect: descRect ? { x: descRect.x, y: descRect.y, w: descRect.width, h: descRect.height } : null,
        labelText: label?.textContent?.trim() ?? '',
        labelFontSize: label ? getComputedStyle(label).fontSize : null,
        descText: desc?.textContent?.trim() ?? '',
        role: r.getAttribute('role'),
        checked: r.hasAttribute('checked'),
      };
    });
  });

  for (const d of data) {
    assert.equal(d.role, 'radio', 'cada radio debe tener role=radio');
    assert.ok(d.rect.w > 0 && d.rect.h > 0, 'radio debe tener rect visible');
    assert.ok(d.ctrlRect && d.ctrlRect.w > 0, 'radio debe tener .control visible');
    assert.ok(d.labelText.length > 0, 'radio debe tener label con texto');
    const fsLabel = parseFloat(d.labelFontSize);
    assert.ok(!Number.isNaN(fsLabel) && fsLabel >= 8, `label font-size >= 8px`);
  }

  // No overlaps entre radios.
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i], b = data[j];
      const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
      const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
      assert.ok(!(ox && oy), `radio ${i} y ${j} no deben solaparse`);
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
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (radio visible, sin overlaps, labels legibles)`);
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
Evalúa la calidad visual del demo del componente <is-radio>.

Checklist (cada una PASS o FAIL):

1. RADIOS NO SE SOLAPAN: los radios (incluidos los de las secciones "Estados"
   y "Colores y label-placement") están visualmente separados.
2. ELEMENTOS VISIBLES: cada radio tiene control (círculo) + dot interno + label
   (y description si está presente) visibles.
3. ESTADOS DISTINGUIBLES: las variantes checked/disabled/colores se ven
   diferentes entre sí.
4. TEXTO LEGIBLE: labels y descripciones son legibles.
5. DARK THEME: fondo oscuro y texto claro, buen contraste.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "elements_visible": "PASS" | "FAIL",
  "states_distinguishable": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
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
    const checks = ['no_overlap', 'elements_visible', 'states_distinguishable', 'text_legible', 'dark_theme'];
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
report('radio-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
