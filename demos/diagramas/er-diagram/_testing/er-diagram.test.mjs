// er-diagram.test.mjs — tests exhaustivos del demo er-diagram.html.
// Cobertura: smoke (monta entidades/relaciones), animation=trace embebe
// keyframes CSS, determinismo (re-render idempotente), accesibilidad.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/er-diagram/er-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-er-diagram> monta y renderiza entidades y aristas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-diagram-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-er-diagram'),
        entities: shadow?.querySelectorAll('.er-entity').length ?? 0,
        relations: shadow?.querySelectorAll('.er-rel').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.er-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-er-diagram debe estar definido');
    assert.ok(info.entities >= 3, `esperaba >=3 entidades, hay ${info.entities}`);
    assert.ok(info.relations >= 2, `esperaba >=2 relaciones, hay ${info.relations}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="er-svg">');
    await screenshot(page, 'er-diagram-smoke');
  },
});

tests.push({
  name: 'entidades: cada entidad tiene dataset.entityId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-diagram-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      return [...el.shadowRoot.querySelectorAll('.er-entity')].map((g) => g.dataset.entityId);
    });
    assert.ok(ids.includes('user'), 'debe haber una entidad "user"');
    assert.ok(ids.includes('session'), 'debe haber una entidad "session"');
    assert.ok(ids.includes('log'), 'debe haber una entidad "log"');
  },
});

tests.push({
  name: 'animation=trace: el SVG embebe <style data-iswc-anim> con keyframes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-diagram-ready');
    const has = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      const style = el.shadowRoot.querySelector('svg > style[data-iswc-anim]');
      return !!style && /iswc-dash-march/.test(style.textContent);
    });
    assert.ok(has, 'SVG debe contener <style data-iswc-anim> con keyframes iswc-dash-march');
  },
});

tests.push({
  name: 'aristas dashed: al menos una lleva clase de animación',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-diagram-ready');
    const has = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      return !!el.shadowRoot.querySelector('.er-rel path.iswc-anim-edge-dashed');
    });
    assert.ok(has, 'debe haber al menos una arista dashed con clase de animación');
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-diagram-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      return el.shadowRoot.querySelector('svg.er-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      return el.shadowRoot.querySelector('svg.er-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: prefers-reduced-motion desactiva animación',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-diagram-ready');
    const ok = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      const style = el.shadowRoot.querySelector('svg > style[data-iswc-anim]');
      return style && /animation: none !important/.test(style.textContent);
    });
    assert.ok(ok, 'CSS embebido debe respetar prefers-reduced-motion');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-er-diagram-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-er-diagram');
      const svg = el.shadowRoot.querySelector('svg.er-svg');
      return { aria: svg.getAttribute('aria-label'), role: svg.getAttribute('role') };
    });
    assert.ok(meta.aria && meta.aria.length > 0, 'debe llevar aria-label');
    assert.equal(meta.role, 'img', 'role debe ser img');
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('er-diagram', failures === 0, { total: tests.length, failures });