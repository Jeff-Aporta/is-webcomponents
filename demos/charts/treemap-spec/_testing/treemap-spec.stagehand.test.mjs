// treemap-spec.stagehand.test.mjs — visual rubric determinista (Playwright puro).
// Cero LLM, cero API keys — solo geometría y atributos del SVG. treemap-spec
// es un utility bundle: resolveTreemapSpec + computeTreemapLayout. El demo
// pinta <is-treemap> en vivo + muestra tres <pre>: exports, spec, layout.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/treemap-spec/treemap-spec.html`,
  readyAttr: 'data-treemap-spec-ready',
  name: 'treemap-spec',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const pres = [...document.querySelectorAll('pre')];
    const presText = pres.map((p) => (p.textContent ?? '').trim());
    const tm = document.querySelector('is-treemap');
    const svg = tm?.shadowRoot?.querySelector('svg');
    const svgRect = svg?.getBoundingClientRect();
    const groups = [...(tm?.shadowRoot?.querySelectorAll('.tm-node') ?? [])];
    const rects = groups.map((g) => {
      const r = g.querySelector('rect.tm-node__rect');
      const bb = r?.getBoundingClientRect();
      return {
        id: g.dataset.nodeId ?? null,
        x: Number(r?.getAttribute('x') ?? 0),
        y: Number(r?.getAttribute('y') ?? 0),
        w: Number(r?.getAttribute('width') ?? 0),
        h: Number(r?.getAttribute('height') ?? 0),
        bbW: bb?.width ?? 0,
        bbH: bb?.height ?? 0,
      };
    });
    const texts = [...(tm?.shadowRoot?.querySelectorAll('text') ?? [])].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return {
      presCount: pres.length,
      presText,
      svgRect: svgRect ? { w: svgRect.width, h: svgRect.height } : null,
      nodes: groups.length,
      rects,
      texts,
    };
  });

  // (1) Estructura del DOM — el demo debe tener 3 <pre> (exports, spec, layout)
  //     + el treemap embebido.
  assert.ok(data.presCount >= 3, `esperaba >=3 <pre>, hay ${data.presCount}`);
  const exportsPre = data.presText[0] ?? '';
  const specPre = data.presText[1] ?? '';
  const layoutPre = data.presText[2] ?? '';
  assert.ok(exportsPre.includes('resolveTreemapSpec'), `<pre id="exports"> debe mencionar resolveTreemapSpec`);
  assert.ok(exportsPre.includes('computeTreemapLayout'), `<pre id="exports"> debe mencionar computeTreemapLayout`);
  assert.ok(specPre.includes('"id"') && specPre.includes('"value"'), `<pre id="spec"> debe contener los campos id y value`);
  assert.ok(layoutPre.includes('"width"') && layoutPre.includes('"height"') && layoutPre.includes('"total"'),
    `<pre id="layout"> debe contener width, height y total`);

  // (2) El chart vivo debe estar montado y dimensionado.
  assert.ok(data.svgRect, 'is-treemap debe haber montado SVG');
  assert.ok(data.svgRect.w > 200 && data.svgRect.h > 100, `SVG debe dimensionarse (got ${data.svgRect.w}x${data.svgRect.h})`);

  // (3) Conteos esperados — el payload del demo declara 4 nodos top-level.
  assert.equal(data.nodes, 4, `esperaba 4 .tm-node, hay ${data.nodes}`);
  assert.equal(data.rects.length, 4, 'debe haber 4 rects');

  // (4) Cada rect debe tener w/h > 0 y estar dentro del SVG.
  for (const r of data.rects) {
    assert.ok(r.w > 0 && r.h > 0, `nodo ${r.id} debe tener w/h > 0 (got ${r.w}x${r.h})`);
    assert.ok(r.x >= 0 && r.y >= 0, `nodo ${r.id} debe tener x/y >= 0 (got ${r.x},${r.y})`);
  }

  // (5) Texto legible — sin textos vacíos ni < 6px.
  const empty = data.texts.filter((t) => !t.text);
  const tooSmall = data.texts.filter((t) => t.fontSize && Number(t.fontSize) < 6);
  assert.equal(empty.length, 0, `textos vacíos: ${empty.length}`);
  assert.equal(tooSmall.length, 0, `textos < 6px: ${tooSmall.length}`);

  // (6) Sin solapamientos groseros — cada rect con x+w debe estar <= ancho SVG.
  for (const r of data.rects) {
    const ok = r.x + r.w <= data.svgRect.w + 1 && r.y + r.h <= data.svgRect.h + 1;
    assert.equal(ok, true, `nodo ${r.id} (${r.x},${r.y},${r.w},${r.h}) se sale del SVG (${data.svgRect.w}x${data.svgRect.h})`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}
await close({ browser, page });
report(DEMO.name, true);

// Stagehand opt-in (LLM visual rubric). Solo corre si STAGEHAND=1.
if (process.env.STAGEHAND === '1') {
  const sh = await maybeStagehand();
  if (sh) {
    console.log(`  (STAGEHAND=1 — visual rubric LLM correría aquí si hay key)`);
    await sh.close?.().catch(() => {});
  }
}
