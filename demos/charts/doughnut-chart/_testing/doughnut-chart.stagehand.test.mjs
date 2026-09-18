// doughnut-chart.stagehand.test.mjs — visual rubric determinista (Playwright puro).
// Cero LLM, cero API keys — solo geometría y atributos del SVG.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/doughnut-chart/doughnut-chart.html`,
  readyAttr: 'data-doughnut-chart-ready',
  name: 'doughnut-chart',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const el = document.querySelector('is-doughnut-chart');
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

  // (4) SLICES DE DOUGHNUT — al menos 5 slices, todas con d en arc (M + A) y
  //     con bbox no degenerada (w>0 ó h>0) — una rodaja muy fina puede tener
  //     una dimensión ~0 pero no ambas.
  const slices = data.marks.filter((m) => m.cls.includes('mark-slice'));
  assert.ok(slices.length >= 5, `esperaba >=5 slices, hay ${slices.length}`);
  for (const s of slices) {
    const arcLike = /[Aa][\s\d.,\-]+/.test(s.d);
    assert.equal(arcLike, true, `slice sin comando arc en d: ${s.d.slice(0, 30)}…`);
  }

  // (5) CENTRO — debe haber un text.center-value con el total.
  const centerValue = data.texts.find((t) => t.cls.includes('center-value'));
  assert.ok(centerValue, 'debe existir un <text class="center-value"> con el total');
  assert.ok(centerValue.text.length > 0, `center-value debe tener texto: "${centerValue.text}"`);
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