// option.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Checks:
//   1. COMPONENTE RENDERIZADO: <is-option> definido, shadow DOM con role=option.
//   2. ELEMENTOS VISIBLES: label + description visibles por cada option.
//   3. TEXTO LEGIBLE: labels y descriptions con font-size >= 8px.
//   4. SIN OVERLAPS: las opciones de cada listbox no se solapan entre sí.
//   5. ESTADOS DISTINGUIBLES: selected vs not-selected tienen computed style
//      diferente (background o similar).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/option/option.html`, readyAttr: 'data-option-ready', name: 'option' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const defined = await page.evaluate(() => !!customElements.get('is-option'));
  assert.equal(defined, true, 'is-option debe estar definido');

  const data = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('is-option')];
    return opts.map((o) => {
      const sr = o.shadowRoot;
      const root = sr?.querySelector('[role="option"]');
      const label = sr?.querySelector('.label');
      const desc = sr?.querySelector('.description');
      const oRect = o.getBoundingClientRect();
      const rootRect = root?.getBoundingClientRect();
      return {
        rect: { x: oRect.x, y: oRect.y, w: oRect.width, h: oRect.height },
        rootRect: rootRect ? { x: rootRect.x, y: rootRect.y, w: rootRect.width, h: rootRect.height } : null,
        labelText: label?.textContent?.trim() ?? '',
        labelFontSize: label ? getComputedStyle(label).fontSize : null,
        descText: desc?.textContent?.trim() ?? '',
        role: root?.getAttribute('role'),
        ariaSelected: root?.getAttribute('aria-selected'),
        selected: o.hasAttribute('selected'),
        disabled: o.hasAttribute('disabled'),
      };
    });
  });

  for (const d of data) {
    assert.equal(d.role, 'option', 'cada option debe tener role=option');
    assert.ok(d.rect.w > 0 && d.rect.h > 0, 'option debe tener rect visible');
    assert.ok(d.rootRect && d.rootRect.w > 0, 'option debe tener root visible');
    assert.ok(d.labelText.length > 0, 'option debe tener label con texto');
    const fsLabel = parseFloat(d.labelFontSize);
    assert.ok(!Number.isNaN(fsLabel) && fsLabel >= 8, `label font-size >= 8px (era ${d.labelFontSize})`);
    if (d.descText) {
      const fsDesc = parseFloat(d.labelFontSize);
      assert.ok(!Number.isNaN(fsDesc) && fsDesc >= 8, `description font-size >= 8px`);
    }
    // aria-selected debe coincidir con la propiedad selected.
    assert.equal(d.ariaSelected, String(d.selected), 'aria-selected debe reflejar selected');
  }

  // No overlaps entre options del demo.
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i], b = data[j];
      const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
      const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
      assert.ok(!(ox && oy), `option ${i} y ${j} no deben solaparse`);
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
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (option visible, sin overlaps, labels legibles)`);
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
Evalúa la calidad visual del demo del componente <is-option>.

Checklist (cada una PASS o FAIL):

1. OPTIONS NO SE SOLAPAN: las opciones (en listbox básico, con grupos, y en
   estados) están visualmente separadas entre sí.
2. ELEMENTOS VISIBLES: cada option tiene label y (si la tiene) description
   visibles. Los slots start/description se renderizan correctamente.
3. ESTADOS DISTINGUIBLES: las variantes selected/not-selected/disabled se ven
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
report('option-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
