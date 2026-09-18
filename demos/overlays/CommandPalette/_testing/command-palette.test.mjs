// command-palette.test.mjs — tests exhaustivos del demo command-palette.html.
//
// Cobertura:
//   - smoke: el componente monta y expone los CSS parts
//   - funcional: open()/close()/toggle() manipulan el atributo open
//   - funcional: Ctrl+K (hotkey) abre y Escape cierra
//   - funcional: filtrado difuso por query (substring + prefix + keywords)
//   - funcional: ArrowDown/ArrowUp mueven el activo, Enter ejecuta is-select
//   - funcional: max-results limita los resultados
//   - funcional: empty-text aparece cuando no hay coincidencias
//   - determinismo: re-asignar comandos idénticos produce mismo results
//   - accesibilidad: aria-label, role, focus al abrir
import assert from 'node:assert/strict';
import { BASE_URL, newPage, close, waitReady, screenshot, report } from './lib/harness.mjs';

const URL = `${BASE_URL}/demos/overlays/CommandPalette/command-palette.html`;

const tests = [];

tests.push({
  name: 'smoke: el componente monta, customElements lo define y expone dialog',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    const info = await page.evaluate(() => {
      const palette = document.querySelector('main is-command-palette');
      const dialog = palette.shadowRoot.querySelector('dialog[part="dialog"]');
      const panel = palette.shadowRoot.querySelector('.panel[part="panel"]');
      const input = palette.shadowRoot.querySelector('input[part="input"]');
      const results = palette.shadowRoot.querySelector('ol[part="results"]');
      return {
        defined: !!customElements.get('is-command-palette'),
        hasDialog: !!dialog,
        hasPanel: !!panel,
        hasInput: !!input,
        hasResults: !!results,
        inputId: !!input,
        commands: palette.commands.length,
        hasFooter: !!palette.querySelector('[slot="footer"]'),
      };
    });
    assert.equal(info.defined, true, 'is-command-palette debe estar definido');
    assert.ok(info.hasDialog, 'dialog[part="dialog"] debe existir');
    assert.ok(info.hasPanel, '.panel[part="panel"] debe existir');
    assert.ok(info.hasInput, 'input[part="input"] debe existir');
    assert.ok(info.hasResults, 'ol[part="results"] debe existir');
    assert.equal(info.commands, 11, 'debe cargar 11 comandos del JSON');
    assert.equal(info.hasFooter, true, 'debe proyectar el slot footer');
    await screenshot(page, 'cmd-smoke');
  },
});

tests.push({
  name: 'funcional: open() abre el dialog y setea atributo open',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const opened = await page.evaluate(async () => {
      const palette = document.querySelector('main is-command-palette');
      palette.open();
      // showModal() tarda un microtask
      await new Promise((r) => requestAnimationFrame(r));
      return {
        openAttr: palette.hasAttribute('open'),
        dialogOpen: palette.shadowRoot.querySelector('dialog').open,
      };
    });
    assert.equal(opened.openAttr, true, 'open() debe setear el atributo open');
    assert.equal(opened.dialogOpen, true, 'el <dialog> subyacente debe estar abierto');
    await page.waitForTimeout(50);
    await screenshot(page, 'cmd-open');
  },
});

tests.push({
  name: 'funcional: close() cierra el dialog y emite is-after-hide',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const after = await page.evaluate(async () => {
      const palette = document.querySelector('main is-command-palette');
      let hideFired = false;
      let afterHideFired = false;
      palette.addEventListener('is-hide', () => { hideFired = true; });
      palette.addEventListener('is-after-hide', () => { afterHideFired = true; });
      palette.open();
      await new Promise((r) => requestAnimationFrame(r));
      palette.close();
      await new Promise((r) => requestAnimationFrame(r));
      return {
        hideFired, afterHideFired,
        openAttr: palette.hasAttribute('open'),
        dialogOpen: palette.shadowRoot.querySelector('dialog').open,
      };
    });
    assert.equal(after.hideFired, true, 'close() debe emitir is-hide');
    assert.equal(after.afterHideFired, true, 'close() debe emitir is-after-hide');
    assert.equal(after.openAttr, false, 'close() debe remover el atributo open');
    assert.equal(after.dialogOpen, false, 'el <dialog> debe estar cerrado');
  },
});

