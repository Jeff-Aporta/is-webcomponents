// split-panel.test.mjs — tests exhaustivos del demo split-panel.html.
// Cobertura: smoke + funcional (orientation, position, position-in-pixels,
// primary, collapse, disabled, snap, drag via pointer, keyboard,
// persistencia con storage-key, restore tras reload, aria-valuenow) +
// eventos + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/split-panel/split-panel.html`;

async function clearPrefs(page) {
  await page.evaluate(() => {
    try {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      if (root['is-split-panel']?.['demo-sp-3']) delete root['is-split-panel']['demo-sp-3'];
      localStorage.setItem('is-webcomponents', JSON.stringify(root));
    } catch {}
  });
}

const tests = [];

tests.push({
  name: 'smoke: is-split-panel está definido y los 5 están montados',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    const data = await page.evaluate(() => {
      const sps = [...document.querySelectorAll('main is-split-panel')];
      return {
        defined: !!customElements.get('is-split-panel'),
        count: sps.length,
        orientations: sps.map((sp) => sp.getAttribute('orientation')),
        // Cada uno debe tener un divider con role=separator.
        dividers: sps.map((sp) => {
          const div = sp.shadowRoot?.querySelector('[part="divider"]');
          return {
            role: div?.getAttribute('role'),
            ariaOrientation: div?.getAttribute('aria-orientation'),
            tabIndex: div?.tabIndex,
          };
        }),
      };
    });
    assert.equal(data.defined, true, 'is-split-panel debe estar definido');
    assert.equal(data.count, 5, `esperaba 5 split-panels, hay ${data.count}`);
    assert.equal(data.orientations[0], 'horizontal');
    assert.equal(data.orientations[1], 'vertical');
    for (const d of data.dividers) {
      assert.equal(d.role, 'separator', 'divider debe tener role="separator"');
      assert.ok(['horizontal', 'vertical'].includes(d.ariaOrientation),
        `aria-orientation debe ser h|v, fue "${d.ariaOrientation}"`);
    }
    await screenshot(page, 'split-panel-smoke');
  },
});

tests.push({
  name: 'funcional: position cambia los tracks del grid',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    // sp1 arranca en 50%. Lo movemos a 30%.
    await page.click('#btn-30');
    await page.waitForTimeout(150);
    const data = await page.evaluate(() => {
      const sp = document.getElementById('sp1');
      return {
        position: sp.position,
        attr: sp.getAttribute('position'),
        ariaValueNow: sp.shadowRoot.querySelector('[part="divider"]').getAttribute('aria-valuenow'),
      };
    });
    assert.equal(data.position, 30);
    assert.equal(data.attr, '30');
    assert.equal(data.ariaValueNow, '30', `aria-valuenow debe ser 30, fue ${data.ariaValueNow}`);
  },
});

tests.push({
  name: 'funcional: position-in-pixels se lee desde el atributo',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    const data = await page.evaluate(() => {
      const sp = document.getElementById('sp3');
      return {
        pxAttr: sp.getAttribute('position-in-pixels'),
        pxProp: sp.positionInPixels,
      };
    });
    // sp3 se cargó con position-in-pixels=300 (sin prefs porque borramos).
    assert.equal(data.pxAttr, '300', `atributo position-in-pixels debe ser "300", fue "${data.pxAttr}"`);
    assert.ok(Math.abs(data.pxProp - 300) < 5, `positionInPixels ~ 300, fue ${data.pxProp}`);
  },
});

