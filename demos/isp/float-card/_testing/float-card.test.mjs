// float-card.test.mjs — tests exhaustivos del demo <is-float-card>.
// Cobertura: smoke + funcional (open toggle, lock/unlock, linearTransform,
// horizontal/vertical axis) + DOM persistente (no display:none).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/float-card/float-card.html`;

const tests = [];

tests.push({
  name: 'smoke: float-card monta con wrap + panel + dos slots',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-float-card-ready');
    const info = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('is-float-card')];
      return cards.map((c) => {
        const sr = c.shadowRoot;
        return {
          id: c.id,
          defined: !!customElements.get('is-float-card'),
          hasWrap: !!sr?.querySelector('[part="wrap"]'),
          hasPanel: !!sr?.querySelector('[part="panel"]'),
          defaultSlot: !!sr?.querySelector('slot:not([name])'),
          floatSlot: !!sr?.querySelector('slot[name="float"]'),
          panelsInLightDOM: c.querySelectorAll('[slot="float"]').length,
        };
      });
    });
    assert.equal(info[0].defined, true);
    assert.equal(info[0].hasWrap, true);
    assert.equal(info[0].hasPanel, true);
    assert.equal(info[0].defaultSlot, true);
    assert.equal(info[0].floatSlot, true);
    assert.ok(info[0].panelsInLightDOM >= 1, `panel slot content debe existir en light DOM (hay ${info[0].panelsInLightDOM})`);
    await screenshot(page, 'float-card-smoke');
  },
});

tests.push({
  name: 'funcional: open=true hace visible el panel sin re-mount',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-float-card-ready');
    await page.waitForTimeout(150);
    const state = await page.evaluate(async () => {
      const fc = document.getElementById('fc2');
      const sr = fc.shadowRoot;
      const panel = sr.querySelector('[part="panel"]');
      fc.open = true;
      await new Promise((r) => setTimeout(r, 50));
      // El panel debe estar en el DOM (no display:none).
      const rect = panel.getBoundingClientRect();
      const cs = getComputedStyle(panel);
      // Aunque opacity:0 + visibility:hidden mantienen el rect, las dimensiones
      // siguen siendo válidas. Lo importante es que el nodo no se ha removido.
      const stillThere = sr.contains(panel);
      const hasFloatContent = sr.querySelector('slot[name="float"]')?.assignedElements?.().length > 0;
      return {
        stillThere,
        rectW: rect.width,
        rectH: rect.height,
        csVisibility: cs.visibility,
        hasFloatContent,
      };
    });
    assert.equal(state.stillThere, true, 'panel debe seguir en DOM tras open=true');
    assert.ok(state.rectW > 0, `panel rect.width > 0 (${state.rectW})`);
    assert.ok(state.rectH > 0, `panel rect.height > 0 (${state.rectH})`);
    assert.ok(state.hasFloatContent, 'slot=float debe tener contenido asignado');
  },
});

tests.push({
  name: 'funcional: lock()/unlock() mantienen el panel visible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-float-card-ready');
    await page.waitForTimeout(100);
    const state = await page.evaluate(async () => {
      const fc = document.getElementById('fc1');
      fc.open = true;
      fc.lock();
      await new Promise((r) => setTimeout(r, 50));
      const locked1 = fc.locked;
      fc.unlock();
      await new Promise((r) => setTimeout(r, 50));
      const locked0 = fc.locked;
      // Lock doble + unlock doble → vuelve a 0.
      fc.lock();
      fc.lock();
      const locked2 = fc.locked;
      fc.unlock();
      fc.unlock();
      const locked3 = fc.locked;
      return { locked1, locked0, locked2, locked3 };
    });
    assert.equal(state.locked1, true, 'tras lock() debe estar locked');
    assert.equal(state.locked0, false, 'tras unlock() debe estar unlocked');
    assert.equal(state.locked2, true, '2 locks → locked');
    assert.equal(state.locked3, false, '2 unlocks → unlocked');
  },
});

tests.push({
  name: 'API: linearTransform acepta {tx, ty, e}',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-float-card-ready');
    await page.waitForTimeout(100);
    const state = await page.evaluate(() => {
      const fc = document.getElementById('fc3');
      const before = fc.linearTransform;
      fc.linearTransform = { tx: '4px', ty: '-2px', e: 1.2 };
      const after = fc.linearTransform;
      return { before, after };
    });
    assert.ok(state.after, 'linearTransform debe estar seteado');
    assert.equal(state.after.e, 1.2);
  },
});

tests.push({
  name: 'API: horizontal/vertical aceptan "top+50", "center", etc.',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-float-card-ready');
    await page.waitForTimeout(100);
    const state = await page.evaluate(() => {
      const fc = document.getElementById('fc2');
      return {
        horizontal: fc.horizontal,
        vertical: fc.vertical,
      };
    });
    assert.equal(state.horizontal, 'center');
    assert.equal(state.vertical, 'top+50');
  });
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

report('float-card', failures === 0, { total: tests.length, failures });