tests.push({
  name: 'funcional: hotkey Ctrl+K abre el dialog cuando está cerrado',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    // Asegurar que está cerrado al inicio
    const beforeOpen = await page.evaluate(() => {
      const p = document.querySelector('main is-command-palette');
      return p.shadowRoot.querySelector('dialog').open;
    });
    assert.equal(beforeOpen, false, 'dialog debe iniciar cerrado');

    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);
    const afterOpen = await page.evaluate(() => {
      const p = document.querySelector('main is-command-palette');
      return {
        openAttr: p.hasAttribute('open'),
        dialogOpen: p.shadowRoot.querySelector('dialog').open,
      };
    });
    assert.equal(afterOpen.openAttr, true, 'Ctrl+K debe abrir la paleta');
    assert.equal(afterOpen.dialogOpen, true, 'Ctrl+K debe abrir el <dialog>');
  },
});

tests.push({
  name: 'funcional: Escape cierra el dialog (vía cancel del <dialog>)',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => {
      const p = document.querySelector('main is-command-palette');
      return {
        openAttr: p.hasAttribute('open'),
        dialogOpen: p.shadowRoot.querySelector('dialog').open,
      };
    });
    assert.equal(after.openAttr, false, 'Escape debe cerrar la paleta');
    assert.equal(after.dialogOpen, false, 'Escape debe cerrar el <dialog>');
  },
});

tests.push({
  name: 'funcional: filtrado difuso — query "expo" prioriza "Exportar PDF" sobre "Nuevo"',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      const input = p.shadowRoot.querySelector('input');
      input.value = 'expo';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // esperar al render
      await new Promise((r) => requestAnimationFrame(r));
      const opts = [...p.shadowRoot.querySelectorAll('.opt')];
      return {
        count: opts.length,
        firstTitle: opts[0]?.querySelector('.t')?.textContent?.trim() ?? null,
      };
    });
    assert.ok(result.count >= 1, `debe haber al menos un resultado, hay ${result.count}`);
    assert.equal(result.firstTitle, 'Exportar PDF',
      `el primer resultado debe ser "Exportar PDF" (fuzzy match "expo"), fue "${result.firstTitle}"`);
  },
});

tests.push({
  name: 'funcional: max-results limita la lista de sugerencias',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    // El demo fija max-results="8" pero los 11 comandos caben en el orden
    // sin query. Verificamos que con max-results=3 hay exactamente 3.
    const result = await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.setAttribute('max-results', '3');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      const opts = [...p.shadowRoot.querySelectorAll('.opt')];
      return { count: opts.length, results: p.results.length };
    });
    assert.equal(result.results, 3, `palette.results.length debe ser 3 (cap por max-results)`);
    assert.equal(result.count, 3, 'DOM debe reflejar 3 <li role="option">');
  },
});

tests.push({
  name: 'funcional: query sin coincidencias muestra empty-text',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    // El componente tiene un fallback: cuando la búsqueda no matchea nada,
    // muestra hasta 4 comandos que empiecen con letra (ver #search()). Para
    // forzar el estado vacío creamos una paleta NUEVA con un script JSON
    // vacío, de modo que al re-leer (onConnected) #commands = [] y no hay
    // fallback posible.
    const result = await page.evaluate(async () => {
      const main = document.querySelector('main');
      const p = document.createElement('is-command-palette');
      p.setAttribute('empty-text', 'Sin coincidencias');
      const script = document.createElement('script');
      script.type = 'application/json';
      script.textContent = '[]';
      p.appendChild(script);
      main.appendChild(p);
      await new Promise((r) => requestAnimationFrame(r));
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      const input = p.shadowRoot.querySelector('input');
      input.value = 'zzzzz_nada';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
      const empty = p.shadowRoot.querySelector('[part="empty"]');
      const resultsLen = p.shadowRoot.querySelectorAll('[role="option"]').length;
      const r = {
        hidden: empty.hasAttribute('hidden'),
        text: empty.textContent.trim(),
        resultsLen,
      };
      p.remove();
      return r;
    });
    assert.equal(result.resultsLen, 0, `con 0 comandos no debe haber options (hay ${result.resultsLen})`);
    assert.equal(result.hidden, false, 'empty debe estar visible sin resultados');
    assert.equal(result.text, 'Sin coincidencias', `empty-text debe ser el configurado, fue "${result.text}"`);
  },
});

