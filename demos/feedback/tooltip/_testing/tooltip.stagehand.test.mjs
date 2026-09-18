// tooltip.stagehand.test.mjs — checks visuales deterministas.
// Foco: el tooltip abierto aparece cerca del target, no se sale del viewport,
// la flecha (arrow) aparece cuando without-arrow no está presente.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/tooltip/tooltip.html`;

const checks = [];

checks.push({
  name: 'layout: tooltip abierto queda cerca del target y dentro del viewport',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(async () => {
      const tt = document.getElementById('tt5');
      tt.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      await new Promise((r) => requestAnimationFrame(() => r()));
      const tip = tt.shadowRoot.querySelector('.tooltip');
      const target = document.getElementById('t5');
      const tRect = target.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return {
        target: { x: tRect.x, y: tRect.y, w: tRect.width, h: tRect.height },
        tip: { x: tipRect.x, y: tipRect.y, w: tipRect.width, h: tipRect.height },
        vw, vh,
        insideX: tipRect.x >= 0 && tipRect.x + tipRect.width <= vw,
        insideY: tipRect.y >= 0 && tipRect.y + tipRect.height <= vh,
        // placement default = top → tip debe estar arriba del target
        tipAbove: tipRect.y < tRect.y + tRect.height / 2,
      };
    });
    assert.ok(info.insideX, `tooltip horizontal dentro del viewport (x=${info.tip.x}, w=${info.tip.w}, vw=${info.vw})`);
    assert.ok(info.insideY, `tooltip vertical dentro del viewport (y=${info.tip.y}, h=${info.tip.h}, vh=${info.vh})`);
    assert.ok(info.tipAbove, `placement=top debe colocar tooltip arriba del target (tip.y=${info.tip.y}, target.y+h=${info.target.y + info.target.h})`);
    await screenshot(page, 'tooltip-layout');
  },
});

checks.push({
  name: 'visibilidad: el tooltip tiene tamaño mínimo (>20px)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const size = await page.evaluate(async () => {
      const tt = document.getElementById('tt5');
      tt.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const tip = tt.shadowRoot.querySelector('.tooltip');
      const r = tip.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    assert.ok(size.w >= 20 && size.h >= 20, `tooltip debe ser >=20x20 (vimos ${size.w}x${size.h})`);
  },
});

checks.push({
  name: 'arrow: without-arrow elimina el arrow del DOM',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(async () => {
      const tt = document.querySelectorAll('is-tooltip')[1]; // t2 (without-arrow)
      tt.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const arrow = tt.shadowRoot.querySelector('[part="base__arrow"]');
      return { hasArrow: !!arrow };
    }).catch(() => ({ hasArrow: null }));
    // Fallback por si el closure tuvo el error de sintaxis original
    const data2 = data.hasArrow === null ? await page.evaluate(async () => {
      const tt = document.querySelectorAll('is-tooltip')[1];
      tt.show();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const floating = tt.shadowRoot.querySelector('is-floating');
      const arrow = floating?.shadowRoot?.querySelector('[part="arrow"]') || tt.shadowRoot.querySelector('[part="base__arrow"]');
      return { hasArrow: !!arrow };
    }) : data;
    assert.equal(data2.hasArrow, false, `without-arrow debe ocultar la flecha (hasArrow=${data2.hasArrow})`);
  },
});

checks.push({
  name: 'visibilidad: el tooltip manual se queda visible hasta hide()',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-tooltip-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(async () => {
      const tt = document.getElementById('tt5');
      tt.show();
      await new Promise((r) => setTimeout(r, 500)); // más que showDelay
      const visibleAfter500ms = tt.hasAttribute('open');
      tt.hide();
      await new Promise((r) => requestAnimationFrame(() => r()));
      return { visibleAfter500ms, afterHide: tt.hasAttribute('open') };
    });
    assert.equal(data.visibleAfter500ms, true, `tooltip manual debe seguir visible tras 500ms (vimos ${data.visibleAfter500ms})`);
    assert.equal(data.afterHide, false, `hide() debe cerrar (vimos ${data.afterHide})`);
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

report('tooltip-stagehand', failures === 0, { total: checks.length, failures });
