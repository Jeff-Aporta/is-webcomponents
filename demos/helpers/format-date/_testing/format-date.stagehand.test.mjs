// format-date.stagehand.test.mjs — checks deterministas de calidad visual.
// Mismo patrón que er-stagehand: cero LLM, sin API keys, CI-friendly.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const DEMO = { url: `${BASE_URL}/demos/helpers/format-date/format-date.html`, readyAttr: 'data-format-date-ready', name: 'format-date' };

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await page.waitForTimeout(150);

  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('main is-format-date')].map((el, idx) => {
      const r = el.getBoundingClientRect();
      const t = el.shadowRoot.querySelector('time');
      const cs = getComputedStyle(t ?? el);
      return { idx, x: r.x, y: r.y, w: r.width, h: r.height, text: t?.textContent ?? '', fontSize: parseFloat(cs.fontSize) };
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
  }

  // 10 textos no vacíos + 1 vacío (fecha inválida)
  const empty = data.items.filter((i) => !i.text);
  assert.equal(empty.length, 1, `esperaba 1 texto vacío (fecha inválida), hay ${empty.length}`);

  console.log(`  ✓ ${DEMO.name}: ${data.items.length} filas, ${data.items.length - 1} formateadas, sin overlap, font-size OK`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  report(DEMO.name, false, { error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

report(DEMO.name, true, { total: 1, failures: 0 });