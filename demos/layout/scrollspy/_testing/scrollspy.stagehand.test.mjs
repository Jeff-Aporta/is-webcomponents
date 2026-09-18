// scrollspy.stagehand.test.mjs — verificaciones de calidad visual para is-scrollspy.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/scrollspy/scrollspy.html`, readyAttr: 'data-scrollspy-ready', name: 'scrollspy' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  // (1) El layout principal (spy1) tiene 4 links + 4 sections en el main.
  const layout1 = await page.evaluate(() => {
    const spy = document.getElementById('spy1');
    const slot = spy.shadowRoot?.querySelector('slot');
    const links = slot?.assignedElements({ flatten: true }).filter((el) => el.tagName === 'A');
    const sections = spy.triggers;
    return {
      linkCount: links?.length ?? 0,
      sectionCount: sections.length,
      hasActive: !!links?.find((a) => a.classList.contains('is-scrollspy-active')),
    };
  });
  assert.equal(layout1.linkCount, 4, `${demo.name}: spy1 debe tener 4 links`);
  assert.equal(layout1.sectionCount, 4, `${demo.name}: spy1 debe detectar 4 sections`);
  assert.equal(layout1.hasActive, true, `${demo.name}: al menos un link debe estar activo`);

  // (2) spy2 y spy3 también montados.
  const otherSpies = await page.evaluate(() => {
    const spies = ['spy2', 'spy3'];
    return spies.map((id) => {
      const el = document.getElementById(id);
      const slot = el.shadowRoot?.querySelector('slot');
      const links = slot?.assignedElements({ flatten: true }).filter((el) => el.tagName === 'A');
      return {
        id,
        linkCount: links?.length ?? 0,
        triggerCount: el.triggers.length,
      };
    });
  });
  for (const s of otherSpies) {
    assert.ok(s.linkCount > 0, `${demo.name}: ${s.id} debe tener links`);
    assert.ok(s.triggerCount > 0, `${demo.name}: ${s.id} debe detectar triggers`);
  }
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (3 spies montados, links y triggers detectados, activo inicial presente)`);
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
Evalúa la calidad visual del <is-scrollspy> en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: el nav del spy muestra los enlaces como una lista vertical.

2. ACTIVE DISTINGUIBLE: el link activo se ve visualmente distinto (fondo o color distinto) del resto.

3. SCROLL CONSISTENTE: el main asociado tiene scroll y muestra las secciones en orden.

4. NO SOLAPAMIENTO: los enlaces no se solapan entre sí; el nav se ve ordenado.

5. SCROLLSPY FUNCIONAL: al cargar, hay exactamente un link marcado como activo (no 0 ni 2).

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "active_distinguishable": "PASS" | "FAIL",
  "scroll_consistent": "PASS" | "FAIL",
  "no_overlap": "PASS" | "FAIL",
  "spy_functional": "PASS" | "FAIL",
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
    const checks = ['renders', 'active_distinguishable', 'scroll_consistent', 'no_overlap', 'spy_functional'];
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
report('scrollspy-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
