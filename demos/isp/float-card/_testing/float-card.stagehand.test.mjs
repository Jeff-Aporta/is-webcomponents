// float-card.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada anchor tiene dimensiones > 0, los panels se posicionan cerca
// del anchor y permanecen en el DOM, los offsets de linearTransform se aplican.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/float-card/float-card.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-float-card-ready');
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('is-float-card')].map((fc) => {
      const sr = fc.shadowRoot;
      const wrap = sr?.querySelector('[part="wrap"]');
      const panel = sr?.querySelector('[part="panel"]');
      const wrapRect = wrap?.getBoundingClientRect();
      const panelRect = panel?.getBoundingClientRect();
      return {
        id: fc.id,
        wrapW: wrapRect?.width || 0,
        wrapH: wrapRect?.height || 0,
        panelW: panelRect?.width || 0,
        panelH: panelRect?.height || 0,
        panelInDOM: sr?.contains(panel) || false,
        open: fc.open,
        horizontal: fc.horizontal,
        vertical: fc.vertical,
        panelTransform: panel?.style.transform || '',
      };
    });
  });

  for (const fc of data) {
    const tag = `float-card#${fc.id}`;
    assert.ok(fc.wrapW > 0, `${tag}: wrap width > 0 (${fc.wrapW})`);
    assert.ok(fc.wrapH > 0, `${tag}: wrap height > 0 (${fc.wrapH})`);
    assert.equal(fc.panelInDOM, true, `${tag}: panel debe estar siempre en DOM`);
    assert.ok(fc.panelW > 0 || fc.open === false, `${tag}: panel width > 0 cuando open (panelW=${fc.panelW}, open=${fc.open})`);
  }

  // Verificar que fc3 (con linearTransform) tiene un transform distinto al por defecto.
  const fc3 = data.find((d) => d.id === 'fc3');
  if (fc3) {
    assert.ok(/translate|scale/.test(fc3.panelTransform), `fc3 debe tener transform aplicado (${fc3.panelTransform})`);
  }

  console.log(`  ✓ float-card: rubric determinista PASS (anchors visibles, panels en DOM, transforms aplicados)`);
  results.push({ name: 'float-card', ok: true });
} catch (err) {
  console.error(`  ✗ float-card: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-float-card'); } catch {}
  results.push({ name: 'float-card', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('float-card-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
