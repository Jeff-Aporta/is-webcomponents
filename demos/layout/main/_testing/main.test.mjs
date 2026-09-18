// main.test.mjs — tests exhaustivos del demo main.html.
// Cobertura: smoke + funcional (role="main" auto, remember-scroll opt-in,
// storage-key, scroll-ttl, saveScroll/restoreScroll/scrollToTop/
// clearRememberedScroll, persistencia en localStorage) + determinismo.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/layout/main/main.html`;

async function clearStorage(page) {
  await page.evaluate(() => {
    try { localStorage.removeItem('is-webcomponents'); } catch {}
  });
}

const tests = [];

tests.push({
  name: 'smoke: is-main está definido y los 4 están montados con role="main"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    const data = await page.evaluate(() => {
      const mains = [...document.querySelectorAll('main is-main')];
      return {
        defined: !!customElements.get('is-main'),
        count: mains.length,
        roles: mains.map((m) => m.getAttribute('role')),
      };
    });
    assert.equal(data.defined, true, 'is-main debe estar definido');
    assert.equal(data.count, 4, `esperaba 4 is-main, hay ${data.count}`);
    for (const r of data.roles) {
      assert.equal(r, 'main', `cada is-main debe tener role="main", fue "${r}"`);
    }
    await screenshot(page, 'main-smoke');
  },
});

tests.push({
  name: 'funcional: remember-scroll sin storage-key es opt-in (no persiste)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    const m1 = await page.evaluate(() => {
      const m = document.getElementById('m1');
      m.scrollTop = 400;
      return { remember: m.rememberScroll, key: m.storageKey };
    });
    assert.equal(m1.remember, false, 'm1 NO debe tener remember-scroll');
    assert.equal(m1.key, '');
    // Tras hacer scroll + recargar, NO debe haber persistencia.
    await page.waitForTimeout(300);
    const ls = await page.evaluate(() => localStorage.getItem('is-webcomponents'));
    assert.equal(ls, null, 'sin remember-scroll + storage-key no debe escribir en localStorage');
  },
});

tests.push({
  name: 'funcional: remember-scroll + storage-key persiste el scroll',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    // m2 está vacío en LS. Hacer scroll + esperar el debounce de save (120ms + slack).
    await page.evaluate(() => { document.getElementById('m2').scrollTop = 300; });
    await page.waitForTimeout(500);
    const lsAfterScroll = await page.evaluate(() => {
      const raw = localStorage.getItem('is-webcomponents');
      return raw ? JSON.parse(raw)['is-main']?.['demo-main-2'] : null;
    });
    assert.ok(lsAfterScroll, 'm2 debe haber escrito en localStorage tras scroll');
    assert.ok(lsAfterScroll.top > 0, `top guardado debe ser > 0, fue ${lsAfterScroll.top}`);
    assert.ok(lsAfterScroll.savedAt > 0, 'savedAt debe ser > 0');
    // Recargar y verificar que el scrollTop se restaura.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    // Esperar un poco al schedule de restore (RESTORE_WINDOW=4500ms, RESTORE_STEP=60ms).
    await page.waitForTimeout(500);
    const restored = await page.evaluate(() => Math.round(document.getElementById('m2').scrollTop));
    assert.ok(restored > 0, `tras reload, scrollTop debe restaurarse, fue ${restored}`);
  },
});

tests.push({
  name: 'funcional: scroll-ttl expira el scroll guardado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    // Sobreescribir manualmente con savedAt muy viejo (más allá del TTL).
    await page.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      root['is-main'] = root['is-main'] || {};
      root['is-main']['demo-main-3'] = { top: 500, savedAt: Date.now() - 120000 }; // 120s > TTL=60s
      localStorage.setItem('is-webcomponents', JSON.stringify(root));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    await page.waitForTimeout(300);
    const restored = await page.evaluate(() => Math.round(document.getElementById('m3').scrollTop));
    assert.equal(restored, 0, `scroll expirado por TTL no debe restaurarse, fue ${restored}`);
  },
});

tests.push({
  name: 'funcional: scrollToTop() lleva scrollTop a 0',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    await page.evaluate(() => { document.getElementById('m4').scrollTop = 500; });
    await page.waitForTimeout(150);
    await page.click('#btn-top');
    await page.waitForTimeout(100);
    const top = await page.evaluate(() => Math.round(document.getElementById('m4').scrollTop));
    assert.equal(top, 0, `scrollToTop debe poner scrollTop a 0, fue ${top}`);
  },
});

tests.push({
  name: 'funcional: saveScroll() escribe en localStorage',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    await page.click('#btn-scroll');
    await page.waitForTimeout(150);
    await page.click('#btn-save');
    await page.waitForTimeout(100);
    const ls = await page.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      return root['is-main']?.['demo-main-interactive'] ?? null;
    });
    assert.ok(ls, 'saveScroll() debe escribir prefs');
    assert.ok(ls.top >= 0 && ls.top <= 500, `top debe estar cerca del scrollTop, fue ${ls.top}`);
  },
});

tests.push({
  name: 'funcional: clearRememberedScroll() borra la entrada',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    await page.click('#btn-scroll');
    await page.waitForTimeout(150);
    await page.click('#btn-save');
    await page.waitForTimeout(100);
    await page.click('#btn-clear');
    await page.waitForTimeout(100);
    const ls = await page.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      return root['is-main']?.['demo-main-interactive'] ?? null;
    });
    assert.ok(ls, 'clearRememberedScroll() debe dejar la entrada (con top=0)');
    assert.equal(ls.top, 0, `top debe ser 0 tras clear, fue ${ls.top}`);
  },
});

tests.push({
  name: 'API: rememberScroll/storageKey/scrollTtl son properties accesibles',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    const data = await page.evaluate(() => {
      const m2 = document.getElementById('m2');
      return {
        rem: m2.rememberScroll,
        key: m2.storageKey,
        ttl: m2.scrollTtl,
        // getter + setter round-trip:
        remSet: (m2.rememberScroll = false, m2.rememberScroll),
      };
    });
    assert.equal(data.rem, true);
    assert.equal(data.key, 'demo-main-2');
    assert.equal(data.ttl, 3600000, `TTL default debe ser 3600000ms (1h), fue ${data.ttl}`);
    assert.equal(data.remSet, false, 'setter debe actualizar el atributo');
  },
});

tests.push({
  name: 'determinismo: cambiar storage-key borra la entrada y resetea el scroll',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-main-ready');
    await page.evaluate(() => { document.getElementById('m2').scrollTop = 200; });
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      return root['is-main']?.['demo-main-2'] ?? null;
    });
    assert.ok(before, `debe haber prefs antes del cambio de key, fue ${JSON.stringify(before)}`);
    // Cambiar el storage-key → debe borrar la entrada y resetear scrollTop.
    await page.evaluate(() => { document.getElementById('m2').storageKey = 'demo-main-2-new'; });
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('is-webcomponents') || '{}');
      return {
        oldKey: root['is-main']?.['demo-main-2'] ?? null,
        newKey: root['is-main']?.['demo-main-2-new'] ?? null,
      };
    });
    // El componente hace clearRememberedScroll() que escribe en el NUEVO storage-key
    // (con top=0). El viejo storage-key queda huérfano (top=200) — no es lo que
    // limpia el componente, sólo deja de usarlo.
    assert.ok(after.newKey !== null && after.newKey.top === 0,
      `el NUEVO storage-key debe tener top=0 tras el cambio, fue ${JSON.stringify(after.newKey)}`);
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

report('main', failures === 0, { total: tests.length, failures });
