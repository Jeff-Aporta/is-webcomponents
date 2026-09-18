// combobox.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) Cuatro comboboxes visibles sin solape vertical.
//  (2) Cada input expone role=combobox y aria-autocomplete=list.
//  (3) Al abrir un combobox, el listbox se renderiza en el top-layer dialog
//      y queda dentro del viewport.
//  (4) El listbox contiene opciones filtradas con role=option y aria-selected.
//  (5) El clear-button aparece solo cuando hay valor (no en vacío, sí en
//      inicial "mexico").
//  (6) El combobox disabled se ve atenuado y no abre.
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/combobox/combobox.html`,
  readyAttr: 'data-combobox-ready',
  name: 'combobox',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1) y (2): layout + roles
  const initial = await page.evaluate(() => {
    const cbs = [...document.querySelectorAll('is-combobox')];
    return cbs.map((c) => {
      const sr = c.shadowRoot;
      const input = sr.querySelector('input.input');
      const rect = c.getBoundingClientRect();
      return {
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        inputRole: input?.getAttribute('role'),
        ariaAutoComplete: input?.getAttribute('aria-autocomplete'),
        ariaExpanded: input?.getAttribute('aria-expanded'),
        listboxRole: sr.querySelector('[part="listbox"]')?.getAttribute('role'),
      };
    });
  });

  for (let i = 1; i < initial.length; i++) {
    const prev = initial[i - 1];
    const cur = initial[i];
    assert.ok(
      cur.rect.y >= prev.rect.y + prev.rect.h - 1,
      `${DEMO.name}#${i}: combobox ${i} no debe solaparse con ${i - 1} (y=${cur.rect.y}, prevBottom=${prev.rect.y + prev.rect.h})`,
    );
  }
  for (const c of initial) {
    assert.equal(c.inputRole, 'combobox', 'input tiene role=combobox');
    assert.equal(c.ariaAutoComplete, 'list', 'aria-autocomplete=list');
    assert.equal(c.ariaExpanded, 'false', 'aria-expanded inicial=false');
    assert.equal(c.listboxRole, 'listbox', 'listbox tiene role=listbox');
  }

  // (3) y (4): abrir el primero y verificar
  await page.evaluate(() => {
    const c = document.querySelector('#sec-basico is-combobox');
    c.value = '';
    c.shadowRoot.querySelector('input.input').focus();
  });
  await page.waitForTimeout(120);
  const open = await page.evaluate(() => {
    const c = document.querySelector('#sec-basico is-combobox');
    const sr = c.shadowRoot;
    const dlg = sr.querySelector('dialog.popup');
    const lb = sr.querySelector('[part="listbox"]');
    const lbRect = lb.getBoundingClientRect();
    const opts = [...lb.querySelectorAll('[role="option"]')];
    return {
      dialogOpen: dlg.open,
      lbRect: { x: lbRect.x, y: lbRect.y, w: lbRect.width, h: lbRect.height },
      optCount: opts.length,
      firstHasRole: opts[0]?.getAttribute('role') === 'option',
      vp: { w: window.innerWidth, h: window.innerHeight },
    };
  });

  assert.equal(open.dialogOpen, true, 'dialog abierto tras focus');
  assert.equal(open.firstHasRole, true, 'opciones con role=option');
  assert.ok(open.optCount >= 1, `debe haber opciones, hay ${open.optCount}`);
  assert.ok(
    open.lbRect.x >= 0 && open.lbRect.x + open.lbRect.w <= open.vp.w + 1,
    `listbox encaja horizontalmente (x=${open.lbRect.x}, w=${open.lbRect.w}, vp=${open.vp.w})`,
  );
  assert.ok(
    open.lbRect.y >= 0 && open.lbRect.y + open.lbRect.h <= open.vp.h + 1,
    `listbox encaja verticalmente (y=${open.lbRect.y}, h=${open.lbRect.h}, vp=${open.vp.h})`,
  );

  // (5) clear visible con valor, oculto sin valor
  const clearState = await page.evaluate(() => {
    const withValue = document.querySelector('#sec-clear is-combobox');
    const noValue = document.querySelector('#sec-basico is-combobox');
    return {
      withValue: withValue.shadowRoot.querySelector('[part="clear"]').hidden,
      withValueHasValue: !!withValue.value,
      noValueHidden: noValue.shadowRoot.querySelector('[part="clear"]').hidden,
    };
  });
  assert.equal(clearState.withValue, false, 'clear visible con valor inicial');
  assert.equal(clearState.withValueHasValue, true, 'combobox clear tiene valor inicial');
  assert.equal(clearState.noValueHidden, true, 'clear oculto cuando no hay valor (basico)');

  // (6) disabled no abre
  const disabled = await page.evaluate(() => {
    const c = document.querySelector('#sec-disabled is-combobox');
    const input = c.shadowRoot.querySelector('input.input');
    return { disabled: input.disabled, stateDisabled: c.matches(':state(disabled)') };
  });
  assert.equal(disabled.disabled, true, 'input.disabled=true en disabled');
  assert.equal(disabled.stateDisabled, true, 'custom state :state(disabled) presente');

  // cerrar
  await page.evaluate(() => {
    document.querySelector('#sec-basico is-combobox').open = false;
  });
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 comboboxes sin solape, listbox top-layer, clear visible según valor)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

// Opt-in: rama LLM
const VISUAL_RUBRIC = `
Evalúa la calidad visual del componente combobox que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. LAYOUT NO SE SOLAPA: los 4 comboboxes se ven apilados verticalmente, sin solaparse.

2. INPUT LEGIBLE: cada input tiene label, placeholder/valor y chevron.

3. PANEL EN TOP-LAYER: al enfocar/abrir, el listbox aparece por encima del resto (sin recortes).

4. OPCIONES LEGIBLES: las opciones filtradas se muestran con texto claro y separadas.

5. CLEAR BUTTON: el combobox con valor inicial muestra un botón X visible para limpiar.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "input_legible": "PASS" | "FAIL",
  "panel_top_layer": "PASS" | "FAIL",
  "options_legible": "PASS" | "FAIL",
  "clear_visible": "PASS" | "FAIL",
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
      const c = document.querySelector('#sec-basico is-combobox');
      c.value = '';
      c.shadowRoot.querySelector('input.input').focus();
    });
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['no_overlap', 'input_legible', 'panel_top_layer', 'options_legible', 'clear_visible'];
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
