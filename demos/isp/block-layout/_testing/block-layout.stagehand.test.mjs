// block-layout.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada bloque tiene dimensiones > 0, --clientw cuadra con width,
// data-sizew está presente, y los breakpoints encajan con la escalera esperada.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/block-layout/block-layout.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-block-ready');
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('is-block-layout')];
    return hosts.map((h, idx) => {
      const r = h.getBoundingClientRect();
      const clientw = parseFloat(h.style.getPropertyValue('--clientw')) || 0;
      return {
        idx,
        id: h.id,
        sizew: h.sizew,
        boolszw: h.boolszw,
        rectW: r.width,
        rectH: r.height,
        clientwVar: clientw,
        getWidth: h.getWidth(),
      };
    });
  });

  for (const h of data) {
    const tag = `block#${h.id || h.idx}`;
    // (1) Dimensiones positivas
    assert.ok(h.rectW > 0, `${tag}: rect.width > 0 (${h.rectW})`);
    assert.ok(h.rectH > 0, `${tag}: rect.height > 0 (${h.rectH})`);
    // (2) --clientw coherente con getWidth()
    assert.ok(Math.abs(h.clientwVar - h.getWidth()) < 2, `${tag}: --clientw (${h.clientwVar}) ≈ getWidth (${h.getWidth()})`);
    // (3) data-sizew encaja con la escalera de breakpoints
    const w = h.getWidth();
    let expected;
    if (w < 480) expected = 'xs';
    else if (w <= 600) expected = 'sm';
    else if (w <= 800) expected = 'md';
    else if (w < 1200) expected = 'lg';
    else expected = 'xl';
    assert.equal(h.sizew, expected, `${tag}: sizew (${h.sizew}) debe encajar con width (${w}px → ${expected})`);
    // (4) boolszw acumulativo: xs siempre true; xl true sólo si sizew=xl
    assert.equal(h.boolszw.xs, true, `${tag}: boolszw.xs siempre true`);
    assert.equal(h.boolszw.xl, h.sizew === 'xl', `${tag}: boolszw.xl coherente con sizew`);
  }

  console.log(`  ✓ block-layout: rubric determinista PASS (dimensiones OK, --clientw coherente, sizew encaja con escalera)`);
  results.push({ name: 'block-layout', ok: true });
} catch (err) {
  console.error(`  ✗ block-layout: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-block-layout'); } catch {}
  results.push({ name: 'block-layout', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('block-layout-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
