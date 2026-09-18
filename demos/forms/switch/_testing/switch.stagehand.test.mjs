// switch.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Checks:
//   1. COMPONENTE RENDERIZADO: <is-switch> definido, shadow DOM, role=switch.
//   2. ELEMENTOS VISIBLES: track + thumb + label visibles por cada switch.
//   3. TEXTO LEGIBLE: labels con font-size >= 8px.
//   4. SIN OVERLAPS: los switches no se solapan entre sí.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/switch/switch.html`, readyAttr: 'data-switch-ready', name: 'switch' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const defined = await page.evaluate(() => !!customElements.get('is-switch'));
  assert.equal(defined, true, 'is-switch debe estar definido');

  const data = await page.evaluate(() => {
    const sws = [...document.querySelectorAll('is-switch')];
    return sws.map((sw) => {
      const sr = sw.shadowRoot;
      const control = sr?.querySelector('.control');
      const thumb = sr?.querySelector('.thumb');
      const label = sr?.querySelector('#label');
      const swRect = sw.getBoundingClientRect();
      const ctrlRect = control?.getBoundingClientRect();
      const thumbRect = thumb?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      return {
        rect: { x: swRect.x, y: swRect.y, w: swRect.width, h: swRect.height },
        ctrlRect: ctrlRect ? { x: ctrlRect.x, y: ctrlRect.y, w: ctrlRect.width, h: ctrlRect.height } : null,
        thumbRect: thumbRect ? { x: thumbRect.x, y: thumbRect.y, w: thumbRect.width, h: thumbRect.height } : null,
        labelRect: labelRect ? { x: labelRect.x, y: labelRect.y, w: labelRect.width, h: labelRect.height } : null,
        labelText: label?.textContent?.trim() ?? '',
        labelFontSize: label ? getComputedStyle(label).fontSize : null,
        role: sw.getAttribute('role'),
        checked: sw.hasAttribute('checked'),
      };
    });
  });

  for (const d of data) {
    assert.equal(d.role, 'switch', 'cada switch debe tener role=switch');
    assert.ok(d.rect.w > 0 && d.rect.h > 0, 'switch debe tener rect visible');
    assert.ok(d.ctrlRect && d.ctrlRect.w > 0, 'switch debe tener .control visible');
    assert.ok(d.thumbRect && d.thumbRect.w > 0, 'switch debe tener thumb visible');
    assert.ok(d.labelText.length > 0, 'switch debe tener label con texto');
    const fsLabel = parseFloat(d.labelFontSize);
    assert.ok(!Number.isNaN(fsLabel) && fsLabel >= 8, `label font-size >= 8px`);
  }

  // No overlaps.
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i], b = data[j];
      const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
      const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
      assert.ok(!(ox && oy), `switch ${i} y ${j} no deben solaparse`);
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
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (switch visible, sin overlaps, labels legibles)`);
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
Evalúa la calidad visual del demo del componente <is-switch>.

Checklist (cada una PASS o FAIL):

1. SWITCHES NO SE SOLAPAN: los interruptores (incluidos los de las secciones
   "Estados", "Colores" y "on-label/off-label") están visualmente separados.
2. ELEMENTOS VISIBLES: cada switch tiene track, thumb y label visibles. El
   thumb es claramente distinguible del track.
3. ESTADOS DISTINGUIBLES: las variantes checked/disabled/colores se ven
   diferentes entre sí.
4. TEXTO LEGIBLE: las etiquetas son legibles.
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
report('switch-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
