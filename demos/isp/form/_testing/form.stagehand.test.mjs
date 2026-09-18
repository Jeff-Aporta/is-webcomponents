// form.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada form tiene dimensiones > 0, los slots tienen contenido
// asignado, y los inputs son visibles dentro del form.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/form/form.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-form-ready');
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    return ['form-a', 'form-b', 'form-c'].map((id) => {
      const f = document.getElementById(id);
      const r = f.getBoundingClientRect();
      const sr = f.shadowRoot;
      const headerSlot = sr.querySelector('slot[name="header"]');
      const contentSlot = sr.querySelector('slot[name="content"]');
      const footerSlot = sr.querySelector('slot[name="footer"], footer[part="footer"]');
      const submit = sr.querySelector('.submit');
      const cancel = sr.querySelector('.cancel');
      return {
        id,
        hostW: r.width,
        hostH: r.height,
        headerAssigned: (headerSlot?.assignedElements({ flatten: true }) || []).length,
        contentAssigned: (contentSlot?.assignedElements({ flatten: true }) || []).length,
        footerExists: !!footerSlot,
        submitRect: submit?.getBoundingClientRect(),
        cancelRect: cancel?.getBoundingClientRect(),
      };
    });
  });

  for (const f of data) {
    const tag = `form#${f.id}`;
    assert.ok(f.hostW > 0, `${tag}: host width > 0 (${f.hostW})`);
    assert.ok(f.hostH > 0, `${tag}: host height > 0 (${f.hostH})`);
    assert.ok(f.headerAssigned >= 1, `${tag}: header debe tener contenido (${f.headerAssigned})`);
    assert.ok(f.contentAssigned >= 1, `${tag}: content debe tener contenido (${f.contentAssigned})`);
    assert.ok(f.submitRect?.width > 0, `${tag}: submit button width > 0`);
    assert.ok(f.cancelRect?.width > 0, `${tag}: cancel button width > 0`);
  }

  console.log(`  ✓ form: rubric determinista PASS (forms visibles, slots con contenido, botones OK)`);
  results.push({ name: 'form', ok: true });
} catch (err) {
  console.error(`  ✗ form: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-form'); } catch {}
  results.push({ name: 'form', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('form-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
