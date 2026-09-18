// file-input.stagehand.test.mjs — verificaciones visuales deterministas.
//
// Patrón tomado de input.stagehand.test.mjs / er-stagehand.test.mjs:
// rubric visual sin LLM por defecto. La rama LLM con Stagehand queda
// opt-in al final del archivo (STAGEHAND=1).
//
// Checks que pasamos (todos sobre el demo file-input.html):
//   1. COMPONENTE RENDERIZADO: <is-file-input> definido, shadow DOM presente,
//      input nativo accesible.
//   2. ELEMENTOS VISIBLES: cada instancia expone label, hint, dropzone e input
//      nativo, todos con rect visible y dentro del viewport.
//   3. TEXTO LEGIBLE: labels e hints con font-size >= 8px; el dropzone muestra
//      el texto instructivo por defecto.
//   4. SIN OVERLAPS: los 4 file-inputs (basico, multiple, required, disabled)
//      están apilados verticalmente sin solaparse.
//   5. ESTADOS DISTINGUIBLES: required / multiple / disabled exponen atributos
//      ARIA + data-state-* correctos; el disabled bloquea el input nativo.
//   6. FILE LIST DINÁMICO: con la lista vacía el <ul> está oculto; tras asignar
//      `files`, la lista aparece con un <li> por archivo y un botón "remove".
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report, maybeStagehand } from './lib/harness.mjs';

const DEMOS = [
  { url: `${BASE_URL}/demos/forms/file-input/file-input.html`, readyAttr: 'data-file-input-ready', name: 'file-input' },
];

