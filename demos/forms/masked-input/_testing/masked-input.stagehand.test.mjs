// masked-input.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) 5 masked-inputs montados
//  (2) El placeholder de cada uno refleja el pattern
//  (3) Setear valor aplica la máscara y los literales aparecen
//  (4) El pattern "AAAA 000" mezcla letras y números
//  (5) El input "requerido" queda marcado como invalid tras blur vacío
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/masked-input/masked-input.html`,
  readyAttr: 'data-masked-input-ready',
  name: 'masked-input',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1): 5 masked-inputs
  const initial = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('is-masked-input')];
    return inputs.map((i) => {
      const sr = i.shadowRoot;
      const inner = sr?.querySelector('input.input');
      const r = inner?.getBoundingClientRect();
      return {
        pattern: i.pattern,
        placeholder: inner?.placeholder ?? '',
        maxLength: inner?.maxLength,
        w: r?.width ?? 0, h: r?.height ?? 0,
      };
    });
  });
  assert.equal(initial.length, 5, '5 masked-inputs');
  for (let i = 0; i < initial.length; i++) {
    const inp = initial[i];
    assert.ok(inp.pattern, `#${i} tiene pattern (${inp.pattern})`);
    assert.ok(inp.placeholder, `#${i} tiene placeholder (${inp.placeholder})`);
    assert.ok(inp.w > 100, `#${i} input visible (w=${inp.w})`);
    assert.ok(inp.h > 20, `#${i} input alto >20 (h=${inp.h})`);
  }

  // (2): placeholders reflejan patterns
  assert.match(initial[0].placeholder, /\+54/, '#tel placeholder comienza con "+54"');
  assert.match(initial[0].placeholder, /_/, '#tel placeholder usa "_" como slot');
  assert.match(initial[2].placeholder, /\//, '#fecha placeholder usa "/"');
  assert.match(initial[3].placeholder, / /, '#placa placeholder usa " " entre letras y nums');

  // (3): setear valor aplica la máscara
  const masked = await page.evaluate(() => {
    const fecha = document.querySelector('#fecha');
    fecha.value = '15072026';
    const card = document.querySelector('#card');
    card.value = '4111111111111111';
    const placa = document.querySelector('#placa');
    placa.value = 'abc123';
    return {
      fecha: fecha.value,
      card: card.value,
      placa: placa.value,
    };
  });
  assert.equal(masked.fecha, '15/07/2026', `fecha formateada con "/" (${masked.fecha})`);
  assert.match(masked.card, /^4111 1111 1111 1111$/, `card con espacios (${masked.card})`);
  assert.equal(masked.placa, 'ABC 123', `placa en mayúsculas con " " (${masked.placa})`);

  // (4): complete del #req con valor completo
  await page.evaluate(() => {
    const req = document.querySelector('#req');
    req.value = '12345678';
  });
  await page.waitForTimeout(50);
  const complete = await page.evaluate(() => {
    return document.querySelector('#req').complete;
  });
  assert.equal(complete, true, 'complete=true con 8 dígitos');

  // (5): required → invalid tras blur vacío
  await page.evaluate(() => {
    const req = document.querySelector('#req');
    req.value = '';
    const inner = req.shadowRoot.querySelector('input.input');
    inner.focus();
    inner.blur();
  });
  await page.waitForTimeout(50);
  const invalid = await page.evaluate(() => {
    return document.querySelector('#req').hasAttribute('invalid');
  });
  assert.equal(invalid, true, '#req tiene atributo invalid tras blur vacío');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (5 inputs, literales, complete, invalid)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del input con máscara que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. INPUTS LEGIBLES: los 5 inputs (tel, card, fecha, placa, requerido) son visualmente identificables con label y placeholder.

2. PATRONES VISIBLES: cada input muestra su placeholder-pattern (con "_" para dígitos y "/" para fecha).

3. LITERALES EN VALORES: tras completar, los valores muestran los separadores literales (espacios, "/", "-").

4. MAYÚSCULAS EN PLACA: la placa "AAAA 000" fuerza letras a mayúsculas.

5. INVALID VISIBLE: el input "requerido" se ve marcado/atenuado cuando está vacío.

Responde SOLO con un JSON con la forma:
{
  "inputs_visible": "PASS" | "FAIL",
  "patterns_visible": "PASS" | "FAIL",
  "literals_in_values": "PASS" | "FAIL",
  "uppercase_plate": "PASS" | "FAIL",
  "required_invalid": "PASS" | "FAIL",
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
    // simular valores para que se vean formateados
    await page.evaluate(() => {
      document.querySelector('#fecha').value = '15072026';
      document.querySelector('#card').value = '4111111111111111';
      document.querySelector('#placa').value = 'abc123';
    });
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['inputs_visible', 'patterns_visible', 'literals_in_values', 'uppercase_plate', 'required_invalid'];
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
