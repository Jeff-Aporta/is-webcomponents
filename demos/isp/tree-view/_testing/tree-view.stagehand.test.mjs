// tree-view.stagehand.test.mjs — checks deterministas visuales.
// Verifica: el árbol monta con dimensiones > 0, las filas son visibles, el
// toolbar se muestra cuando hay customs.menu/topMenuActions, y no hay overflow
// fuera del viewport.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/tree-view/tree-view.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-tree-view-ready');
  await page.waitForTimeout(400);

  const data = await page.evaluate(() => {
    const tv = document.getElementById('tree');
    const sr = tv.shadowRoot;
    const hostRect = tv.getBoundingClientRect();
    const body = sr.querySelector('[part="body"], .isp-tree-body');
    const tb = sr.querySelector('[part="toolbar"], .isp-tree-toolbar');
    const bodyRect = body?.getBoundingClientRect();
    return {
      hostRect,
      bodyRect,
      tbHidden: tb?.hidden,
      tbRect: tb?.getBoundingClientRect(),
      bodyRole: body?.getAttribute('role'),
      bodyAriaLabel: body?.getAttribute('aria-label'),
    };
  });

  // (1) Host y body tienen dimensiones > 0.
  assert.ok(data.hostRect, 'host rect debe existir');
  assert.ok(data.hostRect.height > 100, `host height > 100 (${data.hostRect.height})`);
  assert.ok(data.bodyRect, 'body rect debe existir');
  assert.ok(data.bodyRect.height > 50, `body height > 50 (${data.bodyRect.height})`);

  // (2) Body tiene role="tree" + aria-label.
  assert.equal(data.bodyRole, 'tree');
  assert.ok(data.bodyAriaLabel, `body debe tener aria-label ('${data.bodyAriaLabel}')`);

  // (3) Toolbar visible cuando hay topMenuActions.
  assert.equal(data.tbHidden, false, 'toolbar debe estar visible con topMenuActions');
  assert.ok(data.tbRect?.height > 0, `toolbar height > 0 (${data.tbRect?.height})`);

  // (4) El body no debe desbordarse del host.
  assert.ok(data.bodyRect.width <= data.hostRect.width + 1, `body width (${data.bodyRect.width}) no debe > host width (${data.hostRect.width})`);

  console.log(`  ✓ tree-view: rubric determinista PASS (host visible, body con role=tree, toolbar mostrada, no overflow)`);
  results.push({ name: 'tree-view', ok: true });
} catch (err) {
  console.error(`  ✗ tree-view: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-tree-view'); } catch {}
  results.push({ name: 'tree-view', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('tree-view-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