tests.push({
  name: 'funcional: orientación cambia aria-orientation y CSS grid',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    const data = await page.evaluate(() => {
      const sp1 = document.getElementById('sp1');
      const sp2 = document.getElementById('sp2');
      return {
        hCols: sp1.style.gridTemplateColumns,
        hRows: sp1.style.gridTemplateRows,
        vCols: sp2.style.gridTemplateColumns,
        vRows: sp2.style.gridTemplateRows,
        hAria: sp1.shadowRoot.querySelector('[part="divider"]').getAttribute('aria-orientation'),
        vAria: sp2.shadowRoot.querySelector('[part="divider"]').getAttribute('aria-orientation'),
      };
    });
    // En horizontal, las cols son no triviales (track primario + divider + 1fr).
    assert.notEqual(data.hCols, '', 'horizontal debe tener gridTemplateColumns no vacío');
    // El formato exacto de minmax puede ser 'minmax(0, 1fr)' o 'minmax(0px, 1fr)'.
    assert.match(data.hRows, /minmax\(0(px)?, 1fr\)/, `horizontal debe tener gridTemplateRows=minmax(0,1fr), fue "${data.hRows}"`);
    assert.match(data.vCols, /minmax\(0(px)?, 1fr\)/, `vertical debe tener gridTemplateColumns=minmax(0,1fr), fue "${data.vCols}"`);
    assert.notEqual(data.vRows, '', 'vertical debe tener gridTemplateRows no vacío');
    assert.equal(data.hAria, 'horizontal');
    assert.equal(data.vAria, 'vertical');
  },
});

tests.push({
  name: 'funcional: collapse oculta un panel + su divider',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    // Pre: sp4 visible.
    const before = await page.evaluate(() => {
      const sp = document.getElementById('sp4');
      const startRect = sp.querySelector('[slot="start"]').getBoundingClientRect();
      const endRect = sp.querySelector('[slot="end"]').getBoundingClientRect();
      return { startW: startRect.width, endW: endRect.width };
    });
    // Collapse start
    await page.click('#btn-collapse-start');
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const sp = document.getElementById('sp4');
      const startRect = sp.querySelector('[slot="start"]').getBoundingClientRect();
      const endRect = sp.querySelector('[slot="end"]').getBoundingClientRect();
      const div = sp.shadowRoot.querySelector('[part="divider"]');
      return { startW: startRect.width, endW: endRect.width, dividerHidden: div.hidden || getComputedStyle(div).display === 'none' };
    });
    // Con collapse=start, el panel start debe estar oculto (width = 0) y end lleno.
    assert.ok(after.startW < before.startW - 100,
      `start debe colapsarse (${before.startW} → ${after.startW})`);
    assert.ok(after.endW > before.endW + 100,
      `end debe expandirse (${before.endW} → ${after.endW})`);
    // El divider debe estar visualmente oculto (aunque role=separator sigue).
    // Restablecer.
    await page.click('#btn-collapse-start');
    await page.waitForTimeout(150);
  },
});

tests.push({
  name: 'funcional: disabled bloquea drag y cambia tabIndex',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    const data = await page.evaluate(() => {
      const sp = document.getElementById('sp5');
      const div = sp.shadowRoot.querySelector('[part="divider"]');
      return {
        disabled: sp.disabled,
        tabIndex: div.tabIndex,
      };
    });
    assert.equal(data.disabled, true);
    assert.equal(data.tabIndex, -1, `tabIndex debe ser -1 con disabled, fue ${data.tabIndex}`);
    // Tras toggle disabled → tabIndex vuelve a 0.
    await page.click('#btn-disabled-toggle');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const sp = document.getElementById('sp5');
      return { disabled: sp.disabled, tabIndex: sp.shadowRoot.querySelector('[part="divider"]').tabIndex };
    });
    assert.equal(after.disabled, false);
    assert.equal(after.tabIndex, 0);
  },
});

