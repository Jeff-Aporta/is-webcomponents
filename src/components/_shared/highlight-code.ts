/**
 * highlight-code.js — monta `<is-code readonly compact>` sobre los
 * `<pre class="code">` de la documentación (antes se coloreaban con
 * CodeMirror.runMode; hoy el resaltado lo hace el motor nativo del propio
 * `<is-code>`).
 *
 * Vive en `_shared/` (no en `scripts/`): `<is-cdn-snippet>` y el docs lo
 * importan. No carga CodeMirror ni ningún CDN.
 *
 * API pública estable:
 * - softFormat / dedent / prettyHtml / unwrapHandHighlight
 * - paint / repaint / watchDom
 *
 * No importa `code.js` en estático (ciclo con el bootstrap de <is-code>). Se
 * carga bajo demanda en `paint`.
 */

import { dedent, unwrapHandHighlight, prettyHtml, softFormat, softFormatMode } from './code-text.js';
import { inferLanguage } from './code-langs.js';

export { dedent, unwrapHandHighlight, prettyHtml, softFormat, softFormatMode };

/** data-lang / heurística → mode legacy (softFormat) + lang del editor. */
export const resolveMode = (el: HTMLElement, text: string): string => {
  const raw = ((el.getAttribute?.('data-lang') || el.getAttribute?.('data-language') || el.dataset?.lang) ?? '').toLowerCase();
  if (['js', 'javascript'].includes(raw)) return 'javascript';
  if (['ts', 'typescript'].includes(raw)) return 'typescript';
  if (['jsx', 'tsx'].includes(raw)) return raw;
  if (raw === 'css') return 'css';
  if (['html', 'htm', 'htmlmixed', 'xml', 'svg'].includes(raw)) return 'htmlmixed';
  if (['py', 'python'].includes(raw)) return 'python';
  if (raw === 'json') return 'json';
  if (['diff', 'patch'].includes(raw)) return 'diff';
  return softFormatMode(inferLanguage(text));
};

/** Mode legacy → lang de `<is-code>`. */
export const modeToLang = (mode: string | null | undefined): string => {
  const m = String(mode || '').toLowerCase();
  if (m === 'htmlmixed' || m === 'htm' || m === 'xml' || m === 'svg') return 'html';
  if (m === 'js') return 'javascript';
  if (m === 'ts') return 'typescript';
  if (m === 'py') return 'python';
  return m || 'javascript';
};

const isMountedEditor = (el: Element): boolean => el instanceof HTMLElement
  && el.localName === 'is-code'
  && el.dataset.cm === '1';

let editorImport: Promise<unknown> | null = null;
const ensureEditorDefined = (): Promise<unknown> => {
  if (customElements.get('is-code')) return Promise.resolve();
  editorImport ??= import('../code/code.js');
  return editorImport;
};

/** Editor `<is-code>` ya montado (con atributos de configuración). */
type CodeEditor = HTMLElement & {
  value: string;
  lang: string;
  refresh?: () => void;
};

/**
 * Crea o actualiza un `<is-code readonly compact>` a partir de un
 * `<pre class="code">` o de un editor ya montado.
 */
