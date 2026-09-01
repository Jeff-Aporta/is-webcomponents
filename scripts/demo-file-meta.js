/**
 * demo-file-meta.js — barra única tras el título del preview:
 * botones de fuente (JS · CSS · MD) + pesos de los `.min.js` / `.min.css` CDN.
 *
 * Una sola instancia (`.file-meta-page`). No se repite en cada paper/`is-demo`
 * ni bajo cada `h2` de sección.
 */
import '../src/components/media/icon.js';
import '../src/components/actions/button.js';
import '../src/components/helpers/format-bytes.js';
import components from '../src/manifest.js';
import { resolveCdnMinPaths, resolveSourceFiles } from './component-sources.js';
import { openViewSources } from './view-sources.js';

/** @type {string | null} */
let currentTag = null;

function entryFor(tag) {
  return components.find((c) => c.tag === tag) || null;
}

const makePathCode = (path) => {
  const el = document.createElement('code');
  el.className = 'file-meta__path';
  el.textContent = path;
  el.title = path;
  return el;
};

/** Preserva / reajusta el scroll de `is-main` al insertar chrome arriba. */
const preserveMainScroll = (host, mutate) => {
  const top = host.scrollTop;
  const height = host.scrollHeight;
  mutate();
  const delta = host.scrollHeight - height;
  // Contenido insertado arriba: sumar delta para no saltar de lectura.
  if (top > 0 && delta !== 0) host.scrollTop = top + delta;
  else host.scrollTop = top;
  // F5: reaplicar memoria por si CM/docs movieron el scroll durante el paint.
  if (typeof host.restoreScroll === 'function') {
    requestAnimationFrame(() => {
      host.restoreScroll?.();
      requestAnimationFrame(() => host.restoreScroll?.());
    });
  }
};

/**
 * @param {number|null} bytes
 */
const makeBytes = (bytes) => {
  const el = document.createElement('is-format-bytes');
  el.className = 'file-meta__bytes';
  el.setAttribute('autofit', '');
  el.setAttribute('display', 'short');
  if (bytes == null) {
    el.hidden = true;
    el.removeAttribute('value');
  } else {
    el.hidden = false;
    el.setAttribute('value', String(bytes));
  }
  return el;
};

/**
 * @param {string} tag
 * @param {{ compact?: boolean }} [opts]
 * @returns {HTMLElement | null}
 */
export function buildFileMeta(tag, opts = {}) {
  const entry = entryFor(tag);
  if (!entry) return null;
  const paths = resolveCdnMinPaths(entry);
  if (!paths) return null;
  const sources = resolveSourceFiles(entry);

  const root = document.createElement('div');
  root.className = opts.compact ? 'file-meta file-meta--compact' : 'file-meta';
  root.dataset.tag = tag;
  root.dataset.fileMeta = '1';

  const srcs = document.createElement('div');
  srcs.className = 'file-meta__srcs';
  srcs.setAttribute('role', 'group');
  srcs.setAttribute('aria-label', 'Ver fuentes del módulo');

  /** @type {Array<['js'|'css'|'md', string, boolean]>} */
  const kinds = [
    ['js', 'JS', !!sources.js],
    ['css', 'CSS', !!sources.css],
    ['md', 'MD', !!sources.md],
  ];
  for (const [kind, label, ok] of kinds) {
    const btn = document.createElement('is-button');
    btn.className = 'file-meta__src-btn';
    btn.setAttribute('color', 'neutral');
    btn.setAttribute('variant', 'outlined');
    btn.setAttribute('type', 'button');
    btn.setAttribute('data-kind', kind);
    if (!ok) btn.setAttribute('disabled', '');
    btn.innerHTML = `<is-icon slot="start" icon="${
      kind === 'js' ? 'mdi:language-javascript'
        : kind === 'css' ? 'mdi:language-css3'
          : 'mdi:language-markdown'
    }"></is-icon>${label}`;
    btn.title = ok ? `Ver fuente ${label}` : `${label} no disponible`;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!ok) return;
      openViewSources(tag, kind).catch(console.error);
    });
    srcs.append(btn);
  }
  root.append(srcs);

  const mins = document.createElement('div');
  mins.className = 'file-meta__mins';
  mins.setAttribute('aria-label', 'Pesos CDN minificados');

  const rowJs = document.createElement('div');
  rowJs.className = 'file-meta__row';
  rowJs.dataset.path = paths.js;
  rowJs.append(makePathCode(paths.js), makeBytes(null));
  mins.append(rowJs);

  const rowCss = document.createElement('div');
  rowCss.className = 'file-meta__row';
  rowCss.dataset.path = paths.css || '';
  rowCss.hidden = true;
  if (paths.css) {
    rowCss.append(makePathCode(paths.css), makeBytes(null));
    mins.append(rowCss);
  }

  const total = document.createElement('div');
  total.className = 'file-meta__total';
  total.innerHTML = '<span class="file-meta__total-label">CDN</span>';
  const totalBytes = makeBytes(null);
  totalBytes.classList.add('file-meta__total-bytes');
  total.append(totalBytes);
  mins.append(total);

  root.append(mins);

  return root;
}

/**
 * Barra única (arriba del preview, tras el título de página): fuentes + pesos.
 * No se repite bajo cada h2 de sección ni dentro de cada paper/`is-demo`.
 * @param {string} tag
 */
function mountPageMeta(tag) {
  const host = document.querySelector('is-main.main, main.main');
  if (!host || !entryFor(tag)) return;

  // Legacy + repeticiones: una sola barra de página.
  host.querySelectorAll(':scope > .vs-page-bar').forEach((el) => el.remove());

  const root = document.querySelector('is-preview-component') || host;
  root.querySelectorAll?.('.file-meta:not(.file-meta-page)').forEach((el) => el.remove());
  host.querySelectorAll('.section > .file-meta, .demo > .file-meta, is-demo > .file-meta')
    .forEach((el) => el.remove());

  let bar = host.querySelector(':scope > .file-meta-page');
  if (bar?.dataset.tag === tag) return;

  const meta = buildFileMeta(tag, { compact: false });
  if (!meta) return;
  meta.classList.add('file-meta-page');

  preserveMainScroll(host, () => {
    if (bar) bar.replaceWith(meta);
    else {
      const first = host.firstElementChild;
      if (first) host.insertBefore(meta, first);
      else host.append(meta);
    }
  });
}

/**
 * @param {string} tag
 * @param {ParentNode} [_scope]
 */
export function mountFileMeta(tag, _scope = document) {
  if (!tag || !entryFor(tag)) return;
  currentTag = tag;
  mountPageMeta(tag);
}

document.addEventListener('is-preview-ready', (e) => {
  const { tag } = e.detail ?? {};
  if (typeof tag !== 'string') return;
  sizesPromise = null; // re-leer sizes si el build local cambió
  mountFileMeta(tag);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (currentTag) mountFileMeta(currentTag);
  }, { once: true });
}
