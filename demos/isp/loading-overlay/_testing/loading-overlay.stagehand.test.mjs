// loading-overlay.stagehand.test.mjs — checks deterministas visuales.
// Verifica: tras show(), el backdrop cubre el viewport entero con dimensiones
// válidas y aria-modal correcto. Tras hide(), el backdrop se oculta.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/loading-overlay/loading-overlay.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-loading-ready');
  await page.waitForTimeout(200);

  // Estado inicial: backdrop oculto.
  const initState = await page.evaluate(() => {
    const el = document.getElementById('overlay');
    const bd = el.shadowRoot.querySelector('[part="backdrop"]');
    return {
      hidden: bd?.hidden,
      ariaBusy: bd?.getAttribute('aria-busy'),
      open: el.open,
    };
  });
  assert.equal(initState.hidden, true, 'backdrop oculto inicialmente');
  assert.equal(initState.ariaBusy, 'true', 'aria-busy debe estar siempre en "true" cuando hay overlay');

  // Mostrar y verificar que cubre el viewport.
  await page.evaluate(() => document.getElementById('overlay').show());
  await page.waitForTimeout(300);
  const shown = await page.evaluate(() => {
    const el = document.getElementById('overlay');
    const bd = el.shadowRoot.querySelector('[part="backdrop"]');
    const r = bd.getBoundingClientRect();
    return {
      hidden: bd.hidden,
      rectW: r.width,
      rectH: r.height,
      panelW: el.shadowRoot.querySelector('[part="panel"]')?.getBoundingClientRect().width || 0,
      panelH: el.shadowRoot.querySelector('[part="panel"]')?.getBoundingClientRect().height || 0,
      messageW: el.shadowRoot.querySelector('[part="message"]')?.getBoundingClientRect().width || 0,
      messageText: el.shadowRoot.querySelector('.message-text')?.textContent?.trim() || '',
    };
  });
  const vp = page.viewportSize();
  assert.equal(shown.hidden, false, 'backdrop debe estar visible');
  assert.ok(shown.rectW >= vp.width - 2, `backdrop width (${shown.rectW}) debe cubrir viewport (${vp.width})`);
  assert.ok(shown.rectH >= vp.height - 2, `backdrop height (${shown.rectH}) debe cubrir viewport (${vp.height})`);
  assert.ok(shown.panelW > 50, `panel debe tener width > 50 (${shown.panelW})`);
  assert.ok(shown.panelH > 30, `panel debe tener height > 30 (${shown.panelH})`);
  assert.ok(shown.messageW > 0, `message debe tener width > 0 (${shown.messageW})`);
  assert.ok(/Guardando|Procesando/.test(shown.messageText), `message debe mostrar el texto actual: '${shown.messageText}'`);

  // Hide y volver a estado inicial.
  await page.evaluate(() => document.getElementById('overlay').hide());
  await page.waitForTimeout(200);
  const hiddenAgain = await page.evaluate(() => ({
    hidden: document.getElementById('overlay').shadowRoot.querySelector('[part="backdrop"]').hidden,
  }));
  assert.equal(hiddenAgain.hidden, true, 'backdrop debe volver a ocultarse');

  console.log(`  ✓ loading-overlay: rubric determinista PASS (backdrop cubre viewport, panel visible, message legible)`);
  results.push({ name: 'loading-overlay', ok: true });
} catch (err) {
  console.error(`  ✗ loading-overlay: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-loading-overlay'); } catch {}
  results.push({ name: 'loading-overlay', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('loading-overlay-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
