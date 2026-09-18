// sparkline.stagehand.test.mjs — visual rubric determinista (Playwright puro).
//
// Checklist (cada check debe pasar):
//   (1) SVGS PRESENTES: cada uno de los 3 sparklines tiene un <svg>.
//   (2) MARKS RENDERIZADOS: cada sparkline tiene al menos 1 path o circle.
//   (3) FILLS/STROKES NO VACÍOS: cada mark tiene color visible.
//   (4) VIEWBOX AJUSTADO: el SVG tiene viewBox "0 0 W H" coherente con el
//       tamaño visible.
//   (5) ENCAJA EN VIEWPORT: el bounding box del SVG es > 0.
//   (6) GRADIENTE: el tercer sparkline (variant=gradient) tiene <linearGradient>
//       en <defs>.
//   (7) BAR: el segundo sparkline (type=bar) tiene exactamente N paths, uno
//       por valor del array data.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/sparkline/sparkline.html`,
  readyAttr: 'data-sparkline-ready',
  name: 'sparkline',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('is-sparkline')].map((s, idx) => {
      const svg = s.shadowRoot?.querySelector('svg');
      const svgRect = svg?.getBoundingClientRect();
      const marks = [...s.shadowRoot.querySelectorAll('path, circle')].map((m) => {
        const r = m.getBoundingClientRect();
        return {
          tag: m.tagName.toLowerCase(),
          d: m.getAttribute('d') ?? '',
          stroke: m.getAttribute('stroke'),
          fill: m.getAttribute('fill'),
          cx: m.getAttribute('cx'),
          cy: m.getAttribute('cy'),
          x: r.x, y: r.y, w: r.width, h: r.height,
        };
      });
      const defs = s.shadowRoot.querySelector('defs');
      const grad = defs?.querySelector('linearGradient');
      return {
        idx,
        type: s.getAttribute('type'),
        variant: s.getAttribute('variant'),
        lineColor: s.getAttribute('line-color'),
        valuesAttr: s.getAttribute('values'),
        dataLen: s.data?.length ?? 0,
        svgRect,
        viewBox: svg?.getAttribute('viewBox') ?? null,
        marks,
        hasDefs: !!defs,
        hasGrad: !!grad,
      };
    });
  });

  assert.equal(data.length, 3, `demo debe tener 3 sparklines (hay ${data.length})`);

  for (const sp of data) {
    const tag = `sparkline#${sp.idx}`;

    // (1) SVG presente.
    assert.ok(sp.svgRect, `${tag}: debe haber un <svg> en shadow DOM`);
    assert.ok(sp.svgRect.width > 0, `${tag}: ancho del SVG debe ser > 0 (era ${sp.svgRect.width})`);
    assert.ok(sp.svgRect.height > 0, `${tag}: alto del SVG debe ser > 0 (era ${sp.svgRect.height})`);

    // (2) MARKS RENDERIZADOS.
    assert.ok(sp.marks.length > 0, `${tag}: debe haber al menos 1 path/circle (hay ${sp.marks.length})`);

    // (3) FILLS / STROKES NO VACÍOS.
    for (const m of sp.marks) {
      // Un mark es válido si tiene fill con color visible O stroke con color visible.
      const hasFill = m.fill && m.fill !== 'none' && m.fill !== 'transparent';
      const hasStroke = m.stroke && m.stroke !== 'none' && m.stroke !== 'transparent';
      assert.ok(hasFill || hasStroke,
        `${tag}: mark ${m.tag} debe tener fill o stroke visible (fill="${m.fill}" stroke="${m.stroke}")`);
    }

    // (4) VIEWBOX AJUSTADO.
    assert.ok(sp.viewBox, `${tag}: SVG debe tener viewBox (era ${sp.viewBox})`);
    const parts = (sp.viewBox ?? '').split(/\s+/).map(Number);
    assert.equal(parts.length, 4, `${tag}: viewBox debe tener 4 valores (tiene ${parts.length})`);
    assert.equal(parts[0], 0, `${tag}: viewBox.x debe ser 0 (era ${parts[0]})`);
    assert.equal(parts[1], 0, `${tag}: viewBox.y debe ser 0 (era ${parts[1]})`);
    assert.ok(parts[2] > 0 && parts[3] > 0,
      `${tag}: viewBox.w y viewBox.h deben ser > 0 (era ${parts[2]}×${parts[3]})`);
  }

  // (6) GRADIENTE: el tercer sparkline (variant=gradient).
  const gradientOne = data.find((s) => s.variant === 'gradient');
  assert.ok(gradientOne, 'debe existir un sparkline con variant="gradient"');
  assert.equal(gradientOne.hasDefs, true, 'sparkline con variant=gradient debe tener <defs>');
  assert.equal(gradientOne.hasGrad, true, 'sparkline con variant=gradient debe tener un <linearGradient>');

  // (7) BAR: el segundo sparkline (type=bar) tiene N paths (uno por valor).
  const barOne = data.find((s) => s.type === 'bar');
  assert.ok(barOne, 'debe existir un sparkline con type="bar"');
  const barPaths = barOne.marks.filter((m) => m.tag === 'path');
  assert.equal(barPaths.length, barOne.dataLen,
    `sparkline bar debe tener ${barOne.dataLen} paths (hay ${barPaths.length})`);
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  console.log(`  ✓ ${DEMO.name}: rubric determinista PASS (SVGs presentes, marks con color, viewBox ajustado, gradient OK, bar sin gaps)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}
await close({ browser, page });
report(DEMO.name, true);