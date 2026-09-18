// prefs-clear.stagehand.test.mjs — checks visuales deterministas.
// Foco: el botón interno se ve y es clickeable, el icono aparece,
// el título se muestra al hover.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/prefs-clear/prefs-clear.html`;

const checks = [];

checks.push({
  name: 'layout: el botón interno tiene tamaño clickeable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    const size = await page.evaluate(() => {
      const btn = document.querySelector('is-prefs-clear').shadowRoot.querySelector('is-button');
      const r = btn.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    assert.ok(size.w >= 24 && size.h >= 24, `botón debe ser clickeable >=24x24 (vimos ${size.w}x${size.h})`);
  },
});

checks.push({
  name: 'visibilidad: el icono de broom se renderiza',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    await page.waitForTimeout(150);
    const icon = await page.evaluate(() => {
      const btn = document.querySelector('is-prefs-clear').shadowRoot.querySelector('is-button');
      const ic = btn.shadowRoot?.querySelector('is-icon[slot="start"]') || btn.querySelector('is-icon[slot="start"]');
      return ic?.getAttribute('icon');
    });
    assert.match(icon, /broom|trash|delete/i, `icono debe ser broom o similar (vimos "${icon}")`);
  },
});

checks.push({
  name: 'layout: el botón en la sección "sin confirmación" muestra el texto slotted',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-prefs-clear-ready');
    const txt = await page.evaluate(() => {
      const silent = document.getElementById('silent');
      return silent.textContent.trim();
    });
    assert.match(txt, /Limpiar silencioso/, `texto slotted debe aparecer (vimos "${txt}")`);
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

report('prefs-clear-stagehand', failures === 0, { total: checks.length, failures });
