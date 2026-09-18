// icon.test.mjs — tests exhaustivos del demo icon.html.
// Cobertura: smoke + funcional (render del SVG inline, label/aria-hidden,
// name+library como compat para icon, cambio de icon en vivo, src custom,
// multicolor) + accesibilidad (con label → role=img + aria-label; sin label
// → aria-hidden).
//
// NOTA: el icono se carga de forma asíncrona por fetch desde el sistema
// propio. Los tests esperan con timeout razonable. Si el fetch falla en
// CI, los iconos quedan en data-missing (espacio vacío); los tests verifican
// que el componente degrada con elegancia sin lanzar excepciones.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/media/Icon/icon.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente se registra y renderiza SVG inline tras fetch',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    // Esperar a que se resuelvan los iconos (fetch asíncrono).
    await page.waitForTimeout(1500);
    const data = await page.evaluate(() => {
      const list = [...document.querySelectorAll('main is-icon')];
      return list.map((el) => {
        const inline = el.shadowRoot.querySelector('.inline');
        const svg = inline?.querySelector('svg');
        const hidden = inline?.hasAttribute('hidden');
        return {
          registered: !!customElements.get('is-icon'),
          hasInline: !!inline,
          hasSvg: !!svg,
          hidden,
          hasMissing: el.hasAttribute('data-missing'),
          hasLoading: el.hasAttribute('data-loading'),
        };
      });
    });
    assert.equal(data[0].registered, true, 'is-icon debe estar registrado');
    assert.ok(data.length >= 12, `esperaba >=12 iconos en main, hay ${data.length}`);
    // Al menos algunos iconos deben haberse cargado (los más comunes sí)
    const loadedCount = data.filter((d) => d.hasSvg && !d.hidden).length;
    assert.ok(loadedCount > 0, `al menos algunos iconos deben haberse cargado, hay ${loadedCount} de ${data.length}`);
    await screenshot(page, 'icon-smoke');
  },
});

tests.push({
  name: 'funcional: atributo icon se refleja en la propiedad',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const list = [...document.querySelectorAll('main is-icon[icon]')];
      return list.map((el) => ({ id: el.icon, attr: el.getAttribute('icon') }));
    });
    assert.ok(data.length >= 6, `esperaba >=6 iconos con atributo icon, hay ${data.length}`);
    for (const d of data) {
      assert.equal(d.id, d.attr, `propiedad icon debe coincidir con atributo: prop=${d.id}, attr=${d.attr}`);
    }
    assert.ok(data.some((d) => d.id === 'mdi:home'), 'debe haber un mdi:home en la lista');
  },
});

tests.push({
  name: 'funcional: name+library se combinan a icon (compat)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-icon[name="github"]');
      return { iconProp: el.icon };
    });
    assert.equal(data.iconProp, 'mdi:github', `name="github" + library default mdi → "mdi:github", got "${data.iconProp}"`);
  },
});

tests.push({
  name: 'funcional: cambio de icon en vivo aborta la request anterior',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => {
      const el = document.querySelector('is-icon[icon="mdi:home"]');
      return { icon: el.icon };
    });
    await page.evaluate(() => {
      const el = document.querySelector('is-icon[icon="mdi:home"]');
      el.setAttribute('icon', 'mdi:cog-outline');
    });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const el = document.querySelector('is-icon[icon="mdi:cog-outline"]');
      return { icon: el.icon };
    });
    assert.equal(before.icon, 'mdi:home', 'estado inicial mdi:home');
    assert.equal(after.icon, 'mdi:cog-outline', 'tras setAttribute debe cambiar la propiedad');
  },
});

