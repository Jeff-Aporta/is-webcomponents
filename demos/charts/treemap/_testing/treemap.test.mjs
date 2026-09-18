// treemap.test.mjs — tests exhaustivos del demo treemap.html.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const URL = `${BASE_URL}/demos/charts/treemap/treemap.html`;

const tests = [];

tests.push({
  name: 'smoke: renderiza nodos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-treemap');
      const svg = el.shadowRoot.querySelector('svg');
      const nodes = el.shadowRoot.querySelectorAll('.tm-node');
      return {
        defined: !!customElements.get('is-treemap'),
        svg: !!svg,
        nodes: nodes.length,
        viewBox: svg?.getAttribute('viewBox'),
        payload: el.payload,
      };
    });
    assert.equal(info.defined, true);
    assert.ok(info.svg);
    assert.ok(info.nodes >= 5, `esperaba >=5 nodos, hay ${info.nodes}`);
    await screenshot(page, 'treemap-smoke');
  },
});

tests.push({
  name: 'anidamiento: los nodos hoja se teselan dentro de su parent',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-treemap-ready');
    const data = await page.evaluate(() => {
      const root = document.querySelector('is-treemap').shadowRoot;
      const byId = {};
      for (const g of root.querySelectorAll('.tm-node')) {
        const rect = g.querySelector('rect.tm-node__rect');
        if (!rect) continue;
        const x = Number(rect.getAttribute('x'));
        const y = Number(rect.getAttribute('y'));
        const w = Number(rect.getAttribute('width'));
        const h = Number(rect.getAttribute('height'));
        byId[g.dataset.nodeId] = { x, y, w, h };
      }
      return byId;
    });
    assert.ok(data.tv && data.audio && data.moviles, 'los 3 hijos de electrónica deben existir');
    assert.ok(data.electronica, 'el padre electrónica debe existir');
    // Cada hijo debe estar contenido dentro del rect del padre.
    for (const childId of ['tv', 'audio', 'moviles']) {
      const parent = data.electronica;
      const child = data[childId];
      assert.ok(
        child.x >= parent.x - 0.5 &&
          child.y >= parent.y - 0.5 &&
          child.x + child.w <= parent.x + parent.w + 0.5 &&
          child.y + child.h <= parent.y + parent.h + 0.5,
        `${childId} debe estar contenido dentro de electrónica`,
      );
    }
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

report('treemap', failures === 0, { total: tests.length, failures });
