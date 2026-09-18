// stat.test.mjs — tests exhaustivos del demo stat.html.
// Cobertura: smoke + funcional (rendering, trend auto-detect, trend-direction,
// colors, slots, accesibilidad) + determinismo (re-asignar attrs es idempotente).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data/stat/stat.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente is-stat está definido y los 6 stats renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const initial = await page.evaluate(() => {
      const stats = [...document.querySelectorAll('main is-stat')];
      return {
        defined: !!customElements.get('is-stat'),
        count: stats.length,
        rendered: stats.map((s) => {
          const sr = s.shadowRoot;
          const label = sr?.querySelector('[part="label"]')?.textContent?.trim() || '';
          const value = sr?.querySelector('[part="value"]')?.textContent?.trim() || '';
          return { label, value };
        }),
      };
    });
    assert.equal(initial.defined, true, 'is-stat debe estar definido');
    assert.equal(initial.count, 6, `esperaba 6 stats, hay ${initial.count}`);
    // Cada uno debe tener al menos label y value no vacíos
    for (const r of initial.rendered) {
      assert.ok(r.label.length > 0, `label vacío en un stat: ${JSON.stringify(r)}`);
      assert.ok(r.value.length > 0, `value vacío en un stat: ${JSON.stringify(r)}`);
    }
    await screenshot(page, 'stat-smoke');
  },
});

tests.push({
  name: 'funcional: trend "+12.5%" se marca como up en data-trend',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const trend = await page.evaluate(() => {
      // segundo <section> = trend-up
      const sections = [...document.querySelectorAll('main section')];
      const stat = sections[1].querySelector('is-stat');
      const root = stat.shadowRoot.querySelector('[part="base"]');
      const trendEl = root.querySelector('[part="trend"]');
      return {
        attrTrend: stat.getAttribute('trend'),
        attrColor: stat.getAttribute('color'),
        dataTrend: root.dataset.trend,
        dataColor: root.dataset.color,
        text: trendEl?.textContent?.trim() || '',
      };
    });
    assert.equal(trend.attrTrend, '+12.5%', 'atributo trend debería ser "+12.5%"');
    assert.equal(trend.dataTrend, 'up', `auto-detect debería marcar data-trend="up", fue "${trend.dataTrend}"`);
    assert.equal(trend.dataColor, 'success', `data-color debería ser "success", fue "${trend.dataTrend}"`);
    assert.equal(trend.text, '+12.5%', 'el trend debe estar visible en el slot');
  },
});

tests.push({
  name: 'funcional: trend "-3.2%" se marca como down y color danger',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const trend = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const stat = sections[2].querySelector('is-stat');
      const root = stat.shadowRoot.querySelector('[part="base"]');
      return {
        attrTrend: stat.getAttribute('trend'),
        dataTrend: root.dataset.trend,
        dataColor: root.dataset.color,
      };
    });
    assert.equal(trend.attrTrend, '-3.2%');
    assert.equal(trend.dataTrend, 'down', `auto-detect debería marcar "down", fue "${trend.dataTrend}"`);
    assert.equal(trend.dataColor, 'danger');
  },
});

tests.push({
  name: 'funcional: trend-direction="flat" tiene precedencia sobre el auto-detect',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const flat = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const stat = sections[3].querySelector('is-stat');
      const root = stat.shadowRoot.querySelector('[part="base"]');
      return {
        attrTrendDirection: stat.getAttribute('trend-direction'),
        dataTrend: root.dataset.trend,
      };
    });
    assert.equal(flat.attrTrendDirection, 'flat');
    assert.equal(flat.dataTrend, 'flat', `trend-direction explícito debe forzar "flat", fue "${flat.dataTrend}"`);
  },
});

