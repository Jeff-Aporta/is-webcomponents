// 01-is-code.test.ts: ataque en profundidad al docs de <is-code> tras la
// migracion a motor nativo (sin CodeMirror). Verifica en el navegador real:
//   - cero rastro de CodeMirror (nodos, global, recursos, tags)
//   - read-only/editable/inline pintan con el motor nativo (.ic-* / .tok-*)
//   - escribir en el editor editable emite is-input/is-change/is-cursor y
//     repinta (valor, lineas, linea activa)
//   - las marks se pintan nativas y el tooltip se abre por caret
//   - el tema reacciona a data-theme/is-theme-change sin recargar nada de CM
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@browserbasehq/stagehand';
import {
  arrancar,
  abrirGaleria,
  esperarMs,
  rastroCodeMirror,
  problemasDeConsola,
  faltanRequisitos,
  evidencia,
} from './lib/harness.ts';
import type { CtxE2E, EditorIsCode, ContadoresEventos, FasesMarks, RastroCodeMirror } from './lib/tipos.d.ts';
import { cargarToon, textoDe } from '../../system/toons.js';

// Textos de test SIEMPRE desde los toons (src/utils/system/toons/*.json).
const TOON_CODE = cargarToon('is-code');
const TEXTO_ESCRITURA = textoDe(TOON_CODE, 'escribirEnEditor') || '// e2e nativo';
const TITULO_TOOLTIP = textoDe(TOON_CODE, 'tooltipMarks') || 'add(a, b)';

const DISPONIBLE = faltanRequisitos().length === 0;
let ctx: CtxE2E | null = null;

before(async () => {
  if (!DISPONIBLE) return;
  ctx = await arrancar({ etiqueta: '01-is-code' });
});

after(async () => {
  if (ctx) await ctx.cerrar();
});

function pagina(): Page {
  assert.ok(ctx, 'contexto no disponible');
  return ctx.page;
}

interface EstadoPintado {
  total: number;
  conShadow: number;
  pintados: number;
  readonly: number;
  editables: number;
  inline: number;
  tokens: number;
}

interface EstadoEscrituraAntes {
  value: string;
  lineas: number;
  gutter: number;
}

interface EstadoEscrituraDespues {
  evs: ContadoresEventos;
  valueOk: boolean;
  lineas: number;
  gutter: number;
  activa: number;
}

test('sin CodeMirror: sin nodos .CodeMirror, sin global y sin recursos cm-*', { timeout: 240000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-code', { ms: 6000 });
  const r = await rastroCodeMirror(page);
  assert.equal(r.nodos, 0, 'no debe haber nodos .CodeMirror ni clases cm-s-*');
  assert.equal(r.global, 'undefined', 'no debe existir el global CodeMirror');
  assert.deepEqual(r.recursos, [], `no deben cargarse recursos de codemirror (${r.recursos.join(',')})`);
  assert.deepEqual(r.tags, [], `no deben existir tags link/script a codemirror (${r.tags.join(',')})`);
  await evidencia(page, '01a-sin-codemirror');
});

test('read-only e inline pintan con el motor nativo (nada vacio)', { timeout: 180000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-code', { ms: 6000 });
  const r = (await page.evaluate(() => {
    const hosts = [...document.querySelectorAll<EditorIsCode>('#previewHost is-code')];
    const conShadow = hosts.filter((h) => h.shadowRoot);
    const pintados = conShadow.filter((h) => {
      const sr = h.shadowRoot;
      const nativo = sr.querySelector('.ic-native');
      const lineas = nativo ? [...nativo.querySelectorAll('.ic-line')] : [];
      return lineas.length > 0 && lineas.some((l) => (l.textContent ?? '').trim().length > 0);
    });
    const readonly = conShadow.filter((h) => h.hasAttribute('readonly') || h.readonly);
    const editables = conShadow.filter((h) => h.shadowRoot.querySelector('textarea.ic-input'));
    const inline = conShadow.filter((h) => h.mode === 'inline' || h.hasAttribute('data-inline'));
    const tokens = conShadow.reduce((n, h) => n + h.shadowRoot.querySelectorAll('.ic-line [class*="tok-"]').length, 0);
    return {
      total: hosts.length,
      conShadow: conShadow.length,
      pintados: pintados.length,
      readonly: readonly.length,
      editables: editables.length,
      inline: inline.length,
      tokens,
    };
  })) as EstadoPintado;
  assert.ok(r.total > 0, 'el docs debe tener is-code');
  assert.ok(r.pintados > 0, 'debe haber is-code readonly pintados con .ic-line no vacias');
  assert.ok(r.readonly > 0, 'debe haber vistas readonly');
  assert.ok(r.editables > 0, 'debe haber editores nativos (textarea.ic-input)');
  assert.ok(r.tokens > 0, 'el resaltado debe emitir tokens .tok-*');
  t.diagnostic(`is-code: ${r.total} total, ${r.pintados} pintados, ${r.readonly} readonly, ${r.editables} editable, ${r.inline} inline, ${r.tokens} tokens`);
  await evidencia(page, '01b-nativo-pintado');
});

