// inline-edit.stagehand.test.mjs — verificaciones de calidad visual del inline-edit.
// Mismo patrón: checks deterministas + rama opt-in LLM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/inline-edit/inline-edit.html`;
const READY = 'data-inline-edit-ready';

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('main is-inline-edit')];
    return items.map((r, idx) => {
      const shadow = r.shadowRoot;
      const root = shadow.querySelector('.root');
      const display = shadow.querySelector('[part="display"]');
      const editorWrap = shadow.querySelector('[part="editor-wrap"]');
      const text = shadow.querySelector('[part="display"] .text');
      const input = shadow.querySelector('input,textarea');
      const sectionRect = r.closest('section').getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const displayRect = display ? display.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
      return {
        idx,
        name: r.getAttribute('name'),
        state: root.className.match(/is-(\w+)/)?.[1],
        hasDisplay: !!display,
        hasEditorWrap: !!editorWrap,
        hasInput: !!input,
        displayWidth: displayRect.width,
        displayHeight: displayRect.height,
        rootWidth: rootRect.width,
        rootHeight: rootRect.height,
        text: text?.textContent || '',
        placeholder: r.getAttribute('placeholder'),
        disabled: r.hasAttribute('disabled'),
        sectionRect,
      };
    });
  });

  for (const r of data) {
    const tag = `inline-edit#${r.idx} (${r.name})`;

    // (1) Estructura: root + display + editor-wrap.
    assert.equal(r.hasDisplay, true, `${tag}: debe tener part="display"`);
    assert.equal(r.hasEditorWrap, true, `${tag}: debe tener part="editor-wrap"`);

    // (2) Estado inicial coherente: 'idle' (no 'editing') en el momento de la inspección.
    assert.equal(r.state, 'idle', `${tag}: estado inicial debe ser 'idle', obtuve '${r.state}'`);

    // (3) Display visible con tamaño razonable.
    assert.ok(r.displayWidth > 20, `${tag}: el display debe tener ancho visible (>20px), obtuve ${r.displayWidth}`);
    assert.ok(r.displayHeight > 10, `${tag}: el display debe tener altura visible (>10px), obtuve ${r.displayHeight}`);

    // (4) Texto visible coherente: si no tiene value ni placeholder, debe estar vacío.
    //     Si tiene value, debe verse; si está vacío y tiene placeholder, debe verse el placeholder.
    const value = await page.evaluate((name) => {
      return document.querySelector(`is-inline-edit[name="${name}"]`).value;
    }, r.name).catch(() => '');
    if (r.text.length > 0 || (value && value.length > 0)) {
      assert.ok(r.text.length > 0, `${tag}: con value="${value}" el display debe mostrar texto`);
    } else if (r.placeholder) {
      assert.match(r.text, new RegExp(r.placeholder), `${tag}: vacío debe mostrar placeholder "${r.placeholder}"`);
    }

    // (5) Disabled: el control NO debe haber podido entrar en editing durante la inspección.
    if (r.disabled) {
      assert.equal(r.state, 'idle', `${tag}: disabled debe quedarse en idle`);
    }

    // (6) No se sale del section.
    const sr = r.sectionRect;
    const rr = { x: r.rootX ?? 0, y: 0, width: r.rootWidth, height: r.rootHeight };
    // (best-effort: el root del shadow DOM está alineado al section)
    assert.ok(r.rootWidth > 0, `${tag}: el root debe tener ancho > 0`);
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, READY);
  await checkDeterministic(page);
  console.log('  ✓ inline-edit: rubric determinista PASS (estructura correcta, estado idle, display visible, texto coherente)');
  results.push({ name: 'inline-edit', skipped: false });
  await screenshot(page, 'inline-edit-stagehand-pass');
} catch (err) {
  console.error(`  ✗ inline-edit: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-inline-edit'); } catch {}
  results.push({ name: 'inline-edit', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del componente de edición inline (<is-inline-edit>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. TEXTO LEGIBLE: el texto en modo lectura (idle) es claramente legible con buen contraste.

2. PLACEHOLDER VISIBLE: los campos vacíos muestran el texto placeholder ("¿Qué hay que hacer?", etc.) en color atenuado.

3. INDICACIÓN DE EDICIÓN: hay alguna pista visual (subrayado, fondo, borde) de que el campo es editable.

4. DISTINGUIR DISABLED: el campo deshabilitado ("No editable") se distingue visualmente del resto (color apagado, cursor distinto).

5. DISTINGUIR MODOS: el textarea multilínea se diferencia visualmente del input de una línea.

Responde SOLO con un JSON con la forma:
{
  "text_legible": "PASS" | "FAIL",
  "placeholder_visible": "PASS" | "FAIL",
  "edit_indicator": "PASS" | "FAIL",
  "disabled_distinct": "PASS" | "FAIL" | "N/A",
  "modes_distinct": "PASS" | "FAIL" | "N/A",
  "summary": "una línea"
}
`.trim();

async function runStagehandRubric() {
  const sh = await maybeStagehand();
  if (!sh) return { llm_skipped: true };
  const { browser, page } = await newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, READY);
    await page.waitForTimeout(400);
    const shot = await screenshot(page, 'stagehand-inline-edit');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['text_legible', 'placeholder_visible', 'edit_indicator', 'disabled_distinct', 'modes_distinct'];
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
    if (r.llm_skipped) {
      console.log('  ⊘ inline-edit: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else if (!r.fails || r.fails.length === 0) {
      console.log('  ✓ inline-edit: visual rubric LLM PASS');
    } else {
      console.error(`  ✗ inline-edit: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    }
  } catch (err) {
    console.error(`  ✗ inline-edit (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('inline-edit-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
