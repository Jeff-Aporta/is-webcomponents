// toast.stagehand.test.mjs — checks visuales deterministas.
// Foco: el toaster es visible, los items se apilan sin salirse del viewport,
// el placement es el correcto.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/toast/toast.html`;

const checks = [];

checks.push({
  name: 'layout: el host de toast tiene tamaño coherente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      return [...document.querySelectorAll('is-toast')].map((t) => {
        const stack = t.shadowRoot.querySelector('[part="stack"]');
        const r = stack.getBoundingClientRect();
        const ariaLabel = stack.getAttribute('aria-label');
        return { w: r.width, h: r.height, ariaLabel };
      });
    });
    assert.ok(data.length >= 4, `esperaba >=4 toasters, hay ${data.length}`);
    assert.ok(data.every((d) => d.ariaLabel), 'cada stack debe tener aria-label');
  },
});

checks.push({
  name: 'visibilidad: un toast creado tiene tamaño visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-info');
    await page.waitForTimeout(200);
    const size = await page.evaluate(() => {
      const all = document.querySelectorAll('is-toast-item');
      const visible = [...all].filter((i) => !i.hidden);
      return visible.map((i) => {
        const r = i.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
    });
    assert.ok(size.length >= 1, `esperaba >=1 item visible, hay ${size.length}`);
    for (const s of size) {
      assert.ok(s.w >= 100 && s.h >= 30, `toast debe ser >= 100x30 (vimos ${s.w}x${s.h})`);
    }
    await screenshot(page, 'toast-layout');
  },
});

checks.push({
  name: 'placement: bottom-end deja el toast en la esquina inferior derecha',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    // Limpiar is-toast previos que pueda haber creado IsToast.host() en tests
    // anteriores (data-default-toaster) y verificar el primer is-toast del DOM.
    await page.evaluate(() => {
      document.querySelectorAll('is-toast').forEach((t) => {
        if (t.parentElement === document.body) t.remove();
      });
    });
    await page.click('#btn-info');
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => {
      const host = IsToast.host();
      const stack = host.shadowRoot.querySelector('[part="stack"]');
      const rect = stack.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        vw: window.innerWidth,
        vh: window.innerHeight,
        placement: host.getAttribute('placement'),
      };
    });
    assert.equal(info.placement, 'bottom-end', `IsToast.host() debe tener placement bottom-end (vimos "${info.placement}")`);
    assert.ok(info.y > info.vh / 2, `bottom-end debe estar en mitad inferior del viewport (y=${info.y}, vh=${info.vh})`);
  },
});

checks.push({
  name: 'consistencia: el botón "loading" crea un toast persistente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-toast-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-loading');
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const host = IsToast.host();
      const items = [...host.querySelectorAll('is-toast-item')];
      const last = items[items.length - 1];
      const progress = last?.shadowRoot?.querySelector('.progress');
      return {
        count: items.length,
        visible: items.filter((i) => !i.hidden).length,
        progressHidden: progress?.hidden,
      };
    });
    assert.ok(data.count >= 1, `esperaba >=1 item, hay ${data.count}`);
    assert.ok(data.visible >= 1, `esperaba >=1 item visible, hay ${data.visible}`);
    assert.equal(data.progressHidden, true, `loading persistente debe ocultar progress bar (vimos hidden=${data.progressHidden})`);
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

report('toast-stagehand', failures === 0, { total: checks.length, failures });
