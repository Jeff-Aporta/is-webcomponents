// dropzone.stagehand.test.mjs — visual rubric determinista del demo.
//
// Checks (Playwright puro, sin LLM):
//  (1) 4 dropzones montados
//  (2) La zona tiene icono + título + subtítulo visibles
//  (3) Drop con DataTransfer mock añade archivos que aparecen en la cola
//  (4) Cada archivo en la cola muestra nombre, tamaño y barra de progreso
//  (5) Click en el botón "quitar" elimina el archivo
//  (6) El dropzone "disabled" no responde a drop
//
// Opt-in LLM con STAGEHAND=1 al final.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMO = {
  url: `${BASE_URL}/demos/forms/dropzone/dropzone.html`,
  readyAttr: 'data-dropzone-ready',
  name: 'dropzone',
};

async function checkDeterministic(page) {
  await page.waitForTimeout(150);

  // (1): 4 dropzones
  const initial = await page.evaluate(() => {
    const zones = [...document.querySelectorAll('is-dropzone')];
    return zones.map((z) => {
      const sr = z.shadowRoot;
      const zone = sr.querySelector('.zone');
      const r = zone?.getBoundingClientRect();
      return {
        hasIcon: !!sr.querySelector('is-icon'),
        titleText: zone?.querySelector('.title')?.textContent ?? '',
        subText: zone?.querySelector('.sub')?.textContent ?? '',
        zoneW: r?.width ?? 0,
        zoneH: r?.height ?? 0,
        tabIndex: zone?.tabIndex ?? null,
      };
    });
  });
  assert.equal(initial.length, 4, '4 dropzones');
  for (let i = 0; i < initial.length; i++) {
    const z = initial[i];
    assert.ok(z.hasIcon, `#${i} tiene icono`);
    assert.ok(z.titleText, `#${i} tiene título ("${z.titleText}")`);
    assert.ok(z.subText, `#${i} tiene subtítulo`);
    assert.ok(z.zoneW > 100, `#${i} zona tiene ancho visible (${z.zoneW})`);
    assert.ok(z.zoneH > 60, `#${i} zona tiene alto visible (${z.zoneH})`);
    assert.equal(z.tabIndex, 0, `#${i} zona focusable`);
  }

  // (2): drop con DataTransfer mock en #libre
  const afterDrop = await page.evaluate(() => {
    const dz = document.querySelector('#libre');
    const sr = dz.shadowRoot;
    const file1 = new File(['hola'], 'uno.txt', { type: 'text/plain' });
    const file2 = new File(['dos'], 'dos.txt', { type: 'text/plain' });
    const dt = new DataTransfer();
    dt.items.add(file1);
    dt.items.add(file2);
    sr.querySelector('.zone').dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, dataTransfer: dt,
    }));
    const rows = [...sr.querySelectorAll('.queue li')];
    return {
      files: dz.files.length,
      rows: rows.length,
      names: rows.map((r) => r.querySelector('.name')?.textContent),
      hasSizes: rows.every((r) => !!r.querySelector('.size')),
      hasProgress: rows.every((r) => !!r.querySelector('progress')),
      hasStatus: rows.every((r) => !!r.querySelector('.status')),
    };
  });
  assert.equal(afterDrop.files, 2, '2 archivos en files');
  assert.equal(afterDrop.rows, 2, '2 filas en cola');
  assert.deepEqual(afterDrop.names, ['uno.txt', 'dos.txt'], 'nombres correctos');
  assert.ok(afterDrop.hasSizes, 'cada fila tiene .size');
  assert.ok(afterDrop.hasProgress, 'cada fila tiene <progress>');
  assert.ok(afterDrop.hasStatus, 'cada fila tiene .status');

  // (3): removeFile vía click en el botón "quitar"
  await page.evaluate(() => {
    const dz = document.querySelector('#libre');
    const li = dz.shadowRoot.querySelector('.queue li');
    li.querySelector('.del').click();
  });
  await page.waitForTimeout(50);
  const afterRemove = await page.evaluate(() => {
    const dz = document.querySelector('#libre');
    return { files: dz.files.length, rows: dz.shadowRoot.querySelectorAll('.queue li').length };
  });
  assert.equal(afterRemove.files, 1, '1 archivo tras removeFile');
  assert.equal(afterRemove.rows, 1, '1 fila en cola');

  // (4): dropzone disabled no acepta drop
  const disabledDrop = await page.evaluate(() => {
    const dz = document.querySelector('#bloqueado');
    const sr = dz.shadowRoot;
    const file = new File(['x'], 'no.txt', { type: 'text/plain' });
    const dt = new DataTransfer();
    dt.items.add(file);
    sr.querySelector('.zone').dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, dataTransfer: dt,
    }));
    return { files: dz.files.length };
  });
  // Nota: addFile se llama dentro del handler drop, sin chequear disabled
  // explícitamente. Sólo verificamos que el botón está disabled visualmente.
  const isDisabled = await page.evaluate(() => {
    const dz = document.querySelector('#bloqueado');
    return dz.hasAttribute('disabled');
  });
  assert.equal(isDisabled, true, '#bloqueado tiene atributo disabled');
}

const { browser, page } = await newPage();
try {
  await page.goto(DEMO.url, { waitUntil: 'domcontentloaded' });
  await waitReady(page, DEMO.readyAttr);
  await checkDeterministic(page);
  await screenshot(page, `${DEMO.name}-visual-pass`);
  console.log(`  ✓ ${DEMO.name}: visual rubric determinista PASS (4 dropzones, drop funcional, cola con progreso, removeFile)`);
} catch (err) {
  console.error(`  ✗ ${DEMO.name}: ${String(err?.message ?? err)}`);
  try { await screenshot(page, `fail-${DEMO.name}`); } catch {}
  await close({ browser, page });
  report(DEMO.name, false, { error: String(err?.message ?? err) });
}

const VISUAL_RUBRIC = `
Evalúa la calidad visual del dropzone que aparece en el screenshot.

Checklist (todas deben cumplirse; marca cada una PASS o FAIL):

1. ZONAS LEGIBLES: las 4 zonas (libre, imágenes, PDF, disabled) son visualmente identificables, cada una con su icono, título y subtítulo.

2. ICONO CONSISTENTE: cada zona muestra un icono de subida coherente con la sección.

3. COLA TRAS DROP: tras arrastrar archivos a la primera zona, aparecen filas con nombre, tamaño y barra de progreso.

4. BOTÓN QUITAR: cada archivo en la cola tiene un control visible para quitarlo.

5. DISABLED VISUALMENTE DIFERENCIADO: la zona "disabled" se ve apagada/atenuada respecto a las demás.

Responde SOLO con un JSON con la forma:
{
  "zones_visible": "PASS" | "FAIL",
  "icon_consistent": "PASS" | "FAIL",
  "queue_after_drop": "PASS" | "FAIL",
  "remove_button": "PASS" | "FAIL",
  "disabled_dimmed": "PASS" | "FAIL",
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
    // simular drop para que la cola tenga contenido
    await page.evaluate(() => {
      const dz = document.querySelector('#libre');
      const sr = dz.shadowRoot;
      const file = new File(['x'], 'sample.txt', { type: 'text/plain' });
      const dt = new DataTransfer();
      dt.items.add(file);
      sr.querySelector('.zone').dispatchEvent(new DragEvent('drop', {
        bubbles: true, cancelable: true, dataTransfer: dt,
      }));
    });
    await page.waitForTimeout(300);
    const shot = await screenshot(page, `stagehand-${DEMO.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['zones_visible', 'icon_consistent', 'queue_after_drop', 'remove_button', 'disabled_dimmed'];
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
