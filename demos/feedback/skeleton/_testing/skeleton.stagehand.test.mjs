// skeleton.stagehand.test.mjs — checks visuales deterministas.
// Foco: los skeletons respetan el tamaño CSS del host, son visibles,
// la tarjeta con varios queda coherente.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/skeleton/skeleton.html`;

const checks = [];

checks.push({
  name: 'layout: el indicator respeta width/height del host',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const sizes = await page.evaluate(() => {
      return [...document.querySelectorAll('is-skeleton')].slice(0, 5).map((s) => {
        const outer = s.getBoundingClientRect();
        const inner = s.shadowRoot.querySelector('.indicator').getBoundingClientRect();
        return {
          ow: outer.width, oh: outer.height,
          iw: inner.width, ih: inner.height,
        };
      });
    });
    for (const { ow, oh, iw, ih } of sizes) {
      assert.ok(Math.abs(ow - iw) < 2, `ancho indicator (${iw}) debe ≈ host (${ow})`);
      assert.ok(Math.abs(oh - ih) < 2, `alto indicator (${ih}) debe ≈ host (${oh})`);
    }
    await screenshot(page, 'skeleton-layout');
  },
});

checks.push({
  name: 'visibilidad: el indicator tiene background no transparente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    await page.waitForTimeout(150);
    const bg = await page.evaluate(() => {
      // El connectedCallback setea effect="sheen" si no existe, así que
      // buscamos el primer skeleton con effect explícito (sheen por default).
      const s = document.querySelector('is-skeleton');
      const cs = getComputedStyle(s.shadowRoot.querySelector('.indicator'));
      return {
        bgColor: cs.backgroundColor,
        bgImage: cs.backgroundImage,
      };
    });
    assert.ok(bg.bgColor !== 'rgba(0, 0, 0, 0)', `indicator debe tener color de fondo (vimos "${bg.bgColor}")`);
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

report('skeleton-stagehand', failures === 0, { total: checks.length, failures });
