// component-diagram.test.mjs — tests exhaustivos del demo component-diagram.html.
// Cobertura: smoke (monta y renderiza componentes, interfaces y aristas),
// funcional (cada primitiva UML está presente), determinismo, accesibilidad.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/component-diagram/component-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-component-diagram> monta y renderiza componentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-diagram-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-component-diagram'),
        components: shadow?.querySelectorAll('[data-cmp-id]').length ?? 0,
        interfaces: shadow?.querySelectorAll('[data-iface-id]').length ?? 0,
        edges: shadow?.querySelectorAll('.cd-edge').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.cd-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-component-diagram debe estar definido');
    assert.ok(info.components >= 3, `esperaba >=3 componentes, hay ${info.components}`);
    assert.ok(info.interfaces >= 2, `esperaba >=2 interfaces, hay ${info.interfaces}`);
    assert.ok(info.edges >= 2, `esperaba >=2 aristas, hay ${info.edges}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="cd-svg">');
    await screenshot(page, 'component-diagram-smoke');
  },
});

tests.push({
  name: 'componentes: cada componente tiene dataset.cmpId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-diagram-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-cmp-id]')].map((g) => g.dataset.cmpId);
    });
    assert.ok(ids.includes('api'), 'debe haber un componente "api"');
    assert.ok(ids.includes('svc'), 'debe haber un componente "svc"');
    assert.ok(ids.includes('db'), 'debe haber un componente "db"');
  },
});

tests.push({
  name: 'interfaces: cada lollipop tiene dataset.ifaceId',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-diagram-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-iface-id]')].map((g) => g.dataset.ifaceId);
    });
    assert.ok(ids.includes('if1'), 'debe haber una interfaz "if1"');
    assert.ok(ids.includes('if2'), 'debe haber una interfaz "if2"');
  },
});

tests.push({
  name: 'aristas: cada .cd-edge tiene path con d no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-diagram-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      return [...el.shadowRoot.querySelectorAll('.cd-edge path')].map((p) => ({
        d: p.getAttribute('d'),
        stroke: p.getAttribute('stroke') || getComputedStyle(p).stroke,
      }));
    });
    assert.ok(edges.length >= 2, `esperaba >=2 aristas, hay ${edges.length}`);
    for (const e of edges) {
      assert.ok(e.d && e.d.length > 3, `path sin "d": "${e.d}"`);
      assert.ok(e.stroke && e.stroke !== 'none', `path sin stroke: "${e.stroke}"`);
    }
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-diagram-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      return el.shadowRoot.querySelector('svg.cd-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      return el.shadowRoot.querySelector('svg.cd-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img en el SVG',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-component-diagram-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-component-diagram');
      const svg = el.shadowRoot.querySelector('svg.cd-svg');
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

report('component-diagram', failures === 0, { total: tests.length, failures });