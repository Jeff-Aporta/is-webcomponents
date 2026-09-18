// kanban.stagehand.test.mjs — verificaciones de calidad visual.
//
// Mismo patrón que diagramas/ER/er-stagehand.test.mjs: por defecto corremos
// checks deterministas (Playwright puro) que NO skippean. STAGEHAND=1 +
// MINIMAX_API_KEY activa la rama LLM con un rubric en español.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/data/kanban/kanban.html`, readyAttr: 'data-kanban-ready', name: 'kanban' },
];

const results = [];

// ─────────────────────────────────────────────────────────────────────────
// Checks deterministas (Playwright puro).
// ─────────────────────────────────────────────────────────────────────────
async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const boards = [...document.querySelectorAll('main is-kanban')];
    return boards.map((b, bIdx) => {
      const cols = [...b.querySelectorAll(':scope > is-kanban-column')];
      return {
        bIdx,
        columnCount: cols.length,
        cardCount: cols.reduce((s, c) => s + c.querySelectorAll(':scope > is-kanban-card').length, 0),
        columns: cols.map((c, cIdx) => {
          const sr = c.shadowRoot;
          const rootRect = sr.querySelector('[part="column"]')?.getBoundingClientRect();
          const laneRect = sr.querySelector('[part="lane"]')?.getBoundingClientRect();
          const titleEl = sr.querySelector('[part="title"]');
          const titleText = titleEl?.textContent?.trim() || '';
          const badgeEl = sr.querySelector('[part="badge"]');
          const badgeHidden = badgeEl?.hidden ?? true;
          const badgeText = badgeEl?.textContent?.trim() || '';
          const cards = [...c.querySelectorAll(':scope > is-kanban-card')];
          return {
            cIdx,
            titleText,
            badgeText,
            badgeHidden,
            cardCount: cards.length,
            colW: rootRect?.width ?? 0,
            colH: rootRect?.height ?? 0,
            laneW: laneRect?.width ?? 0,
            laneH: laneRect?.height ?? 0,
            cards: cards.map((card) => {
              const csr = card.shadowRoot;
              const cardRect = csr.querySelector('[part="card"]')?.getBoundingClientRect();
              const headingText = csr.querySelector('[part="heading"]')?.textContent?.trim() || '';
              return { headingText, w: cardRect?.width ?? 0, h: cardRect?.height ?? 0 };
            }),
          };
        }),
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber al menos un board, hay ${data.length}`);

  for (const board of data) {
    const tag = `${demo.name}#board${board.bIdx}`;
    assert.ok(board.columnCount > 0, `${tag}: debe haber al menos 1 columna, hay ${board.columnCount}`);
    assert.ok(board.cardCount > 0, `${tag}: debe haber al menos 1 card en total, hay ${board.cardCount}`);

    for (const col of board.columns) {
      const ctag = `${tag}#col${col.cIdx}`;
      // (1) Título no vacío.
      assert.ok(col.titleText.length > 0, `${ctag}: título de columna vacío`);
      // (2) Layout no-cero.
      assert.ok(col.colW > 50, `${ctag}: ancho de columna debe ser > 50, fue ${col.colW}`);
      assert.ok(col.colH > 50, `${ctag}: alto de columna debe ser > 50, fue ${col.colH}`);
      assert.ok(col.laneW > 30, `${ctag}: ancho de lane debe ser > 30, fue ${col.laneW}`);
      // (3) Si hay badge visible, su texto debe coincidir con el conteo de cards.
      if (!col.badgeHidden && col.badgeText && col.badgeText !== '0') {
        // Auto: badge text === cardCount, salvo badge explícito (e.g. "0" para backlog).
        // Sólo validamos cuando el badge parece numérico.
        if (/^\d+$/.test(col.badgeText) && col.badgeText !== '0') {
          assert.equal(parseInt(col.badgeText, 10), col.cardCount,
            `${ctag}: badge="${col.badgeText}" debería coincidir con cardCount=${col.cardCount}`);
        }
      }
      // (4) Cards visibles y con texto.
      for (const card of col.cards) {
        const cardTag = `${ctag}#card`;
        assert.ok(card.headingText.length > 0, `${cardTag}: heading vacío`);
        assert.ok(card.w > 50, `${cardTag}: ancho de card debe ser > 50, fue ${card.w}`);
        assert.ok(card.h > 30, `${cardTag}: alto de card debe ser > 30, fue ${card.h}`);
      }
    }
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (columnas visibles, layout no-cero, badges consistentes, cards legibles)`);
    results.push({ name: demo.name, skipped: false });
  } catch (err) {
    console.error(`  ✗ ${demo.name}: ${String(err?.message ?? err)}`);
    try { await screenshot(page, `fail-${demo.name}`); } catch {}
    results.push({ name: demo.name, error: String(err?.message ?? err) });
  } finally {
    await close({ browser, page });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Rama opt-in con Stagehand LLM. Sólo corre si STAGEHAND=1 + credenciales.
// ─────────────────────────────────────────────────────────────────────────
const VISUAL_RUBRIC = `
Evalúa la calidad visual del tablero kanban (columnas con cards) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. COLUMNAS VISIBLES: el tablero muestra varias columnas lado a lado, cada una con un título visible.

2. CARDS LEGIBLES: dentro de cada columna hay cards con un heading y, si aplica, una descripción. Las cards son visualmente distinguibles (tienen borde o fondo distinto).

3. BADGES DE COLUMNA: cada columna tiene un contador o badge (o número explícito) en su cabecera.

4. LAYOUT NO VACÍO: las columnas tienen tamaño visible y no aparecen como líneas planas.

5. SIN SOLAPAMIENTO: las cards dentro de una misma columna están apiladas verticalmente sin superponerse.

Responde SOLO con un JSON con la forma:
{
  "columns_visible": "PASS" | "FAIL",
  "cards_legible": "PASS" | "FAIL",
  "badges": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "no_overlap": "PASS" | "FAIL",
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
    const checks = ['columns_visible', 'cards_legible', 'badges', 'non_empty_layout', 'no_overlap'];
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
      if (r.llm_skipped) {
        console.log(`  ⊘ ${demo.name}: stagehand LLM sin credenciales, skipping SOLO la rama LLM`);
      } else if (!r.fails || r.fails.length === 0) {
        console.log(`  ✓ ${demo.name}: visual rubric LLM PASS`);
      } else {
        console.error(`  ✗ ${demo.name}: visual rubric LLM FAIL (${r.fails.join(', ')})`);
      }
    } catch (err) {
      console.error(`  ✗ ${demo.name} (LLM): ${String(err?.message ?? err)}`);
    }
  }
}

const hardFailures = results.filter((r) => r.error).length;
report('kanban-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });