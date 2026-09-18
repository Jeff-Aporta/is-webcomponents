// card.stagehand.test.mjs — verificaciones de calidad visual.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/card/card.html`, readyAttr: 'data-card-ready', name: 'card' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('main is-card')];
    return cards.map((c, idx) => {
      const sr = c.shadowRoot;
      const r = c.getBoundingClientRect();
      const mediaR = sr.querySelector('[part="media"]')?.getBoundingClientRect();
      const bodyR = sr.querySelector('[part="body"]')?.getBoundingClientRect();
      return {
        idx,
        variant: c.getAttribute('variant'),
        orientation: c.getAttribute('orientation'),
        cardW: r.width, cardH: r.height,
        mediaW: mediaR?.width ?? 0, mediaH: mediaR?.height ?? 0,
        bodyW: bodyR?.width ?? 0, bodyH: bodyR?.height ?? 0,
        // Texto visible: light DOM del host (lo que el consumidor puso).
        bodyText: (c.textContent ?? '').trim(),
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber cards, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx} (${d.variant ?? 'outlined'}/${d.orientation ?? 'vertical'})`;

    // (1) Layout real.
    assert.ok(d.cardW > 30, `${tag}: ancho card > 30, fue ${d.cardW}`);
    assert.ok(d.cardH > 20, `${tag}: alto card > 20, fue ${d.cardH}`);

    // (2) Body renderizado.
    assert.ok(d.bodyW > 10, `${tag}: ancho body > 10, fue ${d.bodyW}`);
    assert.ok(d.bodyH > 10, `${tag}: alto body > 10, fue ${d.bodyH}`);
    assert.ok(d.bodyText.length > 0, `${tag}: body vacío`);

    // (3) variant y orientation caen en valores documentados.
    assert.ok(['accent', 'filled', 'outlined', 'filled-outlined', 'plain'].includes(d.variant),
      `${tag}: variant="${d.variant}" fuera de la lista documentada`);
    assert.ok(['horizontal', 'vertical'].includes(d.orientation),
      `${tag}: orientation="${d.orientation}" fuera de la lista documentada`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (parts visibles, layout no-cero, body renderizado, attrs válidos)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del <is-card> que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: las cards muestran un cuerpo con texto visible y un borde/fondo distinguible.

2. LAYOUT NO VACÍO: las cards tienen tamaño visible (alto/ancho > 0), no son una línea plana.

3. VARIANTS DIFERENCIADOS: los 5 variants (accent/filled/outlined/filled-outlined/plain) son visualmente distinguibles entre sí.

4. SLOTS RESERVAN ESPACIO: la card completa (con media + header + footer) tiene más alto que la card mínima (sólo body).

5. HORIZONTAL DISTINGUIBLE: la card con orientation="horizontal" tiene media y actions a izquierda/derecha del body.

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "variants_differentiated": "PASS" | "FAIL",
  "slots_reserve_space": "PASS" | "FAIL",
  "horizontal_distinguishable": "PASS" | "FAIL",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric(demo) {
  const sh = await maybeStagehand();
  if (!sh) return { name: demo.name, llm_skipped: true };
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['renders', 'non_empty_layout', 'variants_differentiated', 'slots_reserve_space', 'horizontal_distinguishable'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { name: demo.name, llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  for (const demo of DEMOS) {
    try {
      const r = await runStagehandRubric(demo);
      if (r.llm_skipped) console.log(`  ⊘ ${demo.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
      else if (!r.fails || r.fails.length === 0) console.log(`  ✓ ${demo.name}: visual rubric LLM PASS`);
      else console.error(`  ✗ ${demo.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    } catch (err) {
      console.error(`  ✗ ${demo.name} (LLM): ${String(err?.message ?? err)}`);
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('card-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
