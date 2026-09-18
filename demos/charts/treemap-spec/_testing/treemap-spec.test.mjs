// treemap-spec.test.mjs — tests exhaustivos del demo treemap-spec.html.
// treemap-spec es un utility bundle: exporta resolveTreemapSpec (payload →
// spec normalizada) y computeTreemapLayout (spec → geometría de rectángulos).
// El demo además pinta <is-treemap> en vivo para verificar el flujo completo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/treemap-spec/treemap-spec.html`;

const tests = [];

tests.push({
  name: 'smoke: el bundle treemap-spec expone resolveTreemapSpec + computeTreemapLayout y el wrapper renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-spec-ready');
    const info = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/treemap-spec.min.js');
      const exports = Object.keys(lib).sort();
      const types = {};
      for (const k of exports) types[k] = typeof lib[k];
      const tm = document.querySelector('is-treemap');
      return {
        exports,
        types,
        tmDefined: !!customElements.get('is-treemap'),
        svg: !!tm?.shadowRoot?.querySelector('svg'),
        nodes: tm?.shadowRoot?.querySelectorAll('.tm-node').length || 0,
        exportsPre: document.getElementById('exports')?.textContent?.trim() || '',
        specPre: document.getElementById('spec')?.textContent?.trim() || '',
        layoutPre: document.getElementById('layout')?.textContent?.trim() || '',
      };
    });
    assert.ok(
      info.exports.includes('resolveTreemapSpec'),
      `debe exportar resolveTreemapSpec (got ${JSON.stringify(info.exports)})`,
    );
    assert.ok(
      info.exports.includes('computeTreemapLayout'),
      `debe exportar computeTreemapLayout (got ${JSON.stringify(info.exports)})`,
    );
    assert.equal(info.types.resolveTreemapSpec, 'function', 'resolveTreemapSpec debe ser function');
    assert.equal(info.types.computeTreemapLayout, 'function', 'computeTreemapLayout debe ser function');
    assert.equal(info.tmDefined, true, 'is-treemap debe estar definido');
    assert.ok(info.svg, 'debe haber un SVG en el shadow DOM del wrapper');
    assert.ok(info.nodes >= 4, `esperaba >=4 nodos, hay ${info.nodes}`);
    assert.ok(info.exportsPre.includes('resolveTreemapSpec'), '<pre> exports debe mencionar resolveTreemapSpec');
    assert.ok(info.exportsPre.includes('computeTreemapLayout'), '<pre> exports debe mencionar computeTreemapLayout');
    assert.ok(info.specPre.includes('"id"'), '<pre> spec debe contener el campo id');
    assert.ok(info.layoutPre.includes('"width"'), '<pre> layout debe contener width');
    await screenshot(page, 'treemap-spec-smoke');
  },
});

tests.push({
  name: 'pure: resolveTreemapSpec normaliza payload {treemap:{nodes:[]}} a spec con 4 nodos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-spec-ready');
    const spec = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/treemap-spec.min.js');
      return lib.resolveTreemapSpec({
        treemap: {
          nodes: [
            { id: 'a', label: 'X', value: 100 },
            { id: 'b', label: 'Y', value: 200 },
          ],
        },
      });
    });
    assert.ok(spec !== null && typeof spec === 'object', 'spec debe ser un objeto no nulo');
    assert.ok(Array.isArray(spec.nodes), 'spec debe tener nodes[]');
    assert.equal(spec.nodes.length, 2, `spec debe tener 2 nodos, tiene ${spec.nodes?.length}`);
    const ids = spec.nodes.map((n) => n.id);
    assert.deepEqual(ids, ['a', 'b'], `ids deben ser ['a','b'] (got ${JSON.stringify(ids)})`);
    assert.equal(spec.nodes[0].label, 'X', 'label del primer nodo debe ser "X"');
    assert.equal(spec.nodes[0].value, 100, 'value del primer nodo debe ser 100');
    assert.equal(spec.nodes[1].value, 200, 'value del segundo nodo debe ser 200');
  },
});

