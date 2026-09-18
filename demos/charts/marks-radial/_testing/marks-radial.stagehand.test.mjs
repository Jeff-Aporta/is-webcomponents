// marks-radial.stagehand.test.mjs — visual rubric determinista (Playwright puro).
// Cero LLM, cero API keys — solo geometría y atributos del SVG. Como el
// paquete marks-radial es una utility bundle (sin custom element propio),
// el demo lo invoca indirectamente a través de los wrappers tipados
// <is-pie-chart>, <is-doughnut-chart>, <is-polar-area-chart> y <is-radar-chart>.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/marks-radial/marks-radial.html`,
  readyAttr: 'data-marks-radial-ready',
  name: 'marks-radial',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const wrappers = ['is-pie-chart', 'is-doughnut-chart', 'is-polar-area-chart', 'is-radar-chart'];
    const wrapInfo = {};
    for (const tag of wrappers) {
      const el = document.querySelector(tag);
      if (!el) { wrapInfo[tag] = { present: false }; continue; }
      const svg = el.shadowRoot.querySelector('svg');
      const svgRect = svg?.getBoundingClientRect();
      const slices = [...el.shadowRoot.querySelectorAll('.mark-slice')];
      const radars = [...el.shadowRoot.querySelectorAll('.mark-radar')];
      const points = [...el.shadowRoot.querySelectorAll('.mark-point')];
      const marks = [...el.shadowRoot.querySelectorAll('.mark')];
      const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => ({
        text: (t.textContent ?? '').trim(),
        fontSize: t.getAttribute('font-size'),
      }));
      wrapInfo[tag] = {
        present: true,
        svg: !!svg,
        svgRect: svgRect ? { w: svgRect.width, h: svgRect.height } : null,
        slices: slices.length,
        radars: radars.length,
        points: points.length,
        marks: marks.length,
        texts: texts.length,
        emptyTexts: texts.filter((t) => !t.text).length,
        tooSmallTexts: texts.filter((t) => t.fontSize && Number(t.fontSize) < 6).length,
      };
    }
    const exportsPre = document.getElementById('exports')?.textContent ?? '';
    return { wrapInfo, exportsPre };
  });

  // (1) Cada wrapper debe estar presente y haber renderizado marcas.
  for (const tag of ['is-pie-chart', 'is-doughnut-chart', 'is-polar-area-chart', 'is-radar-chart']) {
    const info = data.wrapInfo[tag];
    assert.equal(info.present, true, `${tag} debe estar presente en el DOM`);
    assert.equal(info.svg, true, `${tag} debe haber montado SVG`);
    assert.ok(info.svgRect.w > 50 && info.svgRect.h > 50, `${tag} SVG debe dimensionarse (got ${info.svgRect.w}x${info.svgRect.h})`);
    assert.ok(info.marks > 0, `${tag} debe tener marcas (got ${info.marks})`);
    assert.equal(info.emptyTexts, 0, `${tag} no debe tener textos vacíos (got ${info.emptyTexts})`);
    assert.equal(info.tooSmallTexts, 0, `${tag} no debe tener textos < 6px (got ${info.tooSmallTexts})`);
  }

  // (2) Conteos esperados por tipo (reflejan los payloads del demo):
  //     pie 3 categorías, doughnut 4, polar 8, radar 1 polígono + 5 puntos.
  assert.equal(data.wrapInfo['is-pie-chart'].slices, 3, 'pie debe tener 3 .mark-slice');
  assert.equal(data.wrapInfo['is-doughnut-chart'].slices, 4, 'doughnut debe tener 4 .mark-slice');
  assert.equal(data.wrapInfo['is-polar-area-chart'].slices, 8, 'polar-area debe tener 8 .mark-slice');
  assert.equal(data.wrapInfo['is-radar-chart'].radars, 1, 'radar debe tener 1 polígono .mark-radar');
  assert.equal(data.wrapInfo['is-radar-chart'].points, 5, 'radar debe tener 5 puntos .mark-point');

  // (3) El <pre id="exports"> debe listar los 4 nombres de draw*.
  for (const name of ['drawPieMarks', 'drawDoughnutMarks', 'drawPolarAreaMarks', 'drawRadarMarks']) {
    assert.ok(
      data.exportsPre.includes(name),
      `<pre> de exports debe mencionar ${name} (got "${data.exportsPre.slice(0, 80)}...")`,
    );
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
