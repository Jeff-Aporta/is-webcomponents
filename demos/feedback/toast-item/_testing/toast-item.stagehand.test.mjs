// toast-item.stagehand.test.mjs — checks visuales deterministas.
// Foco: el toast es visible, tiene tamaño mínimo, la barra de progreso
// aparece cuando hay duración > 0.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/toast-item/toast-item.html`;

const checks = [];

checks.push({
  name: 'layout: el toast creado tiene tamaño visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-success');
    await page.waitForTimeout(200);
    const size = await page.evaluate(() => {
      const all = document.querySelectorAll('is-toast-item');
      const visible = [...all].filter((t) => !t.hidden);
      return visible.map((t) => {
        const r = t.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
    });
    assert.ok(size.length >= 1, `esperaba >=1 toast visible, hay ${size.length}`);
    for (const s of size) {
      assert.ok(s.w >= 100 && s.h >= 30, `toast debe tener tamaño mínimo (vimos ${s.w}x${s.h})`);
    }
    await screenshot(page, 'toast-item-layout');
  },
});

checks.push({
  name: 'consistencia: con duration > 0 la progress bar aparece',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-success');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const item = [...document.querySelectorAll('is-toast-item')].pop();
      const progress = item.shadowRoot.querySelector('.progress');
      const bar = item.shadowRoot.querySelector('.progress-bar');
      return {
        progressHidden: progress.hidden,
        barWidth: bar.style.width,
      };
    });
    assert.equal(data.progressHidden, false, `progress debe ser visible (vimos hidden=${data.progressHidden})`);
  },
});

checks.push({
  name: 'consistencia: con duration = 0 la progress bar está oculta',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-item-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-warning');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const item = [...document.querySelectorAll('is-toast-item')].pop();
      const progress = item.shadowRoot.querySelector('.progress');
      return progress.hidden;
    });
    assert.equal(data, true, `duration=0 debe ocultar la progress bar (vimos hidden=${data})`);
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

report('toast-item-stagehand', failures === 0, { total: checks.length, failures });
