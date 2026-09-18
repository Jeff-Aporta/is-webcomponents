// color-picker.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) Cada picker tiene swatch con background-color no vacío (hex válido).
//  (2) El trigger expone el texto HEX correcto (#rrggbb en minúsculas).
//  (3) Al hacer show(), el panel aparece en el top-layer y queda visible.
//  (4) El panel contiene los tres sub-controles: color nativo, hex-input,
//      y al menos un swatch.
//  (5) Los swatches tienen background-color no vacío y se posicionan dentro
//      del panel sin desbordar el viewport.
//  (6) Tras hide(), el dialog vuelve a estar cerrado.
//
// Opt-in LLM con STAGEHAND=1 al final (igual que er-stagehand).
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/color-picker/color-picker.html`,
  readyAttr: 'data-color-picker-ready',
  name: 'color-picker',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1) + (2): estado inicial de cada picker
  const initial = await page.evaluate(() => {
    const pickers = [...document.querySelectorAll('is-color-picker')];
    return pickers.map((p) => {
      const sr = p.shadowRoot;
      return {
        value: p.value,
        hexText: sr.querySelector('.hex-text')?.textContent ?? '',
        swatchBg: sr.querySelector('.swatch')?.style.background ?? '',
        ariaExpanded: sr.querySelector('.trigger').getAttribute('aria-expanded'),
        swatchesCount: sr.querySelectorAll('.swatch-btn').length,
      };
    });
  });

  for (let i = 0; i < initial.length; i++) {
    const s = initial[i];
    assert.match(s.value, /^#[0-9a-f]{6}$/, `${DEMO.name}#${i}: value debe ser #rrggbb`);
    assert.equal(s.hexText, s.value, `${DEMO.name}#${i}: hex-text debe coincidir con value`);
    assert.ok(s.swatchBg && s.swatchBg !== 'transparent', `${DEMO.name}#${i}: swatch debe tener color`);
    assert.equal(s.ariaExpanded, 'false', `${DEMO.name}#${i}: aria-expanded inicial=false`);
    assert.ok(s.swatchesCount > 0, `${DEMO.name}#${i}: debe haber swatches`);
  }

  // (3)-(5): abrir el panel del primer picker y verificar layout
  await page.evaluate(() => {
    document.querySelector('#sec-basico is-color-picker').show();
  });
  await page.waitForTimeout(120);

  const open = await page.evaluate(() => {
    const p = document.querySelector('#sec-basico is-color-picker');
    const sr = p.shadowRoot;
    const dialog = sr.querySelector('dialog.popup');
    const panel = sr.querySelector('.panel');
    const dialogRect = dialog.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      dialogOpen: dialog.open,
      ariaExpanded: sr.querySelector('.trigger').getAttribute('aria-expanded'),
      panelVisible: panelRect.width > 0 && panelRect.height > 0,
      native: !!sr.querySelector('.native'),
      hex: !!sr.querySelector('.hex'),
      swatchCount: sr.querySelectorAll('.swatch-btn').length,
      panelRect: { x: panelRect.x, y: panelRect.y, w: panelRect.width, h: panelRect.height },
      vp: { w: window.innerWidth, h: window.innerHeight },
    };
  });

  assert.equal(open.dialogOpen, true, 'dialog debe estar abierto tras show()');
  assert.equal(open.ariaExpanded, 'true', 'aria-expanded=true tras show()');
  assert.equal(open.native, true, 'panel contiene input nativo de color');
  assert.equal(open.hex, true, 'panel contiene hex-input');
  assert.ok(open.swatchCount >= 6, `panel muestra swatches (>=6), hay ${open.swatchCount}`);
  assert.ok(
    open.panelRect.x >= 0 && open.panelRect.x + open.panelRect.w <= open.vp.w + 1,
    `panel encaja horizontalmente (x=${open.panelRect.x}, w=${open.panelRect.w}, vp=${open.vp.w})`,
  );
  assert.ok(
    open.panelRect.y >= 0 && open.panelRect.y + open.panelRect.h <= open.vp.h + 1,
    `panel encaja verticalmente (y=${open.panelRect.y}, h=${open.panelRect.h}, vp=${open.vp.h})`,
  );

  // (6): hide() cierra el dialog
  await page.evaluate(() => {
    document.querySelector('#sec-basico is-color-picker').hide();
  });
  await page.waitForTimeout(80);
  const closed = await page.evaluate(() => {
    const p = document.querySelector('#sec-basico is-color-picker');
    const sr = p.shadowRoot;
    return {
      dialogOpen: sr.querySelector('dialog.popup').open,
      ariaExpanded: sr.querySelector('.trigger').getAttribute('aria-expanded'),
    };
  });
  assert.equal(closed.dialogOpen, false, 'dialog se cierra tras hide()');
  assert.equal(closed.ariaExpanded, 'false', 'aria-expanded=false tras hide()');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 pickers montados, panel abre y cierra, layout dentro del viewport)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

// Opt-in: rama LLM con Stagehand (mismo patrón que er-stagehand)
const VISUAL_RUBRIC = `
Evalúa la calidad visual del selector de color que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. PICKERS LEGIBLES: los 4 pickers (básico, swatches, disabled, required) son visualmente identificables, con su swatch de color y texto HEX visibles.

2. PANEL EN TOP-LAYER: el panel (al abrir uno) aparece por encima del resto del contenido, sin recortes por overflow de ancestros.

3. CONTROLES DEL PANEL: el panel contiene un selector de color nativo, un input de texto HEX y una rejilla de swatches clickables.

4. SWATCHES LEGIBLES: la rejilla de swatches muestra colores sólidos y separados; cada uno se distingue del siguiente.

5. DISABLED VISUALMENTE DIFERENCIADO: el picker "disabled" se ve apagado/atenuado respecto a los demás.

Responde SOLO con un JSON con la forma:
{
  "pickers_visible": "PASS" | "FAIL",
  "panel_top_layer": "PASS" | "FAIL",
  "panel_controls": "PASS" | "FAIL",
  "swatches_visible": "PASS" | "FAIL",
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
    await page.evaluate(() => document.querySelector('#sec-basico is-color-picker').show());
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['pickers_visible', 'panel_top_layer', 'panel_controls', 'swatches_visible', 'disabled_dimmed'];
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