async function checkDeterministic(page, demo) {
  await page.waitForTimeout(200);

  // 1) COMPONENTE RENDERIZADO.
  const defined = await page.evaluate(() => !!customElements.get('is-file-input'));
  assert.equal(defined, true, 'is-file-input debe estar definido');

  // 2-6) Inspección de cada file-input del demo.
  const data = await page.evaluate(() => {
    const els = [...document.querySelectorAll('is-file-input')];
    const vp = { w: window.innerWidth, h: window.innerHeight };
    return els.map((el, idx) => {
      const sr = el.shadowRoot;
      const label = sr?.querySelector('label.label');
      const hint = sr?.querySelector('.hint');
      const dropzone = sr?.querySelector('.dropzone');
      const native = sr?.querySelector('input.native');
      const list = sr?.querySelector('.file-list');
      const labelCs = label ? getComputedStyle(label) : null;
      const hintCs = hint ? getComputedStyle(hint) : null;
      const dzCs = dropzone ? getComputedStyle(dropzone) : null;
      const text = sr?.querySelector('.dropzone-text');
      const elRect = el.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const hintRect = hint?.getBoundingClientRect();
      const dropzoneRect = dropzone?.getBoundingClientRect();
      return {
        index: idx,
        rect: { x: elRect.x, y: elRect.y, w: elRect.width, h: elRect.height },
        labelText: label?.textContent?.trim() ?? '',
        labelFontSize: labelCs?.fontSize ?? null,
        hintText: hint?.textContent?.trim() ?? '',
        hintFontSize: hintCs?.fontSize ?? null,
        labelRect: labelRect ? { x: labelRect.x, y: labelRect.y, w: labelRect.width, h: labelRect.height } : null,
        hintRect: hintRect ? { x: hintRect.x, y: hintRect.y, w: hintRect.width, h: hintRect.height } : null,
        dropzoneRect: dropzoneRect ? { x: dropzoneRect.x, y: dropzoneRect.y, w: dropzoneRect.width, h: dropzoneRect.height } : null,
        dropzoneRole: dropzone?.getAttribute('role'),
        dropzoneTabindex: dropzone?.tabIndex ?? null,
        dropzoneAriaDisabled: dropzone?.getAttribute('aria-disabled'),
        dropzoneLabelledBy: dropzone?.getAttribute('aria-labelledby'),
        dropzoneDescribedBy: dropzone?.getAttribute('aria-describedby'),
        dropzoneText: text?.textContent?.trim() ?? '',
        dropzoneCursor: dzCs?.cursor ?? null,
        dropzoneOpacity: dzCs?.opacity ?? null,
        nativeType: native?.getAttribute('type'),
        nativeDisabled: !!native?.disabled,
        listHidden: !!list?.hidden,
        listItemCount: list?.querySelectorAll('.file').length ?? 0,
        stateBlank: el.hasAttribute('data-state-blank'),
        stateDisabled: el.hasAttribute('data-state-disabled'),
        stateRequired: el.hasAttribute('data-state-required'),
        attrRequired: el.hasAttribute('required'),
        attrMultiple: el.hasAttribute('multiple'),
        attrDisabled: el.hasAttribute('disabled'),
        vp,
      };
    });
  });

  // 2) ELEMENTOS VISIBLES (todos dentro del viewport y con área > 0).
  assert.equal(data.length, 4, `demo debe tener 4 file-inputs, hay ${data.length}`);
  for (const d of data) {
    assert.ok(d.rect.w > 0 && d.rect.h > 0, `file-input#${d.index} debe tener rect visible`);
    assert.ok(d.dropzoneRect && d.dropzoneRect.w > 0 && d.dropzoneRect.h > 0,
      `file-input#${d.index} debe tener dropzone visible`);
    assert.ok(d.labelText.length > 0, `file-input#${d.index} debe tener label con texto (era "${d.labelText}")`);
    assert.ok(d.dropzoneText.length > 0,
      `file-input#${d.index} dropzone debe mostrar texto instructivo (era "${d.dropzoneText}")`);
    assert.equal(d.nativeType, 'file', `file-input#${d.index} input nativo debe ser type=file`);
    // Dentro del viewport (con tolerancia de 1px por subpixel rounding).
    assert.ok(d.rect.x >= -1 && d.rect.x + d.rect.w <= d.vp.w + 1,
      `file-input#${d.index} debe encajar horizontalmente (x=${d.rect.x}, w=${d.rect.w}, vp=${d.vp.w})`);
    assert.ok(d.rect.y >= -1 && d.rect.y + d.rect.h <= d.vp.h + 1,
      `file-input#${d.index} debe encajar verticalmente (y=${d.rect.y}, h=${d.rect.h}, vp=${d.vp.h})`);
  }

  // 3) TEXTO LEGIBLE: labels e hints >= 8px.
  for (const d of data) {
    const fsLabel = parseFloat(d.labelFontSize);
    assert.ok(!Number.isNaN(fsLabel) && fsLabel >= 8,
      `file-input#${d.index}: label font-size >= 8px (era ${d.labelFontSize})`);
    if (d.hintText) {
      const fsHint = parseFloat(d.hintFontSize);
      assert.ok(!Number.isNaN(fsHint) && fsHint >= 8,
        `file-input#${d.index}: hint font-size >= 8px (era ${d.hintFontSize})`);
    }
  }

  // 4) SIN OVERLAPS entre los 4 file-inputs.
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i], b = data[j];
      const ox = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
      const oy = a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
      assert.ok(!(ox && oy),
        `file-input ${i} (${a.labelText}) y ${j} (${b.labelText}) no deben solaparse`);
    }
  }

  // 5) ESTADOS DISTINGUIBLES + ARIA correcto.
  // Esperado por índice:
  //   0 = basico (sin required, sin multiple, sin disabled)
  //   1 = multiple (attr multiple, no required, no disabled)
  //   2 = required (attr required, no multiple, no disabled)
  //   3 = disabled (attr disabled, no required, no multiple)
  const basico = data[0];
  const varios = data[1];
  const requerido = data[2];
  const bloqueado = data[3];

  for (const d of data) {
    assert.equal(d.dropzoneRole, 'button', `file-input#${d.index}: dropzone debe tener role=button`);
    assert.equal(d.dropzoneLabelledBy, 'label',
      `file-input#${d.index}: dropzone aria-labelledby debe apuntar a #label`);
    assert.equal(d.dropzoneDescribedBy, 'hint',
      `file-input#${d.index}: dropzone aria-describedby debe apuntar a #hint`);
    assert.equal(d.stateBlank, true,
      `file-input#${d.index}: data-state-blank presente al inicio (sin archivos)`);
    assert.equal(d.listHidden, true,
      `file-input#${d.index}: .file-list debe estar oculto sin archivos`);
    assert.equal(d.listItemCount, 0,
      `file-input#${d.index}: .file-list sin <li> sin archivos`);
  }

  // basico: atributos simples
  assert.equal(basico.attrRequired, false, 'basico no debe ser required');
  assert.equal(basico.attrMultiple, false, 'basico no debe ser multiple');
  assert.equal(basico.attrDisabled, false, 'basico no debe ser disabled');
  assert.equal(basico.dropzoneTabindex, 0, 'basico dropzone debe ser focusable (tabindex=0)');
  assert.equal(basico.nativeDisabled, false, 'basico input nativo no debe estar disabled');

  // multiple
  assert.equal(varios.attrMultiple, true, 'multiple debe tener atributo multiple');
  assert.equal(varios.attrRequired, false, 'multiple no debe ser required');
  assert.equal(varios.attrDisabled, false, 'multiple no debe ser disabled');
  assert.equal(varios.dropzoneTabindex, 0, 'multiple dropzone focusable');
  assert.equal(varios.nativeDisabled, false, 'multiple input nativo no debe estar disabled');

  // required
  assert.equal(requerido.attrRequired, true, 'required debe tener atributo required');
  assert.equal(requerido.attrMultiple, false, 'required no debe ser multiple');
  assert.equal(requerido.attrDisabled, false, 'required no debe ser disabled');
  assert.equal(requerido.stateRequired, true, 'required debe exponer data-state-required');
  assert.equal(requerido.dropzoneTabindex, 0, 'required dropzone focusable');

  // disabled
  assert.equal(bloqueado.attrDisabled, true, 'disabled debe tener atributo disabled');
  assert.equal(bloqueado.attrRequired, false, 'disabled no debe ser required');
  assert.equal(bloqueado.attrMultiple, false, 'disabled no debe ser multiple');
  assert.equal(bloqueado.stateDisabled, true, 'disabled debe exponer data-state-disabled');
  assert.equal(bloqueado.dropzoneAriaDisabled, 'true', 'disabled dropzone debe tener aria-disabled="true"');
  assert.equal(bloqueado.dropzoneTabindex, -1, 'disabled dropzone debe tener tabindex=-1');
  assert.equal(bloqueado.nativeDisabled, true, 'disabled input nativo debe estar disabled');

  // 6) FILE LIST DINÁMICO: tras asignar files, la lista aparece con un <li>
  // por archivo y un botón remove por cada uno.
  await page.evaluate(() => {
    const el = document.querySelectorAll('is-file-input')[0];
    el.files = [
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
    ];
  });
  await page.waitForTimeout(60);

  const populated = await page.evaluate(() => {
    const el = document.querySelectorAll('is-file-input')[0];
    const sr = el.shadowRoot;
    const list = sr.querySelector('.file-list');
    const items = [...sr.querySelectorAll('.file')];
    return {
      listHidden: !!list.hidden,
      itemCount: items.length,
      names: items.map((li) => li.querySelector('.file-name')?.textContent ?? ''),
      removeButtons: items.every((li) => !!li.querySelector('.remove')),
      blankState: el.hasAttribute('data-state-blank'),
    };
  });

  assert.equal(populated.listHidden, false, 'lista visible tras añadir archivos');
  assert.equal(populated.itemCount, 2, 'lista debe contener 2 <li>');
  assert.deepEqual(populated.names, ['a.txt', 'b.txt'], 'nombres deben coincidir en orden');
  assert.equal(populated.removeButtons, true, 'cada <li> debe tener botón .remove');
  assert.equal(populated.blankState, false, 'data-state-blank debe desaparecer al añadir archivos');

  // Limpieza: vaciar la lista para no contaminar screenshots subsiguientes.
  await page.evaluate(() => {
    document.querySelectorAll('is-file-input')[0].files = [];
  });
}

