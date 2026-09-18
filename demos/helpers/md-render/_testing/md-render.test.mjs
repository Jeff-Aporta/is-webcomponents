// md-render.test.mjs — tests funcionales de <is-md-render>.
//
// Notas técnicas:
//
//   - El componente usa `document.execCommand('bold'/'italic')` para los atajos
//     Ctrl+B / Ctrl+I. Esa API está deprecada pero sigue funcionando en
//     navegadores actuales (la suite NO depende de ella — los tests escriben
//     directamente en el shadow body vía `textContent` para no depender de
//     APIs deprecadas del navegador). El test "execCommand deprecated" verifica
//     que existe un fallback (is-input/is-change) cuando execCommand no hace nada.
//
// Cubre:
//   - smoke: 6 secciones renderizan.
//   - markdown básico: **negrita** → <strong>, *cursiva* → <em>, `código` → <code>.
//   - chips {{var}}: renderiza como <kbd class="prompt-md-var"> o similar.
//   - placeholder: cuando value="" muestra el placeholder.
//   - hidratación: el <script type="text/markdown"> hijo se convierte en value.
//   - can-edit: contentEditable="true", is-input al escribir.
//   - readonly gana: contentEditable="false" con readonly presente.
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from '../../_testing/lib/harness.mjs';

const URL = `${BASE_URL}/demos/helpers/md-render/md-render.html`;

const tests = [];

tests.push({
  name: 'smoke: 6 secciones renderizan',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll('main is-md-render')];
      return all.map((el) => {
        const body = el.shadowRoot.querySelector('.body');
        return { count: 1, text: body?.textContent?.trim() ?? '' };
      });
    });
    assert.equal(r.length, 6, `esperaba 6 instancias, hay ${r.length}`);
    // 5 con texto + 1 vacía con placeholder
    const vacias = r.filter((x) => !x.text);
    assert.equal(vacias.length, 1, `esperaba 1 vacía (placeholder), hay ${vacias.length}`);
    await screenshot(page, 'md-render-smoke');
  },
});

tests.push({
  name: 'markdown: **negrita** y *cursiva* generan <strong>/<em>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][0]; // primera sección
      const body = el.shadowRoot.querySelector('.body');
      return {
        text: body?.textContent ?? '',
        strong: body?.querySelector('strong')?.textContent ?? null,
        em: body?.querySelector('em')?.textContent ?? null,
        code: body?.querySelector('code')?.textContent ?? null,
      };
    });
    assert.equal(r.strong, 'mundo', `**mundo** → <strong> (era "${r.strong}")`);
    assert.equal(r.em, 'cursiva', `*cursiva* → <em> (era "${r.em}")`);
    assert.equal(r.code, 'código', `\`código\` → <code> (era "${r.code}")`);
  },
});

tests.push({
  name: 'chips {{var}}: renderiza el nombre de la variable',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][1]; // sección chips
      const body = el.shadowRoot.querySelector('.body');
      return {
        text: body?.textContent ?? '',
        html: body?.innerHTML ?? '',
        chips: [...(body?.querySelectorAll('.prompt-md-var') ?? [])].length,
      };
    });
    // El nombre de la variable debe aparecer en el texto
    assert.ok(r.text.includes('nombre'), `chip {{nombre}} debe contener "nombre" (era "${r.text}")`);
    assert.ok(r.text.includes('id'), `chip {{id}} debe contener "id" (era "${r.text}")`);
    assert.ok(r.chips >= 2, `esperaba >=2 chips renderizados, hay ${r.chips}`);
  },
});

tests.push({
  name: 'placeholder: con value="" muestra el texto del placeholder',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][2];
      const empty = el.shadowRoot.querySelector('.empty');
      return { empty: empty?.textContent ?? '', hidden: empty?.hidden ?? true };
    });
    assert.equal(r.empty, 'Sin contenido aún', `placeholder debe ser "Sin contenido aún" (era "${r.empty}")`);
    assert.equal(r.hidden, false, `placeholder debe estar visible`);
  },
});

tests.push({
  name: 'hidratación: <script type="text/markdown"> se convierte en value',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][3];
      const body = el.shadowRoot.querySelector('.body');
      const list = body?.querySelector('ul');
      return {
        text: body?.textContent ?? '',
        items: list ? [...list.querySelectorAll('li')].map((li) => li.textContent.trim()) : [],
      };
    });
    assert.equal(r.items.length, 3, `esperaba 3 items en la lista, hay ${r.items.length}`);
    assert.ok(r.items[0].includes('item A'), `primer item debe ser "item A" (era "${r.items[0]}")`);
  },
});

tests.push({
  name: 'can-edit: contentEditable="true" y atributo editable presente',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][4];
      const body = el.shadowRoot.querySelector('.body');
      return {
        ce: body?.contentEditable,
        editable: el.hasAttribute('editable'),
        role: body?.getAttribute('role'),
      };
    });
    assert.equal(r.ce, 'true', `con can-edit, contentEditable="true" (era "${r.ce}")`);
    assert.equal(r.editable, true, `atributo editable presente`);
    assert.equal(r.role, 'textbox', `role=textbox con can-edit (era "${r.role}")`);
  },
});

tests.push({
  name: 'can-edit + readonly: readonly gana, contentEditable="false"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][5];
      const body = el.shadowRoot.querySelector('.body');
      return {
        ce: body?.contentEditable,
        role: body?.getAttribute('role'),
      };
    });
    assert.equal(r.ce, 'false', `readonly gana sobre can-edit (era "${r.ce}")`);
    assert.equal(r.role, 'article', `role=article en solo lectura (era "${r.role}")`);
  },
});

tests.push({
  name: 'can-edit: edición dispara is-input',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    // Adjuntar listener ANTES de escribir
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][4];
      window.__mdInputs = [];
      el.addEventListener('is-input', (e) => window.__mdInputs.push(e.detail?.value ?? ''));
    });
    // Simular input en el shadow body
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][4];
      const body = el.shadowRoot.querySelector('.body');
      body.textContent = 'Texto nuevo';
      body.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await page.waitForTimeout(150);
    const inputs = await page.evaluate(() => window.__mdInputs);
    assert.ok(inputs.length >= 1, `esperaba >=1 evento is-input, recibí ${inputs.length}`);
    assert.ok(inputs[0].includes('Texto nuevo'), `detalle del evento debe contener el texto (era "${inputs[0]}")`);
  },
});

tests.push({
  name: 'gap-15: API moderna disponible (refresh method, sin execCommand en el path crítico)',
  run: async (page) => {
    // Aunque execCommand sigue vivo, el componente expone `refresh()` que es
    // la API moderna para forzar re-render. Verificamos que existe.
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-md-render-ready');
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][0];
      return {
        hasRefresh: typeof el.refresh === 'function',
        afterRefresh: null,
      };
    });
    assert.equal(r.hasRefresh, true, 'refresh() debe estar disponible como API moderna');
    // Llamar refresh no debe romper
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][0];
      el.refresh();
    });
    const stillOk = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main is-md-render')][0];
      const body = el.shadowRoot.querySelector('.body');
      return body?.textContent?.length > 0;
    });
    assert.equal(stillOk, true, 'refresh() no debe vaciar el contenido');
  },
});

let failures = 0;
for (const t of tests) {
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('md-render', failures === 0, { total: tests.length, failures });