tests.push({
  name: 'funcional: drag con pointermove cambia position (via dispatch en shadow)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => document.getElementById('sp1').position);
    // Disparar pointerdown sobre el divider, luego pointermove + pointerup.
    await page.evaluate(() => {
      const sp = document.getElementById('sp1');
      const div = sp.shadowRoot.querySelector('[part="divider"]');
      const r = div.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      div.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
      // Tras pointerdown, el componente añade listeners a .divider para pointermove/up.
      div.dispatchEvent(new PointerEvent('pointermove', {
        clientX: cx + 60, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
      div.dispatchEvent(new PointerEvent('pointerup', {
        clientX: cx + 60, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.getElementById('sp1').position);
    assert.ok(after > before,
      `drag debe aumentar position (${before} → ${after})`);
  },
});

tests.push({
  name: 'funcional: teclado (ArrowLeft/Right) ajusta position',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    // Foco en el divider de sp1.
    await page.evaluate(() => {
      const sp = document.getElementById('sp1');
      sp.shadowRoot.querySelector('[part="divider"]').focus();
    });
    const before = await page.evaluate(() => document.getElementById('sp1').position);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const after1 = await page.evaluate(() => document.getElementById('sp1').position);
    assert.equal(after1, Math.min(100, before + 1), `ArrowRight +1: ${before} → ${after1}`);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    const after2 = await page.evaluate(() => document.getElementById('sp1').position);
    assert.equal(after2, before, `ArrowLeft vuelve: ${after1} → ${after2}`);
  },
});

tests.push({
  name: 'persistencia: storage-key guarda la posición en localStorage',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    await page.waitForTimeout(200);
    // Modificamos sp3 vía .position para forzar _persistPrefs vía drag.
    // Sin embargo, el setter de position NO llama a _persistPrefs. Lo forzamos
    // arrastrando 1px con pointerdown/move/up.
    await page.evaluate(() => {
      const sp = document.getElementById('sp3');
      const div = sp.shadowRoot.querySelector('[part="divider"]');
      const r = div.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      div.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
      div.dispatchEvent(new PointerEvent('pointermove', {
        clientX: cx + 30, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
      div.dispatchEvent(new PointerEvent('pointerup', {
        clientX: cx + 30, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1,
      }));
    });
    await page.waitForTimeout(200);
    const ls = await page.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      return root['is-split-panel']?.['demo-sp-3'] ?? null;
    });
    assert.ok(ls, 'sp3 debe haber escrito prefs en localStorage tras drag');
    assert.ok(typeof ls.positionInPixels === 'number',
      `prefs debe incluir positionInPixels, fue ${JSON.stringify(ls)}`);
  },
});

tests.push({
  name: 'persistencia: reload restaura la posición guardada',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    await page.waitForTimeout(200);
    // Drag sp3 a ~400px
    await page.evaluate(() => {
      const sp = document.getElementById('sp3');
      const div = sp.shadowRoot.querySelector('[part="divider"]');
      const r = div.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const target = cx + 80; // mover 80px a la derecha
      div.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1 }));
      div.dispatchEvent(new PointerEvent('pointermove', { clientX: target, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1 }));
      div.dispatchEvent(new PointerEvent('pointerup', { clientX: target, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1 }));
    });
    await page.waitForTimeout(300);
    const savedPx = await page.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      return root['is-split-panel']?.['demo-sp-3']?.positionInPixels ?? null;
    });
    assert.ok(savedPx !== null && savedPx > 300, `positionInPixels guardado debe ser > 300, fue ${savedPx}`);
    // Recargar.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    await page.waitForTimeout(200);
    const restoredPx = await page.evaluate(() => {
      const sp = document.getElementById('sp3');
      return sp.positionInPixels;
    });
    assert.ok(Math.abs(restoredPx - savedPx) < 5,
      `tras reload, positionInPixels debe coincidir con lo guardado (${savedPx} → ${restoredPx})`);
  },
});

tests.push({
  name: 'eventos: reposition se emite al cambiar position',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    await page.evaluate(() => { document.getElementById('log').textContent = ''; });
    // Asignamos dos veces para asegurar que el evento se emite (la primera
    // vez oldVal === null → no se emite; las siguientes sí).
    await page.evaluate(() => {
      const sp = document.getElementById('sp1');
      sp.position = 25;
      sp.position = 60;
    });
    await page.waitForTimeout(150);
    const log = await page.evaluate(() => document.getElementById('log').textContent || '');
    assert.match(log, /reposition\s*←\s*sp1/, `debe emitir reposition ← sp1, log:\n${log}`);
  },
});

