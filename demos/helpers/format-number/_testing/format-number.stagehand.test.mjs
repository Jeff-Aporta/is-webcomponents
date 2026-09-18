// format-number.stagehand.test.mjs — checks deterministas de calidad visual.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const DEMO = { url: `${BASE_URL}/demos/helpers/format-number/format-number.html`, readyAttr: 'data-format-number-ready', name: 'format-number' };

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await page.waitForTimeout(150);

  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('main is-format-number')].map((el, idx) => {
      const r = el.getBoundingClientRect();
      const span = el.shadowRoot.querySelector('span');
      const cs = getComputedStyle(span ?? el);
      return { idx, x: r.x, y: r.y, w: r.width, h: r.height, text: span?.textContent ?? '', fontSize: parseFloat(cs.fontSize) };
    });
    return { items, viewportW: window.innerWidth };
  });

  for (const it of data.items) {
    assert.ok(it.x + it.w <= data.viewportW + 1, `#${it.idx} "${it.text}" se sale del viewport`);
    assert.ok(it.x >= -1, `#${it.idx} arranca antes del viewport`);
  }

  const sorted = data.items.slice().sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    assert.ok(cur.y >= prev.y + prev.h - 0.5, `fila #${cur.idx} solapa con #${prev.idx}`);
  }

  for (const it of data.items) {
    assert.ok(it.fontSize >= 10, `#${it.idx} font-size ${it.fontSize}px`);
    assert.ok(it.text.length > 0, `#${it.idx} texto vacío`);
  }

  console.log(`  ✓ ${DEMO.name}: ${data.items.length} filas, sin overlap, font-size OK`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  report(DEMO.name, false, { error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

report(DEMO.name, true, { total: 1, failures: 0 });