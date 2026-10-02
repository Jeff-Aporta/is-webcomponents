// cdn-snippet.test.mjs — tests del demo iswc-cdn-snippet.
// Cobertura: smoke + el snippet carga solo el tag + deps + a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/cdn-snippet/cdn-snippet.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta y muestra el snippet del loader',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const el = document.querySelector('iswc-cdn-snippet');
      const root = el.shadowRoot;
      const loaderCode = root.querySelector('iswc-code[data-slot="loader"]');
      return {
        defined: !!customElements.get('iswc-cdn-snippet'),
        hasLoader: !!loaderCode,
        loaderText: (loaderCode?.value || loaderCode?.textContent || '').trim(),
      };
    });
    assert.equal(data.defined, true, 'iswc-cdn-snippet debe estar definido');
    assert.ok(data.hasLoader, 'debe haber un iswc-code[data-slot=loader]');
    assert.ok(/loader\.min\.js/.test(data.loaderText), `snippet debe mencionar loader.min.js (vimos: "${data.loaderText.slice(0, 80)}…")`);
    assert.ok(/loadCSSBase|loadCSSPalettes|load\(/.test(data.loaderText), `snippet debe incluir líneas de loadCSS o load()`);
    await screenshot(page, 'cdn-snippet-smoke');
  },
});

tests.push({
  name: 'funcional: no hay radio de alcance y el snippet carga el tag',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('iswc-cdn-snippet');
      const root = el.shadowRoot;
      const loaderCode = root.querySelector('iswc-code[data-slot="loader"]');
      return {
        scope: !!root.querySelector('[data-slot="scope"], input[name="cdn-scope"]'),
        loader: (loaderCode?.value || loaderCode?.textContent || '').trim(),
      };
    });
    assert.equal(data.scope, false, 'el panel no debe mostrar alcance de la carga');
    assert.ok(/load\(\s*"iswc-cdn-snippet-demo"\s*\)/.test(data.loader), `snippet debe contener load del tag (vimos: ${data.loader.slice(0, 200)}…)`);
    assert.ok(!/load\(\s*"(?:feedback|all)"\s*\)/.test(data.loader), 'el snippet no carga categoria ni all');
  },
});

tests.push({
  name: 'funcional: dependencias declaradas vía slot config se renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(300);
    const deps = await page.evaluate(() => {
      const el = document.querySelector('iswc-cdn-snippet');
      const root = el.shadowRoot;
      const rows = root.querySelectorAll('[data-kind="dep"]:not([hidden])');
      return [...rows].map((r) => r.querySelector('[data-slot="dep-name"]')?.textContent?.trim());
    });
    assert.ok(deps.length >= 2, `esperaba >=2 deps renderizadas, hay ${deps.length}`);
    assert.ok(deps.some((d) => d?.includes('iswc-code')), `deps deben incluir iswc-code, se vio ${JSON.stringify(deps)}`);
    assert.ok(deps.some((d) => d?.includes('iswc-button')), `deps deben incluir iswc-button, se vio ${JSON.stringify(deps)}`);
  },
});

tests.push({
  name: 'accesibilidad: el panel tiene role/heading accesibles',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    const data = await page.evaluate(() => {
      const el = document.querySelector('iswc-cdn-snippet');
      const root = el.shadowRoot;
      const section = root.querySelector('section.cdn');
      return {
        ariaLabel: section?.getAttribute('aria-label'),
        hasTitle: !!root.querySelector('.cdn__title'),
        hasLegend: !!root.querySelector('.cdn__scope-legend'),
      };
    });
    assert.ok(data.ariaLabel, `sección principal debe tener aria-label`);
    assert.ok(data.hasTitle, 'debe haber un título visible');
    assert.equal(data.hasLegend, false, 'no debe quedar el fieldset de alcance');
  },
});

let failures = 0;
for (const t of tests) {
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('cdn-snippet', failures === 0, { total: tests.length, failures });
