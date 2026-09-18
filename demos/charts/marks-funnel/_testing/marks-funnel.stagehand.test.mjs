// marks-funnel.stagehand.test.mjs — visual rubric determinista (Playwright puro).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_global/lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/charts/marks-funnel/marks-funnel.html`,
  readyAttr: 'data-marks-funnel-ready',
  name: 'marks-funnel',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(300);
  const data = await page.evaluate(() => {
    const pre = document.querySelector('pre#bands');
    const fc = document.querySelector('is-funnel-chart');
    const svg = fc?.shadowRoot?.querySelector('svg');
    return {
      bandsText: pre?.textContent ?? '',
      funnelSvg: !!svg,
      funnelMarks: fc?.shadowRoot?.querySelectorAll('.mark').length || 0,
      funnelRects: svg?.getBoundingClientRect(),
    };
  });
  assert.ok(data.bandsText.includes('"ratio"'), 'pre debe contener el JSON de bands');
  assert.equal(data.funnelSvg, true, '<is-funnel-chart> debe renderizar SVG');
  assert.ok(data.funnelMarks >= 4, `esperaba >=4 marks (uno por paso), hay ${data.funnelMarks}`);
  assert.ok(data.funnelRects.width > 0 && data.funnelRects.height > 0, 'SVG debe tener tamaño visible');
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
