// pin-input.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) 5 pin-inputs montados con su número correcto de celdas (6, 4, 4, 6, 6)
//  (2) Cada celda tiene aria-label "Dígito N de M"
//  (3) Setear value rellena las celdas en orden
//  (4) El input "mask" tiene clase .mask en sus celdas (estilo de enmascarado)
//  (5) El input "disabled" tiene sus celdas con atributo disabled
//  (6) Paste completo de 6 dígitos llena las 6 celdas
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/pin-input/pin-input.html`,
  readyAttr: 'data-pin-input-ready',
  name: 'pin-input',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1)-(2): 5 pin-inputs y sus celdas
  const initial = await page.evaluate(() => {
    const pins = [...document.querySelectorAll('is-pin-input')];
    return pins.map((p) => {
      const sr = p.shadowRoot;
      const cells = [...sr.querySelectorAll('input.cell')];
      const r = sr.querySelector('.cells')?.getBoundingClientRect();
      return {
        cellsCount: cells.length,
        firstLabel: cells[0]?.getAttribute('aria-label') ?? '',
        lastLabel: cells[cells.length - 1]?.getAttribute('aria-label') ?? '',
        cellW: r?.width ?? 0,
        cellH: r?.height ?? 0,
        hasMask: cells.some((c) => c.classList.contains('mask')),
        cellDisabled: cells.every((c) => c.disabled),
      };
    });
  });
  assert.equal(initial.length, 5, '5 pin-inputs');
  assert.equal(initial[0].cellsCount, 6, '#otp 6 celdas');
  assert.equal(initial[1].cellsCount, 4, '#pin 4 celdas');
  assert.equal(initial[2].cellsCount, 4, '#corto 4 celdas');
  assert.equal(initial[3].cellsCount, 6, '#texto 6 celdas');
  assert.equal(initial[4].cellsCount, 6, '#bloqueado 6 celdas');
  assert.equal(initial[0].firstLabel, 'Dígito 1 de 6', '#otp aria-label 1');
  assert.equal(initial[0].lastLabel, 'Dígito 6 de 6', '#otp aria-label 6');
  assert.equal(initial[1].firstLabel, 'Dígito 1 de 4', '#pin aria-label 1');
  assert.equal(initial[1].lastLabel, 'Dígito 4 de 4', '#pin aria-label 4');

  // layout: cada celdas encaja en viewport
  for (let i = 0; i < initial.length; i++) {
    assert.ok(initial[i].cellW > 100, `#${i} celdas ancho >100 (${initial[i].cellW})`);
    assert.ok(initial[i].cellH > 20, `#${i} celdas alto >20 (${initial[i].cellH})`);
  }

  // (3): setear value rellena
  await page.evaluate(() => {
    document.querySelector('#otp').value = '424242';
  });
  await page.waitForTimeout(50);
  const filled = await page.evaluate(() => {
    const cells = [...document.querySelector('#otp').shadowRoot.querySelectorAll('input.cell')];
    return cells.map((c) => c.value);
  });
  assert.equal(filled.join(''), '424242', 'celdas rellenas con "424242"');

  // (4): #pin tiene clase mask
  assert.equal(initial[1].hasMask, true, '#pin tiene celdas con clase .mask');

  // (5): #bloqueado tiene celdas disabled
  assert.equal(initial[4].cellDisabled, true, '#bloqueado celdas todas disabled');

  // (6): paste de 6 dígitos
  await page.evaluate(() => {
    const pin = document.querySelector('#otp');
    pin.reset();
    const dt = new DataTransfer();
    dt.setData('text', '999888');
    pin.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, composed: true }));
  });
  await page.waitForTimeout(50);
  const pasted = await page.evaluate(() => {
    return document.querySelector('#otp').value;
  });
  assert.equal(pasted, '999888', `paste rellena value="999888" (${pasted})`);
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (5 PIN inputs, celdas con aria-label, paste y mask)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del input de PIN que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. PINS LEGIBLES: los 5 PIN inputs (OTP, PIN enmascarado, OTP corto, alfanumérico, disabled) son visualmente identificables como filas de casillas.

2. CASILLAS SEPARADAS: cada input muestra casillas/clases separadas, una por dígito.

3. CASILLA ENMASCARADA: el PIN con "mask" muestra asteriscos o puntos en lugar de dígitos.

4. DISABLED DIFERENCIADO: el PIN "disabled" se ve apagado/atenuado.

5. CASILLAS RELLENAS: tras completar, las celdas muestran los caracteres correctos.

Responde SOLO con un JSON con la forma:
{
  "pins_visible": "PASS" | "FAIL",
  "cells_separated": "PASS" | "FAIL",
  "masked_cell": "PASS" | "FAIL",
  "disabled_dimmed": "PASS" | "FAIL",
  "cells_filled": "PASS" | "FAIL",
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
      document.querySelector('#otp').value = '123456';
      document.querySelector('#pin').value = '4321';
      document.querySelector('#texto').value = 'ABC123';
    });
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['pins_visible', 'cells_separated', 'masked_cell', 'disabled_dimmed', 'cells_filled'];
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
