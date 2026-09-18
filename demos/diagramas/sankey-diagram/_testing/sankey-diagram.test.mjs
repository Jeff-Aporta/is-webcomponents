// sankey-diagram.test.mjs — tests exhaustivos del demo sankey-diagram.html.
// Cobertura: smoke (monta nodos + links), funcional (dataset.nodeId,
// dataset.linkId), grosor proporcional, determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/sankey-diagram/sankey-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-sankey-diagram> monta y renderiza nodos y links',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sankey-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-sankey-diagram'),
        nodes: shadow?.querySelectorAll('.sk-node').length ?? 0,
        links: shadow?.querySelectorAll('[data-link-id]').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.sk-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-sankey-diagram debe estar definido');
    assert.ok(info.nodes >= 4, `esperaba >=4 nodos, hay ${info.nodes}`);
    assert.ok(info.links >= 3, `esperaba >=3 links, hay ${info.links}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="sk-svg">');
    await screenshot(page, 'sankey-diagram-smoke');
  },
});

tests.push({
  name: 'nodos: cada uno tiene dataset.nodeId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sankey-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      return [...el.shadowRoot.querySelectorAll('.sk-node')].map((g) => g.dataset.nodeId);
    });
    assert.ok(ids.includes('src'), 'debe existir el nodo "src"');
    assert.ok(ids.includes('grid'), 'debe existir el nodo "grid"');
    assert.ok(ids.includes('home'), 'debe existir el nodo "home"');
  },
});

tests.push({
  name: 'links: cada uno tiene dataset.linkId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sankey-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-link-id]')].map((g) => g.dataset.linkId);
    });
    assert.ok(ids.includes('l1'), 'debe existir el link "l1"');
    assert.ok(ids.includes('l2'), 'debe existir el link "l2"');
    assert.ok(ids.includes('l3'), 'debe existir el link "l3"');
  },
});

tests.push({
  name: 'grosor: el link l1 (valor=100) es más grueso que l3 (valor=30)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sankey-ready');
    const widths = await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      const l1 = el.shadowRoot.querySelector('[data-link-id="l1"] path, [data-link-id="l1"]');
      const l3 = el.shadowRoot.querySelector('[data-link-id="l3"] path, [data-link-id="l3"]');
      const w1 = l1?.getBoundingClientRect().height ?? 0;
      const w3 = l3?.getBoundingClientRect().height ?? 0;
      return { w1, w3 };
    });
    assert.ok(widths.w1 > widths.w3,
      `l1 (100) debe ser más grueso que l3 (30): w1=${widths.w1}, w3=${widths.w3}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sankey-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      return el.shadowRoot.querySelector('svg.sk-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      return el.shadowRoot.querySelector('svg.sk-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sankey-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-sankey-diagram');
      const svg = el.shadowRoot.querySelector('svg.sk-svg');
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

report('sankey-diagram', failures === 0, { total: tests.length, failures });