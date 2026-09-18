// form-json.test.mjs — tests exhaustivos de los helpers de form-json.
// Cobertura: getValues/setValues round-trip sobre múltiples tipos de control
// (input, switch, select, checkbox multi).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/form-json/form-json.html`;

const tests = [];

tests.push({
  name: 'smoke: el demo monta todos los controles y los helpers se cargan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-json-ready');
    const info = await page.evaluate(async () => {
      const form = document.getElementById('demo-form');
      const mod = await import('../../../dist/cdn/isp/form-json.min.js');
      const controls = mod.listControls(form);
      return {
        controlsCount: controls.length,
        hasGetValues: typeof mod.getValues === 'function',
        hasSetValues: typeof mod.setValues === 'function',
        hasList: typeof mod.listControls === 'function',
        names: controls.map((c) => c.getAttribute('name')),
      };
    });
    assert.equal(info.hasGetValues, true, 'getValues export debe existir');
    assert.equal(info.hasSetValues, true, 'setValues export debe existir');
    assert.equal(info.hasList, true, 'listControls export debe existir');
    assert.ok(info.controlsCount >= 4, `esperaba >=4 controles, hay ${info.controlsCount}`);
    assert.ok(info.names.includes('cliente'), 'debe listar control "cliente"');
    assert.ok(info.names.includes('activo'), 'debe listar control "activo"');
    await screenshot(page, 'form-json-smoke');
  },
});

tests.push({
  name: 'funcional: setValues asigna valores a todos los controles',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-json-ready');
    await page.waitForTimeout(150);
    await page.click('#btn-set');
    await page.waitForTimeout(100);
    const values = await page.evaluate(async () => {
      const form = document.getElementById('demo-form');
      const mod = await import('../../../dist/cdn/isp/form-json.min.js');
      return mod.getValues(form);
    });
    assert.equal(values.cliente, 'CL-009', `cliente debe ser 'CL-009', es '${values.cliente}'`);
    assert.equal(values.correo, 'demo@contapyme.co');
    assert.equal(values.cantidad, 42);
    assert.equal(values.activo, true);
    assert.equal(values.tipo, 'factura');
  },
});

tests.push({
  name: 'funcional: getValues() sobre form vacío devuelve {}',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-json-ready');
    await page.waitForTimeout(150);
    // Limpiar antes
    await page.click('#btn-clear');
    await page.waitForTimeout(50);
    const values = await page.evaluate(async () => {
      const form = document.getElementById('demo-form');
      const mod = await import('../../../dist/cdn/isp/form-json.min.js');
      return mod.getValues(form);
    });
    assert.equal(values.cliente, '', `cliente debe estar vacío tras limpiar, es '${values.cliente}'`);
    assert.equal(values.correo, '');
    assert.equal(values.activo, false);
    assert.equal(values.cantidad, null, `cantidad numérica vacía debe ser null, es ${values.cantidad}`);
  },
});

tests.push({
  name: 'funcional: getValues/setValues round-trip preserva tipos',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-json-ready');
    await page.waitForTimeout(150);
    const round = await page.evaluate(async () => {
      const form = document.getElementById('demo-form');
      const mod = await import('../../../dist/cdn/isp/form-json.min.js');
      const original = {
        cliente: 'ABC',
        correo: 'x@y.z',
        cantidad: 7,
        activo: true,
        tipo: 'nota',
      };
      mod.setValues(form, original);
      const read = mod.getValues(form);
      return { original, read, equal: JSON.stringify(original) === JSON.stringify({
        cliente: read.cliente,
        correo: read.correo,
        activo: read.activo,
        tipo: read.tipo,
      }) };
    });
    assert.equal(round.equal, true, `round-trip debe preservar tipos:\noriginal=${JSON.stringify(round.original)}\nread=${JSON.stringify(round.read)}`);
  },
});

tests.push({
  name: 'funcional: listControls() filtra solo controles con name',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-form-json-ready');
    await page.waitForTimeout(150);
    const info = await page.evaluate(async () => {
      const form = document.getElementById('demo-form');
      // Añadir un control sin name (no debe listarse).
      const noName = document.createElement('is-input');
      form.appendChild(noName);
      const mod = await import('../../../dist/cdn/isp/form-json.min.js');
      const controls = mod.listControls(form);
      const names = controls.map((c) => c.getAttribute('name'));
      const hasNoName = names.some((n) => n === null || n === '');
      noName.remove();
      return { count: controls.length, allHaveName: !hasNoName };
    });
    assert.ok(info.count >= 4, `count >= 4, hay ${info.count}`);
    assert.equal(info.allHaveName, true, 'todos los controles listados deben tener name');
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

report('form-json', failures === 0, { total: tests.length, failures });
