// transfer.test.mjs — tests exhaustivos del demo transfer.html.
// Cobertura: smoke + funcional (rendering, mover items, max-target, disabled,
// searchable, eventos, propiedades públicas) + determinismo (round-trip).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/data/transfer/transfer.html`;

const tests = [];

tests.push({
  name: 'smoke: is-transfer e is-transfer-item están definidos y los 4 transfers renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    const initial = await page.evaluate(() => {
      const transfers = [...document.querySelectorAll('main is-transfer')];
      return {
        transferDefined: !!customElements.get('is-transfer'),
        itemDefined: !!customElements.get('is-transfer-item'),
        count: transfers.length,
        perTransfer: transfers.map((t) => {
          const sr = t.shadowRoot;
          return {
            hasBase: !!sr.querySelector('[part="base"]'),
            sourceItems: sr.querySelectorAll('.pane.source .list .item').length,
            targetItems: sr.querySelectorAll('.pane.target .list .item').length,
            children: t.querySelectorAll(':scope > is-transfer-item').length,
          };
        }),
      };
    });
    assert.equal(initial.transferDefined, true, 'is-transfer debe estar definido');
    assert.equal(initial.itemDefined, true, 'is-transfer-item debe estar definido');
    assert.equal(initial.count, 4, `esperaba 4 transfers, hay ${initial.count}`);
    for (const r of initial.perTransfer) {
      assert.equal(r.hasBase, true, 'cada transfer debe tener part="base"');
      assert.ok(r.sourceItems + r.targetItems === r.children,
        `source(${r.sourceItems}) + target(${r.targetItems}) debe sumar children(${r.children})`);
    }
    await screenshot(page, 'transfer-smoke');
  },
});

tests.push({
  name: 'funcional: el basic split 2 source / 4 target coincide con items pre-seleccionados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    const split = await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      const sr = basic.shadowRoot;
      const sourceItems = [...sr.querySelectorAll('.pane.source .list .item')].map((d) => d.dataset.value);
      const targetItems = [...sr.querySelectorAll('.pane.target .list .item')].map((d) => d.dataset.value);
      const selected = [...basic.querySelectorAll(':scope > is-transfer-item[selected]')].map((it) => it.getAttribute('value'));
      const values = basic.values;
      return { sourceItems, targetItems, selected, values };
    });
    // 6 items totales, 2 pre-seleccionados (b, d) → 4 source / 2 target
    assert.equal(split.sourceItems.length, 4, `esperaba 4 en source, hay ${split.sourceItems.length}`);
    assert.equal(split.targetItems.length, 2, `esperaba 2 en target, hay ${split.targetItems.length}`);
    assert.deepEqual(split.values.sort(), ['b', 'd'], 'values debe devolver los 2 seleccionados');
    assert.deepEqual(split.selected.sort(), ['b', 'd']);
    assert.ok(!split.sourceItems.includes('b'), 'b no debe estar en source');
    assert.ok(!split.targetItems.includes('a'), 'a no debe estar en target');
  },
});

tests.push({
  name: 'funcional: max-target bloquea el botón to-target cuando se alcanza el límite',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    // El transfer "limited" tiene 3 items pre-seleccionados y max-target=3.
    // El botón to-target debe estar disabled.
    const state = await page.evaluate(() => {
      const transfers = [...document.querySelectorAll('main is-transfer')];
      const lim = transfers[1];
      const sr = lim.shadowRoot;
      const btnToTarget = sr.querySelector('[data-action="to-target"]');
      const targetCount = lim.values.length;
      return { disabled: btnToTarget.disabled, targetCount };
    });
    assert.equal(state.targetCount, 3, `esperaba 3 en target, hay ${state.targetCount}`);
    assert.equal(state.disabled, true, `botón to-target debe estar disabled al alcanzar max-target=3`);
  },
});

tests.push({
  name: 'funcional: mover todos al target con el botón y verificar counts',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    await page.waitForTimeout(100);
    // basic transfer: clic en "to-target" → 4 source van al target → 6 target, 0 source
    await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      const btn = basic.shadowRoot.querySelector('[data-action="to-target"]');
      btn.click();
    });
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      const sr = basic.shadowRoot;
      const sourceItems = sr.querySelectorAll('.pane.source .list .item').length;
      const targetItems = sr.querySelectorAll('.pane.target .list .item').length;
      return { sourceItems, targetItems, values: basic.values };
    });
    assert.equal(after.sourceItems, 0, `tras to-target source debe ser 0, hay ${after.sourceItems}`);
    assert.equal(after.targetItems, 6, `tras to-target target debe ser 6, hay ${after.targetItems}`);
    assert.equal(after.values.length, 6, `values debe tener 6, tiene ${after.values.length}`);
  },
});

