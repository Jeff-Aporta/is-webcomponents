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
  'iswc-button':            'actions/button',
  'iswc-button-group':      'actions/button-group',
  'iswc-copy-button':       'actions/copy-button',
  'iswc-check-icon-button': 'actions/check-icon-button',
  'iswc-dropdown':          'actions/dropdown',
  'iswc-dropdown-item':     'actions/dropdown-item',
  'iswc-fab':               'actions/fab',
  'iswc-context-menu':      'actions/context-menu',
  'iswc-speed-dial':        'actions/speed-dial',
  // media
  'iswc-icon':              'media/icon',
  'iswc-avatar':            'media/avatar',
  'iswc-theme-img':         'media/theme-img',
  'iswc-video':             'media/video',
  'iswc-video-playlist':    'media/video-playlist',
  'iswc-barcode':           'media/barcode',
  'iswc-image-editor':      'media/image-editor',
  'iswc-qrcode':            'media/qrcode',
  // feedback
  'iswc-spinner':           'feedback/spinner',
  'iswc-badge':             'feedback/badge',
  'iswc-tag':               'feedback/tag',
  'iswc-skeleton':          'feedback/skeleton',
  'iswc-progress-bar':      'feedback/progress-bar',
  'iswc-progress-ring':     'feedback/progress-ring',
  'iswc-theme-toggle':      'feedback/theme-toggle',
  'iswc-prefs-clear':       'feedback/prefs-clear',
  'iswc-toast':             'feedback/toast',
  'iswc-toast-item':        'feedback/toast-item',
  'iswc-tooltip':           'feedback/tooltip',
  'iswc-cdn-snippet':       'feedback/cdn-snippet',
  'iswc-palette-selector':  'feedback/palette-selector',
  'iswc-popconfirm':       'feedback/popconfirm',
  // layout
  'iswc-split-panel':       'layout/split-panel',
  'iswc-main':              'layout/main',
  'iswc-card':              'layout/card',
  'iswc-callout':           'layout/callout',
  'iswc-details':           'layout/details',
  'iswc-dialog':            'layout/dialog',
  'iswc-drawer':            'layout/drawer',
  'iswc-divider':           'layout/divider',
  'iswc-scrollspy':         'layout/scrollspy',
  'iswc-dock':              'layout/dock',
  'iswc-dock-item':         'layout/dock',
  // helpers
  'iswc-popover':           'helpers/popover',
  'iswc-relative-time':     'helpers/relative-time',
  'iswc-format-date':       'helpers/format-date',
  'iswc-format-number':     'helpers/format-number',
  'iswc-format-bytes':      'helpers/format-bytes',
  'iswc-format':            'helpers/format',
  'iswc-intersection-observer': 'helpers/intersection-observer',
  'iswc-mutation-observer': 'helpers/mutation-observer',
  'iswc-resize-observer':   'helpers/resize-observer',
  'iswc-observer':          'helpers/observer',
  // forms
  'iswc-option':            'forms/option',
  'iswc-combobox':          'forms/combobox',
  'iswc-checkbox':          'forms/checkbox',
  'iswc-switch':            'forms/switch',
  'iswc-radio':             'forms/radio',
  'iswc-radio-group':       'forms/radio-group',
  'iswc-input':             'forms/input',
  'iswc-textarea':          'forms/textarea',
  'iswc-slider':            'forms/slider',
  'iswc-rating':            'forms/rating',
  'iswc-select':            'forms/select',
  'iswc-color-picker':      'forms/color-picker',
  'iswc-file-input':        'forms/file-input',
  'iswc-date-field':        'forms/date-field',
  'iswc-date-input':        'forms/date-input',
  'iswc-date-picker':       'forms/date-picker',
  'iswc-date-range-input':  'forms/date-range-input',
  'iswc-date-range-picker':'forms/date-range-picker',
  'iswc-date-time-field':   'forms/date-time-field',
  'iswc-date-time-input':   'forms/date-time-input',
  'iswc-digital-clock':     'forms/digital-clock',
  'iswc-month-calendar':    'forms/month-calendar',
  'iswc-year-calendar':     'forms/year-calendar',
  'iswc-pin-input':         'forms/pin-input',
  'iswc-masked-input':      'forms/masked-input',
  'iswc-mention':           'forms/mention',
  'iswc-inline-edit':       'forms/inline-edit',
  'iswc-duration-picker':   'forms/duration-picker',
  'iswc-dropzone':          'forms/dropzone',
  'iswc-full-calendar':     'forms/full-calendar',
  'iswc-signature':         'forms/signature',
  'iswc-rte':               'forms/rte',
  'iswc-doc-editor':        'forms/doc-editor',
  // code
  'iswc-code':       'code/code',
  // navigation
  'iswc-breadcrumb':        'navigation/breadcrumb',
  'iswc-tab-group':         'navigation/tab-group',
  'iswc-scroller':          'navigation/scroller',
  'iswc-carousel':          'navigation/carousel',
  'iswc-tree':              'navigation/tree',
  'iswc-stepper':           'navigation/stepper',
  'iswc-mega-menu':         'navigation/mega-menu',
  // data
  'iswc-data-grid':         'data/data-grid',
  'iswc-gauge':             'data/gauge',
  'iswc-stat':              'data/stat',
  'iswc-transfer':          'data/transfer',
  'iswc-kanban':            'data/kanban',
  'iswc-pivot-table':       'data/pivot-table',
  'iswc-spreadsheet':       'data/spreadsheet',
  'iswc-ag-grid':           'data/ag-grid',
  // charts
  'iswc-chart':             'charts/chart',
  'iswc-bar-chart':         'charts/bar-chart',
  'iswc-line-chart':        'charts/line-chart',
  'iswc-pie-chart':         'charts/pie-chart',
  'iswc-doughnut-chart':    'charts/doughnut-chart',
  'iswc-radar-chart':       'charts/radar-chart',
  'iswc-polar-area-chart':  'charts/polar-area-chart',
  'iswc-scatter-chart':     'charts/scatter-chart',
  'iswc-bubble-chart':      'charts/bubble-chart',
  'iswc-sparkline':         'charts/sparkline',
  'iswc-funnel-chart':      'charts/funnel-chart',
  'iswc-waterfall-chart':   'charts/waterfall-chart',
  'iswc-treemap':           'charts/treemap',
  // data-viz
  'iswc-heatmap':           'data-viz/heatmap',
  'iswc-maps':              'data-viz/maps',
  // diagrams
  'iswc-flowchart':         'diagrams/flowchart',
  'iswc-class-diagram':     'diagrams/class-diagram',
  'iswc-state-diagram':     'diagrams/state-diagram',
  'iswc-er-diagram':        'diagrams/er-diagram',
  'iswc-block-diagram':     'diagrams/block-diagram',
  'iswc-mindmap':           'diagrams/mindmap',
  'iswc-gantt':             'diagrams/gantt',
  'iswc-timeline':          'diagrams/timeline',
  'iswc-org-chart':         'diagrams/org-chart',
  'iswc-sequence-diagram':  'diagrams/sequence-diagram',
  'iswc-diagram-lightbox':  'diagrams/diagram-lightbox',
  'iswc-lightbox':          'diagrams/lightbox',
  // overlays
  'iswc-command-palette':   'overlays/command-palette',
  'iswc-pdf-viewer':        'overlays/pdf-viewer',
  'iswc-window':            'overlays/window',
};

async function load(tag: string, devPath: string) {
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
