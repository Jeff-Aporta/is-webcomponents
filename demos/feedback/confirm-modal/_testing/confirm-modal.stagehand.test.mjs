// confirm-modal.stagehand.test.mjs — checks visuales deterministas.
// Foco: modal visible y centrado, no overflow fuera del viewport, encabezado
// y mensaje legibles, backdrop con opacidad > 0 cuando está abierto.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/confirm-modal/confirm-modal.html`;

const checks = [];

checks.push({
  name: 'layout: el modal abierto queda centrado en el viewport',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      const modal = m.shadowRoot.querySelector('.modal');
      const rect = modal.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      return {
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        cx, cy, vw, vh,
      };
    });
    const dx = Math.abs(info.cx - info.vw / 2);
    const dy = Math.abs(info.cy - info.vh / 2);
    assert.ok(dx < 40, `modal debe estar centrado horizontalmente (desviación ${dx}px)`);
    assert.ok(dy < 40, `modal debe estar centrado verticalmente (desviación ${dy}px)`);
    assert.ok(info.rect.w > 100 && info.rect.h > 80, `modal debe tener tamaño mínimo razonable (vimos ${JSON.stringify(info.rect)})`);
    await screenshot(page, 'confirm-modal-layout');
  },
});

checks.push({
  name: 'layout: el modal no se sale del viewport',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const inside = await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      const r = m.shadowRoot.querySelector('.modal').getBoundingClientRect();
      return r.x >= 0 && r.y >= 0 && r.x + r.width <= window.innerWidth && r.y + r.height <= window.innerHeight;
    });
    assert.ok(inside, 'el modal debe quedar dentro del viewport');
  },
});

checks.push({
  name: 'visibilidad: el backdrop es opaco cuando el modal está abierto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const bg = await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      const backdrop = m.shadowRoot.querySelector('.backdrop');
      const cs = getComputedStyle(backdrop);
      return {
        display: cs.display,
        bgImage: cs.backgroundImage || cs.backgroundColor,
        opacity: cs.opacity,
      };
    });
    assert.notEqual(bg.display, 'none', `backdrop debe estar visible (display=${bg.display})`);
    assert.ok(bg.opacity === '' || parseFloat(bg.opacity) > 0, `backdrop debe tener opacidad > 0 (era "${bg.opacity}")`);
  },
});

checks.push({
  name: 'tipografía: heading y mensaje tienen texto no vacío',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-confirm-modal-ready');
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('btn-open-1').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const txt = await page.evaluate(() => {
      const m = document.querySelectorAll('is-confirm-modal')[0];
      const heading = m.shadowRoot.querySelector('.heading');
      const message = m.shadowRoot.querySelector('.message-text');
      return {
        heading: heading.textContent.trim(),
        message: message.textContent.trim(),
      };
    });
    assert.ok(txt.heading.length > 0, 'heading debe tener texto');
    assert.ok(txt.message.length > 0, 'message debe tener texto');
    assert.ok(txt.heading.length > 5, `heading debe ser descriptivo (vimos "${txt.heading}")`);
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

report('confirm-modal-stagehand', failures === 0, { total: checks.length, failures });
