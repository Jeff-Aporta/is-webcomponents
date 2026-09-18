// block-diagram.test.mjs — tests exhaustivos del demo block-diagram.html.
// Cobertura: smoke (monta y renderiza bloques y aristas), funcional
// (atributos, re-render idempotente), accesibilidad (aria-label, sin
// texto vacío).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/block-diagram/block-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-block-diagram> monta y renderiza bloques y aristas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-diagram-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-block-diagram'),
        blockCount: shadow?.querySelectorAll('.block-node').length ?? 0,
        edgeCount: shadow?.querySelectorAll('.block-edge').length ?? 0,
        legend: !!shadow?.querySelector('.block-legend'),
        hasSvg: !!shadow?.querySelector('svg.block-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-block-diagram debe estar definido');
    assert.ok(info.blockCount >= 6, `esperaba >=6 bloques, hay ${info.blockCount}`);
    assert.ok(info.edgeCount >= 5, `esperaba >=5 aristas, hay ${info.edgeCount}`);
    assert.equal(info.hasSvg, true, 'debe existir el <svg class="block-svg">');
    await screenshot(page, 'block-diagram-smoke');
  },
});

tests.push({
  name: 'render: cada bloque tiene id en dataset.blockId',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-diagram-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      return [...el.shadowRoot.querySelectorAll('.block-node')].map((g) => g.dataset.blockId);
    });
    assert.ok(ids.length >= 6, `esperaba >=6 ids, hay ${ids.length}`);
    assert.ok(ids.includes('src'), 'debe haber un bloque "src"');
    assert.ok(ids.includes('parse'), 'debe haber un bloque "parse"');
    assert.ok(ids.includes('dlq'), 'debe haber un bloque "dlq"');
  },
});

tests.push({
  name: 'aristas: cada arista tiene path con d y stroke no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-diagram-ready');
    const edges = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      return [...el.shadowRoot.querySelectorAll('.block-edge path')].map((p) => ({
        d: p.getAttribute('d'),
        stroke: p.getAttribute('stroke') || getComputedStyle(p).stroke,
      }));
    });
    assert.ok(edges.length >= 5, `esperaba >=5 aristas, hay ${edges.length}`);
    for (const e of edges) {
      assert.ok(e.d && e.d.length > 5, `path sin "d": "${e.d}"`);
      assert.ok(e.stroke && e.stroke !== 'none', `path sin stroke: "${e.stroke}"`);
    }
  },
});

tests.push({
  name: 'rejilla: cada bloque tiene X,Y únicos (no todos en la misma fila/columna)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-diagram-ready');
    const positions = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      // block-diagram usa <path> (no <rect>) para la forma del bloque.
      const coords = [...el.shadowRoot.querySelectorAll('.block-node__box')]
        .map((p) => {
          // Extraer X,Y inicial del path data. Acepta "Mx,y" y "M x y".
          const d = p.getAttribute('d') ?? '';
          const m = /^M\s*([\d.\-]+)\s*[, ]\s*([\d.\-]+)/.exec(d);
          return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
        })
        .filter(Boolean);
      const distinctYs = [...new Set(coords.map((c) => c.y))];
      const distinctXs = [...new Set(coords.map((c) => c.x))];
      return {
        totalBlocks: coords.length,
        distinctRows: distinctYs.length,
        distinctCols: distinctXs.length,
      };
    });
    assert.equal(positions.totalBlocks, 6, `esperaba 6 bloques, hay ${positions.totalBlocks}`);
    // El layout pone los 6 bloques con un span=2: hay 3 filas distintas
    // (el bloque parse de span 2 fuerza wrap) y >=3 columnas distintas.
    assert.equal(positions.distinctRows, 3, `esperaba 3 filas (span=2), hay ${positions.distinctRows}`);
    assert.ok(positions.distinctCols >= 3, `esperaba >=3 columnas, hay ${positions.distinctCols}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-diagram-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      return el.shadowRoot.querySelector('svg.block-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      return el.shadowRoot.querySelector('svg.block-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox debe ser idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: el svg tiene aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-diagram-ready');
    const aria = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      return el.shadowRoot.querySelector('svg.block-svg').getAttribute('aria-label');
    });
    assert.ok(aria && aria.length > 0, 'el SVG debe llevar aria-label');
  },
});

tests.push({
  name: 'accesibilidad: el SVG tiene role=img',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-block-diagram-ready');
    const role = await page.evaluate(() => {
      const el = document.querySelector('main is-block-diagram');
      return el.shadowRoot.querySelector('svg.block-svg').getAttribute('role');
    });
    assert.equal(role, 'img', 'el SVG debe llevar role=img');
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

report('block-diagram', failures === 0, { total: tests.length, failures });