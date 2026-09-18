// funnel-chart.stagehand.test.mjs — visual rubric determinista (Playwright puro).
// Cero LLM, cero API keys — solo geometría y atributos del SVG.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/funnel-chart/funnel-chart.html`,
  readyAttr: 'data-funnel-chart-ready',
  name: 'funnel-chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const el = document.querySelector('is-funnel-chart');
    const svg = el.shadowRoot.querySelector('svg');
    const svgRect = svg.getBoundingClientRect();
    const marks = [...el.shadowRoot.querySelectorAll('.mark')].map((m) => {
      const r = m.getBoundingClientRect();
      return {
        tag: m.tagName.toLowerCase(),
        cls: m.getAttribute('class') ?? '',
        x: r.x, y: r.y, w: r.width, h: r.height,
        d: m.getAttribute('d') ?? m.getAttribute('cx') ?? '',
      };
    });
    const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => ({
      text: (t.textContent ?? '').trim(),
      fontSize: t.getAttribute('font-size'),
      cls: t.getAttribute('class') ?? '',
    }));
    return { svgRect, marks, texts };
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

  // (4) BANDAS DE FUNNEL — debe haber 5 trapezoides con M + 3×L + Z.
  const bands = data.marks.filter((m) => m.cls.includes('mark-funnel'));
  assert.ok(bands.length >= 5, `esperaba >=5 bandas, hay ${bands.length}`);
  for (const b of bands) {
    const d = b.d;
    const lCount = (d.match(/L/g) ?? []).length;
    assert.equal(/^M[\s\d.\-]+/.test(d), true, `banda sin M inicial: ${d.slice(0, 30)}…`);
    assert.ok(lCount >= 3, `banda sin 3+ L (tiene ${lCount}): ${d.slice(0, 30)}…`);
    assert.ok(d.trim().endsWith('Z'), `banda sin cierre Z: ${d.slice(0, 30)}…`);
  }

  // (5) LABELS Y VALUES — cada paso debe tener un label y un value a los lados.
  const labels = data.texts.filter((t) => t.cls.includes('funnel-label'));
  const values = data.texts.filter((t) => t.cls.includes('funnel-value'));
  assert.equal(labels.length, bands.length,
    `debe haber 1 label por banda (bandas=${bands.length}, labels=${labels.length})`);
  assert.equal(values.length, bands.length,
    `debe haber 1 value por banda (bandas=${bands.length}, values=${values.length})`);
  // Los values deben contener el % del dropPct (al menos en pasos != primero).
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i].text.includes('%'),
      `value ${i} debe contener dropPct (%): "${values[i].text}"`);
  }

  // (6) GEOMETRÍA TRAPEZOIDAL — los anchos de las bandas deben decrecer
  //     monótonamente (el demo es decreciente 12000→4800→2100→760→184).
  const widths = bands.map((b) => b.w);
  let monotonic = true;
  for (let i = 1; i < widths.length; i++) {
    if (widths[i] >= widths[i - 1]) { monotonic = false; break; }
  }
  assert.equal(monotonic, true,
    `anchos deben decrecer: [${widths.map((w) => w.toFixed(1)).join(', ')}]`);
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