const paintOne = async (el: HTMLElement): Promise<void> => {
  if (!(el instanceof HTMLElement)) return;
  if (el.classList.contains('demo-code-pop__pre')
    && !(el.localName === 'is-code' ? (el as CodeEditor).value : el.textContent ?? '').trim()
    && !el.dataset.forceCm) return;

  await ensureEditorDefined();

  const source = el.dataset.cmSource
    || el.dataset.src
    || (isMountedEditor(el) ? (el as CodeEditor).value : el.textContent)
    || '';
  if (!source.trim() && el.classList.contains('demo-code-pop__pre')) return;

  const mode = el.dataset.cmMode || resolveMode(el, source);
  const text = softFormat(source, mode === 'typescript' ? 'javascript' : mode);
  if (!text.trim() && (el.dataset.src || el.dataset.cmSource)) return;
  const lang = modeToLang(mode);

  if (isMountedEditor(el) || el.localName === 'is-code') {
    const ed = el as CodeEditor;
    ed.toggleAttribute('readonly', true);
    // Opt-out: `data-no-compact` permite al consumidor mantener el scroll vertical
    // cuando el contenedor tiene max-height. Por defecto `compact` desactiva el
    // scroll vertical en .ic-scroll (es para snippets inline de docs).
    const noCompact = el.hasAttribute('data-no-compact');
    ed.toggleAttribute('compact', !noCompact);
    if (!ed.hasAttribute('wrap')) ed.setAttribute('wrap', '');
    if (!ed.hasAttribute('line-numbers')) ed.setAttribute('line-numbers', 'false');
    ed.lang = lang;
    // Siempre asignar: el getter de is-code puede devolver el seed aunque la
    // vista aún no esté montada.
    ed.value = text;
    ed.dataset.cm = '1';
    ed.dataset.cmSource = text;
    ed.dataset.cmMode = mode;
    ed.refresh?.();
    return;
  }

  if (el.localName !== 'pre' && !el.classList.contains('code')) return;

  const ed = document.createElement('is-code') as unknown as CodeEditor;
  ed.className = `${el.className} is-code-view`.replace(/\s+/g, ' ').trim();
  ed.setAttribute('readonly', '');
  // Opt-out: `data-no-compact` permite al consumidor mantener el scroll vertical
  // cuando el contenedor tiene max-height. Por defecto `compact` desactiva el
  // scroll vertical en .ic-scroll (es para snippets inline de docs).
  if (!el.hasAttribute('data-no-compact')) ed.setAttribute('compact', '');
  ed.setAttribute('wrap', '');
  ed.setAttribute('line-numbers', 'false');
  ed.setAttribute('lang', lang);
  ed.setAttribute('value', text);
  ed.dataset.cm = '1';
  ed.dataset.cmSource = text;
  ed.dataset.cmMode = mode;
  if (el.id) ed.id = el.id;
  if (el.dataset.codeId) ed.dataset.codeId = el.dataset.codeId;
  if (el.hasAttribute('data-no-copy')) ed.setAttribute('data-no-copy', '');

  el.replaceWith(ed);
};

/**
 * Monta editores readonly sobre `pre.code` pendientes (o actualiza uno).
 */
export const paint = (root: ParentNode | Element = document): Promise<unknown[]> => {
  let targets: HTMLElement[];
  if (root instanceof Element && (root.matches?.('pre.code') || root.localName === 'is-code')) {
    targets = [root as HTMLElement];
  } else {
    const scope: ParentNode = root instanceof Element || root instanceof DocumentFragment || root instanceof ShadowRoot
      ? root
      : document;
    const list = [
      ...scope.querySelectorAll<HTMLElement>('pre.code:not([data-cm])'),
      ...scope.querySelectorAll<HTMLElement>('is-code.code:not([data-cm]), is-code.is-code-view:not([data-cm])'),
    ];
    targets = [...new Set(list)];
  }
  return Promise.all(targets.map((el) => paintOne(el).catch(console.error)));
};

/** Fuerza re-montar / actualizar contenido. */
export const repaint = (el: HTMLElement | null | undefined): Promise<void> => {
  if (!(el instanceof Element)) return Promise.resolve();
  delete el.dataset.cm;
  if (el.localName === 'is-code') {
    return paintOne(el as HTMLElement);
  }
  delete el.dataset.cmSource;
  delete el.dataset.cmMode;
  return paintOne(el as HTMLElement);
};

let observer: MutationObserver | null = null;
let pendientes: Set<HTMLElement> | null = null;
let pintando = false;

const procesarPendientes = (): void => {
  const lote = pendientes;
  pendientes = null;
  if (!lote?.size) return;
  const pintar = (): void => {
    pintando = true;
    try {
      for (const el of lote) {
        if (!el.isConnected) continue;
        if (el.localName === 'is-code') {
          const ed = el as CodeEditor;
          if (ed.dataset.cmSource !== undefined && ed.value !== ed.dataset.cmSource) {
            repaint(el);
          }
          continue;
        }
        if (!el.dataset.cm) paintOne(el);
      }
    } finally {
      pintando = false;
    }
  };
  // Sin puertas ni CDN: <is-code> pinta con su motor nativo (read-only y
  // editable) y se re-pinta solo cuando su fuente cambia.
  pintar();
};

const encolar = (el: HTMLElement): void => {
  pendientes ??= new Set();
  if (!pendientes.size) queueMicrotask(procesarPendientes);
  pendientes.add(el);
};

export const watchDom = (root: Element | Document = document.documentElement): void => {
  if (observer || typeof MutationObserver !== 'function') return;

  observer = new MutationObserver((muts) => {
    if (pintando) return;
    for (const m of muts) {
      if (m.type !== 'childList') continue;
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('pre.code') || node.localName === 'is-code') encolar(node as HTMLElement);
        const nested = node.querySelectorAll?.('pre.code, is-code.code, is-code.is-code-view') ?? [];
        for (const pre of Array.from(nested)) encolar(pre as HTMLElement);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
};

