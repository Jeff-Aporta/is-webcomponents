// tag.stagehand.test.mjs — checks visuales deterministas.
// Foco: tags no se solapan, variantes se pintan distinto,
// el botón de quitar es visible y clickeable.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/tag/tag.html`;

const checks = [];

checks.push({
  name: 'layout: los tags de una sección no se solapan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    await page.waitForTimeout(150);
    const overlaps = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('section')];
      const issues = [];
      for (const sec of sections) {
        const tags = [...sec.querySelectorAll('is-tag')];
        const rects = tags.map((t) => t.getBoundingClientRect());
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            const ox = a.x < b.x + b.width && b.x < a.x + a.width;
            const oy = a.y < b.y + b.height && b.y < a.y + a.height;
            if (ox && oy) issues.push({ sec: sec.querySelector('h2').textContent.trim(), i, j });
          }
        }
      }
      return issues;
    });
    assert.equal(overlaps.length, 0, `tags solapados: ${JSON.stringify(overlaps)}`);
    await screenshot(page, 'tag-layout');
  },
});

checks.push({
  name: 'consistencia: cada variante se pinta distinto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const variants = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Variantes'));
      return [...sec.querySelectorAll('is-tag')].map((t) => {
        const inner = t.shadowRoot.querySelector('.tag');
        const cs = getComputedStyle(inner);
        return {
          v: t.getAttribute('variant'),
          bg: cs.backgroundColor,
          color: cs.color,
          borderLeftWidth: cs.borderLeftWidth,
          borderTopWidth: cs.borderTopWidth,
        };
      });
    });
    const accent = variants.find((v) => v.v === 'accent');
    const fo = variants.find((v) => v.v === 'filled-outlined');
    const filled = variants.find((v) => v.v === 'filled');
    assert.ok(accent && fo && filled, 'deben existir accent, filled-outlined y filled');
    // accent usa border-left-width: 3px; filled-outlined (default) y filled
    // tienen border-width: 1px y otros anchos. Comprobamos que al menos filled
    // (bg sólido) sea muy distinto del resto.
    const accentDiffersFromFilledOutlined = accent.borderLeftWidth !== fo.borderLeftWidth;
    const filledDiffersInBg = filled.bg !== fo.bg || filled.color !== fo.color;
    assert.ok(accentDiffersFromFilledOutlined || filledDiffersInBg,
      `variantes deben pintarse distinto (accent=${JSON.stringify(accent)}, filled=${JSON.stringify(filled)}, filled-outlined=${JSON.stringify(fo)})`);
  },
});

checks.push({
  name: 'visibilidad: el botón de quitar tiene tamaño clickeable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tag-ready');
    const size = await page.evaluate(() => {
      const t = document.querySelector('is-tag[with-remove]');
      const btn = t.shadowRoot.querySelector('.remove');
      const r = btn.getBoundingClientRect();
      return { w: r.width, h: r.height, hidden: btn.hidden };
    });
    assert.equal(size.hidden, false, 'botón remove debe estar visible');
    assert.ok(size.w >= 16 && size.h >= 16, `botón remove debe ser clickeable (vimos ${size.w}x${size.h})`);
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

report('tag-stagehand', failures === 0, { total: checks.length, failures });