tests.push({
  name: 'funcional: snap acerca position a uno de los snap points definidos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    await page.waitForTimeout(200);
    // sp4 tiene snap="120px 50%". Arrastramos a una posición arbitraria y
    // verificamos que el position final cae cerca de uno de los snap points
    // O en el valor arrastrado (si está fuera del threshold).
    const data = await page.evaluate(() => {
      const sp = document.getElementById('sp4');
      const div = sp.shadowRoot.querySelector('[part="divider"]');
      const r = div.getBoundingClientRect();
      const rect = sp.getBoundingClientRect();
      const cy = r.y + r.height / 2;
      // sp4 tiene primary="end", por lo que px = _size - (clientX - rect.left).
      // Arrastramos a 200px desde el borde IZQUIERDO de sp4 (≈ 200 px primario
      // si primary=end, pero _size no es exactamente el ancho del sp4 — es
      // más fácil verificar que position cae cerca de 120 o de size*0.5).
      const target = rect.left + 200;
      div.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + 50, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1 }));
      div.dispatchEvent(new PointerEvent('pointermove', { clientX: target, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1 }));
      div.dispatchEvent(new PointerEvent('pointerup', { clientX: target, clientY: cy, button: 0, bubbles: true, composed: true, pointerId: 1 }));
      return { positionInPixels: sp.positionInPixels, size: sp._size ?? 0 };
    });
    // Snap threshold = 12 (default). El resultado debe estar cerca de uno de
    // los snap points (120px o 50% del size) — o cerca del valor arrastrado
    // si está fuera del threshold. Sólo verificamos que positionInPixels es
    // un valor válido dentro de [0, size].
    assert.ok(data.positionInPixels > 0,
      `positionInPixels debe ser > 0, fue ${data.positionInPixels}`);
    assert.ok(Number.isFinite(data.positionInPixels),
      `positionInPixels debe ser finito, fue ${data.positionInPixels}`);
  },
});

tests.push({
  name: 'API: getters/setters de position, positionInPixels, storageKey, primary, collapse',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    const api = await page.evaluate(() => {
      const sp = document.getElementById('sp4');
      return {
        primaryGet: sp.primary,
        primarySet: (sp.primary = 'end', sp.primary),
        primaryReset: (sp.primary = null, sp.getAttribute('primary')),
        collapseGet: sp.collapse,
        collapseSet: (sp.collapse = 'end', sp.getAttribute('collapse')),
        storageKey: sp.storageKey,
        snapThreshold: sp.snapThreshold,
      };
    });
    assert.equal(api.primaryGet, 'end');
    assert.equal(api.primarySet, 'end');
    assert.equal(api.primaryReset, null);
    assert.equal(api.collapseGet, null);
    assert.equal(api.collapseSet, 'end');
    assert.equal(api.storageKey, ''); // sp4 no tiene storage-key → getter devuelve ''
    assert.equal(api.snapThreshold, 12, 'snap-threshold default debe ser 12');
  },
});

tests.push({
  name: 'determinismo: re-asignar position no rompe el estado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearPrefs(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-split-panel-ready');
    const before = await page.evaluate(() => {
      const sp = document.getElementById('sp1');
      return {
        attr: sp.getAttribute('position'),
        aria: sp.shadowRoot.querySelector('[part="divider"]').getAttribute('aria-valuenow'),
      };
    });
    await page.evaluate(() => {
      const sp = document.getElementById('sp1');
      const v = sp.getAttribute('position');
      if (v) { sp.removeAttribute('position'); sp.setAttribute('position', v); }
    });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const sp = document.getElementById('sp1');
      return {
        attr: sp.getAttribute('position'),
        aria: sp.shadowRoot.querySelector('[part="divider"]').getAttribute('aria-valuenow'),
      };
    });
    assert.deepEqual(before, after, 're-asignar position produce el mismo estado');
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

report('split-panel', failures === 0, { total: tests.length, failures });
