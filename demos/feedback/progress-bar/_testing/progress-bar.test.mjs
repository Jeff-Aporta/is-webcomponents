// progress-bar.test.mjs — tests exhaustivos del demo is-progress-bar.
// Cobertura: smoke + funcional (value, indeterminate, label, aria-valuenow)
// + gap 1: prefers-reduced-motion debe neutralizar la animación indeterminate.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/progress-bar/progress-bar.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta con role=progressbar',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-bar-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-progress-bar');
      return {
        defined: !!customElements.get('is-progress-bar'),
        count: all.length,
        allHaveRole: [...all].every((p) => p.shadowRoot.querySelector('[role="progressbar"]')),
      };
    });
    assert.equal(data.defined, true, 'is-progress-bar debe estar definido');
    assert.ok(data.count >= 6, `esperaba >=6 progress-bars, hay ${data.count}`);
    assert.equal(data.allHaveRole, true, 'todos deben tener role=progressbar en shadow');
    await screenshot(page, 'progress-bar-smoke');
  },
});

tests.push({
  name: 'funcional: aria-valuenow refleja el atributo value',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-bar-ready');
    const data = await page.evaluate(() => {
      return [...document.querySelectorAll('is-progress-bar')]
        .filter((p) => p.hasAttribute('value'))
        .map((p) => {
          const t = p.shadowRoot.querySelector('.track');
          return {
            attr: p.getAttribute('value'),
            ariaNow: t.getAttribute('aria-valuenow'),
            ariaMin: t.getAttribute('aria-valuemin'),
            ariaMax: t.getAttribute('aria-valuemax'),
          };
        });
    });
    assert.ok(data.length >= 4, `esperaba >=4 con value, hay ${data.length}`);
    for (const { attr, ariaNow, ariaMin, ariaMax } of data) {
      assert.equal(ariaNow, attr, `aria-valuenow (${ariaNow}) debe coincidir con value (${attr})`);
      assert.equal(ariaMin, '0', `aria-valuemin debe ser "0" (vimos "${ariaMin}")`);
      assert.equal(ariaMax, '100', `aria-valuemax debe ser "100" (vimos "${ariaMax}")`);
    }
  },
});

tests.push({
  name: 'funcional: value se clipea a [0, 100]',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-bar-ready');
    const data = await page.evaluate(() => {
      const el = document.createElement('is-progress-bar');
      document.body.appendChild(el);
      el.value = 150;
      const highWidth = el.shadowRoot.querySelector('.indicator').style.width;
      el.value = -50;
      const lowWidth = el.shadowRoot.querySelector('.indicator').style.width;
      el.remove();
      return { highWidth, lowWidth };
    });
    assert.equal(data.highWidth, '100%', `value=150 debe saturar a 100% (vimos "${data.highWidth}")`);
    assert.equal(data.lowWidth, '0%', `value=-50 debe saturar a 0% (vimos "${data.lowWidth}")`);
  },
});

tests.push({
  name: 'funcional: indeterminate elimina aria-valuenow y aplica clase',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-bar-ready');
    const data = await page.evaluate(() => {
      const indet = document.querySelector('is-progress-bar[indeterminate]');
      const t = indet.shadowRoot.querySelector('.track');
      const ind = indet.shadowRoot.querySelector('.indicator');
      return {
        ariaNow: t.getAttribute('aria-valuenow'),
        ariaText: t.getAttribute('aria-valuetext'),
        indetClass: ind.classList.contains('is-indeterminate'),
        width: ind.style.width,
      };
    });
    assert.equal(data.ariaNow, null, `indeterminate no debe tener aria-valuenow (vimos "${data.ariaNow}")`);
    assert.match(data.ariaText, /cargando|loading/i, `aria-valuetext debe ser "Cargando" / "Loading" (vimos "${data.ariaText}")`);
    assert.equal(data.indetClass, true, 'indicator debe tener clase is-indeterminate');
    assert.equal(data.width, '', `width debe estar vacío en indeterminate (vimos "${data.width}")`);
  },
});

tests.push({
  name: 'funcional: el setter label refleja en aria-label',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-bar-ready');
    const data = await page.evaluate(() => {
      const el = document.createElement('is-progress-bar');
      el.value = 50;
      el.label = 'Mi carga';
      document.body.appendChild(el);
      const aria = el.shadowRoot.querySelector('.track').getAttribute('aria-label');
      el.remove();
      return aria;
    });
    assert.equal(data, 'Mi carga', `aria-label debe ser "Mi carga" (vimos "${data}")`);
  },
});

tests.push({
  name: 'gap-1 (reduced motion): la animación indeterminate queda neutralizada',
  run: async (page) => {
    // El CSS del progress-bar indeterminate lleva animación. El contrato del
    // handoff (gap 1) exige que prefers-reduced-motion apague esa animación.
    // Verificamos con emulateMedia que el animation-name del indicator se
    // mantiene, pero la *duración efectiva* cae a 0 (o animation se desactiva).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-bar-ready');
    const data = await page.evaluate(() => {
      const indet = document.querySelector('is-progress-bar[indeterminate]');
      const ind = indet.shadowRoot.querySelector('.indicator');
      const cs = getComputedStyle(ind);
      return {
        animName: cs.animationName,
        animDuration: cs.animationDuration,
        animPlayState: cs.animationPlayState,
      };
    });
    // Sin reduced-motion la animación es "is-progress-bar-indet 1.2s linear infinite"
    // (o similar). Con reduced-motion debe quedar "none" o duración 0s.
    const isNeutralized =
      data.animName === 'none' ||
      data.animDuration === '0s' ||
      /^0s/.test(data.animDuration) ||
      data.animPlayState === 'paused';
    assert.ok(
      isNeutralized,
      `reduced-motion debe neutralizar la animación (vimos name=${data.animName}, dur=${data.animDuration}, play=${data.animPlayState})`,
    );
  },
});

tests.push({
  name: 'contraste: prefers-reduced-motion=no-preference mantiene la animación',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-bar-ready');
    const data = await page.evaluate(() => {
      const indet = document.querySelector('is-progress-bar[indeterminate]');
      const ind = indet.shadowRoot.querySelector('.indicator');
      const cs = getComputedStyle(ind);
      return {
        animName: cs.animationName,
        animDuration: cs.animationDuration,
      };
    });
    assert.notEqual(data.animName, 'none', `sin reduced-motion debe haber animación (vimos name="${data.animName}")`);
    assert.notEqual(data.animDuration, '0s', `duración debe ser > 0 (vimos "${data.animDuration}")`);
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

report('progress-bar', failures === 0, { total: tests.length, failures });
