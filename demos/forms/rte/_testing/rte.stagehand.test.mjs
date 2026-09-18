// rte.stagehand.test.mjs — verificaciones de calidad visual del editor RTE.
// Mismo patrón que el rubric del ER: checks deterministas + rama opt-in LLM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/rte/rte.html`;
const READY = 'data-rte-ready';

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const rtes = [...document.querySelectorAll('main is-rte')];
    return rtes.map((r, idx) => {
      const shadow = r.shadowRoot;
      const tb = shadow.querySelector('.toolbar');
      const tbRect = tb ? tb.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
      const content = shadow.querySelector('.content');
      const contentRect = content ? content.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
      const btns = [...shadow.querySelectorAll('.toolbar .btn')];
      const allBtnsHaveLabel = btns.every((b) => b.getAttribute('aria-label'));
      const allBtnsSameY = btns.length > 0
        ? Math.max(...btns.map((b) => b.getBoundingClientRect().y)) -
          Math.min(...btns.map((b) => b.getBoundingClientRect().y)) < 4
        : true;
      const name = r.getAttribute('name');
      const cmds = btns.map((b) => b.dataset.cmd);
      return {
        idx,
        name,
        tbRole: tb?.getAttribute('role'),
        tbRect,
        contentRect,
        btnCount: btns.length,
        allBtnsHaveLabel,
        allBtnsSameY,
        cmds,
      };
    });
  });

  for (const r of data) {
    const tag = `rte#${r.idx} (${r.name})`;

    // (1) Toolbar semántica con role=toolbar y todos los botones con aria-label.
    assert.equal(r.tbRole, 'toolbar', `${tag}: toolbar debe llevar role="toolbar"`);
    assert.equal(r.allBtnsHaveLabel, true, `${tag}: todos los botones deben llevar aria-label`);
    assert.ok(r.btnCount > 0, `${tag}: la toolbar debe tener botones`);

    // (2) Toolbar alineada horizontalmente.
    assert.equal(r.allBtnsSameY, true, `${tag}: todos los botones de la toolbar deben estar en la misma línea`);

    // (3) Toolbar y content están en vertical: tb encima, content debajo.
    if (r.tbRect.height > 0 && r.contentRect.height > 0) {
      assert.ok(r.tbRect.y < r.contentRect.y,
        `${tag}: la toolbar debe estar visualmente encima del content (tb.y=${r.tbRect.y.toFixed(1)}, content.y=${r.contentRect.y.toFixed(1)})`);
    }

    // (4) Ancho de la toolbar coherente con el ancho del content (mismo control).
    if (r.tbRect.width > 0 && r.contentRect.width > 0) {
      const ratio = r.tbRect.width / r.contentRect.width;
      assert.ok(ratio > 0.5 && ratio < 1.5,
        `${tag}: toolbar y content deben tener anchos similares (ratio=${ratio.toFixed(2)})`);
    }

    // (5) Comandos específicos presentes en la toolbar por defecto.
    if (r.name === 'body') {
      for (const cmd of ['bold', 'italic', 'link', 'clear']) {
        assert.ok(r.cmds.includes(cmd), `${tag}: la toolbar por defecto debe incluir "${cmd}"`);
      }
    }
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, READY);
  await checkDeterministic(page);
  console.log('  ✓ rte: rubric determinista PASS (toolbar semántica, alineada, encima del content, comandos correctos)');
  results.push({ name: 'rte', skipped: false });
  await screenshot(page, 'rte-stagehand-pass');
} catch (err) {
  console.error(`  ✗ rte: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-rte'); } catch {}
  results.push({ name: 'rte', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del editor de texto enriquecido (<is-rte>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. TOOLBAR VISIBLE: la barra de herramientas es visible, con botones etiquetados y separados en grupos lógicos.

2. CONTENT EDITABLE LEGIBLE: el área de contenido tiene el texto visible con buen contraste y suficiente altura para editar.

3. SEPARADORES: los separadores verticales ("|") entre grupos de botones son visibles.

4. ICONOS LEGIBLES: los iconos o glifos de los botones (B, I, U, listas, etc.) son legibles, no se cortan.

5. ALINEACIÓN: la toolbar está alineada horizontalmente y encima del área de contenido.

Responde SOLO con un JSON con la forma:
{
  "toolbar_visible": "PASS" | "FAIL",
  "content_legible": "PASS" | "FAIL",
  "separators_visible": "PASS" | "FAIL" | "N/A",
  "icons_legible": "PASS" | "FAIL",
  "alignment": "PASS" | "FAIL",
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
    const shot = await screenshot(page, 'stagehand-rte');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['toolbar_visible', 'content_legible', 'separators_visible', 'icons_legible', 'alignment'];
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
      console.log('  ⊘ rte: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else if (!r.fails || r.fails.length === 0) {
      console.log('  ✓ rte: visual rubric LLM PASS');
    } else {
      console.error(`  ✗ rte: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    }
  } catch (err) {
    console.error(`  ✗ rte (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('rte-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
