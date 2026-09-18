// polar-area-chart.test.mjs — tests exhaustivos del demo polar-area-chart.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/polar-area-chart/polar-area-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: el elemento se registra y renderiza SVG con marcas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-polar-area-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-polar-area-chart');
      const svg = el.shadowRoot.querySelector('svg');
      const marks = el.shadowRoot.querySelectorAll('.mark');
      return {
        defined: !!customElements.get('is-polar-area-chart'),
        chartDefined: !!customElements.get('is-chart'),
        svg: !!svg,
        viewBox: svg?.getAttribute('viewBox'),
        marks: marks.length,
        markClasses: [...marks].map((m) => m.getAttribute('class')),
      };
    });
    assert.equal(info.defined, true, 'is-polar-area-chart debe estar definido');
    assert.equal(info.chartDefined, true, 'is-chart también debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en shadow DOM');
    assert.ok(info.marks > 0, `debe haber marcas renderizadas, hay ${info.marks}`);
    assert.ok(
      info.markClasses.every((c) => c && c.includes('mark')),
      'cada marca debe tener la clase .mark',
    );
    await screenshot(page, 'polar-area-chart-smoke');
  },
});

tests.push({
  name: 'config: cambiar payload re-renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-polar-area-chart-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => {
      return document.querySelector('is-polar-area-chart').shadowRoot.querySelectorAll('.mark.mark-slice').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-polar-area-chart');
      el.payload = {
        type: 'polarArea',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{ label: 'Mini', data: [10, 20, 30] }],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      return document.querySelector('is-polar-area-chart').shadowRoot.querySelectorAll('.mark.mark-slice').length;
    });
    assert.notEqual(after, before, `re-asignar payload debe cambiar el render (before=${before}, after=${after})`);
    assert.equal(after, 3, 'el nuevo dataset tiene 3 sectores');
  },
});

tests.push({
  name: 'slices: cada label produce un .mark-slice (path con d= arco)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-polar-area-chart-ready');
    const info = await page.evaluate(() => {
      const root = document.querySelector('is-polar-area-chart').shadowRoot;
      const slices = [...root.querySelectorAll('.mark.mark-slice')];
      return {
        total: slices.length,
        allPaths: slices.every((s) => s.tagName.toLowerCase() === 'path'),
        allHaveD: slices.every((s) => (s.getAttribute('d') ?? '').length > 4),
        ds: slices.map((s) => s.getAttribute('d') ?? ''),
      };
    });
    assert.equal(info.total, 6, '6 labels ⇒ 6 sectores');
    assert.equal(info.allPaths, true, 'cada sector debe ser <path>');
    assert.equal(info.allHaveD, true, 'cada sector debe tener atributo d con arco');
    assert.ok(info.ds.length >= 6, 'deben persistir los 6 paths');
  },
});

tests.push({
  name: 'grid: dibuja anillos de referencia (.grid-line circles)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-polar-area-chart-ready');
    const grid = await page.evaluate(() => {
      const root = document.querySelector('is-polar-area-chart').shadowRoot;
      return root.querySelectorAll('.grid-line').length;
    });
    assert.ok(grid >= 3, `debe haber al menos 3 .grid-line (anillos de referencia), hay ${grid}`);
  },
});

tests.push({
  name: 'radius: cada sector tiene un path d distinto (radios proporcionales al valor)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-polar-area-chart-ready');
    const ds = await page.evaluate(() => {
      const root = document.querySelector('is-polar-area-chart').shadowRoot;
      return [...root.querySelectorAll('.mark.mark-slice')].map((s) => s.getAttribute('d') ?? '');
    });
    // Cada path describe un arco desde (cx, cy) hasta el borde. Si los radios fuesen
    // todos iguales (como en un pie normal), todos los d serían aproximadamente la
    // misma longitud. Aquí los valores [120, 280, 340, 90, 160, 60] ⇒ radios distintos.
    const lengths = ds.map((d) => d.length);
    const uniqueLengths = new Set(lengths);
    assert.ok(uniqueLengths.size >= 3, `los sectores deben tener paths de longitud distinta (radios distintos), got ${uniqueLengths.size} valores únicos`);
  },
});

tests.push({
  name: 'multi-dataset: con un solo dataset cada label sigue produciendo un sector',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-polar-area-chart-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const el = document.querySelector('is-polar-area-chart');
      el.payload = {
        type: 'polarArea',
        data: {
          labels: ['Uno', 'Dos', 'Tres', 'Cuatro'],
          datasets: [{ label: 'Conjunto', data: [5, 15, 25, 35] }],
        },
      };
    });
    await page.waitForTimeout(200);
    const total = await page.evaluate(() => {
      return document.querySelector('is-polar-area-chart').shadowRoot.querySelectorAll('.mark.mark-slice').length;
    });
    assert.equal(total, 4, '4 labels ⇒ 4 sectores');
  },
});

tests.push({
  name: 'no-FOUC: el elemento queda visible al definirlo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-polar-area-chart-ready');
    const visible = await page.evaluate(() => {
      const el = document.querySelector('is-polar-area-chart');
      const cs = getComputedStyle(el);
      return { defined: !!customElements.get('is-polar-area-chart'), visibility: cs.visibility };
    });
    assert.equal(visible.defined, true, 'el elemento debe estar definido');
    assert.notEqual(visible.visibility, 'hidden', 'el elemento no debe quedar visibility:hidden tras definir');
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

report('polar-area-chart', failures === 0, { total: tests.length, failures });
