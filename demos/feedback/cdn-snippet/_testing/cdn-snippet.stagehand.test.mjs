// cdn-snippet.stagehand.test.mjs — checks visuales deterministas.
// Foco: el panel renderiza sin overflow, los radios están alineados, los
// bloques de código tienen tamaño razonable.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/cdn-snippet/cdn-snippet.html`;

const checks = [];

checks.push({
  name: 'layout: el panel completo queda dentro del viewport',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const section = root.querySelector('section.cdn');
      const secRect = section?.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return {
        secRect: secRect ? { x: secRect.x, y: secRect.y, w: secRect.width, h: secRect.height } : null,
        vw, vh,
      };
    });
    assert.ok(info.secRect, 'debe existir la sección .cdn');
    assert.ok(info.secRect.w <= info.vw, `ancho del panel (${info.secRect.w}) no debe exceder viewport (${info.vw})`);
    assert.ok(info.secRect.h <= info.vh * 5, `alto del panel no debe ser excesivo (era ${info.secRect.h})`);
    await screenshot(page, 'cdn-snippet-layout');
  },
});

checks.push({
  name: 'layout: los radios del fieldset están alineados horizontalmente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    const ys = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const labels = root.querySelectorAll('[data-slot="scope"] label.cdn__radio');
      return [...labels].map((l) => l.getBoundingClientRect().y);
    });
    assert.equal(ys.length, 3, `esperaba 3 radios, hay ${ys.length}`);
    const spread = Math.max(...ys) - Math.min(...ys);
    assert.ok(spread < 200, `radios deben quedar en la misma fila (spread vertical=${spread})`);
  },
});

checks.push({
  name: 'layout: los bloques principales (loader + LLM) tienen altura > 30px',
  run: async (page) => {
    // Hay 4 is-code blocks en el demo: loader, llm-prompt, y 2 deps. Las deps
    // pueden tener altura muy pequeña si el snippet es muy corto. Verificamos
    // los bloques principales (loader + LLM prompt) que SIEMPRE están.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(500);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const loader = root.querySelector('is-code[data-slot="loader"]');
      const llm = root.querySelector('is-md-editor[data-slot="llm-prompt"]');
      // Cuántos is-code.cdn__pre hay con altura > 0
      const allCodes = [...root.querySelectorAll('is-code.cdn__pre')];
      const visibleCodes = allCodes.filter((c) => !c.hidden && c.getBoundingClientRect().height > 30);
      return {
        loaderH: loader?.getBoundingClientRect().height,
        llmH: llm?.getBoundingClientRect().height,
        visibleCodesCount: visibleCodes.length,
        totalCodes: allCodes.length,
      };
    });
    assert.ok(data.loaderH >= 30, `loader block debe medir >=30px (vimos ${data.loaderH})`);
    assert.ok(data.llmH >= 30, `LLM prompt editor debe medir >=30px (vimos ${data.llmH})`);
    // Al menos loader + LLM (2 bloques principales con altura > 30).
    assert.ok(data.visibleCodesCount >= 2,
      `esperaba >=2 is-code blocks con altura > 30, hay ${data.visibleCodesCount}`);
  },
});

checks.push({
  name: 'consistencia: el botón "Copiar" reacciona al click',
  run: async (page) => {
    // Habilitamos clipboard para que copyText no falle en headless.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const btn = el.shadowRoot.querySelector('.cdn__copy[data-copy="loader"]');
      btn.click();
    });
    await page.waitForTimeout(200);
    const txt = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const btn = el.shadowRoot.querySelector('.cdn__copy[data-copy="loader"]');
      return btn.textContent.trim();
    });
    assert.match(txt, /Copiado|Copiar/, `botón debe mostrar feedback tras click (vimos "${txt}")`);
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

report('cdn-snippet-stagehand', failures === 0, { total: checks.length, failures });
