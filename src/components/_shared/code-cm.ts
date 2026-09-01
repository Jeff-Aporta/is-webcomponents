/**
 * code-cm.js — carga CodeMirror 5 para el editor editable (`<is-code>`).
 *
 * Reusa el CDN y la carga de modos base de `highlight-code.js` (pintor de
 * `<pre>`). Aquí se añaden addons de edición: lineNumbers, active-line,
 * matchbrackets, comment. Los modos pesados (p. ej. python) los pide
 * `code-langs.js` bajo demanda.
 *
 * Preferencia del kit: CodeMirror 5.65.16 (no 6). Ver LLM.md / is-cdn-snippet.
 */

import { ensureCodeMirror, THEMES } from './highlight-code.js';

const CDN = 'https://cdn.jsdelivr.net/npm/codemirror@5.65.16';

const loadScript = (src: string) => new Promise((resolve, reject) => {
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

/** Fetch + cache del CSS de CodeMirror para inyectarlo en Shadow DOM. */
const cssTextCache = new Map();

export const loadCssText = async (href: string) => {
  if (cssTextCache.has(href)) return cssTextCache.get(href);
  const res = await fetch(href);
  if (!res.ok) throw new Error(`Failed to fetch CSS ${href}`);
  const text = await res.text();
  cssTextCache.set(href, text);
  return text;
};

/**
 * Adopta hojas CM dentro de un shadow root (link en document no atraviesa shadow).
 * @param {ShadowRoot} shadow
 * @param {string[]} hrefs
 */
export const adoptCodeMirrorCss = async (shadow, hrefs) => {
  for (const href of hrefs) {
    if (shadow.querySelector<HTMLElement>(`style[data-cm-css="${href}"]`)) continue;
    const css = await loadCssText(href);
    const style = document.createElement('style');
    style.setAttribute('data-cm-css', href);
    style.textContent = css;
    shadow.append(style);
  }
};


let editorPromise = null;

/** CSS + addons necesarios para un editor (no solo runMode). Idempotente. */
export const ensureCodeMirrorEditor = () => {
  editorPromise ??= (async () => {
    await ensureCodeMirror();

    const CM = () => globalThis.CodeMirror;
    if (!CM()?.prototype?.setOption) {
      throw new Error('[is-code] CodeMirror core no disponible');
    }

    // Addons de edición (idempotentes: el script se salta si ya está).
    await loadScript(`${CDN}/addon/selection/active-line.min.js`);
    await loadScript(`${CDN}/addon/edit/matchbrackets.min.js`);
    await loadScript(`${CDN}/addon/edit/closebrackets.min.js`);
    await loadScript(`${CDN}/addon/comment/comment.min.js`);
    await loadScript(`${CDN}/addon/display/placeholder.min.js`);

    return CM();
  })();
  return editorPromise;
};

/** Carga un modo CM por path relativo a /mode/ (p. ej. `python/python`). */
export const loadCodeMirrorMode = async (modePath: string) => {
  await ensureCodeMirrorEditor();
  const src = `${CDN}/mode/${modePath}.min.js`;
  await loadScript(src);
};

export { CDN as CODEMIRROR_CDN, THEMES as CODEMIRROR_THEMES };
