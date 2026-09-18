// theme-toggle.test.mjs — tests exhaustivos del demo is-theme-toggle.
// Cobertura: smoke + funcional (toggle alterna dark/light, dark attribute
// reflejado en host, evento is-theme-change con detalle, observación del
// container).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/theme-toggle/theme-toggle.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta con un is-check-icon-button interno',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-theme-toggle');
      return {
        defined: !!customElements.get('is-theme-toggle'),
        count: all.length,
        eachHasBtn: [...all].every((t) => !!t.shadowRoot.querySelector('is-check-icon-button')),
      };
    });
    assert.equal(data.defined, true, 'is-theme-toggle debe estar definido');
    assert.ok(data.count >= 2, `esperaba >=2 toggles, hay ${data.count}`);
    assert.equal(data.eachHasBtn, true, 'cada toggle debe contener un is-check-icon-button');
    await screenshot(page, 'theme-toggle-smoke');
  },
});

tests.push({
  name: 'funcional: el atributo dark refleja el tema del container',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(100);
    const data = await page.evaluate(() => {
      const first = document.querySelector('is-theme-toggle');
      const html = document.documentElement;
      return {
        hostDark: first.hasAttribute('dark'),
        htmlDataset: html.dataset.theme,
        htmlHasClass: html.classList.contains('theme-dark'),
      };
    });
    assert.equal(data.hostDark, true, `toggle debe reflejar dark=true al inicio (vimos "${data.hostDark}")`);
    assert.equal(data.htmlDataset, 'dark', `<html> data-theme debe ser "dark" (vimos "${data.htmlDataset}")`);
    assert.ok(data.htmlHasClass, '<html> debe tener .theme-dark');
  },
});

tests.push({
  name: 'eventos: is-theme-change se dispara al alternar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(100);
    const seen = await page.evaluate(async () => {
      const events = [];
      document.addEventListener('is-theme-change', (e) => events.push(e.detail));
      const t = document.querySelector('is-theme-toggle');
      // Click en el botón interno (is-check-icon-button emite is-change)
      const btn = t.shadowRoot.querySelector('is-check-icon-button');
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      return events;
    });
    assert.ok(seen.length >= 2, `esperaba >=2 eventos, vi ${seen.length}`);
    assert.ok(seen.some((e) => e.theme === 'light'), `esperaba un evento con theme=light (vi ${JSON.stringify(seen.map((e) => e.theme))})`);
    assert.ok(seen.some((e) => e.theme === 'dark'), `esperaba un evento con theme=dark (vi ${JSON.stringify(seen.map((e) => e.theme))})`);
    assert.ok(seen.every((e) => typeof e.dark === 'boolean'), `evento debe llevar dark: boolean`);
  },
});

tests.push({
  name: 'funcional: click alterna dark/light en <html>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(100);
    const after = await page.evaluate(async () => {
      const t = document.querySelector('is-theme-toggle');
      const btn = t.shadowRoot.querySelector('is-check-icon-button');
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      return {
        theme: document.documentElement.dataset.theme,
        hostDark: t.hasAttribute('dark'),
      };
    });
    assert.equal(after.theme, 'light', `<html> data-theme debe pasar a "light" (vimos "${after.theme}")`);
    assert.equal(after.hostDark, false, `toggle.hostDark debe ser false (vimos ${after.hostDark})`);
    // Segundo click → vuelve a dark
    const back = await page.evaluate(async () => {
      const t = document.querySelector('is-theme-toggle');
      const btn = t.shadowRoot.querySelector('is-check-icon-button');
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      return document.documentElement.dataset.theme;
    });
    assert.equal(back, 'dark', `segundo click debe volver a "dark" (vimos "${back}")`);
  },
});

tests.push({
  name: 'observación: cambiar el tema del container desde fuera sincroniza el toggle',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(150);
    const after = await page.evaluate(async () => {
      const t = document.querySelector('is-theme-toggle');
      // readTheme() consulta classList ANTES de data-theme. Para pasar a
      // 'light' hay que tocar AMBAS cosas (que es lo que hace applyTheme).
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.add('theme-light');
      document.documentElement.dataset.theme = 'light';
      // MutationObserver dispara syncFromScope
      await new Promise((r) => setTimeout(r, 150));
      return t.hasAttribute('dark');
    });
    assert.equal(after, false, `cambio externo a theme-light debe reflejarse en toggle.dark=false (vimos dark=${after})`);
  },
});

tests.push({
  name: 'subárbol: el toggle dentro de .container-theme solo afecta a esa sección',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(150);
    const result = await page.evaluate(async () => {
      const nested = document.getElementById('nested');
      const btn = nested.shadowRoot.querySelector('is-check-icon-button');
      const htmlThemeBefore = document.documentElement.dataset.theme;
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      // html no debe haber cambiado
      const htmlThemeAfter = document.documentElement.dataset.theme;
      // El container más cercano es la <section class="light-theme-demo container-theme">
      const section = nested.themeContainer;
      const sectionTheme = section.dataset?.theme;
      return { htmlThemeBefore, htmlThemeAfter, sectionTheme };
    });
    assert.equal(result.htmlThemeAfter, result.htmlThemeBefore,
      `<html> no debe cambiar al usar el toggle del subárbol (antes=${result.htmlThemeBefore}, después=${result.htmlThemeAfter})`);
    assert.ok(result.sectionTheme, `el container del subárbol debe tener data-theme definido (vimos "${result.sectionTheme}")`);
  },
});

tests.push({
  name: 'accesibilidad: el botón interno tiene labels accesibles',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-theme-toggle-ready');
    await page.waitForTimeout(100);
    const labels = await page.evaluate(() => {
      const t = document.querySelector('is-theme-toggle');
      const btn = t.shadowRoot.querySelector('is-check-icon-button');
      return {
        label: btn.getAttribute('label'),
        checkedLabel: btn.getAttribute('checked-label'),
      };
    });
    assert.ok(labels.label, `label debe existir (vimos "${labels.label}")`);
    assert.ok(labels.checkedLabel, `checked-label debe existir (vimos "${labels.checkedLabel}")`);
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

report('theme-toggle', failures === 0, { total: tests.length, failures });
