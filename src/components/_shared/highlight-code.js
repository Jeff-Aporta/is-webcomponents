/**
 * highlight-code.js — pintor de código con CodeMirror (runMode), compartido.
 *
 * Vive en `_shared/` y NO en `scripts/` a propósito: `<is-cdn-snippet>` es un
 * componente y necesita colorear los `<pre>` de su Shadow DOM. Un componente no
 * puede importar de `scripts/` (esbuild lo inlinearía en el bundle del CDN y
 * colapsaría `import.meta.url`, el bug documentado de `adoptCss`). Al vivir
 * aquí, tanto el componente como `scripts/highlight-pre.js` lo importan de
 * forma estática y comparten la MISMA instancia en el navegador.
 *
 * Qué hace:
 * - Dedenta la indentación heredada del HTML fuente.
 * - Detecta modo: data-lang | heurística (html / javascript / css).
 * - Theme reactivo al `data-theme` de `<html>`:
 *     dark  -> material-darker
 *     light -> mdn-like  (alto contraste sobre fondo blanco)
 * - Re-pinta al cambiar el tema y emite `is-codemirror-theme-changed`.
 *
 * `window.CodeMirror` es un global de terceros (script clásico de jsDelivr):
 * leerlo es correcto, no es un puente nuestro.
 */

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

/** Quita indentación común heredada del markup del preview. */
export const dedent = (text) => {
  const normalized = String(text).replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
  const lines = normalized.split('\n');
  const indents = lines
    .filter((l) => l.trim().length)
    .map((l) => {
      const m = l.match(/^[ \t]*/) || [''];
      return m[0].replace(/\t/g, '  ').length;
    });
  const min = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => {
      const expanded = l.replace(/^\t+/, (tabs) => '  '.repeat(tabs.length));
      const lead = (expanded.match(/^ */) || [''])[0].length;
      return expanded.slice(Math.min(min, lead));
    })
    .join('\n')
    .replace(/[ \t]+$/gm, '');
};

/**
 * La migración HTML→JSON dejó en algunos `<pre>` el coloreado a mano
 * (`<span class="tag">…`) como si fuera el código. CodeMirror lo vuelve a
 * tokenizar, marca cierres huérfanos como `cm-error` (fondo rojo) y aplana
 * la indentación. Si detectamos ese markup, lo desempaquetamos a texto plano.
 */
const HAND_HL_OPEN = /<span\s+class="(?:tag|attr|val|str|kw|com)">/gi;
const HAND_HL_CLOSE = /<\/span>/gi;
const HAND_HL_PROBE = /<span\s+class="(?:tag|attr|val|str|kw|com)"/i;

export const unwrapHandHighlight = (text) => {
  const raw = String(text);
  if (!HAND_HL_PROBE.test(raw)) return raw;
  return raw.replace(HAND_HL_OPEN, '').replace(HAND_HL_CLOSE, '');
};

const VOID_HTML = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;

/** Pretty-print HTML mínimo: parte en `><` e indenta abiertos/cerrados. */
export const prettyHtml = (text) => {
  const lines = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let depth = 0;
  const out = [];
  for (const line of lines) {
    const isClose = /^<\//.test(line);
    if (isClose) depth = Math.max(0, depth - 1);
    out.push(`${'  '.repeat(depth)}${line}`);
    const isOpen = /^<[^/!?][^>]*>$/.test(line)
      && !/\/>$/.test(line)
      && !VOID_HTML.test(line.slice(1));
    if (!isClose && isOpen) depth += 1;
  }
  // `<slot></slot>` vacío no merece dos líneas: el split por `><` lo separó.
  return out.join('\n').replace(
    /^(\s*)(<([a-zA-Z][\w:-]*)\b[^>]*>)\n\1(<\/\3>)/gm,
    '$1$2$4',
  );
};

/**
 * Formato ligero: si viene casi en una línea o con anidación en la misma
 * línea, inserta saltos básicos para HTML y JS sin un prettier completo.
 */
