// treemap.stagehand.test.mjs — visual rubric determinista (Playwright puro).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/treemap/treemap.html`,
  readyAttr: 'data-treemap-ready',
  name: 'treemap',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const el = document.querySelector('is-treemap');
    const svg = el.shadowRoot.querySelector('svg');
    const svgRect = svg.getBoundingClientRect();
    const nodes = [...el.shadowRoot.querySelectorAll('.tm-node')].map((g) => {
      const rect = g.querySelector('rect.tm-node__rect');
      const r = rect ? rect.getBoundingClientRect() : null;
      const text = g.querySelector('text');
      return {
        id: g.dataset.nodeId,
        hasRect: !!rect,
        width: r?.width ?? 0,
        height: r?.height ?? 0,
        label: text ? text.textContent : null,
      };
    });
    const titleEl = svg.querySelector(':scope > text');
    return { svgRect, nodes, title: titleEl?.textContent ?? null };
  });

  assert.ok(data.svgRect.width > 100, `SVG debe tener ancho > 100px (got ${data.svgRect.width})`);
  assert.ok(data.svgRect.height > 100, `SVG debe tener alto > 100px (got ${data.svgRect.height})`);
  assert.ok(data.nodes.length >= 5, `esperaba >= 5 nodos teselados, hay ${data.nodes.length}`);

  const broken = data.nodes.filter((n) => !n.hasRect || n.width < 1 || n.height < 1);
  assert.equal(broken.length, 0, `nodos con rect inválido: ${broken.length}/${data.nodes.length}`);

  const emptyLabels = data.nodes.filter((n) => !n.label);
  assert.equal(emptyLabels.length, 0, `nodos sin etiqueta: ${emptyLabels.length}/${data.nodes.length}`);

  assert.equal(data.title, 'Inventario por categoría', 'el título debe estar presente en el SVG');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}
await close({ browser, page });
report(DEMO.name, true);
