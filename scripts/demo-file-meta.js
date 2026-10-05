/**
 * demo-file-meta.js — la barra JS/CSS/MD + pesos CDN se retiró de los demos.
 * Este módulo solo limpia restos (`.file-meta*`, `.vs-page-bar`) al montar un preview.
 *
 * El visor de fuentes sigue en `view-sources.js` (se abre desde otros sitios si aplica).
 */
import components from '../src/manifest.js';

/** @type {string | null} */
let currentTag = null;

function entryFor(tag) {
  return components.find((c) => c.tag === tag) || null;
}

/** Quita cualquier barra de meta de fuentes del preview. */
function quitarBarrasMeta() {
  const host = document.querySelector('iswc-main.main, main.main');
  host?.querySelectorAll('.file-meta, .file-meta-page, .vs-page-bar').forEach((el) => el.remove());
  document.querySelector('iswc-preview-component')
    ?.querySelectorAll?.('.file-meta, .file-meta-page, .vs-page-bar')
    .forEach((el) => el.remove());
}

/**
 * @param {string} _tag
 * @param {{ compact?: boolean }} [_opts]
 * @returns {null}
 */
export function buildFileMeta(_tag, _opts = {}) {
  return null;
}

/**
 * @param {string} tag
 * @param {ParentNode} [_scope]
 */
export function mountFileMeta(tag, _scope = document) {
  if (!tag || !entryFor(tag)) return;
  currentTag = tag;
  quitarBarrasMeta();
}

document.addEventListener('iswc-preview-ready', (e) => {
  const { tag } = e.detail ?? {};
  if (typeof tag !== 'string') return;
  mountFileMeta(tag);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (currentTag) mountFileMeta(currentTag);
    else quitarBarrasMeta();
  }, { once: true });
} else {
  quitarBarrasMeta();
}
