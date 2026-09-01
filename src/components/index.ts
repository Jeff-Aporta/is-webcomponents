/**
 * Barril cdn-first. Para cada componente intenta primero `dist/cdn/<name>.min.js`
 * (bundle minificado publicado) y si no existe cae al path de fuente en `components/`.
 *
 * Esto permite que `index.html` siga mostrando:
 *   - componentes publicados en `dist/cdn/` (rápido, minificado),
 *   - o dev source cuando aún no están en la build.
 *
 * Los componentes son idempotentes (`if (!customElements.get(tag)) ...`), por
 * lo que cargar dos paths no rompe: gana el primero que defina.
 */

const [cdnBase, devBase] = (() => {
  // components/index.js está en components/. El bundle vive en ../dist/cdn.
  // El dev source está en el propio components/<...>.
  const here = new URL('.', import.meta.url);
  return [
    new URL('../dist/cdn/', here).href,
    new URL('./', here).href,
  ];
})();

/** Catálogo: tag → devPath (sin .js). El path CDN es <name>.min.js con mismo nombre. */
const CATALOG = {
  // actions
  'is-button':            'actions/button',
  'is-button-group':      'actions/button-group',
  'is-copy-button':       'actions/copy-button',
  'is-check-icon-button': 'actions/check-icon-button',
  'is-dropdown':          'actions/dropdown',
  'is-dropdown-item':     'actions/dropdown-item',
  'is-fab':               'actions/fab',
  'is-context-menu':      'actions/context-menu',
  'is-speed-dial':        'actions/speed-dial',
  // media
  'is-icon':              'media/icon',
  'is-avatar':            'media/avatar',
  'is-theme-img':         'media/theme-img',
  'is-video':             'media/video',
  'is-video-playlist':    'media/video-playlist',
  'is-barcode':           'media/barcode',
  'is-image-editor':      'media/image-editor',
  'is-qrcode':            'media/qrcode',
  // feedback
  'is-spinner':           'feedback/spinner',
  'is-badge':             'feedback/badge',
  'is-tag':               'feedback/tag',
  'is-skeleton':          'feedback/skeleton',
  'is-progress-bar':      'feedback/progress-bar',
  'is-progress-ring':     'feedback/progress-ring',
  'is-theme-toggle':      'feedback/theme-toggle',
  'is-prefs-clear':       'feedback/prefs-clear',
  'is-toast':             'feedback/toast',
  'is-toast-item':        'feedback/toast-item',
  'is-tooltip':           'feedback/tooltip',
  'is-cdn-snippet':       'feedback/cdn-snippet',
  'is-palette-selector':  'feedback/palette-selector',
  'is-popconfirm':       'feedback/popconfirm',
  // layout
  'is-split-panel':       'layout/split-panel',
  'is-main':              'layout/main',
  'is-card':              'layout/card',
  'is-callout':           'layout/callout',
  'is-details':           'layout/details',
  'is-dialog':            'layout/dialog',
  'is-drawer':            'layout/drawer',
  'is-divider':           'layout/divider',
  'is-scrollspy':         'layout/scrollspy',
  'is-dock':              'layout/dock',
  'is-dock-item':         'layout/dock',
  // helpers
  'is-popover':           'helpers/popover',
  'is-relative-time':     'helpers/relative-time',
  'is-format-date':       'helpers/format-date',
  'is-format-number':     'helpers/format-number',
  'is-format-bytes':      'helpers/format-bytes',
  'is-format':            'helpers/format',
  'is-intersection-observer': 'helpers/intersection-observer',
  'is-mutation-observer': 'helpers/mutation-observer',
  'is-resize-observer':   'helpers/resize-observer',
  'is-observer':          'helpers/observer',
  // forms
  'is-option':            'forms/option',
  'is-combobox':          'forms/combobox',
  'is-checkbox':          'forms/checkbox',
  'is-switch':            'forms/switch',
  'is-radio':             'forms/radio',
  'is-radio-group':       'forms/radio-group',
  'is-input':             'forms/input',
  'is-textarea':          'forms/textarea',
  'is-slider':            'forms/slider',
  'is-rating':            'forms/rating',
  'is-select':            'forms/select',
  'is-color-picker':      'forms/color-picker',
  'is-file-input':        'forms/file-input',
  'is-date-field':        'forms/date-field',
  'is-date-input':        'forms/date-input',
  'is-date-picker':       'forms/date-picker',
  'is-date-range-input':  'forms/date-range-input',
  'is-date-range-picker':'forms/date-range-picker',
  'is-date-time-field':   'forms/date-time-field',
  'is-date-time-input':   'forms/date-time-input',
  'is-digital-clock':     'forms/digital-clock',
  'is-month-calendar':    'forms/month-calendar',
  'is-year-calendar':     'forms/year-calendar',
  'is-pin-input':         'forms/pin-input',
  'is-masked-input':      'forms/masked-input',
  'is-mention':           'forms/mention',
  'is-inline-edit':       'forms/inline-edit',
  'is-duration-picker':   'forms/duration-picker',
  'is-dropzone':          'forms/dropzone',
  'is-full-calendar':     'forms/full-calendar',
  'is-signature':         'forms/signature',
  'is-rte':               'forms/rte',
  'is-doc-editor':        'forms/doc-editor',
  // code
  'is-code':       'code/code',
  // navigation
  'is-breadcrumb':        'navigation/breadcrumb',
  'is-tab-group':         'navigation/tab-group',
  'is-scroller':          'navigation/scroller',
  'is-carousel':          'navigation/carousel',
  'is-tree':              'navigation/tree',
  'is-stepper':           'navigation/stepper',
  'is-mega-menu':         'navigation/mega-menu',
  // data
  'is-data-grid':         'data/data-grid',
  'is-gauge':             'data/gauge',
  'is-stat':              'data/stat',
  'is-transfer':          'data/transfer',
  'is-kanban':            'data/kanban',
  'is-pivot-table':       'data/pivot-table',
  'is-spreadsheet':       'data/spreadsheet',
  'is-ag-grid':           'data/ag-grid',
  // charts
  'is-chart':             'charts/chart',
  'is-bar-chart':         'charts/bar-chart',
  'is-line-chart':        'charts/line-chart',
  'is-pie-chart':         'charts/pie-chart',
  'is-doughnut-chart':    'charts/doughnut-chart',
  'is-radar-chart':       'charts/radar-chart',
  'is-polar-area-chart':  'charts/polar-area-chart',
  'is-scatter-chart':     'charts/scatter-chart',
  'is-bubble-chart':      'charts/bubble-chart',
  'is-sparkline':         'charts/sparkline',
  'is-funnel-chart':      'charts/funnel-chart',
  'is-waterfall-chart':   'charts/waterfall-chart',
  'is-treemap':           'charts/treemap',
  // data-viz
  'is-heatmap':           'data-viz/heatmap',
  'is-maps':              'data-viz/maps',
  // diagrams
  'is-flowchart':         'diagrams/flowchart',
  'is-class-diagram':     'diagrams/class-diagram',
  'is-state-diagram':     'diagrams/state-diagram',
  'is-er-diagram':        'diagrams/er-diagram',
  'is-block-diagram':     'diagrams/block-diagram',
  'is-mindmap':           'diagrams/mindmap',
  'is-gantt':             'diagrams/gantt',
  'is-timeline':          'diagrams/timeline',
  'is-org-chart':         'diagrams/org-chart',
  'is-sequence-diagram':  'diagrams/sequence-diagram',
  'is-diagram-lightbox':  'diagrams/diagram-lightbox',
  'is-lightbox':          'diagrams/lightbox',
  // overlays
  'is-command-palette':   'overlays/command-palette',
  'is-pdf-viewer':        'overlays/pdf-viewer',
  'is-window':            'overlays/window',
};

async function load(tag, devPath: string) {
  if (customElements.get(tag)) return;
  // 1) CDN minificado: dist/cdn/<categoria>/<name>.min.js (folderizado)
  const [folder] = devPath.split('/');
  const name = devPath.split('/').pop();
  const cdn = `${cdnBase}${folder}/${name}.min.js`;
  const dev = `${devBase}${devPath}.js`;
  try {
    await import(/* @vite-ignore */ cdn);
  } catch {
    await import(/* @vite-ignore */ dev);
  }
}

await Promise.all(Object.entries(CATALOG).map(([tag, p]) => load(tag, p)));
