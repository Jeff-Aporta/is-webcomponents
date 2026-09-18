// flex-options.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada toolbar es visible con dimensiones > 0, los botones pintados
// tienen tamaño coherente, el modo compact los hace más estrechos.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/flex-options/flex-options.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-flex-opts-ready');
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('is-flex-options')].map((el) => {
      const r = el.getBoundingClientRect();
      const sr = el.shadowRoot;
      const tb = sr?.querySelector('[part="toolbar"], .toolbar');
      const tbRect = tb?.getBoundingClientRect();
      const btns = [...(sr?.querySelectorAll('is-button') || [])];
      return {
        id: el.id,
        compact: el.compact,
        hostW: r.width,
        hostH: r.height,
        tbW: tbRect?.width || 0,
        tbH: tbRect?.height || 0,
        btnCount: btns.length,
        btnWidths: btns.map((b) => b.getBoundingClientRect().width),
      };
    });
  });

  for (const tb of data) {
    const tag = `flex-opts#${tb.id}`;
    assert.ok(tb.tbW > 0, `${tag}: toolbar width > 0 (${tb.tbW})`);
    assert.ok(tb.tbH > 0, `${tag}: toolbar height > 0 (${tb.tbH})`);
    assert.ok(tb.btnCount > 0, `${tag}: debe haber al menos 1 botón (hay ${tb.btnCount})`);
    for (const w of tb.btnWidths) {
      assert.ok(w > 0, `${tag}: cada botón debe tener width > 0 (${w})`);
    }
  }

  // Verificar que compact produce botones más estrechos (sin labels).
  const compact1 = data.find((d) => d.id === 'opts3');
  const normal1 = data.find((d) => d.id === 'opts1');
  if (compact1 && normal1) {
    const avgCompact = compact1.btnWidths.reduce((a, b) => a + b, 0) / compact1.btnWidths.length;
    const avgNormal = normal1.btnWidths.reduce((a, b) => a + b, 0) / normal1.btnWidths.length;
    assert.ok(avgCompact < avgNormal, `compact (${avgCompact}) debe ser más estrecho que normal (${avgNormal})`);
  }

  console.log(`  ✓ flex-options: rubric determinista PASS (toolbars visibles, botones con tamaño > 0, compact más estrecho)`);
  results.push({ name: 'flex-options', ok: true });
} catch (err) {
  console.error(`  ✗ flex-options: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-flex-options'); } catch {}
  results.push({ name: 'flex-options', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('flex-options-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
