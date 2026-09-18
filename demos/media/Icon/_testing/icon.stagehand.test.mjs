// icon.stagehand.test.mjs — verificaciones de calidad visual (rubric
// determinista + rama LLM opt-in).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_testing/lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/media/Icon/icon.html`, readyAttr: 'data-icon-ready', name: 'icon' },
];

const results = [];

async function checkDeterministic(page, demo) {
  // Esperar a que se resuelvan los iconos (fetch asíncrono).
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const icons = [...document.querySelectorAll('main is-icon')];
    return icons.map((el, idx) => {
      const shadow = el.shadowRoot;
      const wrap = shadow.querySelector('.wrap');
      const wrapRect = wrap?.getBoundingClientRect();
      const svg = shadow.querySelector('.inline svg');
      const hidden = shadow.querySelector('.inline').hasAttribute('hidden');
      const isMulticolor = shadow.querySelector('.inline').classList.contains('is-multicolor');
      const cs = svg ? getComputedStyle(svg) : null;
      return {
        idx,
        iconAttr: el.getAttribute('icon') || `${el.getAttribute('library') || 'mdi'}:${el.getAttribute('name')}`,
        wrapRect,
        hasSvg: !!svg,
        hidden,
        hasMissing: el.hasAttribute('data-missing'),
        isMulticolor,
        fill: cs?.fill || '',
        width: svg?.getAttribute('width'),
        height: svg?.getAttribute('height'),
      };
    });
  });

  for (const i of data) {
    const tag = `${demo.name}#${i.idx}(${i.iconAttr})`;

    // (1) El wrap del icono tiene tamaño no nulo (escala 1em × 1em).
    assert.ok(i.wrapRect && i.wrapRect.width > 0 && i.wrapRect.height > 0, `${tag}: wrap debe tener tamaño (w=${i.wrapRect?.width}, h=${i.wrapRect?.height})`);

    // (2) Si está cargado, width/height son 1em y no está oculto.
    if (i.hasSvg && !i.hidden && !i.hasMissing) {
      assert.equal(i.width, '1em', `${tag}: width debe ser 1em, got "${i.width}"`);
      assert.equal(i.height, '1em', `${tag}: height debe ser 1em, got "${i.height}"`);
      // Si NO es multicolor, debe usar currentColor (fill resuelto).
      if (!i.isMulticolor) {
        // fill computado debe coincidir con el color del contexto (no negro puro).
        assert.notEqual(i.fill, 'rgb(0, 0, 0)', `${tag}: fill debe usar currentColor (got "${i.fill}")`);
      }
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (iconos escalan, currentColor OK)`);
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
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual de los iconos que aparecen en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. ICONOS LEGIBLES: cada icono es visible y reconocible dentro de su caja.

2. CONSISTENCIA DE TAMAÑO: todos los iconos monocromáticos tienen el mismo tamaño aparente.

3. COLOR CONSISTENTE: los iconos monocromáticos comparten el mismo color (currentColor del contexto).

4. NO HAY OVERLAP: los iconos no se superponen entre sí.

5. ENCAJA EN VIEWPORT: todos los iconos caben en su celda/sección.

Responde SOLO con un JSON con la forma:
{
  "icons_legible": "PASS" | "FAIL",
  "size_consistent": "PASS" | "FAIL",
  "color_consistent": "PASS" | "FAIL",
  "no_overlap": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
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
    await page.waitForTimeout(2500); // dar tiempo a los fetches
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['icons_legible', 'size_consistent', 'color_consistent', 'no_overlap', 'in_viewport'];
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
report('icon-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
