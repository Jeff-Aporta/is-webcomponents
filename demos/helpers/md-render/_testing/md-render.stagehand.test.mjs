// md-render.stagehand.test.mjs — checks deterministas visuales.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const DEMO = { url: `${BASE_URL}/demos/helpers/md-render/md-render.html`, readyAttr: 'data-md-render-ready', name: 'md-render' };

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('main is-md-render')].map((el, idx) => {
      const r = el.getBoundingClientRect();
      const body = el.shadowRoot.querySelector('.body');
      const cs = getComputedStyle(body ?? el);
      const fontSize = parseFloat(cs.fontSize);
      const text = body?.textContent ?? '';
      return { idx, x: r.x, y: r.y, w: r.width, h: r.height, text, fontSize };
    });
    return { items, viewportW: window.innerWidth };
  });

  for (const it of data.items) {
    assert.ok(it.x + it.w <= data.viewportW + 1, `#${it.idx} "${it.text.slice(0, 30)}" se sale del viewport`);
    assert.ok(it.x >= -1, `#${it.idx} arranca antes del viewport`);
    assert.ok(it.fontSize >= 10, `#${it.idx} font-size ${it.fontSize}px`);
  }

  // Cada sección tiene un cuerpo renderizado con fuente legible
  const rendered = data.items.filter((i) => i.text.length > 0);
  assert.equal(rendered.length, 5, `esperaba 5 secciones con texto (la 6ª usa placeholder), hay ${rendered.length}`);

  // Las secciones (rows) NO se solapan verticalmente
  const sorted = data.items.slice().sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    assert.ok(cur.y >= prev.y + prev.h - 0.5, `#${cur.idx} solapa con #${prev.idx}`);
  }

  console.log(`  ✓ ${DEMO.name}: ${data.items.length} secciones, ${rendered.length} renderizadas, sin overlap`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  report(DEMO.name, false, { error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

report(DEMO.name, true, { total: 1, failures: 0 });