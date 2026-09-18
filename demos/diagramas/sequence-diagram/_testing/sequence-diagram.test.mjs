// sequence-diagram.test.mjs — tests exhaustivos del demo sequence-diagram.html.
// Cobertura: smoke (monta actores + mensajes), funcional (lifelines,
// mensajes con kind), rama alt visible, determinismo, a11y.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/diagramas/sequence-diagram/sequence-diagram.html`;

const tests = [];

tests.push({
  name: 'smoke: <is-sequence-diagram> monta y renderiza actores y mensajes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    const info = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      const shadow = el?.shadowRoot;
      return {
        defined: !!customElements.get('is-sequence-diagram'),
        actors: shadow?.querySelectorAll('.seq-actor').length ?? 0,
        messages: shadow?.querySelectorAll('[data-msg-id]').length ?? 0,
        hasSvg: !!shadow?.querySelector('svg.seq-svg'),
      };
    });
    assert.equal(info.defined, true, 'is-sequence-diagram debe estar definido');
    assert.ok(info.actors >= 4, `esperaba >=4 actores, hay ${info.actors}`);
    assert.ok(info.messages >= 5, `esperaba >=5 mensajes (3 + 2 alt), hay ${info.messages}`);
    assert.equal(info.hasSvg, true, 'debe existir <svg class="seq-svg">');
    await screenshot(page, 'sequence-diagram-smoke');
  },
});

tests.push({
  name: 'actores: cada uno tiene un avatar con etiqueta del payload',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    const labels = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      return [...el.shadowRoot.querySelectorAll('.seq-actor')].map((g) => g.textContent.trim());
    });
    const joined = labels.join(' | ');
    assert.match(joined, /Usuario/, 'debe aparecer "Usuario"');
    assert.match(joined, /AuthAPI/, 'debe aparecer "AuthAPI"');
    assert.match(joined, /DB/, 'debe aparecer "DB"');
  },
});

tests.push({
  name: 'lifelines: cada actor tiene una línea vertical (línea punteada)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    const lifelines = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      return [...el.shadowRoot.querySelectorAll('svg line')].filter((l) => l.getAttribute('stroke-dasharray')).length;
    });
    assert.ok(lifelines >= 4, `esperaba >=4 lifelines (líneas dashed), hay ${lifelines}`);
  },
});

tests.push({
  name: 'mensajes: cada uno tiene dataset.msgId con el id declarado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    const ids = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      return [...el.shadowRoot.querySelectorAll('[data-msg-id]')].map((g) => g.dataset.msgId);
    });
    assert.ok(ids.includes('m1'), 'debe existir mensaje "m1"');
    assert.ok(ids.includes('m5'), 'debe existir mensaje "m5" (rama alt)');
  },
});

tests.push({
  name: 'rama alt: el SVG contiene ambas condiciones',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    const conditions = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      const texts = [...el.shadowRoot.querySelectorAll('text')].map((t) => t.textContent.trim());
      return texts.filter((t) => /pwd OK|pwd FAIL/.test(t));
    });
    assert.ok(conditions.length >= 2,
      `esperaba al menos 2 condiciones (pwd OK + rsp FAIL), hay ${conditions.length}`);
  },
});

tests.push({
  name: 'determinismo: re-asignar el mismo payload produce viewBox idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    const before = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      return el.shadowRoot.querySelector('svg.seq-svg').getAttribute('viewBox');
    });
    await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      el.payload = el.payload;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      return el.shadowRoot.querySelector('svg.seq-svg').getAttribute('viewBox');
    });
    assert.equal(before, after, 'viewBox idéntico tras re-asignar payload');
  },
});

tests.push({
  name: 'accesibilidad: aria-label y role=img presentes',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-sequence-ready');
    const meta = await page.evaluate(() => {
      const el = document.querySelector('main is-sequence-diagram');
      const svg = el.shadowRoot.querySelector('svg.seq-svg');
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

report('sequence-diagram', failures === 0, { total: tests.length, failures });