test('escribir en el editor editable emite is-input/is-change/is-cursor y repinta', { timeout: 180000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-code', { ms: 6000 });
  const antes = (await page.evaluate(() => {
    const h = [...document.querySelectorAll<EditorIsCode>('#previewHost is-code')].find((c) => (
      c.shadowRoot?.querySelector('textarea.ic-input')
    ));
    if (!h) return null;
    window.__edE2E = h;
    window.__evs = { input: 0, change: 0, cursor: 0 };
    h.addEventListener('is-input', () => { if (window.__evs) window.__evs.input++; });
    h.addEventListener('is-change', () => { if (window.__evs) window.__evs.change++; });
    h.addEventListener('is-cursor', () => { if (window.__evs) window.__evs.cursor++; });
    const ta = h.shadowRoot.querySelector<HTMLTextAreaElement>('textarea.ic-input');
    const antes = {
      value: ta ? ta.value : '',
      lineas: h.shadowRoot.querySelectorAll('.ic-line').length,
      gutter: h.shadowRoot.querySelectorAll('.ic-ln').length,
    };
    ta?.scrollIntoView({ block: 'center' });
    return antes;
  })) as EstadoEscrituraAntes | null;
  assert.ok(antes, 'debe existir un editor editable en el docs');
  await esperarMs(600);
  // El textarea vive en el shadow de <is-code> y el proxy de Stagehand no
  // expone page.keyboard: se inserta en el caret con setRangeText y se
  // dispara el evento `input` real (el mismo camino que pisa el teclado:
  // el handler nativo lee ta.value y repinta/emite).
  await page.evaluate((texto: string) => {
    const h = window.__edE2E;
    const ta = h?.shadowRoot.querySelector<HTMLTextAreaElement>('textarea.ic-input');
    if (!h || !ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.setRangeText(texto, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, TEXTO_ESCRITURA);
  await esperarMs(700);
  const despues = (await page.evaluate((texto: string) => {
    const h = window.__edE2E;
    if (!h) return null;
    const ta = h.shadowRoot.querySelector<HTMLTextAreaElement>('textarea.ic-input');
    return {
      evs: window.__evs ?? { input: 0, change: 0, cursor: 0 },
      valueOk: !!ta && ta.value.includes(texto),
      lineas: h.shadowRoot.querySelectorAll('.ic-line').length,
      gutter: h.shadowRoot.querySelectorAll('.ic-ln').length,
      activa: h.shadowRoot.querySelectorAll('.ic-line--active').length,
    };
  }, TEXTO_ESCRITURA)) as EstadoEscrituraDespues | null;
  assert.ok(despues, 'el editor debe seguir presente tras escribir');
  assert.ok(despues.valueOk, 'el valor del editor debe contener lo tecleado');
  assert.ok(despues.evs.input >= 1 && despues.evs.change >= 1, `is-input/is-change disparados (${JSON.stringify(despues.evs)})`);
  assert.ok(despues.evs.cursor >= 1, 'is-cursor debe dispararse');
  assert.ok(despues.lineas >= antes!.lineas, `repintado: lineas ${antes!.lineas} â†’ ${despues.lineas}`);
  assert.ok(despues.activa >= 0, 'linea activa presente');
  t.diagnostic(`editor: ${JSON.stringify(despues.evs)} eventos; ${despues.lineas} lineas; gutter ${despues.gutter}`);
  await evidencia(page, '01c-editor-escritura');
});

interface EstadoMarks {
  n: number;
  value: string;
}

interface EstadoTip {
  open: boolean;
  texto: string;
  phases: FasesMarks;
}

test('marks nativas: spans con data-mark-id y tooltip por caret', { timeout: 180000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-code', { ms: 6000 });
  const spans = (await page.evaluate(() => {
    const h = [...document.querySelectorAll<EditorIsCode>('#previewHost is-code')].find((c) => (
      c.shadowRoot?.querySelector('.ic-input') && c.shadowRoot.querySelector('span[data-mark-id]')
    ));
    if (!h) return { n: 0, value: '' };
    (h as HTMLElement).scrollIntoView({ block: 'center' });
    window.__edMarks = h;
    const n = h.shadowRoot.querySelectorAll('span[data-mark-id]').length;
    return { n, value: h.value.slice(0, 60) };
  })) as EstadoMarks;
  assert.ok(spans.n >= 3, `el demo de marks debe pintar spans nativos (${spans.n})`);
  await esperarMs(600);
  const abierto = await page.evaluate(() => {
    const h = window.__edMarks;
    const ta = h?.shadowRoot.querySelector<HTMLTextAreaElement>('textarea.ic-input');
    if (!h || !ta) return false;
    const phases: FasesMarks = [];
    h.addEventListener('is-mark-activate', (e) => phases.push(`${String((e as CustomEvent<{ phase?: string; mark?: { id?: string } }>).detail?.phase)}:${String((e as CustomEvent<{ mark?: { id?: string } }>).detail?.mark?.id ?? '')}`));
    window.__phases = phases;
    const idx = h.value.indexOf('add') + 1;
    ta.focus();
    ta.setSelectionRange(idx, idx);
    ta.dispatchEvent(new Event('click', { bubbles: true }));
    ta.dispatchEvent(new Event('keyup', { bubbles: true }));
    return true;
  });
  assert.ok(abierto, 'debe poder situarse el caret en la mark');
  await esperarMs(600);
  const tip = (await page.evaluate(() => {
    const h = window.__edMarks;
    if (!h) return null;
    const sr = h.shadowRoot;
    const t = sr.querySelector<HTMLElement & { open?: boolean }>('is-tooltip');
    return {
      open: t?.open ?? false,
      texto: ((t?.textContent ?? '').trim()).slice(0, 50),
      phases: window.__phases ?? [],
    };
  })) as EstadoTip | null;
  assert.ok(tip, 'tooltip presente');
  assert.ok(tip.open, 'el tooltip debe abrirse con el caret dentro de la mark');
  assert.ok(tip.texto.startsWith(TITULO_TOOLTIP), `el tooltip muestra el texto del toon "${TITULO_TOOLTIP}" (${tip.texto})`);
  assert.ok(tip.phases.includes('enter:tip-add'), `is-mark-activate enter:tip-add (${tip.phases.join(',')})`);
  await evidencia(page, '01d-marks-tooltip');
});

test('tema reactivo: data-theme + is-theme-change repinta sin CodeMirror', { timeout: 180000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const page = pagina();
  await abrirGaleria(page, 'is-code', { ms: 5000 });
  const base = await page.evaluate(() => {
    const h = document.querySelector('#previewHost is-code');
    return h ? getComputedStyle(h).getPropertyValue('--is-code-bg').trim() : '';
  });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
    document.dispatchEvent(new CustomEvent('is-theme-change', { detail: { theme: 'light' } }));
  });
  await esperarMs(1500);
  const luz = await page.evaluate(() => {
    const h = document.querySelector('#previewHost is-code');
    return h ? getComputedStyle(h).getPropertyValue('--is-code-bg').trim() : '';
  });
  assert.ok(base && luz, 'debe existir --is-code-bg en el host');
  assert.notEqual(base, luz, `el tema debe repintar el fondo (${base} â†’ ${luz})`);
  const rastro: RastroCodeMirror = await rastroCodeMirror(page);
  assert.equal(rastro.total, 0, 'el cambio de tema no debe cargar nada de CodeMirror');
  await evidencia(page, '01e-tema-reactivo');
});

test('sin errores de consola en la profundidad de is-code', { timeout: 30000 }, async (t) => {
  if (!DISPONIBLE) return t.skip('faltan variables E2E');
  const problemas = problemasDeConsola(ctx!.consola);
  const unicos = [...new Set(problemas.map((p) => p.texto))];
  if (unicos.length) {
    t.diagnostic(`consola con avisos (ver 03-problemas): ${unicos.join(' | ')}`);
  }
});
