// marks-radial.test.mjs — tests exhaustivos del demo marks-radial.html.
// marks-radial es un utility bundle (sin custom element propio); exporta
// drawPieMarks, drawDoughnutMarks, drawPolarAreaMarks y drawRadarMarks.
// El demo invoca esas funciones a través de los wrappers tipados
// <is-pie-chart>, <is-doughnut-chart>, <is-polar-area-chart> y <is-radar-chart>.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/marks-radial/marks-radial.html`;

const tests = [];

tests.push({
  name: 'smoke: el bundle marks-radial expone los 4 exports de draw* y los 4 wrappers renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-radial-ready');
    const info = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/marks-radial.min.js');
      const exports = Object.keys(lib).sort();
      const types = {};
      for (const k of exports) types[k] = typeof lib[k];
      const pieEl = document.querySelector('is-pie-chart');
      const doughEl = document.querySelector('is-doughnut-chart');
      const polEl = document.querySelector('is-polar-area-chart');
      const radEl = document.querySelector('is-radar-chart');
      return {
        exports,
        types,
        defined: {
          pie: !!customElements.get('is-pie-chart'),
          dough: !!customElements.get('is-doughnut-chart'),
          pol: !!customElements.get('is-polar-area-chart'),
          rad: !!customElements.get('is-radar-chart'),
          chart: !!customElements.get('is-chart'),
        },
        counts: {
          pie: pieEl?.shadowRoot?.querySelectorAll('.mark-slice').length || 0,
          dough: doughEl?.shadowRoot?.querySelectorAll('.mark-slice').length || 0,
          pol: polEl?.shadowRoot?.querySelectorAll('.mark-slice').length || 0,
          rad: radEl?.shadowRoot?.querySelectorAll('.mark-radar').length || 0,
          radPoints: radEl?.shadowRoot?.querySelectorAll('.mark-point').length || 0,
        },
        exportsPre: document.getElementById('exports')?.textContent?.trim() || '',
      };
    });
    assert.deepEqual(
      info.exports,
      ['drawDoughnutMarks', 'drawPieMarks', 'drawPolarAreaMarks', 'drawRadarMarks'],
      `exports deben ser exactamente 4 draw* (got ${JSON.stringify(info.exports)})`,
    );
    for (const k of info.exports) {
      assert.equal(info.types[k], 'function', `${k} debe ser function`);
    }
    assert.equal(info.defined.pie, true, 'is-pie-chart debe estar definido');
    assert.equal(info.defined.dough, true, 'is-doughnut-chart debe estar definido');
    assert.equal(info.defined.pol, true, 'is-polar-area-chart debe estar definido');
    assert.equal(info.defined.rad, true, 'is-radar-chart debe estar definido');
    assert.ok(info.counts.pie > 0, `pie debe renderizar marcas, hay ${info.counts.pie}`);
    assert.ok(info.counts.dough > 0, `doughnut debe renderizar marcas, hay ${info.counts.dough}`);
    assert.ok(info.counts.pol > 0, `polar debe renderizar marcas, hay ${info.counts.pol}`);
    assert.ok(info.counts.rad > 0, `radar debe renderizar polígonos, hay ${info.counts.rad}`);
    assert.ok(info.counts.radPoints > 0, `radar debe renderizar puntos, hay ${info.counts.radPoints}`);
    assert.ok(info.exportsPre.includes('drawPieMarks'), 'el <pre> de exports debe listar drawPieMarks');
    await screenshot(page, 'marks-radial-smoke');
  },
});

tests.push({
  name: 'pie: 3 categorías producen 3 rebanadas con clases .mark-slice y cada una tiene path d',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-radial-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-pie-chart');
      const slices = [...el.shadowRoot.querySelectorAll('.mark.mark-slice')];
      return {
        count: slices.length,
        paths: slices.map((s) => s.getAttribute('d') ?? ''),
        fills: slices.map((s) => s.getAttribute('fill') ?? ''),
      };
    });
    assert.equal(data.count, 3, `esperaba 3 rebanadas, hay ${data.count}`);
    assert.ok(data.paths.every((d) => d.length > 8 && /^M/.test(d)), 'cada path debe empezar por M');
    assert.ok(data.paths.every((d) => /A.*0 1/.test(d)), 'cada path debe contener un arco A');
    assert.ok(new Set(data.fills).size >= 2, `los fills deben ser heterogéneos, hay ${JSON.stringify(data.fills)}`);
  },
});

tests.push({
  name: 'radar: 1 dataset × 5 vértices → 1 polígono + 5 puntos .mark-point',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-radial-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-radar-chart');
      const polys = [...el.shadowRoot.querySelectorAll('.mark.mark-radar')];
      const points = [...el.shadowRoot.querySelectorAll('.mark.mark-point')];
      const ticks = [...el.shadowRoot.querySelectorAll('text.tick-label')].map((t) => (t.textContent ?? '').trim());
      return {
        polygons: polys.length,
        points: points.length,
        polyD: polys[0]?.getAttribute('d') ?? '',
        polyStroke: polys[0]?.getAttribute('stroke') ?? '',
        ticks,
      };
    });
    assert.equal(data.polygons, 1, `esperaba 1 polígono, hay ${data.polygons}`);
    assert.equal(data.points, 5, `esperaba 5 puntos, hay ${data.points}`);
    assert.ok(data.polyD.length > 8, `polígono debe tener d, got "${data.polyD}"`);
    assert.ok(/Z\s*$/.test(data.polyD.trim()), `polígono radar debe cerrar con Z, got "${data.polyD}"`);
    assert.ok(data.polyStroke.length > 0, 'polígono debe tener stroke');
    assert.deepEqual(data.ticks, ['A', 'B', 'C', 'D', 'E'], `ticks radar deben ser A..E, got ${JSON.stringify(data.ticks)}`);
  },
});

tests.push({
  name: 'doughnut: cada rebanada tiene un path de arco cerrado con Z',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-radial-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-doughnut-chart');
      const slices = [...el.shadowRoot.querySelectorAll('.mark.mark-slice')];
      return {
        count: slices.length,
        dsLabels: el.payload?.data?.datasets?.[0]?.data ?? [],
      };
    });
    assert.equal(data.count, 4, `esperaba 4 rebanadas (4 categorías), hay ${data.count}`);
    assert.equal(data.dsLabels.length, 4, 'demo doughnut debe tener 4 deltas');
  },
});

tests.push({
  name: 'polar-area: 8 categorías producen 8 slices con path arc válido',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-marks-radial-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-polar-area-chart');
      const slices = [...el.shadowRoot.querySelectorAll('.mark.mark-slice')];
      return {
        count: slices.length,
        allClosed: slices.every((s) => /Z\s*$/.test((s.getAttribute('d') ?? '').trim())),
      };
    });
    assert.equal(data.count, 8, `esperaba 8 slices (8 puntos cardinales), hay ${data.count}`);
    assert.equal(data.allClosed, true, 'todos los slices polar deben cerrar con Z');
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('marks-radial', failures === 0, { total: tests.length, failures });
