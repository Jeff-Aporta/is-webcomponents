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
export const resolveMode = (el, text) => {
  const raw = (el.getAttribute?.('data-lang') || el.getAttribute?.('data-language') || el.dataset?.lang || '').toLowerCase();
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
export const modeToLang = (mode) => {
  const m = String(mode || '').toLowerCase();
  if (m === 'htmlmixed' || m === 'htm' || m === 'xml' || m === 'svg') return 'html';
  if (m === 'js') return 'javascript';
  if (m === 'ts') return 'typescript';
  if (m === 'py') return 'python';
  return m || 'javascript';
};

const isMountedEditor = (el) => el instanceof HTMLElement
  && el.localName === 'is-code'
  && el.dataset.cm === '1';

let editorImport = null;
const ensureEditorDefined = () => {
  if (customElements.get('is-code')) return Promise.resolve();
  editorImport ??= import('../code/code.js');
  return editorImport;
};

/**
 * Crea o actualiza un `<is-code readonly compact>` a partir de un
 * `<pre class="code">` o de un editor ya montado.
 * @param {HTMLElement} el
 */
const paintOne = async (el) => {
  if (!(el instanceof HTMLElement)) return;
  if (el.classList.contains('demo-code-pop__pre')
    && !(el.localName === 'is-code' ? el.value : el.textContent).trim()
    && !el.dataset.forceCm) return;

  await ensureEditorDefined();

  const source = el.dataset.cmSource
    || el.dataset.src
    || (isMountedEditor(el) ? el.value : el.textContent)
    || '';
  if (!source.trim() && el.classList.contains('demo-code-pop__pre')) return;

  const mode = el.dataset.cmMode || resolveMode(el, source);
  const text = softFormat(source, mode === 'typescript' ? 'javascript' : mode);
  if (!text.trim() && (el.dataset.src || el.dataset.cmSource)) return;
  const lang = modeToLang(mode);

  if (isMountedEditor(el) || el.localName === 'is-code') {
    el.toggleAttribute('readonly', true);
    el.toggleAttribute('compact', true);
    if (!el.hasAttribute('wrap')) el.setAttribute('wrap', '');
    if (!el.hasAttribute('line-numbers')) el.setAttribute('line-numbers', 'false');
    el.lang = lang;
    // Siempre asignar: el getter de is-code puede devolver el seed aunque la
    // vista aún no esté montada.
    el.value = text;
    el.dataset.cm = '1';
    el.dataset.cmSource = text;
    el.dataset.cmMode = mode;
    el.refresh?.();
    return;
  }

  if (el.localName !== 'pre' && !el.classList.contains('code')) return;

  const ed = document.createElement('is-code');
  ed.className = `${el.className} is-code-view`.replace(/\s+/g, ' ').trim();
  ed.setAttribute('readonly', '');
  ed.setAttribute('compact', '');
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
 * @param {ParentNode | Element} [root]
 */
export const paint = (root = document) => {
  let targets;
  if (root instanceof Element && (root.matches?.('pre.code') || root.localName === 'is-code')) {
    targets = [root];
  } else {
    const scope = root instanceof Element || root instanceof DocumentFragment || root instanceof ShadowRoot
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
export const repaint = (el) => {
  if (!(el instanceof Element)) return Promise.resolve();
  delete el.dataset.cm;
  if (el.localName === 'is-code') {
    return paintOne(el);
  }
  delete el.dataset.cmSource;
  delete el.dataset.cmMode;
  return paintOne(el);
};

let observer = null;
let pendientes = null;
let pintando = false;

const procesarPendientes = () => {
  const lote = pendientes;
  pendientes = null;
  if (!lote?.size) return;
  const pintar = () => {
    pintando = true;
    try {
      for (const el of lote) {
        if (!el.isConnected) continue;
        if (el.localName === 'is-code') {
          if (el.dataset.cmSource !== undefined && el.value !== el.dataset.cmSource) {
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

const encolar = (el) => {
  pendientes ??= new Set();
  if (!pendientes.size) queueMicrotask(procesarPendientes);
  pendientes.add(el);
};

export const watchDom = (root = document.documentElement) => {
  if (observer || typeof MutationObserver !== 'function') return;

  observer = new MutationObserver((muts) => {
    if (pintando) return;
    for (const m of muts) {
      if (m.type !== 'childList') continue;
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('pre.code') || node.localName === 'is-code') encolar(node);
        for (const pre of node.querySelectorAll?.('pre.code, is-code.code, is-code.is-code-view') ?? []) {
          encolar(pre);
        }
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
};