tests.push({
  name: 'funcional: items deshabilitados no se mueven con to-target',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => {
      const transfers = [...document.querySelectorAll('main is-transfer')];
      const dis = transfers[2];
      return {
        disabledValues: [...dis.querySelectorAll(':scope > is-transfer-item[disabled]')].map((it) => it.getAttribute('value')),
        values: dis.values,
        sourceCount: dis.shadowRoot.querySelectorAll('.pane.source .list .item').length,
        targetCount: dis.shadowRoot.querySelectorAll('.pane.target .list .item').length,
      };
    });
    // Antes hay 2 disabled (admin, banned), 2 selected (admin, viewer) → 2/3 split
    assert.deepEqual(before.disabledValues.sort(), ['admin', 'banned']);
    // Clic en to-target: admin está disabled (sale del target) y banned no se mueve
    await page.evaluate(() => {
      const transfers = [...document.querySelectorAll('main is-transfer')];
      const dis = transfers[2];
      dis.shadowRoot.querySelector('[data-action="to-target"]').click();
    });
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const transfers = [...document.querySelectorAll('main is-transfer')];
      const dis = transfers[2];
      const sr = dis.shadowRoot;
      return {
        disabledInSource: [...dis.querySelectorAll(':scope > is-transfer-item[disabled]:not([selected])')].map((it) => it.getAttribute('value')),
        values: dis.values,
        sourceCount: sr.querySelectorAll('.pane.source .list .item').length,
        targetCount: sr.querySelectorAll('.pane.target .list .item').length,
      };
    });
    // admin y banned deben seguir en source (no se mueven)
    assert.deepEqual(after.disabledInSource.sort(), ['admin', 'banned'],
      'admin y banned deben seguir en source tras to-target (están disabled)');
    // editor y guest deben haber pasado al target
    assert.ok(after.values.includes('editor'), 'editor debe estar en target');
    assert.ok(after.values.includes('guest'), 'guest debe estar en target');
  },
});

tests.push({
  name: 'funcional: evento is-transfer-change emite con detalle correcto',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    await page.waitForTimeout(100);
    // Suscribirse manualmente y disparar una transferencia.
    const captured = await page.evaluate(() => {
      return new Promise((resolve) => {
        const basic = document.querySelector('main is-transfer');
        let lastDetail = null;
        basic.addEventListener('is-transfer-change', (e) => { lastDetail = e.detail; });
        const btn = basic.shadowRoot.querySelector('[data-action="to-target"]');
        btn.click();
        // Pequeño delay para asegurar que el listener corrió.
        setTimeout(() => {
          resolve({
            detailKeys: lastDetail ? Object.keys(lastDetail).sort() : [],
            hasValues: !!(lastDetail && Array.isArray(lastDetail.values)),
            valueCount: lastDetail?.values?.length ?? 0,
            source: lastDetail?.source ?? null,
            target: lastDetail?.target ?? null,
          });
        }, 80);
      });
    });
    assert.deepEqual(captured.detailKeys, ['item', 'source', 'target', 'values'],
      `detail debería tener keys [item, source, target, values], tuvo ${JSON.stringify(captured.detailKeys)}`);
    assert.equal(captured.hasValues, true, 'detail.values debe ser un array');
    assert.equal(captured.valueCount, 6, `tras mover todos, values debe tener 6, tiene ${captured.valueCount}`);
    assert.equal(captured.source, 0, 'source count = 0 tras mover todos');
    assert.equal(captured.target, 6, 'target count = 6 tras mover todos');
  },
});

tests.push({
  name: 'funcional: searchable filtra los items al escribir en el input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    await page.waitForTimeout(100);
    // El transfer limited tiene searchable. Buscar "rust".
    await page.evaluate(() => {
      const transfers = [...document.querySelectorAll('main is-transfer')];
      const lim = transfers[1];
      const input = lim.shadowRoot.querySelector('.pane.source .search input');
      input.value = 'rust';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(80);
    const filtered = await page.evaluate(() => {
      const transfers = [...document.querySelectorAll('main is-transfer')];
      const lim = transfers[1];
      const sourceItems = [...lim.shadowRoot.querySelectorAll('.pane.source .list .item')].map((d) => d.textContent.trim());
      return { sourceItems, sourceCount: sourceItems.length };
    });
    assert.equal(filtered.sourceCount, 1, `filtrar por "rust" debe dejar 1 item, hay ${filtered.sourceCount}`);
    assert.ok(filtered.sourceItems[0]?.toLowerCase().includes('rust'),
      `el item restante debe contener "rust", fue "${filtered.sourceItems[0]}"`);
  },
});

tests.push({
  name: 'determinismo: round-trip values → selection → values es idéntico',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    await page.waitForTimeout(100);
    const a = await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      return [...basic.values].sort();
    });
    // Mover todos y luego traerlos de vuelta
    await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      basic.shadowRoot.querySelector('[data-action="to-target"]').click();
    });
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      basic.shadowRoot.querySelector('[data-action="to-source"]').click();
    });
    await page.waitForTimeout(80);
    const b = await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      return [...basic.values].sort();
    });
    assert.deepEqual(a, b, 'round-trip (mover todos → traer todos) debe dejar los mismos values');
    assert.deepEqual(a, [], 'precondición: el basic no debe tener nada seleccionado tras mover todos y traer todos');
  },
});

tests.push({
  name: 'accesibilidad: panes usan role="listbox" con aria-multiselectable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-transfer-ready');
    const aria = await page.evaluate(() => {
      const basic = document.querySelector('main is-transfer');
      const sr = basic.shadowRoot;
      const lists = [...sr.querySelectorAll('.list')];
      return lists.map((l) => ({
        role: l.getAttribute('role'),
        ariaMulti: l.getAttribute('aria-multiselectable'),
        optionCount: l.querySelectorAll('[role="option"]').length,
      }));
    });
    assert.equal(aria.length, 2, 'debe haber 2 .list (source y target)');
    for (const l of aria) {
      assert.equal(l.role, 'listbox', `role del list debe ser "listbox", fue "${l.role}"`);
      assert.equal(l.ariaMulti, 'true', `aria-multiselectable debe ser "true", fue "${l.ariaMulti}"`);
      assert.ok(l.optionCount > 0, 'debe haber al menos 1 opción');
    }
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

report('transfer', failures === 0, { total: tests.length, failures });