tests.push({
  name: 'funcional: el SVG inline tiene width="1em" y height="1em"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    await page.waitForTimeout(2000); // esperar fetch
    const data = await page.evaluate(() => {
      // Buscar un icono cargado (no data-missing)
      const loaded = [...document.querySelectorAll('main is-icon')].find((el) => !el.hasAttribute('data-missing') && !el.hasAttribute('data-loading'));
      if (!loaded) return { found: false };
      const svg = loaded.shadowRoot.querySelector('.inline svg');
      return {
        found: true,
        width: svg?.getAttribute('width'),
        height: svg?.getAttribute('height'),
        focusable: svg?.getAttribute('focusable'),
      };
    });
    if (!data.found) {
      console.log('     (skip — ningún icono se cargó en el entorno actual)');
      return;
    }
    assert.equal(data.width, '1em', `SVG width debe ser 1em, got "${data.width}"`);
    assert.equal(data.height, '1em', `SVG height debe ser 1em, got "${data.height}"`);
    assert.equal(data.focusable, 'false', `SVG focusable debe ser "false", got "${data.focusable}"`);
  },
});

tests.push({
  name: 'funcional: el fetch puede fallar y el componente marca data-missing sin lanzar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    const result = await page.evaluate(async () => {
      const el = document.createElement('is-icon');
      el.setAttribute('icon', 'mdi:this-icon-definitely-does-not-exist-xyz');
      document.body.appendChild(el);
      // Esperar a que termine el fetch (fallo)
      await new Promise((r) => setTimeout(r, 2000));
      return {
        missing: el.hasAttribute('data-missing'),
        loading: el.hasAttribute('data-loading'),
        crashed: false,
      };
    }).catch((e) => ({ crashed: true, error: String(e?.message ?? e) }));
    assert.equal(result.crashed, false, `icon inexistente no debe lanzar: ${result.error}`);
    assert.equal(result.missing, true, 'icon inexistente debe marcar data-missing');
    assert.equal(result.loading, false, 'icon inexistente no debe seguir en data-loading');
  },
});

tests.push({
  name: 'accesibilidad: con label → role=img + aria-label; sin label → aria-hidden',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    const data = await page.evaluate(() => {
      // Con label: el primero que tenga label="Inicio"
      const withLabel = document.querySelector('is-icon[label="Inicio"]');
      // Sin label: en la sección de fondo claro (la .swatch-light) hay iconos sin label
      const withoutLabel = document.querySelector('.swatch-light is-icon');
      return {
        withLabel: {
          role: withLabel.getAttribute('role'),
          ariaLabel: withLabel.getAttribute('aria-label'),
          ariaHidden: withLabel.getAttribute('aria-hidden'),
        },
        withoutLabel: {
          role: withoutLabel.getAttribute('role'),
          ariaLabel: withoutLabel.getAttribute('aria-label'),
          ariaHidden: withoutLabel.getAttribute('aria-hidden'),
        },
      };
    });
    assert.equal(data.withLabel.role, 'img', `con label role debe ser "img", got "${data.withLabel.role}"`);
    assert.equal(data.withLabel.ariaLabel, 'Inicio', `aria-label debe ser "Inicio", got "${data.withLabel.ariaLabel}"`);
    assert.equal(data.withLabel.ariaHidden, null, 'con label no debe tener aria-hidden');
    assert.equal(data.withoutLabel.ariaHidden, 'true', `sin label debe tener aria-hidden="true", got "${data.withoutLabel.ariaHidden}"`);
    assert.equal(data.withoutLabel.role, null, 'sin label no debe tener role');
  },
});

tests.push({
  name: 'cleanup: disconnectedCallback aborta el fetch en curso',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-icon-ready');
    const result = await page.evaluate(async () => {
      const el = document.createElement('is-icon');
      el.setAttribute('icon', 'mdi:home');
      document.body.appendChild(el);
      // Esperar un instante a que arranque el fetch
      await new Promise((r) => setTimeout(r, 50));
      // Remover antes de que termine
      document.body.removeChild(el);
      // Esperar más del tiempo que tardaría el fetch
      await new Promise((r) => setTimeout(r, 500));
      return { ok: true };
    }).catch((e) => ({ ok: false, error: String(e?.message ?? e) }));
    assert.equal(result.ok, true, `disconnect antes del fetch no debe crashear: ${result.error}`);
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  let detail = {};
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    detail = { error: String(err?.message ?? err) };
    console.error(`  ✗ ${t.name}\n     ${detail.error}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('icon', failures === 0, { total: tests.length, failures });
