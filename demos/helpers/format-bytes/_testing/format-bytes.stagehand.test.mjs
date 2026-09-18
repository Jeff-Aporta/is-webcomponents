// format-bytes.stagehand.test.mjs — checks deterministas de calidad visual
// para el demo de <is-format-bytes>. Mismo patrón que er-stagehand.test.mjs:
// cero LLM, sin API keys, CI-friendly.
//
// Verificaciones:
//   1. Todos los <is-format-bytes> están en el viewport horizontal.
//   2. Las filas de la tabla no se solapan verticalmente.
//   3. Los textos son legibles (font-size >= 10px, no vacíos).
//   4. Las unidades (KB/MB/GB) se muestran en todos los elementos esperados.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const DEMO = { url: `${BASE_URL}/demos/helpers/format-bytes/format-bytes.html`, readyAttr: 'data-format-bytes-ready', name: 'format-bytes' };

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);

  await page.waitForTimeout(150);

  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('main is-format-bytes')].map((el, idx) => {
      const r = el.getBoundingClientRect();
      const text = el.shadowRoot.querySelector('span')?.textContent ?? '';
      const cs = getComputedStyle(el.shadowRoot.querySelector('span'));
      return { idx, x: r.x, y: r.y, w: r.width, h: r.height, text, fontSize: parseFloat(cs.fontSize) };
    });
    return { items, viewportW: window.innerWidth };
  });

  // (1) EN VIEWPORT HORIZONTALMENTE
  for (const it of data.items) {
    assert.ok(
      it.x + it.w <= data.viewportW + 1,
      `#${it.idx} "${it.text}" se sale del viewport (${(it.x + it.w).toFixed(1)} > ${data.viewportW})`,
    );
    assert.ok(it.x >= -1, `#${it.idx} "${it.text}" arranca antes del viewport (${it.x.toFixed(1)})`);
  }

  // (2) NO OVERLAP VERTICAL
  const sorted = data.items.slice().sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    assert.ok(
      cur.y >= prev.y + prev.h - 0.5,
      `fila #${cur.idx} (y=${cur.y.toFixed(1)}) solapa con #${prev.idx} (y=${prev.y.toFixed(1)}, h=${prev.h.toFixed(1)})`,
    );
  }

  // (3) TEXTOS LEGIBLES
  for (const it of data.items) {
    assert.ok(it.text.length > 0, `#${it.idx} texto vacío`);
    assert.ok(it.fontSize >= 10, `#${it.idx} font-size demasiado pequeño: ${it.fontSize}px`);
  }

  // (4) UNIDADES PRESENTES
  const kb = data.items.filter((i) => i.text.includes('KB'));
  const mb = data.items.filter((i) => i.text.includes('MB'));
  const gb = data.items.filter((i) => i.text.includes('GB'));
  assert.ok(kb.length >= 3, `esperaba >=3 elementos con KB, hay ${kb.length}`);
  assert.ok(mb.length >= 2, `esperaba >=2 elementos con MB, hay ${mb.length}`);
  assert.ok(gb.length >= 1, `esperaba >=1 elemento con GB, hay ${gb.length}`);

  console.log(`  ✓ ${DEMO.name}: ${data.items.length} filas renderizadas, ${kb.length} KB · ${mb.length} MB · ${gb.length} GB, sin overlap, font-size OK`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  report(DEMO.name, false, { error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

report(DEMO.name, true, { total: 1, failures: 0 });