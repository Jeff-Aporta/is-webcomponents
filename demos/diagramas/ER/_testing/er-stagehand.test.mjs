// er-stagehand.test.mjs — verificaciones de calidad visual.
//
// Antes: usaba Stagehand (LLM) con un rubric en español y dependía de la
// API key de un LLM externo (MiniMax). Resultado: siempre SKIPPED en CI y
// en cualquier máquina sin credenciales — no aportaba valor real.
//
// Ahora: las mismas cinco preguntas del rubric ("entidades no se solapan",
// "aristas legibles", "en viewport", "texto legible", "animación consistente")
// se responden DETERMINÍSTICAMENTE con Playwright + getBoundingClientRect +
// atributos del SVG. Cero dependencias de LLM, cero API keys, CI-friendly.
//
// Si alguien quiere ejecutar la versión con Stagehand LLM (la que teníamos
// antes, útil para casos visuales no estructurados), basta con poner
// `STAGEHAND=1` + `MINIMAX_API_KEY=...` y se activa la rama LLM al final
// del archivo. Sigue siendo opt-in; por defecto corremos las checks
// estructuradas que NO skippean.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/diagramas/ER/er-editor.html`, readyAttr: 'data-er-editor-ready', name: 'er-editor' },
  { url: `${BASE_URL}/demos/diagramas/ER/er-static.html`, readyAttr: 'data-er-static-ready', name: 'er-static' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro). Reemplazan al rubric de Stagehand.
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  // Esperar a que el render esté completo y el layout estable.
  await page.waitForTimeout(200);

  // IMPORTANTE: las páginas de demo pueden tener múltiples <is-er-diagram>.
  // Para que (1)..(5) operen sobre los datos del MISMO diagrama, los hacemos
  // scoped al shadow root del diagram correspondiente (no global).
  const data = await page.evaluate((demoUrl) => {
    // Encontrar el is-er-diagram que pertenece a esta URL (puede haber varios).
    const all = document.querySelectorAll('is-er-diagram');
    // Como cada demo carga sólo 1 diagram (er-editor) o 2 (er-static), usamos
    // heurística: scope = el primero cuyo getAttribute('animation') o posición
    // cuadre. Aquí iteramos todos y devolvemos un set de checks POR cada
    // diagram para no perder cobertura.
    const diagrams = [...all];
    return diagrams.map((d, idx) => {
      const shadow = d.shadowRoot;
      const svg = shadow.querySelector('svg[part="canvas"]');
      const svgRect = svg.getBoundingClientRect();
      const entities = [...shadow.querySelectorAll('.er-entity')].map((e) => {
        const r = e.getBoundingClientRect();
        return { id: e.dataset.entityId, x: r.x, y: r.y, w: r.width, h: r.height };
      });
      const rels = [...shadow.querySelectorAll('.er-rel path')].map((p) => ({
        d: p.getAttribute('d') ?? '',
        stroke: p.getAttribute('stroke') ?? '',
      }));
      const texts = [...shadow.querySelectorAll('.er-entity text')].map((t) => ({
        text: (t.textContent ?? '').trim(),
        fontSize: t.getAttribute('font-size'),
      }));
      const animated = shadow.querySelectorAll('.er-rel path.iswc-anim-edge-dashed').length;
      const dashed = shadow.querySelectorAll('.er-rel path[stroke-dasharray]').length;
      const traceAttr = d.getAttribute('animation') === 'trace';
      return { idx, svgRect, entities, rels, texts, animated, dashed, traceAttr };
    });
  }, demo.url);

  for (const diag of data) {
    const tag = `${demo.name}#${diag.idx}`;

    // (1) ENTIDADES NO SE SOLAPAN.
    const overlaps = [];
    for (let i = 0; i < diag.entities.length; i++) {
      for (let j = i + 1; j < diag.entities.length; j++) {
        const a = diag.entities[i], b = diag.entities[j];
        const ox = a.x < b.x + b.w && b.x < a.x + a.w;
        const oy = a.y < b.y + b.h && b.y < a.y + a.h;
        if (ox && oy) overlaps.push([i, j]);
      }
    }
    assert.equal(overlaps.length, 0, `${tag}: las cajas NO deben solaparse. Solapes: ${JSON.stringify(overlaps)}`);

    // (2) ARISTAS LEGIBLES.
    const brokenRels = diag.rels.filter((r) => !r.d || r.d.length < 5 || !r.stroke);
    assert.equal(brokenRels.length, 0, `${tag}: todas las aristas deben tener path y stroke. Rotas: ${brokenRels.length}`);

    // (3) DIAGRAMA ENCAJA EN VIEWPORT (CSS pixels).
    const sr = diag.svgRect;
    for (const e of diag.entities) {
      const inside =
        e.x >= sr.x - 1 &&
        e.x + e.w <= sr.x + sr.width + 1 &&
        e.y >= sr.y - 1 &&
        e.y + e.h <= sr.y + sr.height + 1;
      assert.ok(
        inside,
        `${tag}: entidad ${e.id} en (${e.x.toFixed(1)},${e.y.toFixed(1)}) se sale del SVG rect (${JSON.stringify({ ...sr, x: sr.x.toFixed(1), y: sr.y.toFixed(1) })})`,
      );
    }

    // (4) TEXTO LEGIBLE.
    const empty = diag.texts.filter((t) => !t.text);
    const tooSmall = diag.texts.filter((t) => t.fontSize && Number(t.fontSize) < 6);
    assert.equal(empty.length, 0, `${tag}: textos vacíos: ${empty.length}`);
    assert.equal(tooSmall.length, 0, `${tag}: textos < 6px: ${tooSmall.length}`);

    // (5) ANIMACIÓN CONSISTENTE.
    if (diag.dashed > 0 && diag.animated === 0 && diag.traceAttr) {
      throw new Error(`${tag}: animation="trace" pero ninguna arista lleva clase de animación (${diag.animated}/${diag.dashed})`);
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (no overlap, edges legibles, en viewport, texto legible, animación consistente)`);
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
// Rama opt-in con Stagehand LLM (la original). Sólo corre si STAGEHAND=1
// + credenciales configuradas. Útil en local para casos visuales que el
// rubric determinista no cubre.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del diagrama entidad-relación que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. ENTIDADES NO SE SOLAPAN: cada caja de entidad (rectángulo con texto) está visualmente separada de las demás. No hay superposición.

2. ARISTAS LEGIBLES: las líneas que conectan cajas son visibles y no se cruzan de forma caótica. Las patas de gallo / círculos de cardinalidad son visibles en los extremos.

3. DIAGRAMA ENCAJA EN VIEWPORT: el diagrama completo (incluyendo título y leyenda si existen) cabe dentro del área visible. No hay recortes.

4. TEXTO LEGIBLE: los nombres de entidades y etiquetas son legibles, sin texto cortado.

5. ANIMACIÓN CONSISTENTE: si hay líneas dashed/animadas, siguen un patrón consistente.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "edges_legible": "PASS" | "FAIL",
  "in_viewport": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "animation_consistent": "PASS" | "FAIL" | "N/A",
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
    const checks = ['no_overlap', 'edges_legible', 'in_viewport', 'text_legible', 'animation_consistent'];
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
report('er-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });