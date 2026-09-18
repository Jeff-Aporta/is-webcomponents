// flowchart.test.mjs — tests exhaustivos del demo flowchart.html.
// Cobertura: smoke (monta y renderiza nodos/aristas), animation=flow embebe
// keyframes CSS, nodos con shape distinto (stadium/diamond), determinismo,
// accesibilidad.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/flowchart/flowchart.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-flowchart> monta y renderiza nodos y aristas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-flowchart'),
        nodes: shadow?.querySelectorAll('.flow-node').length ?? 0,
        edges: shadow?.querySelectorAll('.flow-edge').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.flow-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-flowchart debe estar definido');
    assert.ok(info.nodes >= 4, `esperaba >=4 nodos, hay ${info.nodes}`);
    assert.ok(info.edges >= 4, `esperaba >=4 aristas, hay ${info.edges}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="flow-svg">');
    await screenshot(page, 'flowchart-smoke');
  },
});

tests.push({
  name: 'nodos: cada uno tiene dataset.nodeId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      return [...el.shadowRoot.querySelectorAll('.flow-node')].map((g) => g.dataset.nodeId);
    });
    assert.ok(ids.includes('start'), 'debe haber un nodo "start"');
    assert.ok(ids.includes('verify'), 'debe haber un nodo "verify"');
    assert.ok(ids.includes('create'), 'debe haber un nodo "create"');
    assert.ok(ids.includes('done'), 'debe haber un nodo "done"');
  },
});

tests.push({
  name: 'shapes: stadium y diamond se dibujan con paths distintos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    const shapes = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      const start = el.shadowRoot.querySelector('.flow-node[data-node-id="start"] path');
      const verify = el.shadowRoot.querySelector('.flow-node[data-node-id="verify"] path');
      return {
        stadium: start?.getAttribute('d') ?? '',
        diamond: verify?.getAttribute('d') ?? '',
      };
    });
    assert.ok(shapes.stadium.includes('a') || shapes.stadium.includes('A'),
      `stadium debe usar arcos (a/A): "${shapes.stadium.slice(0, 60)}"`);
    assert.ok(shapes.diamond.includes('L') || shapes.diamond.includes('l'),
      `diamond debe usar líneas (L/l): "${shapes.diamond.slice(0, 60)}"`);
  },
});

tests.push({
  name: 'animation=flow: cada arista no-dashed lleva una capa flow-edge__flow',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    const has = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      // Con animation="flow", cada arista sólida (no dashed) añade una capa
      // .flow-edge__flow con stroke-dasharray visible.
      const flowLayers = el.shadowRoot.querySelectorAll('.flow-edge__flow');
      return flowLayers.length;
    });
    assert.ok(has >= 2, `esperaba >=2 capas flow-edge__flow (una por arista sólida), hay ${has}`);
  },
});

tests.push({
  name: 'aristas dashed: las aristas con kind=dashed llevan stroke-dasharray',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    const has = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      const dashed = [...el.shadowRoot.querySelectorAll('.flow-edge__path')]
        .filter((p) => p.getAttribute('stroke-dasharray'));
      return dashed.length;
    });
    assert.ok(has >= 1, `esperaba >=1 arista con stroke-dasharray, hay ${has}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      return el.shadowRoot.querySelector('svg.flow-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      return el.shadowRoot.querySelector('svg.flow-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-flowchart-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-flowchart');
      const svg = el.shadowRoot.querySelector('svg.flow-svg');
      return { aria: svg.getAttribute('aria-label'), role: svg.getAttribute('role') };
    });
    assert.ok(meta.aria && meta.aria.length > 0, 'debe llevar aria-label');
    assert.equal(meta.role, 'img', 'role debe ser img');
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

report('flowchart', failures === 0, { total: tests.length, failures });