// marks-waterfall.stagehand.test.mjs — visual rubric determinista (Playwright puro).
// Cero LLM, cero API keys — solo geometría y atributos del SVG. marks-waterfall
// es un utility bundle: waterfallBars (pura) + drawWaterfallMarks (ctx). El
// demo pinta <is-waterfall-chart> en vivo y además muestra el JSON de la
// función pura y el listado de exports en dos <pre>.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/marks-waterfall/marks-waterfall.html`,
  readyAttr: 'data-marks-waterfall-ready',
  name: 'marks-waterfall',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const pres = [...document.querySelectorAll('pre')];
    const presText = pres.map((p) => (p.textContent ?? '').trim());
    const wf = document.querySelector('is-waterfall-chart');
    const svg = wf?.shadowRoot?.querySelector('svg');
    const svgRect = svg?.getBoundingClientRect();
    const marks = [...(wf?.shadowRoot?.querySelectorAll('.mark') ?? [])].map((m) => {
      const r = m.getBoundingClientRect();
      return {
        tag: m.tagName.toLowerCase(),
        cls: m.getAttribute('class') ?? '',
        x: r.x, y: r.y, w: r.width, h: r.height,
        d: m.getAttribute('d') ?? m.getAttribute('cx') ?? '',
      };
    });
    const connectors = [...(wf?.shadowRoot?.querySelectorAll('.waterfall-connector') ?? [])];
    const texts = [...(wf?.shadowRoot?.querySelectorAll('text') ?? [])].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
    }));
    return {
      presCount: pres.length,
      presText,
      svgRect: svgRect ? { w: svgRect.width, h: svgRect.height } : null,
      marks,
      connectors: connectors.length,
      texts,
    };
  });

  // (1) Estructura del DOM — el demo debe tener 2 <pre> + el chart embebido.
  assert.ok(data.presCount >= 2, `esperaba >=2 <pre>, hay ${data.presCount}`);
  // El primer <pre> lista los exports; debe mencionar ambos nombres.
  const exportsPre = data.presText[0] ?? '';
  assert.ok(exportsPre.includes('waterfallBars'), `<pre id="exports"> debe mencionar waterfallBars (got "${exportsPre.slice(0, 80)}...")`);
  assert.ok(exportsPre.includes('drawWaterfallMarks'), `<pre id="exports"> debe mencionar drawWaterfallMarks`);
  // El segundo <pre> lista el resultado de waterfallBars([1200, 850, -420, -180, null], [0, 4]).
  const barsPre = data.presText[1] ?? '';
  assert.ok(barsPre.includes('"kind"'), `<pre id="bars"> debe contener el campo kind`);
  assert.ok(barsPre.includes('"total"'), `<pre id="bars"> debe contener el kind "total"`);
  assert.ok(barsPre.includes('"up"'), `<pre id="bars"> debe contener el kind "up"`);
  assert.ok(barsPre.includes('"down"'), `<pre id="bars"> debe contener el kind "down"`);

  // (2) El chart vivo debe estar montado y dimensionado.
  assert.ok(data.svgRect, 'is-waterfall-chart debe haber montado SVG');
  assert.ok(data.svgRect.w > 100 && data.svgRect.h > 100, `SVG debe dimensionarse (got ${data.svgRect.w}x${data.svgRect.h})`);

  // (3) Marcas válidas — todas con d no vacío.
  const broken = data.marks.filter((m) => !m.d || m.d.length < 2);
  assert.equal(broken.length, 0, `${data.marks.length - broken.length}/${data.marks.length} marks con path válido`);

  // (4) Texto legible — sin textos vacíos ni < 6px.
  const empty = data.texts.filter((t) => !t.text);
  const tooSmall = data.texts.filter((t) => t.fontSize && Number(t.fontSize) < 6);
  assert.equal(empty.length, 0, `textos vacíos: ${empty.length}`);
  assert.equal(tooSmall.length, 0, `textos < 6px: ${tooSmall.length}`);

  // (5) Geometría específica de waterfall — 5 marks + 4 conectores entre barras.
  const wfMarks = data.marks.filter((m) => m.cls.includes('mark-waterfall'));
  assert.equal(wfMarks.length, 5, `esperaba 5 .mark-waterfall, hay ${wfMarks.length}`);
  assert.equal(data.connectors, 4, `esperaba 4 .waterfall-connector entre 5 barras, hay ${data.connectors}`);

  // (6) Cada barra debe tener altura y ancho > 0 y encajar en el SVG.
  const sr = data.svgRect;
  for (const b of wfMarks) {
    assert.ok(b.h > 0, `barra con altura 0 en (${b.x.toFixed(1)},${b.y.toFixed(1)})`);
    assert.ok(b.w > 0, `barra con ancho 0 en (${b.x.toFixed(1)},${b.y.toFixed(1)})`);
    const inside =
      b.x >= 0 && b.x + b.w <= sr.w + 1 &&
      b.y >= 0 && b.y + b.h <= sr.h + 1;
    assert.equal(inside, true, `barra en (${b.x.toFixed(1)},${b.y.toFixed(1)}) sale del SVG`);
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