tests.push({
  name: 'funcional: cambiar trend en caliente actualiza data-trend',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const before = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const stat = sections[1].querySelector('is-stat'); // trend-up
      return stat.shadowRoot.querySelector('[part="base"]').dataset.trend;
    });
    assert.equal(before, 'up', 'precondición: trend="+12.5%" marca up');
    // Cambiamos trend a "-7%" → debería re-detectar a down
    await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const stat = sections[1].querySelector('is-stat');
      stat.setAttribute('trend', '-7%');
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const stat = sections[1].querySelector('is-stat');
      return stat.shadowRoot.querySelector('[part="base"]').dataset.trend;
    });
    assert.equal(after, 'down', `tras cambiar trend a "-7%", data-trend debe ser "down", fue "${after}"`);
  },
});

tests.push({
  name: 'funcional: slot value personalizado se respeta (no se sobreescribe)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const slot = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      const stat = sections[5].querySelector('is-stat'); // section de slot override
      const valueEl = stat.shadowRoot.querySelector('[part="value"]');
      return {
        attrValue: stat.getAttribute('value'),
        slotChildren: stat.querySelector('[slot="value"]')?.textContent || '',
        visibleText: valueEl?.textContent?.trim() || '',
      };
    });
    assert.equal(slot.attrValue, null, 'stat con slot override no debe llevar atributo value');
    assert.equal(slot.slotChildren, '$ 3.4M', 'el contenido del slot debe ser "$ 3.4M"');
    assert.equal(slot.visibleText, '$ 3.4M', 'el texto visible debe reflejar el slot');
  },
});

tests.push({
  name: 'smoke: cada stat expone las CSS Parts documentadas',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const parts = await page.evaluate(() => {
      const stat = document.querySelector('main is-stat');
      const sr = stat.shadowRoot;
      return {
        base: !!sr.querySelector('[part="base"]'),
        label: !!sr.querySelector('[part="label"]'),
        value: !!sr.querySelector('[part="value"]'),
        helper: !!sr.querySelector('[part="helper"]'),
        trend: !!sr.querySelector('[part="trend"]'),
        icon: !!sr.querySelector('[part="icon"]'),
      };
    });
    assert.equal(parts.base, true, 'part="base"');
    assert.equal(parts.label, true, 'part="label"');
    assert.equal(parts.value, true, 'part="value"');
    assert.equal(parts.helper, true, 'part="helper"');
    assert.equal(parts.trend, true, 'part="trend"');
    assert.equal(parts.icon, true, 'part="icon"');
  },
});

tests.push({
  name: 'determinismo: re-render con los mismos attrs produce el mismo data-trend',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const a = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      return sections.map((s) => {
        const stat = s.querySelector('is-stat');
        const root = stat.shadowRoot.querySelector('[part="base"]');
        return { trend: root.dataset.trend, color: root.dataset.color };
      });
    });
    // Tocar todos los stats con un remove+set del mismo atributo
    await page.evaluate(() => {
      document.querySelectorAll('main is-stat').forEach((s) => {
        const t = s.getAttribute('trend'); if (t) { s.removeAttribute('trend'); s.setAttribute('trend', t); }
        const c = s.getAttribute('color'); if (c) { s.removeAttribute('color'); s.setAttribute('color', c); }
      });
    });
    await page.waitForTimeout(50);
    const b = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main section')];
      return sections.map((s) => {
        const stat = s.querySelector('is-stat');
        const root = stat.shadowRoot.querySelector('[part="base"]');
        return { trend: root.dataset.trend, color: root.dataset.color };
      });
    });
    assert.deepEqual(a, b, 'tras re-asignar mismos attrs, data-trend y data-color son idénticos');
  },
});

tests.push({
  name: 'accesibilidad: helper se expone con su texto accesible',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-stat-ready');
    const helpers = await page.evaluate(() => {
      return [...document.querySelectorAll('main is-stat')].map((s) => {
        const helper = s.shadowRoot.querySelector('[part="helper"]');
        return helper ? helper.textContent.trim() : null;
      });
    });
    // Esperamos al menos 4 helpers no vacíos (basic, up, down, warning, slot=5)
    const nonEmpty = helpers.filter((h) => h && h.length > 0);
    assert.ok(nonEmpty.length >= 4, `esperaba >=4 helpers visibles, hay ${nonEmpty.length}`);
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

report('stat', failures === 0, { total: tests.length, failures });