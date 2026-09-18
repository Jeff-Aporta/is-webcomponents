// org-chart.test.mjs — tests exhaustivos del demo org-chart.html.
// org-chart es OUTLIER: no extiende DiagramElementBase, su SVG class es
// "canvas" (no "{kind}-svg") y los nodos son tarjetas <foreignObject> con
// g.dataset.id (no dataset.nodeId).
// Cobertura: smoke (monta y renderiza tarjetas), funcional (dataset.id,
// jerarquía visible), determinismo, accesibilidad.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/org-chart/org-chart.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-org-chart> monta y renderiza tarjetas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-org-chart'),
        cards: shadow?.querySelectorAll('.card').length ?? 0,
        nodes: shadow?.querySelectorAll('.node').length ?? 0,
        edges: shadow?.querySelectorAll('path.edge').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.canvas'),
      };
    });
    assert.equal(info.defined, true, 'is-org-chart debe estar definido');
    assert.ok(info.cards >= 8, `esperaba >=8 tarjetas, hay ${info.cards}`);
    assert.ok(info.nodes >= 8, `esperaba >=8 nodos .node, hay ${info.nodes}`);
    assert.ok(info.edges >= 7, `esperaba >=7 aristas, hay ${info.edges}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="canvas">');
    await screenshot(page, 'org-chart-smoke');
  },
});

tests.push({
  name: 'nodos: cada tarjeta tiene dataset.id con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      return [...el.shadowRoot.querySelectorAll('.node')].map((g) => g.dataset.id);
    });
    assert.ok(ids.includes('ceo'), 'debe existir el nodo "ceo"');
    assert.ok(ids.includes('cto'), 'debe existir el nodo "cto"');
    assert.ok(ids.includes('dev1'), 'debe existir el nodo "dev1"');
  },
});

tests.push({
  name: 'tarjetas: la tarjeta CEO muestra nombre y cargo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    const text = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      const ceoCard = el.shadowRoot.querySelector('.node[data-id="ceo"] .card');
      return ceoCard?.textContent ?? '';
    });
    assert.match(text, /Carolina/, 'debe aparecer "Carolina"');
    assert.match(text, /CEO/, 'debe aparecer el cargo "CEO"');
  },
});

tests.push({
  name: 'aristas: cada path.edge tiene d no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      return [...el.shadowRoot.querySelectorAll('path.edge')].map((p) => p.getAttribute('d'));
    });
    assert.ok(edges.length >= 7, `esperaba >=7 aristas, hay ${edges.length}`);
    for (const d of edges) {
      assert.ok(d && d.length > 10, `arista sin path d: "${d}"`);
    }
  },
});

tests.push({
  name: 'API: expand(colapsar=false por defecto) funciona sin errores',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    await page.waitForTimeout(200);
    // Llamar expand sobre un id existente debe ser no-op o marcar colapso.
    await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      el.expand('cto');
      el.collapse('cto');
    });
    await page.waitForTimeout(200);
    const ok = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      return !!el?.expand && !!el?.collapse;
    });
    assert.ok(ok, 'debe existir la API expand/collapse');
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      return el.shadowRoot.querySelector('svg.canvas').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      el.payload = JSON.parse(JSON.stringify(el.payload));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      return el.shadowRoot.querySelector('svg.canvas').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: role=tree en el SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-org-chart-ready');
    const role = await page.evaluate(() => {
      const el = document.querySelector('main is-org-chart');
      return el.shadowRoot.querySelector('svg.canvas').getAttribute('role');
    });
    assert.equal(role, 'tree', 'el SVG debe llevar role=tree');
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

report('org-chart', failures === 0, { total: tests.length, failures });