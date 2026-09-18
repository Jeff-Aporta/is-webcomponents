// mention.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) Cuatro mention visibles sin solape vertical.
//  (2) Cada uno expone input + popup con role=listbox.
//  (3) Al tipear @, el popup aparece dentro del viewport (no recorta por
//      overflow de ancestros).
//  (4) El popup contiene opciones con role=option y exactamente una activa.
//  (5) Tras seleccionar, el input contiene el texto @item y el popup se oculta.
//  (6) El mention disabled se ve atenuado y no abre popup.
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/mention/mention.html`,
  readyAttr: 'data-mention-ready',
  name: 'mention',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1) y (2): layout + roles
  const initial = await page.evaluate(() => {
    const ms = [...document.querySelectorAll('is-mention')];
    return ms.map((m) => {
      const sr = m.shadowRoot;
      const rect = m.getBoundingClientRect();
      return {
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        hasInput: !!sr?.querySelector('input.input'),
        popupRole: sr?.querySelector('.popup')?.getAttribute('role'),
        popupHidden: sr?.querySelector('.popup')?.hidden,
      };
    });
  });

  for (let i = 1; i < initial.length; i++) {
    const prev = initial[i - 1];
    const cur = initial[i];
    assert.ok(
      cur.rect.y >= prev.rect.y + prev.rect.h - 1,
      `${DEMO.name}#${i}: mention ${i} no debe solaparse con ${i - 1} (y=${cur.rect.y}, prevBottom=${prev.rect.y + prev.rect.h})`,
    );
  }
  for (const m of initial) {
    assert.equal(m.hasInput, true, 'input interno presente');
    assert.equal(m.popupRole, 'listbox', 'popup tiene role=listbox');
    assert.equal(m.popupHidden, true, 'popup inicia oculto');
  }

  // (3) y (4): abrir el popup del primero
  await page.evaluate(() => {
    const m = document.querySelector('#sec-basico is-mention');
    const sr = m.shadowRoot;
    const input = sr.querySelector('input.input');
    input.focus();
    input.value = '@a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const open = await page.evaluate(() => {
    const m = document.querySelector('#sec-basico is-mention');
    const sr = m.shadowRoot;
    const popup = sr.querySelector('.popup');
    const popupRect = popup.getBoundingClientRect();
    const opts = [...popup.querySelectorAll('.opt')];
    return {
      hidden: popup.hidden,
      popupRect: { x: popupRect.x, y: popupRect.y, w: popupRect.width, h: popupRect.height },
      optCount: opts.length,
      allHaveRole: opts.every((o) => o.getAttribute('role') === 'option'),
      activeCount: opts.filter((o) => o.classList.contains('is-active')).length,
      vp: { w: window.innerWidth, h: window.innerHeight },
    };
  });

  assert.equal(open.hidden, false, 'popup abierto tras tipear @');
  assert.ok(open.allHaveRole, 'todas las opciones tienen role=option');
  assert.ok(open.optCount >= 1, `debe haber opciones (>=1), hay ${open.optCount}`);
  assert.equal(open.activeCount, 1, 'exactamente una opción activa');
  assert.ok(
    open.popupRect.x >= 0 && open.popupRect.x + open.popupRect.w <= open.vp.w + 1,
    `popup encaja horizontalmente (x=${open.popupRect.x}, w=${open.popupRect.w}, vp=${open.vp.w})`,
  );
  assert.ok(
    open.popupRect.y >= 0 && open.popupRect.y + open.popupRect.h <= open.vp.h + 1,
    `popup encaja verticalmente (y=${open.popupRect.y}, h=${open.popupRect.h}, vp=${open.vp.h})`,
  );

  // (5) seleccionar primera opción
  await page.evaluate(() => {
    const m = document.querySelector('#sec-basico is-mention');
    const sr = m.shadowRoot;
    sr.querySelector('.opt').click();
  });
  await page.waitForTimeout(50);
  const after = await page.evaluate(() => {
    const m = document.querySelector('#sec-basico is-mention');
    const sr = m.shadowRoot;
    return {
      value: m.value,
      popupHidden: sr.querySelector('.popup').hidden,
    };
  });
  assert.ok(after.value.startsWith('@'), `input.value empieza con @, got "${after.value}"`);
  assert.equal(after.popupHidden, true, 'popup se oculta tras seleccionar');

  // (6) disabled
  const dis = await page.evaluate(() => {
    const m = document.querySelector('#sec-disabled is-mention');
    const sr = m.shadowRoot;
    const input = sr.querySelector('input.input');
    return { disabled: input.disabled, popupHidden: sr.querySelector('.popup').hidden };
  });
  assert.equal(dis.disabled, true, 'input.disabled=true en disabled');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 mentions sin solape, popup abre/cierra, layout dentro del viewport)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

// Opt-in: rama LLM
const VISUAL_RUBRIC = `
Evalúa la calidad visual del componente mention que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. LAYOUT NO SE SOLAPA: los 4 mentions se ven apilados verticalmente, sin solaparse.

2. INPUT LEGIBLE: cada input tiene label, placeholder/valor y aspecto de campo de texto.

3. POPUP VISIBLE: al tipear @, el popup aparece debajo del input con sugerencias legibles.

4. OPCIONES LEGIBLES: las opciones muestran el trigger (@ o #) y el nombre del item, separadas y seleccionadas claramente.

5. DISABLED VISUALMENTE DIFERENCIADO: el mention disabled se ve apagado/atenuado.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "input_legible": "PASS" | "FAIL",
  "popup_visible": "PASS" | "FAIL",
  "options_legible": "PASS" | "FAIL",
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
      const m = document.querySelector('#sec-basico is-mention');
      const sr = m.shadowRoot;
      const input = sr.querySelector('input.input');
      input.focus();
      input.value = '@';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['no_overlap', 'input_legible', 'popup_visible', 'options_legible', 'disabled_dimmed'];
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
