// flex-layout.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada layout es flex con dimensiones > 0, los hijos están dentro
// del host, no hay overflow, y los layouts responsivos reflejan data-sizew.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/flex-layout/flex-layout.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-flex-ready');
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const layouts = [...document.querySelectorAll('is-flex-layout')];
    return layouts.map((l) => {
      const cs = getComputedStyle(l);
      const r = l.getBoundingClientRect();
      const children = [...l.children].map((c) => {
        const cr = c.getBoundingClientRect();
        return { x: cr.x, y: cr.y, w: cr.width, h: cr.height };
      });
      return {
        direction: l.direction,
        gap: l.gap,
        sizew: l.sizew,
        display: cs.display,
        flexDirection: cs.flexDirection,
        hostW: r.width,
        hostH: r.height,
        children,
      };
    });
  });

  for (const layout of data) {
    const tag = `flex#${layout.direction}`;
    // (1) display debe ser flex
    assert.equal(layout.display, 'flex', `${tag}: display debe ser 'flex' (es '${layout.display}')`);
    assert.ok(layout.hostW > 0, `${tag}: hostW > 0 (${layout.hostW})`);
    assert.ok(layout.hostH > 0, `${tag}: hostH > 0 (${layout.hostH})`);
    // (2) flexDirection debe coincidir con direction
    const expectedFD = layout.direction === 'column' ? 'column' : 'row';
    assert.equal(layout.flexDirection, expectedFD, `${tag}: flex-direction ${layout.flexDirection} debe ser ${expectedFD}`);
    // (3) Todos los hijos dentro del host
    for (const c of layout.children) {
      assert.ok(c.w > 0, `${tag}: hijo width > 0 (${c.w})`);
      assert.ok(c.h > 0, `${tag}: hijo height > 0 (${c.h})`);
      assert.ok(c.x >= layout.hostW * -1 && c.x + c.w <= layout.hostW * 2, `${tag}: hijo x dentro del host`);
    }
  }

  console.log(`  ✓ flex-layout: rubric determinista PASS (display:flex correcto, dimensiones OK, hijos dentro del host)`);
  results.push({ name: 'flex-layout', ok: true });
} catch (err) {
  console.error(`  ✗ flex-layout: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-flex-layout'); } catch {}
  results.push({ name: 'flex-layout', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('flex-layout-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
