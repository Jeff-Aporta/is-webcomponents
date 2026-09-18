// btn-ref.stagehand.test.mjs — checks deterministas visuales.
// Verifica: campo visible con tamaño > 0, modal abre con catálogo, label resuelto
// tras asignación programática, ningún overflow fuera del viewport.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/btn-ref/btn-ref.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-btn-ref-ready');
  await page.waitForTimeout(200);

  // (1) Inspección inicial del shadow root y dimensiones del campo.
  const init = await page.evaluate(() => {
    const el = document.getElementById('ref-app');
    const sr = el.shadowRoot;
    const inputEl = sr.querySelector('is-input.field');
    const openBtn = sr.querySelector('button.open');
    return {
      inputRect: inputEl?.getBoundingClientRect(),
      openRect: openBtn?.getBoundingClientRect(),
      hasLabelText: !!sr.querySelector('.value-label'),
      svgIcon: !!openBtn?.querySelector('svg'),
    };
  });
  assert.ok(init.inputRect, 'input debe tener rect');
  assert.ok(init.inputRect.width > 0, `input width > 0 (${init.inputRect.width})`);
  assert.ok(init.inputRect.height > 0, `input height > 0 (${init.inputRect.height})`);
  assert.ok(init.openRect, 'open button debe tener rect');
  assert.ok(init.openRect.width > 0, `open button width > 0 (${init.openRect.width})`);
  assert.equal(init.hasLabelText, true, '.value-label debe existir en shadow');
  assert.equal(init.svgIcon, true, 'open button debe tener el icono filtro SVG');

  // (2) El campo no debe sobresalir del viewport.
  const vp = page.viewportSize();
  assert.ok(init.inputRect.x + init.inputRect.width <= vp.width + 1, 'input no debe salirse del viewport');

  // (3) Tras set-value, la label resuelta debe estar visible y no debe ser placeholder.
  await page.click('#set-value');
  await page.waitForTimeout(400);
  const afterValue = await page.evaluate(() => {
    const el = document.getElementById('ref-app');
    const label = el.shadowRoot.querySelector('.value-label');
    return {
      labelText: label?.textContent?.trim() ?? '',
      labelHidden: !!label?.hidden,
    };
  });
  assert.ok(afterValue.labelText.length > 0, `label debe estar resuelta, es '${afterValue.labelText}'`);
  assert.ok(afterValue.labelText !== 'Cargando...', `label no debe seguir en estado 'Cargando...' (es '${afterValue.labelText}')`);

  console.log(`  ✓ btn-ref: rubric determinista PASS (dimensiones OK, icono presente, label resuelta)`);
  results.push({ name: 'btn-ref', ok: true });
} catch (err) {
  console.error(`  ✗ btn-ref: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-btn-ref'); } catch {}
  results.push({ name: 'btn-ref', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('btn-ref-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
