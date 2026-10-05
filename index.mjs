/**
 * index.mjs — boot local de la galería (loader + shell + page modules).
 */
import { ISWebComponentsLoader as L } from './dist/cdn/core/loader.min.js';

// Autoprueba del kit: relativo al loader (dist/cdn/), sin mirrors ni pin SHA.
L.configure({ local: true });
L.sheets.install({ cacheName: 'iswc-gallery-sheets' });

void L.loadPageStyles([
  'iswc-palettes-default',
  'src/styles/shell.css',
  'src/styles/presentation.css',
]);

// Shell + preview-component (catálogo del kit, category preview).
L.load(
  'iswc-split-panel',
  'iswc-main',
  'iswc-drawer',
  'iswc-demo',
  'iswc-scrollspy',
  'iswc-button',
  'iswc-icon',
  'iswc-theme-toggle',
  'iswc-palette-selector',
  'iswc-code',
  'iswc-preview-component',
)
  .then(() => {
    document.documentElement.dataset.kitShell = '1';
    window.dispatchEvent(new Event('iswc-gallery-shell-ready'));
  })
  .catch((err) => console.error('[gallery] shell boot', err));

// Lazy: chrome de docs + dev-reload. No bloquean paint.
L.loadPageModules([
  'highlight-pre',
  'demo-code',
  'docs-chrome',
  'cdn-panel',
  'view-sources',
  'demo-file-meta',
  'dev-reload',
]).catch((err) => console.warn('[gallery] page modules', err));
