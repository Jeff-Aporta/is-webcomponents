// palette-selector.stagehand.test.mjs — checks visuales deterministas.
// Foco: el trigger tiene tamaño clickeable, las opciones no se solapan,
// aria-selected coherente con la opción visible.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/palette-selector/palette-selector.html`;

const checks = [];

checks.push({
  name: 'layout: el trigger es clickeable (>24px en ambas dimensiones)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    const size = await page.evaluate(() => {
      const sel = document.querySelector('iswc-palette-selector');
      const t = sel.shadowRoot.querySelector('.trigger');
      const r = t.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    assert.ok(size.w >= 24 && size.h >= 24, `trigger debe ser >=24x24 (vimos ${size.w}x${size.h})`);
  },
});

checks.push({
  name: 'layout: las opciones del menú no se solapan entre sí',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(100);
    const overlaps = await page.evaluate(async () => {
      const sel = document.querySelector('iswc-palette-selector');
      const t = sel.shadowRoot.querySelector('.trigger');
      t.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const opts = [...sel.shadowRoot.querySelectorAll('[role="option"]')];
      const rects = opts.map((o) => o.getBoundingClientRect());
      const issues = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          const ox = a.x < b.x + b.width && b.x < a.x + a.width;
          const oy = a.y < b.y + b.height && b.y < a.y + a.height;
          if (ox && oy) issues.push({ i, j });
        }
      }
      return issues;
    });
    assert.equal(overlaps.length, 0, `opciones solapadas: ${JSON.stringify(overlaps)}`);
    await screenshot(page, 'palette-selector-layout');
  },
});

checks.push({
  name: 'consistencia: el trigger refleja el color de la paleta activa',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-palette-selector-ready');
    await page.waitForTimeout(100);
    const colors = await page.evaluate(async () => {
      const sel = document.querySelector('iswc-palette-selector');
      sel.value = 'cardenal';
      await new Promise((r) => setTimeout(r, 50));
      // La muestra del trigger pinta el main de la paleta activa (cardenal = hsl(0 74% 54%)).
      const chip = sel.shadowRoot.querySelector('.chip__main');
      return { color: getComputedStyle(chip).backgroundColor, label: sel.shadowRoot.querySelector('.trigger__label').textContent };
    });
    assert.match(colors.color, /rgb\(225,\s*51,\s*51\)/, `la muestra del trigger debe ser el rojo de cardenal (vimos "${colors.color}")`);
    assert.equal(colors.label, 'Cardenal');
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

report('palette-selector-stagehand', failures === 0, { total: checks.length, failures });