export const softFormat = (text, mode) => {
  let t = dedent(unwrapHandHighlight(text));
  const compact = t.replace(/\s+/g, ' ').trim();
  const fewLines = t.split('\n').length <= 2;
  const inlineNest = t.split('\n').some((line) => />\s*</.test(line));

  if (mode === 'htmlmixed' && t.includes('<') && (fewLines || inlineNest) && compact.length > 40) {
    t = prettyHtml(t);
  }

  if (mode === 'javascript' && fewLines && /[{;]/.test(compact) && compact.length > 60) {
    t = compact
      .replace(/;\s*/g, ';\n')
      .replace(/\{\s*/g, '{\n')
      .replace(/\s*\}/g, '\n}')
      .replace(/,\s*(?=[{\[])/g, ',\n');
    // re-indent braces
    let depth = 0;
    t = t.split('\n').map((raw) => {
      const line = raw.trim();
      if (!line) return '';
      if (line.startsWith('}') || line.startsWith(']')) depth = Math.max(0, depth - 1);
      const out = `${'  '.repeat(depth)}${line}`;
      if (/[{\[]$/.test(line)) depth += 1;
      return out;
    }).filter((l, i, arr) => l || (i > 0 && i < arr.length - 1)).join('\n');
  }

  return dedent(t);
};

const resolveMode = (el, text) => {
  const raw = (el.getAttribute('data-lang') || el.getAttribute('data-language') || '').toLowerCase();
  if (['js', 'javascript', 'ts', 'typescript'].includes(raw)) return 'javascript';
  if (raw === 'css') return 'css';
  if (['html', 'htm', 'htmlmixed', 'xml', 'svg'].includes(raw)) return 'htmlmixed';

  const t = text.trim();
  if (!t) return 'htmlmixed';
  // CSS
  if (/^(?:@|:root|[.#]?[a-z][\w-]*)\s*\{/i.test(t) || /:\s*[^;]+;/m.test(t) && !/[<(]/.test(t.slice(0, 40))) {
    if (!/\b(?:const|let|var|function|=>)\b/.test(t) && !/^</.test(t)) return 'css';
  }
  // HTML / markup
  if (/^</.test(t) || /<\/?[a-z][\w:-]*[\s>]/i.test(t.slice(0, 120))) return 'htmlmixed';
  // JS default for scripts
  if (/\b(?:const|let|var|function|=>|import|export|class)\b/.test(t) || /\.\w+\s*=/.test(t)) return 'javascript';
  return 'javascript';
};

/** Lee el tema actual del documento (mirror del is-theme-toggle). */
const resolveThemeId = () => {
  const t = (document.documentElement.dataset.theme || 'dark').toLowerCase();
  return THEMES[t] ? t : 'dark';
};

const paintOne = (el) => {
  if (typeof CodeMirror?.runMode !== 'function') return;
  if (el.classList.contains('demo-code-pop__pre') && !el.textContent.trim() && !el.dataset.forceCm) return;

  const source = el.dataset.cmSource ?? el.textContent;
  const mode = el.dataset.cmMode || resolveMode(el, source);
  const text = softFormat(source, mode);
  const themeId = resolveThemeId();
  const theme = THEMES[themeId];

  el.textContent = '';
  CodeMirror.runMode(text, mode, el);
  // Limpia cualquier clase cm-s-* que pudieramos haber puesto antes,
  // para que no se acumulen los dos themes.
  for (const t of Object.values(THEMES)) el.classList.remove(t.className);
  el.classList.add(theme.className);
  el.dataset.cm = '1';
  el.dataset.cmMode = mode;
  el.dataset.cmTheme = themeId;
  // Guarda texto limpio para copiar / re-pintar
  el.dataset.cmSource = text;
};

export const paint = (root = document) => {
  if (typeof CodeMirror?.runMode !== 'function') return;
  let targets;
  if (root instanceof Element && root.matches('pre.code')) {
    targets = root.dataset.cm ? [] : [root];
  } else {
    const scope = root instanceof Element || root instanceof DocumentFragment ? root : document;
    targets = [...scope.querySelectorAll('pre.code:not([data-cm])')];
  }
  targets.forEach(paintOne);
};

/** Re-pinta los <pre> ya pintados con el theme actual. Llamalo cuando
 *  cambia document.documentElement.dataset.theme. */
export const reapplyTheme = () => {
  if (typeof CodeMirror?.runMode !== 'function') {
    // Todavia no cargo CodeMirror: re-pintara cuando boot() termine.
    return false;
  }
  const target = resolveThemeId();
  // Asegura que el CSS del theme este cargado (lazy).
  ensureCss(THEMES[target].css);
  const all = [...document.querySelectorAll('pre.code[data-cm]')];
  all.forEach(paintOne);
  document.dispatchEvent(new CustomEvent('is-codemirror-theme-changed', { detail: { theme: target, count: all.length } }));
  return true;
};

/** ¿Está CodeMirror listo para colorear de verdad? Hacen falta las TRES
 *  cosas: el core, el addon runMode y el modo htmlmixed (los modos son
 *  scripts aparte; sin ellos runMode aplica el tema pero no tokeniza). */
export const isReady = () => typeof globalThis.CodeMirror?.runMode === 'function'
  && !!globalThis.CodeMirror?.modes?.htmlmixed;

/** Evento en `document` que anuncia que `isReady()` ya es true. Lo emite
 *  `ensureCodeMirror()`; los consumidores que no cargan CodeMirror por su
 *  cuenta (p. ej. `<is-cdn-snippet>`) solo tienen que escucharlo. */
export const CODEMIRROR_READY = 'is-codemirror-ready';

let cmPromise = null;

/** Carga CodeMirror + runMode + modos + CSS de ambos themes. Idempotente. */
export const ensureCodeMirror = () => {
  cmPromise ??= (async () => {
    // Cargamos el CSS del theme actual Y el del opuesto para que el switch
    // sea instantaneo cuando el usuario cambie el theme (solo ~1KB cada uno).
    const initial = resolveThemeId();
    ensureCss(`${CDN}/lib/codemirror.min.css`);
    ensureCss(THEMES[initial].css);
    ensureCss(THEMES[initial === 'dark' ? 'light' : 'dark'].css);

    if (!globalThis.CodeMirror) await loadScript(`${CDN}/lib/codemirror.min.js`);
    if (typeof CodeMirror.runMode !== 'function') {
      await loadScript(`${CDN}/addon/runmode/runmode.min.js`);
    }
    if (!CodeMirror.modes?.xml) await loadScript(`${CDN}/mode/xml/xml.min.js`);
    if (!CodeMirror.modes?.javascript) await loadScript(`${CDN}/mode/javascript/javascript.min.js`);
    if (!CodeMirror.modes?.css) await loadScript(`${CDN}/mode/css/css.min.js`);
    if (!CodeMirror.modes?.htmlmixed) await loadScript(`${CDN}/mode/htmlmixed/htmlmixed.min.js`);

    document.dispatchEvent(new CustomEvent(CODEMIRROR_READY));
  })();
  return cmPromise;
};

let watching = false;

/** Engancha el re-pintado automático al cambio de tema. Idempotente. */
export const watchTheme = () => {
  if (watching) return;
  watching = true;

  // Escucha cambios de data-theme en <html>. El <is-theme-toggle> emite
  // 'is-theme-change' en document; ademas cubrimos el caso de quien
  // cambie data-theme directamente (backcompat / tests).
  const onThemeChange = () => reapplyTheme();
  document.addEventListener('is-theme-change', onThemeChange);

  // Algunas implementaciones (preview-chrome.js) reescriben
  // documentElement.dataset.* directamente. Usa MutationObserver para
  // cubrir ese caso sin obligar al consumidor a emitir el evento.
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        onThemeChange();
        break;
      }
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
};
