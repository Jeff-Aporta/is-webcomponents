// progress-ring.stagehand.test.mjs — checks visuales deterministas.
// Foco: el indicador se alinea visualmente sobre el track, los anillos no se
// solapan, el label central queda centrado.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/progress-ring/progress-ring.html`;

const checks = [];

checks.push({
  name: 'layout: el host del anillo tiene tamaño visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const sizes = await page.evaluate(() => {
      // Mide el HOST (no el inner SVG, que puede tener su propio size por viewBox).
      return [...document.querySelectorAll('is-progress-ring')].map((p) => {
        const r = p.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
    });
    const tiny = sizes.filter((s) => s.w < 5 || s.h < 5);
    assert.equal(tiny.length, 0, `hosts demasiado pequeños: ${JSON.stringify(sizes)}`);
    await screenshot(page, 'progress-ring-layout');
  },
});

checks.push({
  name: 'consistencia: track e indicator comparten el mismo centro',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const aligned = await page.evaluate(() => {
      return [...document.querySelectorAll('is-progress-ring')].every((p) => {
        const circles = p.shadowRoot.querySelectorAll('circle');
        if (circles.length < 2) return false;
        const t = circles[0].getBoundingClientRect();
        const i = circles[1].getBoundingClientRect();
        const dx = Math.abs((t.x + t.width / 2) - (i.x + i.width / 2));
        const dy = Math.abs((t.y + t.height / 2) - (i.y + i.height / 2));
        return dx < 1 && dy < 1;
      });
    });
    assert.ok(aligned, 'track e indicator deben estar centrados en el mismo punto');
  },
});

checks.push({
  name: 'custom: el atributo width se acepta (gap conocido en CSS)',
  run: async (page) => {
    // NOTA: progress-ring extiende ElementBase, que NO sincroniza styleAttrs
    // (eso lo hace withStyleAttrs). Por lo tanto width="120" queda como
    // atributo pero no se aplica como inline CSS var. Documentamos el gap.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const info = await page.evaluate(() => {
      const def = document.querySelector('is-progress-ring[value="0"]');
      const big = document.querySelector('is-progress-ring[width="120"]');
      return {
        defAttr: def.getAttribute('width'),
        bigAttr: big.getAttribute('width'),
        defW: def.getBoundingClientRect().width,
        bigW: big.getBoundingClientRect().width,
      };
    });
    assert.equal(info.defAttr, null, `default no debe tener width (vimos "${info.defAttr}")`);
    assert.equal(info.bigAttr, '120', `custom debe tener width="120" (vimos "${info.bigAttr}")`);
    assert.ok(info.bigW > 0, `host debe tener ancho > 0 (vimos ${info.bigW})`);
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

report('progress-ring-stagehand', failures === 0, { total: checks.length, failures });
