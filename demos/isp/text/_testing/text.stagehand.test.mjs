// text.stagehand.test.mjs — checks deterministas visuales.
// Verifica: cada texto es visible, los clamps producen alturas esperadas
// (más líneas = más altura), los colores semánticos son distintos entre sí.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/isp/text/text.html`;

const { browser, page } = await newPage();
const results = [];
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 'data-text-ready');
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('is-text')].map((t) => {
      const r = t.getBoundingClientRect();
      const cs = getComputedStyle(t);
      return {
        color: t.getAttribute('color'),
        mix: t.getAttribute('mix'),
        lines: t.getAttribute('lines'),
        rectW: r.width,
        rectH: r.height,
        display: cs.display,
        color2: cs.color,
      };
    });
  });

  // (1) Todos visibles con dimensiones > 0.
  for (const t of data) {
    assert.ok(t.rectW > 0, `text[color=${t.color}]: width > 0 (${t.rectW})`);
    assert.ok(t.rectH > 0, `text[color=${t.color}]: height > 0 (${t.rectH})`);
  }

  // (2) Los clamp boxes producen alturas monótonas crecientes con lines.
  // Buscar los 3 demos de lines en la sección clamp.
  const clampData = data.filter((d) => d.lines);
  // Esperaríamos que lines=4 produzca más altura que lines=2 (con el mismo ancho de contenedor).
  // Como los contenedores tienen width:16rem idénticos, podemos comparar.
  const byLines = {};
  for (const d of clampData) {
    if (!byLines[d.lines]) byLines[d.lines] = d.rectH;
  }
  if (byLines['2'] && byLines['3']) {
    assert.ok(byLines['3'] > byLines['2'] - 1, `lines=3 (${byLines['3']}) debe ser >= lines=2 (${byLines['2']})`);
  }
  if (byLines['2'] && byLines['4']) {
    assert.ok(byLines['4'] > byLines['2'] - 1, `lines=4 (${byLines['4']}) debe ser >= lines=2 (${byLines['2']})`);
  }

  // (3) Colores semánticos producen computed colors distintos.
  const colors = new Set(data.map((d) => d.color2));
  assert.ok(colors.size >= 3, `esperaba >=3 colores computados distintos, hay ${colors.size}`);

  console.log(`  ✓ text: rubric determinista PASS (textos visibles, clamp escala con lines, colores distintos)`);
  results.push({ name: 'text', ok: true });
} catch (err) {
  console.error(`  ✗ text: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-text'); } catch {}
  results.push({ name: 'text', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

const hardFailures = results.filter((r) => r.error).length;
report('text-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
