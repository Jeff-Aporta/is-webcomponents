// mindmap.test.mjs — tests exhaustivos del demo mindmap.html.
// Cobertura: smoke (monta y renderiza nodos + aristas), funcional
// (dataset.nodeId, kind=root/branch/leaf), aristas con path ortogonal,
// determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/mindmap/mindmap.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-mindmap> monta y renderiza nodos y aristas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-mindmap'),
        nodes: shadow?.querySelectorAll('.mm-node').length ?? 0,
        edges: shadow?.querySelectorAll('.mm-edge').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.mm-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-mindmap debe estar definido');
    assert.ok(info.nodes >= 10, `esperaba >=10 nodos, hay ${info.nodes}`);
    assert.ok(info.edges >= 9, `esperaba >=9 aristas, hay ${info.edges}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="mm-svg">');
    await screenshot(page, 'mindmap-smoke');
  },
});

tests.push({
  name: 'nodos: cada uno tiene dataset.nodeId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      return [...el.shadowRoot.querySelectorAll('.mm-node')].map((g) => g.dataset.nodeId);
    });
    assert.ok(ids.includes('root'), 'debe haber un nodo raíz "root"');
    assert.ok(ids.includes('mkt'), 'debe haber una rama "mkt"');
    assert.ok(ids.includes('mkt-1'), 'debe haber una hoja "mkt-1"');
  },
});

tests.push({
  name: 'kinds: la raíz, las ramas y las hojas se distinguen por clase CSS',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const kinds = await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      return {
        root: el.shadowRoot.querySelectorAll('.mm-node--root').length,
        branch: el.shadowRoot.querySelectorAll('.mm-node--branch').length,
        leaf: el.shadowRoot.querySelectorAll('.mm-node--leaf').length,
      };
    });
    assert.equal(kinds.root, 1, `esperaba 1 root, hay ${kinds.root}`);
    assert.equal(kinds.branch, 3, `esperaba 3 ramas, hay ${kinds.branch}`);
    assert.equal(kinds.leaf, 6, `esperaba 6 hojas, hay ${kinds.leaf}`);
  },
});

tests.push({
  name: 'aristas: cada .mm-edge tiene path con d no vacío y stroke',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      return [...el.shadowRoot.querySelectorAll('.mm-edge')].map((p) => ({
        d: p.getAttribute('d'),
        stroke: p.getAttribute('stroke') || getComputedStyle(p).stroke,
      }));
    });
    assert.ok(edges.length >= 9, `esperaba >=9 aristas, hay ${edges.length}`);
    for (const e of edges) {
      assert.ok(e.d && e.d.length > 3, `path sin d: "${e.d}"`);
      assert.ok(e.stroke && e.stroke !== 'none', `path sin stroke: "${e.stroke}"`);
    }
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      return el.shadowRoot.querySelector('svg.mm-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      return el.shadowRoot.querySelector('svg.mm-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-mindmap-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-mindmap');
      const svg = el.shadowRoot.querySelector('svg.mm-svg');
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

report('mindmap', failures === 0, { total: tests.length, failures });