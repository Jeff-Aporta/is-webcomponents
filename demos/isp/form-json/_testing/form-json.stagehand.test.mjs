// form-json.stagehand.test.mjs — checks deterministas visuales.
// Verifica: los controles son visibles, el panel de output se actualiza tras
// pulsar botones, y los valores asignados se reflejan en el DOM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/form-json/form-json.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-form-json-ready');
  await page.waitForTimeout(300);

  // (1) Cada control con name tiene dimensiones > 0 y está visible.
  const layout = await page.evaluate(() => {
    const form = document.getElementById('demo-form');
    return [...form.querySelectorAll('[name]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.localName, name: el.getAttribute('name'), w: r.width, h: r.height };
    });
  });
  for (const c of layout) {
    assert.ok(c.w > 0, `${c.tag}[name=${c.name}] width > 0 (${c.w})`);
    assert.ok(c.h > 0, `${c.tag}[name=${c.name}] height > 0 (${c.h})`);
  }

  // (2) Click en setValues → los inputs reflejan los valores en el DOM.
  await page.click('#btn-set');
  await page.waitForTimeout(150);
  const written = await page.evaluate(() => {
    const form = document.getElementById('demo-form');
    const cliente = form.querySelector('[name="cliente"]');
    const correo = form.querySelector('[name="correo"]');
    const activo = form.querySelector('[name="activo"]');
    const tipo = form.querySelector('[name="tipo"]');
    return {
      clienteValue: cliente?.value,
      correoValue: correo?.value,
      activoChecked: !!activo?.checked,
      tipoValue: tipo?.value,
    };
  });
  assert.equal(written.clienteValue, 'CL-009');
  assert.equal(written.correoValue, 'demo@contapyme.co');
  assert.equal(written.activoChecked, true);
  assert.equal(written.tipoValue, 'factura');

  // (3) El output JSON contiene las claves asignadas.
  const outText = await page.evaluate(() => document.getElementById('out').textContent);
  assert.ok(/"cliente":\s*"CL-009"/.test(outText), `output debe contener "cliente":"CL-009", es: ${outText.slice(0, 200)}`);

  console.log(`  ✓ form-json: rubric determinista PASS (controles visibles, setValues escribe en DOM, output JSON coherente)`);
  results.push({ name: 'form-json', ok: true });
} catch (err) {
  console.error(`  ✗ form-json: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-form-json'); } catch {}
  results.push({ name: 'form-json', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('form-json-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
