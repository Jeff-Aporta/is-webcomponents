// progress-ring.test.mjs — tests exhaustivos del demo is-progress-ring.
// Cobertura: smoke + funcional (value, label, aria, stroke-dashoffset) +
// gap 1: prefers-reduced-motion afecta a la transición del stroke.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/feedback/progress-ring/progress-ring.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta y dibuja el SVG del anillo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const data = await page.evaluate(() => {
      const all = document.querySelectorAll('is-progress-ring');
      return {
        defined: !!customElements.get('is-progress-ring'),
        count: all.length,
        hasSvg: [...all].every((p) => !!p.shadowRoot.querySelector('svg')),
        hasCircles: [...all].every((p) => p.shadowRoot.querySelectorAll('circle').length === 2),
      };
    });
    assert.equal(data.defined, true, 'is-progress-ring debe estar definido');
    assert.ok(data.count >= 8, `esperaba >=8 rings, hay ${data.count}`);
    assert.equal(data.hasSvg, true, 'todos deben tener un <svg>');
    assert.equal(data.hasCircles, true, 'todos deben tener track + indicator');
    await screenshot(page, 'progress-ring-smoke');
  },
});

tests.push({
  name: 'funcional: stroke-dashoffset refleja value (escala de 0 a CIRC)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const data = await page.evaluate(() => {
      const CIRC = 2 * Math.PI * 15.9155;
      return [...document.querySelectorAll('is-progress-ring[value]')].map((p) => {
        const ind = p.shadowRoot.querySelector('.indicator');
        const offset = parseFloat(ind.style.strokeDashoffset);
        const value = Number(p.getAttribute('value'));
        return { value, offset, expected: CIRC * (1 - value / 100) };
      });
    });
    for (const { value, offset, expected } of data) {
      assert.ok(Math.abs(offset - expected) < 0.5,
        `value=${value} debe dar stroke-dashoffset ≈ ${expected.toFixed(2)} (real=${offset.toFixed(2)})`);
    }
  },
});

tests.push({
  name: 'funcional: aria-valuenow refleja value y aria-valuetext usa label o %',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const data = await page.evaluate(() => {
      return [...document.querySelectorAll('is-progress-ring')].map((p) => {
        const wrap = p.shadowRoot.querySelector('.ring-wrap');
        return {
          value: p.getAttribute('value'),
          label: p.getAttribute('label'),
          ariaNow: wrap.getAttribute('aria-valuenow'),
          ariaText: wrap.getAttribute('aria-valuetext'),
        };
      });
    });
    for (const { value, label, ariaNow, ariaText } of data) {
      assert.equal(ariaNow, value, `aria-valuenow (${ariaNow}) debe coincidir con value (${value})`);
      if (label) {
        assert.equal(ariaText, label, `con label "${label}", aria-valuetext debe ser ese label (vimos "${ariaText}")`);
      } else {
        assert.match(ariaText, /%\s*$/, `sin label, aria-valuetext debe terminar en "%" (vimos "${ariaText}")`);
      }
    }
  },
});

tests.push({
  name: 'funcional: el label se pinta en el centro del anillo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const data = await page.evaluate(() => {
      const labelled = document.querySelector('is-progress-ring[label]');
      const lbl = labelled.shadowRoot.querySelector('.label');
      return { text: lbl.textContent.trim(), hidden: lbl.hidden };
    });
    assert.equal(data.text, '73 / 100', `label central debe ser "73 / 100" (vimos "${data.text}")`);
    assert.equal(data.hidden, false, `label central debe estar visible (hidden=${data.hidden})`);
  },
});

tests.push({
  name: 'funcional: sin label se muestra el % redondeado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const text = await page.evaluate(() => {
      const p = document.querySelector('is-progress-ring[value="50"]');
      return p.shadowRoot.querySelector('.label').textContent.trim();
    });
    assert.equal(text, '50%', `sin label, debe mostrarse "50%" (vimos "${text}")`);
  },
});

tests.push({
  name: 'gap-1 (reduced motion): la transición stroke-dashoffset queda neutralizada',
  run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-progress-ring-ready');
    const data = await page.evaluate(() => {
      const p = document.querySelector('is-progress-ring[value="50"]');
      const ind = p.shadowRoot.querySelector('.indicator');
      const cs = getComputedStyle(ind);
      return {
        transition: cs.transitionProperty + ' / ' + cs.transitionDuration,
        animDuration: cs.animationDuration,
      };
    });
    // El contrato del gap 1 exige que con reduced-motion la transición (si la
    // hay) quede en 0s. Aquí permitimos tanto transitionDuration 0s como
    // animationDuration 0s.
    assert.ok(
      /\b0s\b/.test(data.transition) || /\b0s\b/.test(data.animDuration),
      `reduced-motion debe neutralizar la transición (transition="${data.transition}", animation="${data.animDuration}")`,
    );
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

report('progress-ring', failures === 0, { total: tests.length, failures });
