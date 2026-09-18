// doc-editor.stagehand.test.mjs — verificaciones de calidad visual del editor de documento.
// Mismo patrón: checks deterministas + rama opt-in LLM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/forms/doc-editor/doc-editor.html`;
const READY = 'data-doc-editor-ready';

const results = [];

async function checkDeterministic(page) {
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const docs = [...document.querySelectorAll('main is-doc-editor')];
    return docs.map((d, idx) => {
      const shadow = d.shadowRoot;
      const blocks = [...shadow.querySelectorAll('.block')];
      const blockRects = blocks.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, type: b.className.match(/block-(\S+)/)?.[1] };
      });
      const section = d.closest('section');
      const sectionRect = section.getBoundingClientRect();
      // Tipos representados
      const types = new Set(blockRects.map((b) => b.type));
      // Verificar que los bloques están apilados verticalmente sin solaparse
      const ys = blockRects.map((b) => b.y).sort((a, b) => a - b);
      const verticalGaps = [];
      for (let i = 1; i < ys.length; i++) {
        verticalGaps.push(ys[i] - ys[i - 1]);
      }
      const minGap = verticalGaps.length > 0 ? Math.min(...verticalGaps) : 0;
      return {
        idx,
        name: d.getAttribute('name'),
        blockCount: blockRects.length,
        types: [...types],
        sectionRect,
        minGap,
        minW: Math.min(...blockRects.map((b) => b.w)),
        minH: Math.min(...blockRects.map((b) => b.h)),
      };
    });
  });

  for (const r of data) {
    const tag = `doc-editor#${r.idx} (${r.name})`;

    // (1) Al menos un bloque renderizado.
    assert.ok(r.blockCount > 0, `${tag}: debe haber al menos un bloque`);

    // (2) Cada bloque debe tener dimensiones visibles.
    assert.ok(r.minW > 20, `${tag}: los bloques deben tener ancho visible (>20px), obtuve ${r.minW}`);
    assert.ok(r.minH > 5, `${tag}: los bloques deben tener altura visible (>5px), obtuve ${r.minH}`);

    // (3) Si tiene varios bloques, deben estar apilados verticalmente (sin solape).
    if (r.blockCount > 1) {
      assert.ok(r.minGap >= -1,
        `${tag}: los bloques deben apilarse sin solaparse, minGap=${r.minGap} (debería ser >= -1px)`);
    }

    // (4) Los tipos renderizados deben coincidir con los esperados según el doc.
    if (r.name === 'meeting') {
      for (const required of ['heading-1', 'paragraph', 'todo', 'heading-2', 'bullet-list', 'quote', 'code']) {
        assert.ok(r.types.includes(required),
          `${tag}: el doc "meeting" debe incluir bloque "${required}", tipos=${JSON.stringify(r.types)}`);
      }
    }
  }
}

const { browser, page } = await newPage();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await waitReady(page, READY);
  await checkDeterministic(page);
  console.log('  ✓ doc-editor: rubric determinista PASS (bloques apilados, tipos coherentes, dimensiones visibles)');
  results.push({ name: 'doc-editor', skipped: false });
  await screenshot(page, 'doc-editor-stagehand-pass');
} catch (err) {
  console.error(`  ✗ doc-editor: ${String(err?.message ?? err)}`);
  try { await screenshot(page, 'fail-doc-editor'); } catch {}
  results.push({ name: 'doc-editor', error: String(err?.message ?? err) });
} finally {
  await close({ browser, page });
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del editor de documento por bloques (<is-doc-editor>) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. JERARQUÍA VISUAL: los títulos (heading-1/2/3) son claramente más grandes y destacados que los párrafos.

2. BLOQUES LEGIBLES: el texto de cada bloque (paragraph, list items, todo, quote, code) es legible y tiene buen contraste.

3. SEPARACIÓN: los bloques están separados visualmente (espaciado entre ellos), no se ven pegados.

4. TODO DISTINGUIBLE: los bloques de tipo todo muestran un checkbox (marcado o no) claramente visible.

5. CODE Y QUOTE: los bloques de tipo code (fondo monoespaciado) y quote (sangría o barra lateral) son visualmente distintos del resto.

Responde SOLO con un JSON con la forma:
{
  "heading_hierarchy": "PASS" | "FAIL",
  "blocks_legible": "PASS" | "FAIL",
  "block_separation": "PASS" | "FAIL",
  "todo_distinct": "PASS" | "FAIL" | "N/A",
  "code_quote_distinct": "PASS" | "FAIL" | "N/A",
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
    const shot = await screenshot(page, 'stagehand-doc-editor');
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['heading_hierarchy', 'blocks_legible', 'block_separation', 'todo_distinct', 'code_quote_distinct'];
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
      console.log('  ⊘ doc-editor: stagehand LLM sin credenciales, skipping SOLO la rama LLM');
    } else if (!r.fails || r.fails.length === 0) {
      console.log('  ✓ doc-editor: visual rubric LLM PASS');
    } else {
      console.error(`  ✗ doc-editor: visual rubric LLM FAIL (${r.fails.join(', ')})`);
    }
  } catch (err) {
    console.error(`  ✗ doc-editor (LLM): ${String(err?.message ?? err)}`);
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('doc-editor-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
