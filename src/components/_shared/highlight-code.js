/**
 * highlight-code.js — monta `<is-code readonly compact>` donde antes
 * se coloreaba con CodeMirror.runMode sobre `<pre class="code">`.
 *
 * Vive en `_shared/` (no en `scripts/`): `<is-cdn-snippet>` y el docs lo
 * importan. El motor CM5 sigue cargándose vía `ensureCodeMirror` porque
 * `<is-code>` lo necesita; el pintor de docs YA NO usa runMode.
 *
 * API pública estable:
 * - softFormat / dedent / prettyHtml / unwrapHandHighlight
 * - paint / repaint / watchDom / reapplyTheme / ensureCodeMirror / isReady
 * - THEMES / CODEMIRROR_READY (compat; el theme lo aplica el editor)
 *
 * No importa `code.js` en estático (ciclo con code-cm). Se carga
 * bajo demanda en `paint`.
 */

import { dedent, unwrapHandHighlight, prettyHtml, softFormat, softFormatMode } from './code-text.js';
import { inferLanguage } from './code-langs.js';

export { dedent, unwrapHandHighlight, prettyHtml, softFormat, softFormatMode };

const CDN = 'https://cdn.jsdelivr.net/npm/codemirror@5.65.16';

export const THEMES = {
  dark: { id: 'material-darker', css: `${CDN}/theme/material-darker.min.css`, className: 'cm-s-material-darker' },
  light: { id: 'mdn-like', css: `${CDN}/theme/mdn-like.min.css`, className: 'cm-s-mdn-like' },
};

const ensureCss = (href) => {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === href || l.getAttribute('href') === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

const loadScript = (src) => new Promise((resolve, reject) => {
  if ([...document.scripts].some((s) => s.src === src || s.getAttribute('src') === src)) {
    resolve();
    return;
  }
  const el = document.createElement('script');
  el.src = src;
  el.onload = () => resolve();
  el.onerror = () => reject(new Error(`Failed to load ${src}`));
  document.head.appendChild(el);
});

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

const resolveThemeId = () => {
  const t = (document.documentElement.dataset.theme || 'dark').toLowerCase();
  return THEMES[t] ? t : 'dark';
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
    // Siempre asignar: el getter de is-code puede devolver el seed aunque CM esté vacío.
    el.value = text;
    el.dataset.cm = '1';
    el.dataset.cmSource = text;
    el.dataset.cmMode = mode;
    el.dataset.cmTheme = resolveThemeId();
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
  ed.dataset.cmTheme = resolveThemeId();
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
      ...scope.querySelectorAll('pre.code:not([data-cm])'),
      ...scope.querySelectorAll('is-code.code:not([data-cm]), is-code.is-code-view:not([data-cm])'),
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
  if (isReady()) pintar();
  else ensureCodeMirror().then(pintar).catch(console.error);
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

/** Compat: el theme lo aplica cada `<is-code>` vía data-theme. */
export const reapplyTheme = () => {
  const target = resolveThemeId();
  const all = [
    ...document.querySelectorAll('is-code[data-cm]'),
    ...document.querySelectorAll('pre.code[data-cm]'),
  ];
  all.forEach((el) => {
    if (el.localName === 'is-code') {
      el.dataset.cmTheme = target;
      el.refresh?.();
    } else {
      paintOne(el);
    }
  });
  document.dispatchEvent(new CustomEvent('is-codemirror-theme-changed', {
    detail: { theme: target, count: all.length },
  }));
  return true;
};

export const isReady = () => typeof globalThis.CodeMirror?.runMode === 'function'
  && !!globalThis.CodeMirror?.modes?.htmlmixed;

export const CODEMIRROR_READY = 'is-codemirror-ready';

let cmPromise = null;

/** Sigue cargando CM5: lo necesita `<is-code>` / code-cm. */
export const ensureCodeMirror = () => {
  cmPromise ??= (async () => {
    const initial = resolveThemeId();
    ensureCss(`${CDN}/lib/codemirror.min.css`);
    ensureCss(THEMES[initial].css);
    ensureCss(THEMES[initial === 'dark' ? 'light' : 'dark'].css);

    if (!globalThis.CodeMirror) await loadScript(`${CDN}/lib/codemirror.min.js`);
    const CM = () => globalThis.CodeMirror;
    if (typeof CM()?.runMode !== 'function') {
      await loadScript(`${CDN}/addon/runmode/runmode.min.js`);
    }
    if (!CM()?.modes?.xml) await loadScript(`${CDN}/mode/xml/xml.min.js`);
    if (!CM()?.modes?.javascript) await loadScript(`${CDN}/mode/javascript/javascript.min.js`);
    if (!CM()?.modes?.css) await loadScript(`${CDN}/mode/css/css.min.js`);
    if (!CM()?.modes?.htmlmixed) await loadScript(`${CDN}/mode/htmlmixed/htmlmixed.min.js`);

    document.dispatchEvent(new CustomEvent(CODEMIRROR_READY));
  })();
  return cmPromise;
};

let watching = false;

export const watchTheme = () => {
  if (watching) return;
  watching = true;
  const onThemeChange = () => reapplyTheme();
  document.addEventListener('is-theme-change', onThemeChange);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        onThemeChange();
        break;
      }
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
};
