// slider.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) Cinco sliders visibles, sin solape vertical.
//  (2) Cada uno tiene rail visible y thumbs posicionados dentro del rail.
//  (3) En range, los dos thumbs están separados y no se solapan.
//  (4) Marks con labels se renderizan con texto legible bajo el rail.
//  (5) Slider disabled se ve atenuado y los thumbs quedan dentro del rail.
//  (6) Tras interacción con teclado, los thumbs se reposicionan a la nueva
//      posición (sin quedar fuera del rail).
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/slider/slider.html`,
  readyAttr: 'data-slider-ready',
  name: 'slider',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1): layout
  const rects = await page.evaluate(() => {
    const sl = [...document.querySelectorAll('is-slider')];
    return sl.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
  });
  for (let i = 1; i < rects.length; i++) {
    const prev = rects[i - 1];
    const cur = rects[i];
    assert.ok(
      cur.y >= prev.y + prev.h - 1,
      `${DEMO.name}#${i}: slider ${i} no debe solaparse con ${i - 1} (y=${cur.y}, prevBottom=${prev.y + prev.h})`,
    );
  }

  // (2) y (3): thumbs dentro del rail y no solapados en range
  const thumbData = await page.evaluate(() => {
    const sl = [...document.querySelectorAll('is-slider')];
    return sl.map((s, idx) => {
      const sr = s.shadowRoot;
      const rail = sr.querySelector('[part="rail"]');
      const railRect = rail?.getBoundingClientRect();
      const thumbs = [...sr.querySelectorAll('[role="slider"]')];
      const thumbRects = thumbs.map((t) => {
        const r = t.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      return { idx, railRect, thumbs: thumbRects };
    });
  });

  for (const s of thumbData) {
    const r = s.railRect;
    if (!r || r.width === 0) continue;
    // Tolerancia de 20px porque el thumb sobresale del rail en los extremos
    // (el thumb es más alto que el rail y se renderiza con center anchor).
    const TOL = 20;
    for (let i = 0; i < s.thumbs.length; i++) {
      const t = s.thumbs[i];
      const inside =
        t.x >= r.x - TOL &&
        t.x + t.width <= r.x + r.width + TOL;
      assert.ok(
        inside,
        `${DEMO.name}#${s.idx}: thumb ${i} debe estar dentro del rail±${TOL} (x=${t.x.toFixed(1)}, railX=${r.x.toFixed(1)}, railW=${r.width.toFixed(1)})`,
      );
    }
    // thumbs no se solapan entre sí (en range)
    for (let i = 0; i < s.thumbs.length; i++) {
      for (let j = i + 1; j < s.thumbs.length; j++) {
        const a = s.thumbs[i], b = s.thumbs[j];
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width;
        assert.equal(overlap, false, `${DEMO.name}#${s.idx}: thumbs ${i} y ${j} no deben solaparse`);
      }
    }
  }

  // (4): marks con labels
  const marks = await page.evaluate(() => {
    const s = document.querySelector('#sec-marks is-slider');
    const sr = s.shadowRoot;
    const labels = [...sr.querySelectorAll('[part="mark-label"]')];
    return labels.map((l) => ({
      text: l.textContent.trim(),
      rect: (() => { const r = l.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
    }));
  });
  assert.equal(marks.length, 5, '5 marks con label');
  for (const m of marks) {
    assert.ok(m.text.length > 0, `mark label "${m.text}" tiene texto`);
    assert.ok(m.rect.w > 0 && m.rect.h > 0, `mark "${m.text}" tiene tamaño visible`);
  }

  // (5): disabled
  const dis = await page.evaluate(() => {
    const s = document.querySelector('#sec-disabled is-slider');
    return {
      stateDisabled: s.matches(':state(disabled)'),
      thumbTabindex: s.shadowRoot.querySelector('[role="slider"]').tabIndex,
    };
  });
  assert.equal(dis.stateDisabled, true, 'slider disabled tiene :state(disabled)');
  assert.equal(dis.thumbTabindex, -1, 'thumb no focusable');

  // (6): interacción con teclado reposiciona el thumb sin salirse del rail
  await page.evaluate(() => {
    const s = document.querySelector('#sec-basico is-slider');
    s.shadowRoot.querySelector('[role="slider"]').focus();
  });
  await page.keyboard.press('End');
  await page.waitForTimeout(80);
  const afterEnd = await page.evaluate(() => {
    const s = document.querySelector('#sec-basico is-slider');
    const sr = s.shadowRoot;
    const rail = sr.querySelector('[part="rail"]');
    const thumb = sr.querySelector('[role="slider"]');
    const railRect = rail.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    return {
      value: s.value,
      thumbInside: thumbRect.x + thumbRect.width / 2 >= railRect.x - 1 && thumbRect.x + thumbRect.width / 2 <= railRect.x + railRect.width + 1,
    };
  });
  assert.equal(afterEnd.value, 100, 'End → value=100');
  assert.ok(afterEnd.thumbInside, 'thumb queda dentro del rail tras End');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (5 sliders sin solape, thumbs dentro del rail, range con 2 thumbs separados, marks legibles)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

// Opt-in: rama LLM
const VISUAL_RUBRIC = `
Evalúa la calidad visual del componente slider que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. LAYOUT NO SE SOLAPA: los 5 sliders se ven apilados verticalmente, sin solaparse.

2. THUMBS VISIBLES: cada slider expone un thumb (o dos para range) sobre el rail.

3. TRACK Y RAIL LEGIBLES: el rail y el track rellenado se distinguen visualmente.

4. MARKS LEGIBLES: el slider con marks muestra etiquetas de texto bajo el rail, alineadas con los puntos.

5. THUMB DENTRO DEL RAIL: tras interacción (o en estado final), los thumbs no se salen del rail.

6. DISABLED VISUALMENTE DIFERENCIADO: el slider disabled se ve apagado/atenuado.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "thumbs_visible": "PASS" | "FAIL",
  "track_visible": "PASS" | "FAIL",
  "marks_legible": "PASS" | "FAIL" | "N/A",
  "thumb_inside_rail": "PASS" | "FAIL",
  "disabled_dimmed": "PASS" | "FAIL" | "N/A",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric() {
  const sh = await maybeStagehand();
  if (!sh) return { llm_skipped: true };
  const { browser, page } = await newPage();
  try {
    await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, DEMO.readyAttr);
    await page.evaluate(() => {
      const s = document.querySelector('#sec-basico is-slider');
      s.shadowRoot.querySelector('[role="slider"]').focus();
    });
    await page.keyboard.press('End');
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['no_overlap', 'thumbs_visible', 'track_visible', 'marks_legible', 'thumb_inside_rail', 'disabled_dimmed'];
    const fails = checks.filter((c) => json?.[c] === 'FAIL');
    return { llm_skipped: false, rubric: json, fails };
  } finally {
    await sh.close?.().catch(() => {});
    await close({ browser, page });
  }
}

if (process.env.STAGEHAND === '1') {
  console.log('  (STAGEHAND=1 — ejecutando rama LLM además de las checks deterministas)');
  try {
    const r = await runStagehandRubric();
    if (r.llm_skipped) console.log(`  ⊘ ${DEMO.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
    else if (!r.fails || r.fails.length === 0) console.log(`  ✓ ${DEMO.name}: visual rubric LLM PASS`);
    else console.error(`  ✗ ${DEMO.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
  } catch (err) {
    console.error(`  ✗ ${DEMO.name} (LLM): ${String(err?.message ?? err)}`);
  }
}

await close({ browser, page });
report(DEMO.name, true, { mode: 'deterministic+opt-in-llm' });
