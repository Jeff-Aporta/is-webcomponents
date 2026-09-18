// state-diagram.test.mjs — tests exhaustivos del demo state-diagram.html.
// Cobertura: smoke (monta y renderiza estados + aristas), funcional
// (dataset.nodeId, kind=start/end, transiciones etiquetadas), determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/state-diagram/state-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-state-diagram> monta y renderiza estados y transiciones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-state-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-state-diagram'),
        nodes: shadow?.querySelectorAll('.st-node').length ?? 0,
        edges: shadow?.querySelectorAll('.st-trans').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.st-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-state-diagram debe estar definido');
    assert.ok(info.nodes >= 6, `esperaba >=6 estados, hay ${info.nodes}`);
    assert.ok(info.edges >= 6, `esperaba >=6 transiciones, hay ${info.edges}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="st-svg">');
    await screenshot(page, 'state-diagram-smoke');
  },
});

tests.push({
  name: 'estados: cada uno tiene dataset.nodeId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-state-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      return [...el.shadowRoot.querySelectorAll('.st-node')].map((g) => g.dataset.nodeId);
    });
    assert.ok(ids.includes('init'), 'debe existir el estado inicial "init"');
    assert.ok(ids.includes('paid'), 'debe existir el estado "paid"');
    assert.ok(ids.includes('end'), 'debe existir el estado final "end"');
  },
});

tests.push({
  name: 'transiciones: cada una tiene dataset.edgeId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-state-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      return [...el.shadowRoot.querySelectorAll('.st-trans')].map((g) => g.dataset.edgeId);
    });
    assert.ok(ids.includes('e1'), 'debe existir la transición "e1"');
    assert.ok(ids.includes('e4'), 'debe existir la transición "e4"');
  },
});

tests.push({
  name: 'start/end: los pseudo-estados inicial y final se distinguen por su forma',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-state-ready');
    // state-diagram distingue start (círculo sólido) y end (doble círculo)
    // por los hijos de .st-node — path para start, circles para end.
    const kinds = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      const nodes = [...el.shadowRoot.querySelectorAll('.st-node')];
      let start = 0, end = 0;
      for (const n of nodes) {
        if (n.querySelector('path')) start++;
        else if (n.querySelectorAll('circle').length === 2) end++;
      }
      return { start, end };
    });
    assert.ok(kinds.start >= 1, `debe haber al menos 1 estado inicial (path), hay ${kinds.start}`);
    assert.ok(kinds.end >= 1, `debe haber al menos 1 estado final (2 circles), hay ${kinds.end}`);
  },
});

tests.push({
  name: 'aristas: cada .st-trans tiene path con d no vacío y stroke',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-state-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      return [...el.shadowRoot.querySelectorAll('.st-trans path')].map((p) => ({
        d: p.getAttribute('d'),
        stroke: p.getAttribute('stroke') || getComputedStyle(p).stroke,
      }));
    });
    assert.ok(edges.length >= 6, `esperaba >=6 transiciones, hay ${edges.length}`);
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
    await waitReady(page, 'data-state-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      return el.shadowRoot.querySelector('svg.st-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      return el.shadowRoot.querySelector('svg.st-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-state-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-state-diagram');
      const svg = el.shadowRoot.querySelector('svg.st-svg');
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

report('state-diagram', failures === 0, { total: tests.length, failures });