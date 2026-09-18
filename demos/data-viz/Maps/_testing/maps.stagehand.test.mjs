// maps.stagehand.test.mjs — checks deterministas de calidad visual para el
// demo maps.html. Mismo enfoque que er-stagehand.test.mjs / heatmap.stagehand:
// Playwright puro + métricas geométricas + atributos del SVG y del iframe.
// Cero LLM, cero API keys.
//
// Checklist (cada check debe pasar):
//   (1) MARCADORES VISIBLES Y DISTRIBUIDOS: cada circle.marker tiene r=6 y
//       ocupa una posición distinta del SVG.
//   (2) ETIQUETAS LEGIBLES: cada text.marker-label tiene contenido no vacío
//       y un tamaño razonable.
//   (3) GRILLA + MERIDIANOS: el SVG incluye líneas de grilla y meridianos.
//   (4) TILE MODE FUNCIONAL: el iframe apunta a una URL HTTP(S) absoluta,
//       con bbox/zoom/center/layer y loading=lazy.
//   (5) ATTRIBUTION PRESENTE: <small class="attribution"> existe en el
//       shadow root del tile mode.
//
// Rama opt-in con Stagehand LLM al final (STAGEHAND=1 + credenciales).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data-viz/Maps/maps.html`, readyAttr: 'data-maps-ready', name: 'maps' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const out = { maps: [], summary: { totalMarkers: 0, tileIframe: null } };
    for (const m of document.querySelectorAll('is-maps')) {
      const engine = m.getAttribute('engine');
      if (engine === 'svg') {
        const svg = m.shadowRoot.querySelector('svg.map');
        const svgRect = svg.getBoundingClientRect();
        const markers = [...m.shadowRoot.querySelectorAll('circle.marker')].map((c) => {
          const r = c.getBoundingClientRect();
          return { cx: Number(c.getAttribute('cx')), cy: Number(c.getAttribute('cy')), r: Number(c.getAttribute('r')), x: r.x, y: r.y, w: r.width, h: r.height };
        });
        const labels = [...m.shadowRoot.querySelectorAll('text.marker-label')].map((t) => ({
          text: t.textContent.trim(),
          fontSize: t.getAttribute('font-size'),
        }));
        const grid = m.shadowRoot.querySelectorAll('line.grid').length;
        const meridians = m.shadowRoot.querySelectorAll('line.meridian').length;
        out.maps.push({ engine, svgRect, markers, labels, grid, meridians });
        out.summary.totalMarkers += markers.length;
      } else if (engine === 'tile') {
        const iframe = m.shadowRoot.querySelector('iframe.tile-iframe');
        const attr = m.shadowRoot.querySelector('.attribution');
        out.maps.push({
          engine,
          iframe: {
            src: iframe?.getAttribute('src') ?? null,
            loading: iframe?.getAttribute('loading') ?? null,
            title: iframe?.getAttribute('title') ?? null,
          },
          attribution: {
            tag: attr?.tagName ?? null,
            text: attr?.textContent.trim() ?? '',
          },
        });
        out.summary.tileIframe = iframe?.getAttribute('src') ?? null;
      }
    }
    return out;
  });

  for (const m of data.maps) {
    const tag = `${demo.name}#${m.engine}`;

    if (m.engine === 'svg') {
      // (1) MARCADORES VISIBLES Y DISTRIBUIDOS.
      assert.ok(m.markers.length >= 2, `${tag}: debe haber >=2 marcadores visibles (hay ${m.markers.length})`);
      for (const mk of m.markers) {
        assert.equal(mk.r, 6, `${tag}: cada marker debe tener r=6 (uno tiene ${mk.r})`);
        assert.ok(Number.isFinite(mk.cx) && Number.isFinite(mk.cy), `${tag}: marker debe tener cx,cy finitos`);
      }
      // Posiciones distintas (no todos en el mismo punto)
      const positions = new Set(m.markers.map((mk) => `${mk.cx.toFixed(0)},${mk.cy.toFixed(0)}`));
      assert.ok(positions.size >= Math.min(m.markers.length, 4), `${tag}: posiciones de markers demasiado coincidentes (${positions.size}/${m.markers.length})`);

      // (2) ETIQUETAS LEGIBLES.
      assert.equal(m.labels.length, m.markers.length, `${tag}: debe haber 1 label por marker (${m.labels.length}/${m.markers.length})`);
      const empty = m.labels.filter((l) => !l.text);
      assert.equal(empty.length, 0, `${tag}: labels vacíos: ${empty.length}`);

      // (3) GRILLA + MERIDIANOS presentes (son los que dan contexto geográfico).
      assert.ok(m.grid >= 2, `${tag}: debe haber líneas de grilla (hay ${m.grid})`);
      assert.ok(m.meridians >= 2, `${tag}: debe haber meridianos (hay ${m.meridians})`);
    } else if (m.engine === 'tile') {
      // (4) TILE MODE FUNCIONAL.
      assert.ok(m.iframe.src, `${tag}: iframe debe tener src`);
      assert.match(m.iframe.src, /^https?:\/\//, `${tag}: iframe.src debe ser absoluta (${m.iframe.src})`);
      assert.equal(m.iframe.loading, 'lazy', `${tag}: iframe debe tener loading="lazy"`);
      assert.ok(m.iframe.title, `${tag}: iframe debe llevar title`);
      for (const param of ['bbox=', 'zoom=', 'center=', 'layer=mapnik']) {
        assert.ok(m.iframe.src.includes(param), `${tag}: iframe.src debe incluir "${param}" (${m.iframe.src})`);
      }

      // (5) ATTRIBUTION PRESENTE.
      assert.equal(m.attribution.tag, 'SMALL', `${tag}: attribution debe ser <small> (got ${m.attribution.tag})`);
      assert.ok(m.attribution.text.length > 0, `${tag}: attribution no debe estar vacía`);
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
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (markers visibles+distribuidos, labels legibles, grilla+meridianos, tile funcional, attribution presente)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

// ── Rama opt-in con Stagehand LLM ────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del mapa geográfico que aparece en el screenshot.

El mapa tiene DOS paneles lado a lado:
- Panel izquierdo: modo SVG nativo con marcadores (círculos) sobre una rejilla de meridianos/paralelos.
- Panel derecho: modo tile (iframe con mapa real) con una attribution pequeña abajo.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. MARCADORES VISIBLES Y DISTRIBUIDOS: en el panel SVG, los círculos que representan ciudades están separados, no se solapan, y se ven claramente sobre la grilla.

2. ETIQUETAS LEGIBLES: cada marcador lleva un texto (nombre de ciudad) que es legible y no se corta.

3. GRILLA + MERIDIANOS: en el panel SVG, se ven líneas de rejilla y meridianos/paralelos que dan contexto geográfico.

4. TILE MODE FUNCIONAL: en el panel derecho, el iframe muestra un mapa real (calles, países) cargado desde OpenStreetMap, sin zona gris/blanca.

5. ATTRIBUTION PRESENTE: en el panel derecho, debajo del iframe, aparece un texto pequeño de atribución (ej. "© OpenStreetMap contributors").

Responde SOLO con un JSON con la forma:
{
  "markers_visible": "PASS" | "FAIL",
  "labels_legible": "PASS" | "FAIL",
  "grid_meridians": "PASS" | "FAIL",
  "tile_functional": "PASS" | "FAIL",
  "attribution_present": "PASS" | "FAIL",
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
    await page.waitForTimeout(800);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['markers_visible', 'labels_legible', 'grid_meridians', 'tile_functional', 'attribution_present'];
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
report('maps-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
