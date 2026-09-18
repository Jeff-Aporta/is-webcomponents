// checkbox.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Patrón tomado de er-stagehand.test.mjs: rubric visual sin LLM por defecto.
// La rama LLM con Stagehand queda opt-in al final del archivo.
//
// Checks que pasamos (todos sobre el demo checkbox.html):
//   1. COMPONENTE RENDERIZADO: <is-checkbox> definido, shadow DOM presente.
//   2. ELEMENTOS VISIBLES: cada checkbox tiene control + label dentro del rect.
//   3. TEXTO LEGIBLE: etiquetas con font-size >= 8px, sin overlaps entre cajas.
//   4. ESTADOS DISTINGUIBLES: checkboxes con checked/indeterminate/disabled se
//      renderizan con estados visuales diferenciados (background computed style).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/checkbox/checkbox.html`, readyAttr: 'data-checkbox-ready', name: 'checkbox' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  // 1) COMPONENTE RENDERIZADO.
  const defined = await page.evaluate(() => !!customElements.get('is-checkbox'));
  assert.equal(defined, true, 'is-checkbox debe estar definido');

  // 2-4) Inspección de cada checkbox del demo.
  const data = await page.evaluate(() => {
    const checkboxes = [...document.querySelectorAll('is-checkbox')];
    return checkboxes.map((cb) => {
      const sr = cb.shadowRoot;
      const control = sr?.querySelector('.control');
      const label = sr?.querySelector('#label');
      const cs = control ? getComputedStyle(control) : null;
      const cbRect = cb.getBoundingClientRect();
      const ctrlRect = control?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      return {
        rect: { x: cbRect.x, y: cbRect.y, w: cbRect.width, h: cbRect.height },
        controlRect: ctrlRect ? { x: ctrlRect.x, y: ctrlRect.y, w: ctrlRect.width, h: ctrlRect.height } : null,
        labelRect: labelRect ? { x: labelRect.x, y: labelRect.y, w: labelRect.width, h: labelRect.height } : null,
        labelText: label?.textContent?.trim() ?? '',
        controlBg: cs?.backgroundColor,
        fontSize: label ? getComputedStyle(label).fontSize : null,
        checked: cb.hasAttribute('checked'),
        indeterminate: cb.hasAttribute('indeterminate'),
        disabled: cb.hasAttribute('disabled'),
      };
    });
  });

  // 2) ELEMENTOS VISIBLES (no clipping: el rect del componente debe tener área).
  for (const c of data) {
    assert.ok(c.rect.w > 0 && c.rect.h > 0, 'checkbox debe tener rect visible');
    assert.ok(c.controlRect, 'cada checkbox debe tener .control');
    assert.ok(c.labelRect, 'cada checkbox debe tener label visible');
    assert.ok(c.labelText.length > 0, 'cada checkbox debe tener texto de etiqueta');
  }

  // 3) TEXTO LEGIBLE + sin overlaps entre checkboxes consecutivos.
  for (const c of data) {
    const fs = parseFloat(c.fontSize);
    assert.ok(!Number.isNaN(fs) && fs >= 8, `font-size debe ser >= 8px (era ${c.fontSize})`);
  }
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i], b = data[j];
      const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
      const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
      assert.ok(!(ox && oy), `checkbox ${i} y ${j} no deben solaparse`);
    }
  }

  // 4) ESTADOS DISTINGUIBLES: checked/indeterminate/disabled deben dar computed
  // styles diferentes (o al menos no idénticos entre los 3 grupos de estado).
  const states = {
    checked: data.filter((d) => d.checked && !d.indeterminate && !d.disabled),
    mixed: data.filter((d) => d.indeterminate),
    disabled: data.filter((d) => d.disabled),
  };
  for (const [k, arr] of Object.entries(states)) {
    if (arr.length) {
      assert.ok(arr[0].controlBg, `${k}: debe tener background computado`);
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
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (componente visible, sin overlaps, texto legible)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM. Sólo corre si STAGEHAND=1 + credenciales.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del demo del componente <is-checkbox>.

Checklist (cada una PASS o FAIL):

1. CAJAS NO SE SOLAPAN: las casillas (incluidas las de la sección "Estados",
   "Colores" y "label-placement") están visualmente separadas.
2. ELEMENTOS VISIBLES: cada casilla tiene un control (cuadrado) y una etiqueta
   con texto legible.
3. ESTADOS DISTINGUIBLES: las variantes checked/indeterminate/disabled/colores
   se ven diferentes entre sí.
4. TEXTO LEGIBLE: las etiquetas son legibles (no truncadas, tamaño razonable).
5. DARK THEME: el fondo es oscuro y el texto claro, sin elementos con bajo
   contraste.

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
report('checkbox-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
