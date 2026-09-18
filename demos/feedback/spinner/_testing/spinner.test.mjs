// spinner.test.mjs — tests exhaustivos del demo is-spinner.
// Cobertura: smoke + funcional (role=status, aria-live, aria-label por
// defecto, color custom) + gap 1: prefers-reduced-motion neutraliza la
// animación de rotación del spinner.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/spinner/spinner.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta con role=status + aria-live=polite',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-spinner');
      return {
        defined: !!customElements.get('is-spinner'),
        count: all.length,
        allRole: [...all].every((s) => s.getAttribute('role') === 'status'),
        allLive: [...all].every((s) => s.getAttribute('aria-live') === 'polite'),
        allLabel: [...all].every((s) => (s.getAttribute('aria-label') || '').length > 0),
      };
    });
    assert.equal(data.defined, true, 'is-spinner debe estar definido');
    assert.ok(data.count >= 9, `esperaba >=9 spinners, hay ${data.count}`);
    assert.equal(data.allRole, true, 'todos deben tener role=status');
    assert.equal(data.allLive, true, 'todos deben tener aria-live=polite');
    assert.equal(data.allLabel, true, 'todos deben tener aria-label no vacío');
    await screenshot(page, 'spinner-smoke');
  },
});

tests.push({
  name: 'funcional: aria-label por defecto es "Cargando"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    await page.waitForTimeout(150);
    const label = await page.evaluate(() => {
      // El connectedCallback setea aria-label="Cargando" si no existe.
      // El HTML del demo no pone aria-label en ninguno, así que TODOS lo
      // reciben como "Cargando" tras upgrade. Filtramos por ese valor.
      const s = document.querySelector('is-spinner[aria-label="Cargando"]');
      return s?.getAttribute('aria-label');
    });
    assert.match(label, /cargando/i, `aria-label default debe ser "Cargando" (vimos "${label}")`);
  },
});

tests.push({
  name: 'funcional: aria-label custom tiene precedencia',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const label = await page.evaluate(() => {
      const s = document.createElement('is-spinner');
      s.setAttribute('aria-label', 'Cargando perfil');
      document.body.appendChild(s);
      const got = s.getAttribute('aria-label');
      s.remove();
      return got;
    });
    assert.equal(label, 'Cargando perfil', `aria-label custom debe prevalecer (vimos "${label}")`);
  },
});

tests.push({
  name: 'funcional: color custom se aplica al indicador',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const data = await page.evaluate(() => {
      const s = document.querySelector('is-spinner[color="#7c3aed"]');
      const ind = s.shadowRoot.querySelector('.spinner');
      return {
        varColor: s.style.getPropertyValue('--is-spinner-color'),
        computedColor: getComputedStyle(ind).borderTopColor,
      };
    });
    // El color debe propagarse de alguna forma (CSS var o computed style).
    assert.ok(
      data.varColor === '#7c3aed' || /124,\s*58,\s*237/.test(data.computedColor),
      `color="#7c3aed" debe reflejarse (var=${data.varColor}, computed=${data.computedColor})`,
    );
  },
});

tests.push({
  name: 'funcional: speed custom se aplica al indicador',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const data = await page.evaluate(() => {
      const slow = document.querySelector('is-spinner[speed="3s"]');
      const def = document.querySelector('is-spinner:not([speed])');
      return {
        slowVar: slow.style.getPropertyValue('--is-spinner-speed'),
        slowDur: getComputedStyle(slow.shadowRoot.querySelector('.spinner')).animationDuration,
        defDur: getComputedStyle(def.shadowRoot.querySelector('.spinner')).animationDuration,
      };
    });
    assert.equal(data.slowVar, '3s', `speed="3s" debe reflejarse en --is-spinner-speed (vimos "${data.slowVar}")`);
    assert.match(data.slowDur, /3s/, `slow spinner debe tener animationDuration ≈ 3s (vimos "${data.slowDur}")`);
    assert.notEqual(data.slowDur, data.defDur, `slow debe ser más lento que default (slow=${data.slowDur}, def=${data.defDur})`);
  },
});

tests.push({
  name: 'gap-1 (reduced motion): la rotación del spinner queda neutralizada',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const data = await page.evaluate(() => {
      const s = document.querySelector('is-spinner:not([speed])');
      const ind = s.shadowRoot.querySelector('.spinner');
      const cs = getComputedStyle(ind);
      return {
        animName: cs.animationName,
        animDuration: cs.animationDuration,
      };
    });
    const isNeutralized =
      data.animName === 'none' ||
      data.animDuration === '0s' ||
      /^0s/.test(data.animDuration);
    assert.ok(isNeutralized,
      `reduced-motion debe neutralizar la rotación (animName="${data.animName}", duration="${data.animDuration}")`);
  },
});

tests.push({
  name: 'contraste: prefers-reduced-motion=no-preference mantiene la animación',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-spinner-ready');
    const data = await page.evaluate(() => {
      const s = document.querySelector('is-spinner:not([speed])');
      const cs = getComputedStyle(s.shadowRoot.querySelector('.spinner'));
      return { animName: cs.animationName, animDuration: cs.animationDuration };
    });
    assert.notEqual(data.animName, 'none', `sin reduced-motion debe haber animación (vimos "${data.animName}")`);
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

report('spinner', failures === 0, { total: tests.length, failures });
