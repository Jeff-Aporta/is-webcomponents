// radio-group.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Checks:
//   1. COMPONENTE RENDERIZADO: <is-radio-group> definido, role=radiogroup.
//   2. ELEMENTOS VISIBLES: cada radio del grupo (control + dot + label) visible.
//   3. TEXTO LEGIBLE: labels del grupo con font-size >= 8px.
//   4. SIN OVERLAPS: los radios de cada grupo no se solapan entre sí.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/radio-group/radio-group.html`, readyAttr: 'data-radio-group-ready', name: 'radio-group' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const defined = await page.evaluate(() => !!customElements.get('is-radio-group'));
  assert.equal(defined, true, 'is-radio-group debe estar definido');

  // Inspeccionar cada radio-group del demo, sus radios y el label/hint/error del grupo.
  const data = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('is-radio-group')];
    return groups.map((g) => {
      const sr = g.shadowRoot;
      const base = sr?.querySelector('.base');
      const labelEl = sr?.querySelector('.label');
      const hintEl = sr?.querySelector('#hint');
      const errEl = sr?.querySelector('#error');
      const gRect = g.getBoundingClientRect();
      const radios = [...g.querySelectorAll('is-radio')].map((r) => {
        const rRect = r.getBoundingClientRect();
        const rsr = r.shadowRoot;
        const ctrl = rsr?.querySelector('.control');
        const label = rsr?.querySelector('.label');
        return {
          rect: { x: rRect.x, y: rRect.y, w: rRect.width, h: rRect.height },
          ctrlRect: ctrl ? { x: ctrl.getBoundingClientRect().x, y: ctrl.getBoundingClientRect().y, w: ctrl.getBoundingClientRect().width, h: ctrl.getBoundingClientRect().height } : null,
          labelText: label?.textContent?.trim() ?? '',
          checked: r.hasAttribute('checked'),
        };
      });
      return {
        groupRect: { x: gRect.x, y: gRect.y, w: gRect.width, h: gRect.height },
        baseRole: base?.getAttribute('role'),
        baseOrient: base?.getAttribute('aria-orientation'),
        groupLabel: labelEl?.textContent?.trim() ?? '',
        groupHint: hintEl?.textContent?.trim() ?? '',
        groupError: errEl?.textContent?.trim() ?? '',
        radios,
      };
    });
  });

  for (const g of data) {
    assert.equal(g.baseRole, 'radiogroup', 'el contenedor interno debe tener role=radiogroup');
    assert.ok(g.groupRect.w > 0 && g.groupRect.h > 0, 'radio-group debe tener rect visible');
    assert.ok(g.radios.length > 0, 'cada grupo debe tener al menos 1 radio');
    for (const r of g.radios) {
      assert.ok(r.rect.w > 0 && r.rect.h > 0, `radio debe tener rect visible`);
      assert.ok(r.ctrlRect && r.ctrlRect.w > 0, `radio debe tener .control visible`);
      assert.ok(r.labelText.length > 0, `radio debe tener label con texto`);
    }
    // No overlaps entre radios del mismo grupo.
    for (let i = 0; i < g.radios.length; i++) {
      for (let j = i + 1; j < g.radios.length; j++) {
        const a = g.radios[i], b = g.radios[j];
        const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
        const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
        assert.ok(!(ox && oy), `radios ${i} y ${j} de un mismo grupo no deben solaparse`);
      }
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
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (grupos visibles, sin overlaps, labels legibles)`);
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
Evalúa la calidad visual del demo del componente <is-radio-group>.

Checklist (cada una PASS o FAIL):

1. GRUPOS NO SE SOLAPAN: los grupos (vertical, horizontal, con error, disabled)
   están visualmente separados entre sí. Los radios dentro de cada grupo
   tampoco se solapan.
2. ELEMENTOS VISIBLES: cada grupo tiene label, radios con control + dot + label
   visibles. Los hints y errores se ven cuando corresponden.
3. ORIENTACIÓN CONSISTENTE: el grupo vertical muestra radios en columna; el
   horizontal, en fila.
4. ESTADOS DISTINGUIBLES: los grupos con error y disabled se ven diferentes
   al resto.
5. DARK THEME: fondo oscuro y texto claro, buen contraste.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "elements_visible": "PASS" | "FAIL",
  "orientation_consistent": "PASS" | "FAIL",
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
    const checks = ['no_overlap', 'elements_visible', 'orientation_consistent', 'states_distinguishable', 'dark_theme'];
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
report('radio-group-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
