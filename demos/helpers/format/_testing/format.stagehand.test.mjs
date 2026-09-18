// format.stagehand.test.mjs — checks deterministas visuales.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const DEMO = { url: `${BASE_URL}/demos/helpers/format/format.html`, readyAttr: 'data-format-ready', name: 'format' };

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('main is-format')].map((el, idx) => {
      const r = el.getBoundingClientRect();
      const span = el.shadowRoot.querySelector('span') ?? el.shadowRoot.querySelector('time');
      const cs = getComputedStyle(span ?? el);
      return { idx, x: r.x, y: r.y, w: r.width, h: r.height, text: span?.textContent ?? '', fontSize: parseFloat(cs.fontSize), type: el.dataset.type };
    });
    return { items, viewportW: window.innerWidth };
  });

  for (const it of data.items) {
    assert.ok(it.x + it.w <= data.viewportW + 1, `#${it.idx} "${it.text}" se sale del viewport`);
    assert.ok(it.x >= -1, `#${it.idx} arranca antes del viewport`);
    assert.ok(it.fontSize >= 10, `#${it.idx} font-size ${it.fontSize}px`);
  }

  // Headers de sección NO se solapan con filas.
  const sorted = data.items.slice().sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    assert.ok(cur.y >= prev.y + prev.h - 0.5, `fila #${cur.idx} (y=${cur.y.toFixed(1)}) solapa con #${prev.idx} (y=${prev.y.toFixed(1)}, h=${prev.h.toFixed(1)})`);
  }

  // Cada tipo presente
  const types = new Set(data.items.map((i) => i.type));
  assert.ok(types.has('date'), 'debe haber items tipo date');
  assert.ok(types.has('number'), 'debe haber items tipo number');
  assert.ok(types.has('bytes'), 'debe haber items tipo bytes');
  assert.ok(types.has('relative'), 'debe haber items tipo relative');
  assert.ok(types.has('text'), 'debe haber items tipo text');

  console.log(`  ✓ ${DEMO.name}: ${data.items.length} items, 5 secciones (date/number/bytes/relative/text), sin overlap`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  report(DEMO.name, false, { error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

report(DEMO.name, true, { total: 1, failures: 0 });