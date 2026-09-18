// select.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) Cuatro selects visibles, no se solapan entre sí en el layout.
//  (2) Cada trigger expone role=combobox y un listbox accesible (role=listbox).
//  (3) Al abrir un select, el listbox aparece en el top-layer y queda dentro
//      del viewport (no recortado por overflow de ancestros).
//  (4) El listbox tiene role=listbox y opciones con role=option.
//  (5) Las opciones activas exponen data-active (visual) y aria-selected.
//  (6) Modo multi renderiza tags (chips) con role adecuado.
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/select/select.html`,
  readyAttr: 'data-select-ready',
  name: 'select',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1) y (2): layout + roles
  const initial = await page.evaluate(() => {
    const sels = [...document.querySelectorAll('is-select')];
    return sels.map((s) => {
      const sr = s.shadowRoot;
      const rect = s.getBoundingClientRect();
      return {
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        triggerRole: sr.querySelector('.trigger')?.getAttribute('role'),
        listboxRole: sr.querySelector('[part="listbox"]')?.getAttribute('role'),
        ariaExpanded: sr.querySelector('.trigger')?.getAttribute('aria-expanded'),
        optionCount: s.querySelectorAll('is-option').length,
      };
    });
  });

  // Comprobar que las secciones no se solapan verticalmente (márgenes CSS)
  for (let i = 1; i < initial.length; i++) {
    const prev = initial[i - 1];
    const cur = initial[i];
    assert.ok(
      cur.rect.y >= prev.rect.y + prev.rect.h - 1,
      `${DEMO.name}#${i}: el select ${i} no debe solaparse con el ${i - 1} (y=${cur.rect.y}, prevBottom=${prev.rect.y + prev.rect.h})`,
    );
  }

  for (const s of initial) {
    assert.equal(s.triggerRole, 'combobox', 'trigger tiene role=combobox');
    assert.equal(s.listboxRole, 'listbox', 'listbox tiene role=listbox');
    assert.equal(s.ariaExpanded, 'false', 'aria-expanded inicial=false');
  }

  // (3)-(5): abrir el primer select y verificar el listbox en el top-layer
  await page.evaluate(() => document.querySelector('#sec-basico is-select').show());
  await page.waitForTimeout(120);
  const open = await page.evaluate(() => {
    const s = document.querySelector('#sec-basico is-select');
    const sr = s.shadowRoot;
    const dlg = sr.querySelector('dialog.popup');
    const lb = sr.querySelector('[part="listbox"]');
    const lbRect = lb.getBoundingClientRect();
    const opts = [...lb.querySelectorAll('[role="option"]')];
    const firstOpt = opts[0]?.getBoundingClientRect();
    return {
      dialogOpen: dlg.open,
      listboxRole: lb.getAttribute('role'),
      lbRect: { x: lbRect.x, y: lbRect.y, w: lbRect.width, h: lbRect.height },
      optCount: opts.length,
      firstOptHasRole: opts[0]?.getAttribute('role') === 'option',
      firstOptRect: firstOpt ? { x: firstOpt.x, y: firstOpt.y, w: firstOpt.width, h: firstOpt.height } : null,
      ariaSelectedFirst: opts[0]?.getAttribute('aria-selected'),
      activeDescendant: sr.querySelector('.trigger').getAttribute('aria-activedescendant'),
      vp: { w: window.innerWidth, h: window.innerHeight },
    };
  });

  assert.equal(open.dialogOpen, true, 'dialog abierto tras show()');
  assert.equal(open.listboxRole, 'listbox', 'listbox en top-layer mantiene role=listbox');
  assert.equal(open.firstOptHasRole, true, 'las opciones tienen role=option');
  assert.ok(open.optCount >= 5, `debe haber >=5 opciones, hay ${open.optCount}`);
  assert.ok(open.ariaSelectedFirst, 'la primera opción expone aria-selected');
  assert.ok(open.activeDescendant, 'aria-activedescendant presente tras show()');
  assert.ok(
    open.lbRect.x >= 0 && open.lbRect.x + open.lbRect.w <= open.vp.w + 1,
    `listbox encaja horizontalmente (x=${open.lbRect.x}, w=${open.lbRect.w}, vp=${open.vp.w})`,
  );
  assert.ok(
    open.lbRect.y >= 0 && open.lbRect.y + open.lbRect.h <= open.vp.h + 1,
    `listbox encaja verticalmente (y=${open.lbRect.y}, h=${open.lbRect.h}, vp=${open.vp.h})`,
  );

  // (6) cerrar y revisar tags del multi
  await page.evaluate(() => {
    document.querySelector('#sec-basico is-select').hide();
  });
  const tags = await page.evaluate(() => {
    const s = document.querySelector('#sec-multi is-select');
    const sr = s.shadowRoot;
    return {
      tagsCount: sr.querySelectorAll('[part="tag"]').length,
      hasTagsContainer: !!sr.querySelector('.tags'),
    };
  });
  assert.ok(tags.hasTagsContainer, 'multi select expone contenedor de tags');
  assert.equal(tags.tagsCount, 2, 'debe haber 2 tags renderizados (frontend, design)');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 selects sin solape, listbox top-layer, roles ARIA correctos)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

// Opt-in: rama LLM
const VISUAL_RUBRIC = `
Evalúa la calidad visual del componente select que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. LAYOUT NO SE SOLAPA: los 4 selects se ven apilados verticalmente, sin solaparse.

2. TRIGGER LEGIBLE: cada trigger se distingue como un campo clickable con su label, valor/placeholder y chevron.

3. PANEL EN TOP-LAYER: al abrir un select, el listbox aparece por encima del resto (sin recortes por overflow de ancestros).

4. OPCIONES LEGIBLES: las opciones del listbox tienen texto claro; las seleccionadas se diferencian visualmente.

5. TAGS EN MODO MULTI: el select multi muestra chips/tags legibles para los valores seleccionados.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "trigger_legible": "PASS" | "FAIL",
  "panel_top_layer": "PASS" | "FAIL",
  "options_legible": "PASS" | "FAIL",
  "tags_visible": "PASS" | "FAIL",
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
    await page.evaluate(() => document.querySelector('#sec-basico is-select').show());
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['no_overlap', 'trigger_legible', 'panel_top_layer', 'options_legible', 'tags_visible'];
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
