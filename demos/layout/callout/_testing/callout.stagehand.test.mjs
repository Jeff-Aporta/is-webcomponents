// callout.stagehand.test.mjs — verificaciones de calidad visual.
// Mismo patrón que diagramas/ER y data/stat: checks deterministas por
// defecto (no skippean). STAGEHAND=1 + credenciales activa la rama LLM.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/layout/callout/callout.html`, readyAttr: 'data-callout-ready', name: 'callout' },
];

const results = [];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const callouts = [...document.querySelectorAll('main is-callout')];
    return callouts.map((c, idx) => {
      const sr = c.shadowRoot;
      const base = sr?.querySelector('[part="base"]');
      const icon = sr?.querySelector('[part="icon"]');
      const message = sr?.querySelector('[part="message"]');
      const baseRect = base?.getBoundingClientRect();
      const iconRect = icon?.getBoundingClientRect();
      const messageRect = message?.getBoundingClientRect();
      return {
        idx,
        color: c.getAttribute('color'),
        variant: c.getAttribute('variant'),
        hasBase: !!base,
        hasIcon: !!icon,
        hasMessage: !!message,
        baseW: baseRect?.width ?? 0,
        baseH: baseRect?.height ?? 0,
        iconW: iconRect?.width ?? 0,
        iconH: iconRect?.height ?? 0,
        messageW: messageRect?.width ?? 0,
        messageH: messageRect?.height ?? 0,
        // Texto visible: usamos el textContent del host (light DOM) que es
        // lo que el consumidor asignó y lo que se ve a través del slot.
        messageText: (c.textContent ?? '').trim(),
      };
    });
  });

  assert.ok(data.length > 0, `${demo.name}: debe haber callouts, hay ${data.length}`);

  for (const d of data) {
    const tag = `${demo.name}#${d.idx} (${d.color}/${d.variant ?? 'filled-outlined'})`;

    // (1) Partes base/icon/message renderizan.
    assert.equal(d.hasBase, true, `${tag}: debe existir part="base"`);
    assert.equal(d.hasIcon, true, `${tag}: debe existir part="icon"`);
    assert.equal(d.hasMessage, true, `${tag}: debe existir part="message"`);

    // (2) Tamaño no-cero: layout real, no línea plana.
    assert.ok(d.baseW > 30, `${tag}: ancho base > 30, fue ${d.baseW}`);
    assert.ok(d.baseH > 20, `${tag}: alto base > 20, fue ${d.baseH}`);

    // (3) Icono renderizado con tamaño > 0.
    assert.ok(d.iconW > 0, `${tag}: icono debe tener ancho > 0, fue ${d.iconW}`);
    assert.ok(d.iconH > 0, `${tag}: icono debe tener alto > 0, fue ${d.iconH}`);

    // (4) Mensaje con texto no vacío.
    assert.ok(d.messageText.length > 0, `${tag}: mensaje vacío`);
    assert.ok(d.messageW > 10, `${tag}: ancho mensaje > 10, fue ${d.messageW}`);

    // (5) Color cae en uno de los documentados (incluso los inválidos
    //     terminan reseteados a uno de la lista).
    assert.ok(['brand', 'neutral', 'success', 'warning', 'danger'].includes(d.color),
      `${tag}: color="${d.color}" no es uno de brand/neutral/success/warning/danger`);
  }

  // (6) Verificación ya realizada dentro del bucle anterior.
}

for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (parts visibles, layout no-cero, texto legible, color válido)`);
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
Evalúa la calidad visual del <is-callout> (mensaje en línea) que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. RENDERIZA: cada callout muestra un icono a la izquierda y un mensaje a la derecha, con borde y fondo visibles.

2. LAYOUT NO VACÍO: los callouts tienen tamaño visible (alto/ancho > 0) y no aparecen como una línea plana.

3. COLORES DIFERENCIADOS: los 5 colores (brand, neutral, success, warning, danger) son visualmente distinguibles entre sí (no todos grises).

4. ICONO PRESENTE: cada callout muestra un icono a la izquierda del texto (puede ser un icono de Iconify o un glyph slotted).

5. TEXTO LEGIBLE: el texto del mensaje es legible y no se sale del card.

Responde SOLO con un JSON con la forma:
{
  "renders": "PASS" | "FAIL",
  "non_empty_layout": "PASS" | "FAIL",
  "colors_differentiated": "PASS" | "FAIL",
  "icon_present": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
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
    const checks = ['renders', 'non_empty_layout', 'colors_differentiated', 'icon_present', 'text_legible'];
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
report('callout-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
