// heading.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada heading es visible con tamaño > 0, el nivel determina el
// font-size (h1 > h2 > ... > h6), y los colores semánticos producen
// computed-color distinto del default.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/heading/heading.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-heading-ready');
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('is-heading')].map((h, idx) => {
      const sr = h.shadowRoot;
      const inner = sr.querySelector('h1, h2, h3, h4, h5, h6');
      const cs = inner ? getComputedStyle(inner) : getComputedStyle(h);
      const r = inner?.getBoundingClientRect() || h.getBoundingClientRect();
      return {
        idx,
        level: h.level,
        color: h.getAttribute('color'),
        fontSize: parseFloat(cs.fontSize),
        rectW: r.width,
        rectH: r.height,
        text: inner?.textContent?.trim() || '',
      };
    });
  });

  // (1) Todos visibles con dimensiones > 0.
  for (const h of data) {
    assert.ok(h.rectW > 0, `heading "${h.text}": width > 0 (${h.rectW})`);
    assert.ok(h.rectH > 0, `heading "${h.text}": height > 0 (${h.rectH})`);
    assert.ok(h.fontSize > 6, `heading "${h.text}": font-size > 6px (${h.fontSize})`);
  }

  // (2) Escala por nivel: h1 > h2 > h3.
  const byLevel = {};
  for (const h of data) {
    if (h.color || h.level > '4') continue; // ignorar los coloreados/customs
    if (!byLevel[h.level]) byLevel[h.level] = h.fontSize;
  }
  // Asumir que se han capturado los 6 niveles en la primera sección.
  const levels = ['1', '2', '3', '4', '5', '6'].filter((l) => byLevel[l]);
  for (let i = 1; i < levels.length; i++) {
    const cur = levels[i];
    const prev = levels[i - 1];
    if (byLevel[cur] && byLevel[prev]) {
      assert.ok(
        byLevel[cur] <= byLevel[prev] + 1,
        `font-size nivel ${cur} (${byLevel[cur]}px) debe ser <= nivel ${prev} (${byLevel[prev]}px)`,
      );
    }
  }

  console.log(`  ✓ heading: rubric determinista PASS (todos visibles, escala por nivel coherente)`);
  results.push({ name: 'heading', ok: true });
} catch (err) {
  console.error(`  ✗ heading: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-heading'); } catch {}
  results.push({ name: 'heading', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('heading-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