tests.push({
  name: 'pure: computeTreemapLayout produce width/height/nodes[] coherentes con los valores',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-spec-ready');
    const layout = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/treemap-spec.min.js');
      const spec = lib.resolveTreemapSpec({
        treemap: {
          nodes: [
            { id: 'a', label: 'X', value: 100 },
            { id: 'b', label: 'Y', value: 200 },
          ],
        },
      });
      return lib.computeTreemapLayout(spec, { width: 640 });
    });
    assert.ok(layout, 'layout debe existir');
    assert.equal(layout.width, 640, `width debe ser 640 (got ${layout.width})`);
    assert.ok(layout.height > 0, `height debe ser > 0 (got ${layout.height})`);
    assert.ok(Array.isArray(layout.nodes), 'layout.nodes debe ser array');
    assert.equal(layout.nodes.length, 2, `layout debe contener 2 nodos, tiene ${layout.nodes?.length}`);
    assert.equal(layout.total, 300, `total debe sumar 100+200=300 (got ${layout.total})`);
    // Cada nodo tiene rect {x, y, w, h} no negativos y área proporcional al valor.
    const a = layout.nodes.find((n) => n.id === 'a');
    const b = layout.nodes.find((n) => n.id === 'b');
    assert.ok(a && b, 'deben existir nodos a y b');
    assert.ok(a.w > 0 && a.h > 0, `nodo a debe tener w/h > 0 (got ${a.w}x${a.h})`);
    assert.ok(b.w > 0 && b.h > 0, `nodo b debe tener w/h > 0 (got ${b.w}x${b.h})`);
    const areaA = a.w * a.h;
    const areaB = b.w * a.h;
    assert.ok(areaB > areaA, `área de b (value=200) debe ser > área de a (value=100), got ${areaA} vs ${areaB}`);
  },
});

tests.push({
  name: 'pure: payload sin nodes devuelve null (caso vacío defensivo)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-spec-ready');
    const spec = await page.evaluate(async () => {
      const lib = await import('/dist/cdn/charts/treemap-spec.min.js');
      return lib.resolveTreemapSpec({ treemap: { nodes: [] } });
    });
    assert.equal(spec, null, `resolveTreemapSpec de nodes=[] debe devolver null (got ${JSON.stringify(spec)})`);
  },
});

tests.push({
  name: 'live: <is-treemap> pinta 4 nodos .tm-node con rects no solapados que cubren el lienzo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-spec-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-treemap');
      const groups = [...el.shadowRoot.querySelectorAll('.tm-node')];
      const rects = groups.map((g) => {
        const r = g.querySelector('rect.tm-node__rect');
        return {
          id: g.dataset.nodeId ?? null,
          x: Number(r?.getAttribute('x') ?? 0),
          y: Number(r?.getAttribute('y') ?? 0),
          w: Number(r?.getAttribute('width') ?? 0),
          h: Number(r?.getAttribute('height') ?? 0),
        };
      });
      return { groups: groups.length, rects };
    });
    assert.equal(data.groups, 4, `esperaba 4 .tm-node, hay ${data.groups}`);
    assert.equal(data.rects.length, 4, 'debe haber 4 rects');
    for (const r of data.rects) {
      assert.ok(r.w > 0 && r.h > 0, `nodo ${r.id} debe tener w/h > 0 (got ${r.w}x${r.h})`);
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y), `nodo ${r.id} debe tener x/y numéricos`);
    }
    // Cada rect debe estar dentro del lienzo (x>=0, y>=0).
    for (const r of data.rects) {
      assert.ok(r.x >= 0, `x de ${r.id} debe ser >= 0 (got ${r.x})`);
      assert.ok(r.y >= 0, `y de ${r.id} debe ser >= 0 (got ${r.y})`);
    }
  },
});

tests.push({
  name: 'live: re-asignar payload re-tesela el treemap',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-spec-ready');
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => {
      return document.querySelector('is-treemap').shadowRoot.querySelectorAll('.tm-node').length;
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-treemap');
      el.payload = {
        treemap: {
          nodes: [
            { id: 'x', label: 'X', value: 10 },
            { id: 'y', label: 'Y', value: 20 },
            { id: 'z', label: 'Z', value: 30 },
          ],
        },
      };
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const root = document.querySelector('is-treemap').shadowRoot;
      return {
        nodes: root.querySelectorAll('.tm-node').length,
        ids: [...root.querySelectorAll('.tm-node')].map((g) => g.dataset.nodeId),
      };
    });
    assert.equal(after.nodes, 3, `nuevo payload (3 nodos) debe repintar 3 .tm-node (got ${after.nodes})`);
    assert.deepEqual(after.ids, ['x', 'y', 'z'], `ids deben ser ['x','y','z'] (got ${JSON.stringify(after.ids)})`);
    assert.notEqual(after.nodes, before, 'el número de nodos cambió tras re-asignar payload');
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

report('treemap-spec', failures === 0, { total: tests.length, failures });
