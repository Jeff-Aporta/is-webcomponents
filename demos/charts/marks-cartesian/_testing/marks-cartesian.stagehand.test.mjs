// marks-cartesian.stagehand.test.mjs — visual rubric determinista (Playwright puro).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/marks-cartesian/marks-cartesian.html`,
  readyAttr: 'data-marks-cartesian-ready',
  name: 'marks-cartesian',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const pre = document.querySelector('pre#exports');
    const bar = document.querySelector('is-chart[type="bar"]');
    const line = document.querySelector('is-chart[type="line"]');
    const barSvg = bar?.shadowRoot?.querySelector('svg');
    const lineSvg = line?.shadowRoot?.querySelector('svg');
    return {
      exportsText: pre?.textContent ?? '',
      barRect: barSvg?.getBoundingClientRect(),
      lineRect: lineSvg?.getBoundingClientRect(),
      barSvgs: !!barSvg,
      lineSvgs: !!lineSvg,
    };
  });

  assert.ok(
    data.exportsText.includes('drawBarMarks') &&
      data.exportsText.includes('drawLineMarks') &&
      data.exportsText.includes('drawScatterMarks') &&
      data.exportsText.includes('drawBubbleMarks'),
    'pre#exports debe listar los 4 exports del bundle',
  );
  assert.equal(data.barSvgs, true, '<is-chart type=bar> debe renderizar SVG');
  assert.equal(data.lineSvgs, true, '<is-chart type=line> debe renderizar SVG');
  assert.ok(data.barRect.width > 100 && data.barRect.height > 100, 'SVG de barras debe tener tamaño visible');
  assert.ok(data.lineRect.width > 100 && data.lineRect.height > 100, 'SVG de líneas debe tener tamaño visible');
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