const results = [];
for (const demo of DEMOS) {
  const { browser, page } = await newPage();
  try {
    await page.goto(demo.url, { waitUntil: 'domcontentloaded' });
    await waitReady(page, demo.readyAttr);
    await checkDeterministic(page, demo);
    console.log(`  ✓ ${demo.name}: rubric determinista PASS (4 file-inputs, sin overlaps, estados distinguibles, lista dinámica)`);
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
Evalúa la calidad visual del demo del componente <is-file-input>.

Checklist (cada una PASS o FAIL):

1. LAYOUT NO SE SOLAPA: los 4 file-inputs (Básico, Múltiple, Requerido,
   Deshabilitado) están visualmente separados y apilados verticalmente.
2. ELEMENTOS VISIBLES: cada sección expone label, hint y un dropzone con
   icono de nube y texto instructivo "Arrastra archivos aquí o haz clic
   para seleccionar".
3. TEXTO LEGIBLE: labels e hints son legibles, sin texto cortado.
4. ESTADOS DISTINGUIBLES: las variantes multiple / required / disabled se
   ven diferentes entre sí (el disabled está atenuado o con cursor not-allowed).
5. DARK THEME: el fondo es oscuro y el texto claro, buen contraste.

Responde SOLO con un JSON con la forma:
{
  "no_overlap": "PASS" | "FAIL",
  "elements_visible": "PASS" | "FAIL",
  "text_legible": "PASS" | "FAIL",
  "states_distinguishable": "PASS" | "FAIL",
  "dark_theme": "PASS" | "FAIL",
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
    // Poblar el primer input para que la captura incluya la file-list.
    await page.evaluate(() => {
      const el = document.querySelectorAll('is-file-input')[0];
      el.files = [
        new File(['hello'], 'demo.txt', { type: 'text/plain' }),
        new File(['world'], 'otra-imagen.png', { type: 'image/png' }),
      ];
    });
    await page.waitForTimeout(400);
    const shot = await screenshot(page, `stagehand-${demo.name}`);
    const result = await sh.act(VISUAL_RUBRIC, { image: shot });
    const json = JSON.parse(result?.output ?? result?.text ?? '{}');
    const checks = ['no_overlap', 'elements_visible', 'text_legible', 'states_distinguishable', 'dark_theme'];
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
report('file-input-stagehand', hardFailures === 0, { total: results.length, failures: hardFailures, results });
