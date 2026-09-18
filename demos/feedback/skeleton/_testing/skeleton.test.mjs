// skeleton.test.mjs — tests exhaustivos del demo is-skeleton.
// Cobertura: smoke + funcional (effect default = sheen, effect=none sin
// animación, effect=pulse con respiración) + gap 1: prefers-reduced-motion
// neutraliza el sheen y el pulse.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/skeleton/skeleton.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta con effect=sheen por defecto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-skeleton');
      return {
        defined: !!customElements.get('is-skeleton'),
        count: all.length,
        defaults: [...all].filter((s) => s.getAttribute('effect') === 'sheen').length,
        ariaHidden: [...all].every((s) => s.getAttribute('aria-hidden') === 'true'),
      };
    });
    assert.equal(data.defined, true, 'is-skeleton debe estar definido');
    assert.ok(data.count >= 6, `esperaba >=6 skeletons, hay ${data.count}`);
    assert.ok(data.defaults >= 3, `al menos 3 deben tener effect=sheen por default (hay ${data.defaults})`);
    assert.equal(data.ariaHidden, true, 'todos los skeletons deben ser aria-hidden=true');
    await screenshot(page, 'skeleton-smoke');
  },
});

tests.push({
  name: 'funcional: effect inválido cae a sheen',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const data = await page.evaluate(() => {
      const el = document.createElement('is-skeleton');
      el.setAttribute('effect', 'no-existe');
      document.body.appendChild(el);
      const got = el.getAttribute('effect');
      el.remove();
      return got;
    });
    assert.equal(data, 'sheen', `effect inválido debe caer a "sheen" (vimos "${data}")`);
  },
});

tests.push({
  name: 'funcional: effect=none NO aplica animación',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-skeleton[effect="none"]');
      const ind = el.shadowRoot.querySelector('.indicator');
      const cs = getComputedStyle(ind);
      return {
        animName: cs.animationName,
        animDuration: cs.animationDuration,
        bgImage: cs.backgroundImage,
      };
    });
    assert.equal(data.animName, 'none', `effect=none debe tener animationName=none (vimos "${data.animName}")`);
  },
});

tests.push({
  name: 'funcional: effect=pulse lleva animación de respiración',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-skeleton[effect="pulse"]');
      const ind = el.shadowRoot.querySelector('.indicator');
      const cs = getComputedStyle(ind);
      return {
        animName: cs.animationName,
        animDuration: cs.animationDuration,
      };
    });
    assert.notEqual(data.animName, 'none', `pulse debe llevar animación (vimos "${data.animName}")`);
    assert.notEqual(data.animDuration, '0s', `pulse debe tener duración > 0 (vimos "${data.animDuration}")`);
  },
});

tests.push({
  name: 'gap-1 (reduced motion): sheen queda neutralizado',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const data = await page.evaluate(() => {
      // El connectedCallback setea effect="sheen" si no existe. Filtramos
      // por el valor explícito tras upgrade.
      const el = document.querySelector('is-skeleton[effect="sheen"]');
      const ind = el.shadowRoot.querySelector('.indicator');
      const cs = getComputedStyle(ind);
      return {
        animName: cs.animationName,
        animDuration: cs.animationDuration,
      };
    });
    const isNeutralized =
      data.animName === 'none' ||
      /^0s/.test(data.animDuration) ||
      data.animDuration === '0s';
    assert.ok(isNeutralized,
      `reduced-motion debe neutralizar el sheen (animName="${data.animName}", duration="${data.animDuration}")`);
  },
});

tests.push({
  name: 'gap-1 (reduced motion): pulse queda neutralizado',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const data = await page.evaluate(() => {
      const el = document.querySelector('is-skeleton[effect="pulse"]');
      const ind = el.shadowRoot.querySelector('.indicator');
      const cs = getComputedStyle(ind);
      return {
        animName: cs.animationName,
        animDuration: cs.animationDuration,
      };
    });
    const isNeutralized =
      data.animName === 'none' ||
      /^0s/.test(data.animDuration) ||
      data.animDuration === '0s';
    assert.ok(isNeutralized,
      `reduced-motion debe neutralizar el pulse (animName="${data.animName}", duration="${data.animDuration}")`);
  },
});

tests.push({
  name: 'accesibilidad: role=status correcto o aria-hidden presente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-skeleton-ready');
    const all = await page.evaluate(() => {
      return [...document.querySelectorAll('is-skeleton')].map((s) => s.getAttribute('aria-hidden'));
    });
    assert.ok(all.length >= 5, `esperaba >=5 skeletons (hay ${all.length})`);
    assert.ok(all.every((v) => v === 'true'), `todos deben ser aria-hidden=true, vi ${JSON.stringify(all)}`);
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

report('skeleton', failures === 0, { total: tests.length, failures });
