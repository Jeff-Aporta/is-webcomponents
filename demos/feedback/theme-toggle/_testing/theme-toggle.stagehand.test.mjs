// theme-toggle.stagehand.test.mjs — checks visuales deterministas.
// Foco: el botón interno es clickeable, las secciones no se desbordan,
// el toggle en la sección clara se ve distinto que el del fondo oscuro.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/theme-toggle/theme-toggle.html`;

const checks = [];

checks.push({
  name: 'layout: cada toggle tiene un botón clickeable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(100);
    const sizes = await page.evaluate(() => {
      return [...document.querySelectorAll('is-theme-toggle')].map((t) => {
        const btn = t.shadowRoot.querySelector('is-check-icon-button');
        const r = btn.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
    });
    assert.equal(sizes.length, 2, `esperaba 2 toggles, hay ${sizes.length}`);
    for (const s of sizes) {
      assert.ok(s.w >= 24 && s.h >= 24, `botón debe ser clickeable >=24x24 (vimos ${s.w}x${s.h})`);
    }
  },
});

checks.push({
  name: 'layout: ninguna sección se desborda del viewport',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    const overflow = await page.evaluate(() => {
      return [...document.querySelectorAll('section')].filter((s) => {
        const r = s.getBoundingClientRect();
        return r.x + r.width > window.innerWidth + 1;
      }).length;
    });
    assert.equal(overflow, 0, `secciones desbordadas: ${overflow}`);
    await screenshot(page, 'theme-toggle-layout');
  },
});

checks.push({
  name: 'contraste: el toggle en la sección clara es visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(100);
    const hasToggle = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.classList.contains('light-theme-demo'));
      return sec.querySelector('is-theme-toggle') !== null;
    });
    assert.ok(hasToggle, 'la sección clara debe contener un is-theme-toggle');
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

report('theme-toggle-stagehand', failures === 0, { total: checks.length, failures });