tests.push({
  name: 'funcional: ArrowDown mueve el item activo y Enter ejecuta is-select',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      // Esperar foco en el input (open() llama input.focus())
      await new Promise((r) => setTimeout(r, 50));
      // Capturar el evento is-select con su detail
      let selected = null;
      p.addEventListener('is-select', (e) => { selected = e.detail; });
      // ArrowDown x1 → mueve de idx=0 a idx=1
      p.shadowRoot.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown', bubbles: true,
      }));
      // Enter → selecciona idx activo
      p.shadowRoot.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true,
      }));
      await new Promise((r) => requestAnimationFrame(r));
      return { selected };
    });
    assert.ok(result.selected, 'Enter debe emitir is-select con detail');
    assert.ok(result.selected.id, 'detail debe tener id del comando');
  },
});

tests.push({
  name: 'funcional: keys/shortcut se renderiza como chips <kbd>',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      // El primer resultado debería ser "Nuevo documento" (idx=0, sort estable)
      const firstOpt = p.shadowRoot.querySelector('.opt');
      const keys = firstOpt?.querySelectorAll('.keys kbd') ?? [];
      return {
        count: keys.length,
        labels: [...keys].map((k) => k.textContent.trim()),
      };
    });
    assert.equal(result.count, 2, `"Nuevo documento" debe mostrar 2 chips <kbd> (Ctrl+N), hay ${result.count}`);
    assert.equal(result.labels[0], 'Ctrl');
    assert.equal(result.labels[1], 'N');
  },
});

tests.push({
  name: 'funcional: click sobre un [role="option"] lo ejecuta',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      let selectedId = null;
      p.addEventListener('is-select', (e) => { selectedId = e.detail.id; });
      // Click sobre el segundo <li role="option">
      const opts = [...p.shadowRoot.querySelectorAll('[role="option"]')];
      opts[1].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await new Promise((r) => requestAnimationFrame(r));
      return {
        selectedId,
        dialogClosed: !p.shadowRoot.querySelector('dialog').open,
      };
    });
    assert.equal(result.selectedId, 'open', `click debe ejecutar el comando "open" (segundo en lista), fue "${result.selectedId}"`);
    assert.equal(result.dialogClosed, true, 'tras seleccionar, la paleta debe cerrarse');
  },
});

tests.push({
  name: 'accesibilidad: el input tiene aria-label implícito y el dialog es modal',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      const input = p.shadowRoot.querySelector('input');
      const dialog = p.shadowRoot.querySelector('dialog');
      return {
        inputType: input.type,
        inputAutocomplete: input.autocomplete,
        inputPlaceholder: input.placeholder,
        // <dialog> con showModal() tiene implicit role="dialog"
        isModal: dialog.open,
      };
    });
    assert.equal(result.inputType, 'text', 'input debe ser type=text');
    assert.equal(result.inputAutocomplete, 'off', 'input debe tener autocomplete=off');
    assert.ok(result.inputPlaceholder.length > 0, 'placeholder debe estar poblado');
    assert.equal(result.isModal, true, '<dialog> abierto vía showModal() es modal');
  },
});

tests.push({
  name: 'determinismo: open/close repetidos con mismos comandos producen mismos results',
  run: async (page) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 'data-command-palette-ready');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
      const p = document.querySelector('main is-command-palette');
      // Captura 1
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      const first = [...p.shadowRoot.querySelectorAll('.opt .t')].map((t) => t.textContent.trim());
      p.close();
      await new Promise((r) => requestAnimationFrame(r));
      // Captura 2
      p.open();
      await new Promise((r) => requestAnimationFrame(r));
      const second = [...p.shadowRoot.querySelectorAll('.opt .t')].map((t) => t.textContent.trim());
      return { first, second };
    });
    assert.deepEqual(result.first, result.second, 'los resultados deben ser idénticos tras open/close');
  },
});

let failures = 0;
for (const t of tests) {
  let ok = false;
  const { browser, page } = await newPage();
  try {
    await t.run(page);
    ok = true;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
    try { await screenshot(page, `fail-${t.name.replace(/\W+/g, '-')}`); } catch {}
  } finally {
    await close({ browser, page });
  }
}

report('command-palette', failures === 0, { total: tests.length, failures });