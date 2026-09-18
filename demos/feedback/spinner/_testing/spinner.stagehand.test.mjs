// spinner.stagehand.test.mjs — checks visuales deterministas.
// Foco: los spinners respetan el width/height del host, son visibles,
// el indicador tiene border visible.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/spinner/spinner.html`;

const checks = [];

checks.push({
  name: 'layout: spinners respetan width/height del host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const sizes = await page.evaluate(() => {
      // Mide el HOST (no la inner .spinner, que puede tener border/padding).
      // Verifica que el inline style width/height se aplica al host.
      return [...document.querySelectorAll('is-spinner[style*="width"]')].map((s) => {
        const r = s.getBoundingClientRect();
        const inlineW = s.style.width;
        const inlineH = s.style.height;
        return { inlineW, inlineH, hostW: r.width, hostH: r.height };
      });
    });
    assert.ok(sizes.length === 3, `esperaba 3 spinners con style, hay ${sizes.length}`);
    for (const { inlineW, inlineH, hostW, hostH } of sizes) {
      const expectedW = parseFloat(inlineW);
      const expectedH = parseFloat(inlineH);
      // El host debe respetar el inline style (con tolerancia de sub-pixel).
      assert.ok(
        Math.abs(hostW - expectedW) < 1,
        `host.width (${hostW}) debe ≈ style.width (${expectedW})`,
      );
      assert.ok(
        Math.abs(hostH - expectedH) < 1,
        `host.height (${hostH}) debe ≈ style.height (${expectedH})`,
      );
    }
    // Verificamos que los tres tamaños son distintos y progresivamente más grandes.
    const widths = sizes.map((s) => s.hostW);
    assert.ok(widths[0] < widths[1] && widths[1] < widths[2],
      `los 3 spinners deben tener tamaños progresivamente más grandes (vi ${JSON.stringify(widths)})`);
    await screenshot(page, 'spinner-layout');
  },
});

checks.push({
  name: 'visibilidad: el indicador tiene borde visible (border-top-color)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const data = await page.evaluate(() => {
      const s = document.querySelectorAll('is-spinner')[0];
      const cs = getComputedStyle(s.shadowRoot.querySelector('.spinner'));
      return {
        borderTopWidth: cs.borderTopWidth,
        borderTopColor: cs.borderTopColor,
        borderTopStyle: cs.borderTopStyle,
      };
    });
    assert.notEqual(data.borderTopColor, 'rgba(0, 0, 0, 0)', `border-top debe tener color (vimos "${data.borderTopColor}")`);
    assert.notEqual(data.borderTopWidth, '0px', `border-top debe tener grosor (vimos "${data.borderTopWidth}")`);
    assert.equal(data.borderTopStyle, 'solid', `border-top debe ser solid (vimos "${data.borderTopStyle}")`);
  },
});

let failures = 0;
const { browser, page } = await newPage();
try {
  for (const t of checks) {
    try {
      await t.run(page);
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
      try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
    }
  }
} finally {
  await close({ browser, page });
}

report('spinner-stagehand', failures === 0, { total: checks.length, failures });
