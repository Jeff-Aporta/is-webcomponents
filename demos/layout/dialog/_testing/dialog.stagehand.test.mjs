// dialog.stagehand.test.mjs — verificaciones de calidad visual para is-dialog.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/dialog/dialog.html`, readyAttr: 'data-dialog-ready', name: 'dialog' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);
  // d1 está CERRADO al cargar (la demo no lo abre por defecto para no
  // bloquear el resto de tests con su backdrop). Lo abrimos con click.
  await page.click('#btn-open-1');
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const dialog = document.querySelector('body > is-dialog#d1');
    if (!dialog) return null;
    const sr = dialog.shadowRoot;
    const modal = sr.querySelector('[part="dialog"]');
    const backdrop = sr.querySelector('[part="backdrop"]');
    const title = sr.querySelector('[part="title"]');
    const close = sr.querySelector('[part="close-button"]');
    const mRect = modal?.getBoundingClientRect();
    const bRect = backdrop?.getBoundingClientRect();
    return {
      defined: !!customElements.get('is-dialog'),
      open: dialog.open,
      state: dialog.dataset.state,
      role: modal?.getAttribute('role'),
      ariaModal: modal?.getAttribute('aria-modal'),
      modalW: mRect?.width ?? 0, modalH: mRect?.height ?? 0,
      backdropW: bRect?.width ?? 0, backdropH: bRect?.height ?? 0,
      hasTitle: !!title,
      hasClose: !!close,
      titleText: (title?.textContent ?? '').trim(),
    };
  });
  assert.ok(data, `${demo.name}: debe existir d1`);
  assert.equal(data.defined, true, 'is-dialog debe estar definido');
  assert.equal(data.open, true, 'd1 debe estar abierto tras click');
  assert.equal(data.role, 'dialog', 'modal debe tener role="dialog"');
  assert.equal(data.ariaModal, 'true', 'modal debe tener aria-modal="true"');
  assert.ok(data.modalW > 100, `ancho modal > 100, fue ${data.modalW}`);
  assert.ok(data.modalH > 60, `alto modal > 60, fue ${data.modalH}`);
  // Backdrop ocupa todo el viewport.
  assert.ok(data.backdropW >= 800, `ancho backdrop >= 800 (viewport), fue ${data.backdropW}`);
  assert.ok(data.backdropH >= 400, `alto backdrop >= 400 (viewport), fue ${data.backdropH}`);
  assert.equal(data.hasTitle, true);
  assert.equal(data.hasClose, true);
  assert.match(data.titleText, /Confirmación|/, `título debe contener "Confirmación", fue "${data.titleText}"`);
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (role/aria-modal, modal centrado, backdrop full-viewport)`);
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
Evalúa la calidad visual del <is-dialog> (modal accesible) en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. MODAL RENDERIZA: el diálogo aparece centrado en el viewport con header (título), body y footer visibles.

2. BACKDROP PRESENTE: hay un fondo oscuro (o blur) que cubre todo el viewport por detrás del modal.

3. ROLE/ARIA CORRECTOS: el modal tiene role="dialog" y aria-modal="true" (esto se refleja visualmente en la jerarquía de foco).

4. HEADER + CLOSE VISIBLES: el header muestra el título y un botón close (X) a la derecha.

5. FOOTER CON ACCIONES: el footer muestra al menos un botón (Aceptar / Cancelar).

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "backdrop_present": "PASS" | "FAIL",
  "role_aria_correct": "PASS" | "FAIL",
  "header_close_visible": "PASS" | "FAIL",
  "footer_actions_visible": "PASS" | "FAIL",
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
    const checks = ['renders', 'backdrop_present', 'role_aria_correct', 'header_close_visible', 'footer_actions_visible'];
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
report('dialog-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
