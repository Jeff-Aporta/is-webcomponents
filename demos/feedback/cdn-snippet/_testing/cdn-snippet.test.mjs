// cdn-snippet.test.mjs — tests del demo is-cdn-snippet.
// Cobertura: smoke + funcional (alcance tag/category/all + URL ?s= persistencia)
// + deps list + accesibilidad básica del panel.
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
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const loaderCode = root.querySelector('is-code[data-slot="loader"]');
      return {
        defined: !!customElements.get('is-cdn-snippet'),
        hasLoader: !!loaderCode,
        loaderText: (loaderCode?.value || loaderCode?.textContent || '').trim(),
      };
    });
    assert.equal(data.defined, true, 'is-cdn-snippet debe estar definido');
    assert.ok(data.hasLoader, 'debe haber un is-code[data-slot=loader]');
    assert.ok(/loader\.min\.js/.test(data.loaderText), `snippet debe mencionar loader.min.js (vimos: "${data.loaderText.slice(0, 80)}…")`);
    assert.ok(/loadCSSBase|loadCSSPalettes|load\(/.test(data.loaderText), `snippet debe incluir líneas de loadCSS o load()`);
    await screenshot(page, 'cdn-snippet-smoke');
  },
});

tests.push({
  name: 'funcional: el fieldset de alcance aparece con tag+category',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const fs = root.querySelector('[data-slot="scope"]');
      const checked = root.querySelector('input[name="cdn-scope"]:checked');
      return {
        hidden: fs?.hidden ?? true,
        checkedValue: checked?.value,
        tagCode: root.querySelector('[data-slot="scope-tag"]')?.textContent?.trim(),
        catCode: root.querySelector('[data-slot="scope-cat"]')?.textContent?.trim(),
      };
    });
    assert.equal(data.hidden, false, 'fieldset debe estar visible cuando hay tag+category');
    assert.equal(data.tagCode, 'is-cdn-snippet-demo', `slot scope-tag debe reflejar el tag (vimos "${data.tagCode}")`);
    assert.equal(data.catCode, 'feedback', `slot scope-cat debe reflejar la categoría (vimos "${data.catCode}")`);
    assert.ok(['tag', 'category', 'all'].includes(data.checkedValue), `radio marcado debe ser uno de los scopes válidos (vimos "${data.checkedValue}")`);
  },
});

tests.push({
  name: 'funcional: cambiar a "category" reescribe la línea load(arg)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const radio = root.querySelector('input[name="cdn-scope"][value="category"]');
      radio.click();
      const loaderCode = root.querySelector('is-code[data-slot="loader"]');
      return (loaderCode?.value || loaderCode?.textContent || '').trim();
    });
    assert.ok(/load\(\s*"feedback"\s*\)/.test(after), `snippet debe contener load("feedback") (vimos: ${after.slice(0, 200)}…)`);
  },
});

tests.push({
  name: 'funcional: cambiar a "all" produce load("all")',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const radio = root.querySelector('input[name="cdn-scope"][value="all"]');
      radio.click();
      const loaderCode = root.querySelector('is-code[data-slot="loader"]');
      return (loaderCode?.value || loaderCode?.textContent || '').trim();
    });
    assert.ok(/load\(\s*"all"\s*\)/.test(after), `snippet debe contener load("all") (vimos: ${after.slice(0, 200)}…)`);
  },
});

tests.push({
  name: 'funcional: dependencias declaradas vía slot config se renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(300);
    const deps = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const rows = root.querySelectorAll('[data-kind="dep"]:not([hidden])');
      return [...rows].map((r) => r.querySelector('[data-slot="dep-name"]')?.textContent?.trim());
    });
    assert.ok(deps.length >= 2, `esperaba >=2 deps renderizadas, hay ${deps.length}`);
    assert.ok(deps.some((d) => d?.includes('is-code')), `deps deben incluir is-code, se vio ${JSON.stringify(deps)}`);
    assert.ok(deps.some((d) => d?.includes('is-button')), `deps deben incluir is-button, se vio ${JSON.stringify(deps)}`);
  },
});

tests.push({
  name: 'persistencia: la elección del radio se refleja en ?s= clave',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const radio = root.querySelector('input[name="cdn-scope"][value="category"]');
      radio.click();
    });
    await page.waitForTimeout(150);
    const url = page.url();
    assert.ok(/[?&]s=/.test(url), `la URL debe contener ?s= tras seleccionar (vimos "${url}")`);
    // ?s= guarda un b64url JSON del estado. Decodificamos para verificar.
    const decoded = await page.evaluate((u) => {
      const m = u.match(/[?&]s=([^&]+)/);
      if (!m) return null;
      // b64url → b64 standard → atob → JSON
      const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
      try {
        return JSON.parse(atob(padded));
      } catch (e) {
        return null;
      }
    }, url);
    assert.ok(decoded, `?s= debe ser JSON b64url decodificable (vimos "${url}")`);
    assert.equal(decoded?.['cdn-snippet-demo'], 'category',
      `?s= debe contener la elección "category" (vimos ${JSON.stringify(decoded)})`);
  },
});

tests.push({
  name: 'persistencia: al recargar con ?s=category el radio arranca en category',
  run: async (page) => {
    // Primera carga para setear ?s=
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const radio = root.querySelector('input[name="cdn-scope"][value="category"]');
      radio.click();
    });
    await page.waitForTimeout(150);
    const persistedUrl = page.url();

    // Segunda carga con esa URL
    await page.goto(persistedUrl, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    await page.waitForTimeout(200);
    const checked = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
      const root = el.shadowRoot;
      const radio = root.querySelector('input[name="cdn-scope"]:checked');
      const loaderCode = root.querySelector('is-code[data-slot="loader"]');
      return {
        value: radio?.value,
        loader: (loaderCode?.value || loaderCode?.textContent || '').trim(),
      };
    });
    assert.equal(checked.value, 'category', `radio restaurado debe ser category (vimos "${checked.value}")`);
    assert.ok(/load\(\s*"feedback"\s*\)/.test(checked.loader), `snippet restaurado debe contener load("feedback")`);
  },
});

tests.push({
  name: 'accesibilidad: el panel tiene role/heading accesibles',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-cdn-snippet-ready');
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-cdn-snippet');
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
    assert.ok(data.hasLegend, 'el fieldset debe tener <legend> para AT');
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
