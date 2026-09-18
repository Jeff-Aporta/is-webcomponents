// waterfall-chart.stagehand.test.mjs — visual rubric determinista (Playwright puro).
// Cero LLM, cero API keys — solo geometría y atributos del SVG.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/waterfall-chart/waterfall-chart.html`,
  readyAttr: 'data-waterfall-chart-ready',
  name: 'waterfall-chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const el = document.querySelector('is-waterfall-chart');
    const svg = el.shadowRoot.querySelector('svg');
    const svgRect = svg.getBoundingClientRect();
    const marks = [...el.shadowRoot.querySelectorAll('.mark')].map((m) => {
      const r = m.getBoundingClientRect();
      return {
        tag: m.tagName.toLowerCase(),
        cls: m.getAttribute('class') ?? '',
        fill: m.getAttribute('fill') ?? '',
        x: r.x, y: r.y, w: r.width, h: r.height,
        d: m.getAttribute('d') ?? m.getAttribute('cx') ?? '',
      };
    });
    const connectors = [...el.shadowRoot.querySelectorAll('.waterfall-connector')].map((l) => ({
      x1: Number(l.getAttribute('x1') ?? 0),
      y1: Number(l.getAttribute('y1') ?? 0),
      x2: Number(l.getAttribute('x2') ?? 0),
      y2: Number(l.getAttribute('y2') ?? 0),
    }));
    const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
      cls: t.getAttribute('class') ?? '',
    }));
    return { svgRect, marks, texts, connectors };
  });

  // (1) MARCAS LEGIBLES — todos los marks deben tener d/cx no vacío.
  const broken = data.marks.filter((m) => !m.d || m.d.length < 2);
  assert.equal(broken.length, 0, `${data.marks.length - broken.length}/${data.marks.length} marks con path válido`);

  // (2) ENCAJA EN VIEWPORT (CSS pixels).
  for (const m of data.marks) {
    if (m.tag === 'text') continue;
    const sr = data.svgRect;
    const inside =
      m.x >= sr.x - 1 && m.x + m.w <= sr.x + sr.width + 1 &&
      m.y >= sr.y - 1 && m.y + m.h <= sr.y + sr.height + 1;
    if (!inside) {
      throw new Error(`mark ${m.tag} en (${m.x.toFixed(1)},${m.y.toFixed(1)}) se sale del SVG`);
    }
  }

  // (3) TEXTO LEGIBLE — sin textos vacíos ni tamaño < 6.
  const empty = data.texts.filter((t) => !t.text);
  const tooSmall = data.texts.filter((t) => t.fontSize && Number(t.fontSize) < 6);
  assert.equal(empty.length, 0, `textos vacíos: ${empty.length}`);
  assert.equal(tooSmall.length, 0, `textos < 6px: ${tooSmall.length}`);

  // (4) BARRAS DE WATERFALL — debe haber 6 barras con M + L + Z (roundedBarRect).
  const bars = data.marks.filter((m) => m.cls.includes('mark-waterfall'));
  assert.ok(bars.length >= 6, `esperaba >=6 barras, hay ${bars.length}`);
  for (const b of bars) {
    const d = b.d;
    assert.equal(/^M[\s\d.\-]+/.test(d), true, `barra sin M inicial: ${d.slice(0, 30)}…`);
    assert.ok(d.trim().endsWith('Z'), `barra sin cierre Z: ${d.slice(0, 30)}…`);
    assert.ok(b.w > 0, `barra con ancho 0 en (${b.x.toFixed(1)},${b.y.toFixed(1)})`);
    assert.ok(b.h > 0, `barra con altura 0 en (${b.x.toFixed(1)},${b.y.toFixed(1)})`);
  }

  // (5) DISTINCIÓN TOTAL vs DELTA — el demo usa 2 totales ([0,5]) + 4 deltas.
  //     Las barras totales usan el color de la serie (colors[0]) y los deltas
  //     usan success/danger; deben ser distinguibles. Verificamos que los fills
  //     no son todos idénticos (que sería síntoma de un solo kind).
  const fills = bars.map((b) => b.fill);
  const distinct = new Set(fills);
  assert.ok(distinct.size >= 2,
    `esperaba >=2 colores distintos (totales + deltas), hay ${distinct.size}: ${[...distinct].join(', ')}`);

  // (6) CONECTORES — debe haber N-1 conectores entre barras consecutivas.
  assert.equal(data.connectors.length, bars.length - 1,
    `esperaba ${bars.length - 1} conectores, hay ${data.connectors.length}`);
  for (const c of data.connectors) {
    // Los conectores unen el final de una barra con el inicio de la siguiente
    // a la misma altura (mismo y). Tolerancia 8px por el snap a 8px del código.
    assert.ok(Math.abs(c.y1 - c.y2) <= 8,
      `conector no horizontal: y1=${c.y1}, y2=${c.y2}`);
    assert.ok(c.x2 > c.x1, `conector no avanza en X: (${c.x1},${c.y1}) → (${c.x2},${c.y2})`);
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