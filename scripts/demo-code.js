/**
 * demo-code.js — botón "Ver código del ejemplo" en cada `.demo`.
 *
 * El snippet es un **fragmento mínimo pegable**, no un documento completo:
 * primero los `<link>` / `<script type="module">` del CDN, después el markup
 * del ejemplo. Se pega dentro de cualquier `<body>` o contenedor y funciona.
 * (Antes emitía un HTML entero con head, body y un bloque de alternativas
 * comentado: demasiado ruido para copiar y pegar.)
 *
 * El panel va dentro de un <is-dropdown>, así queda anclado al trigger y se
 * reposiciona al hacer scroll; copiar usa <is-copy-button>.
 *
 * Override opcional: data-code="..." | data-no-code
 * Depende de highlight-pre.js (window.__isHighlightCode) e is-icon.
 */
(() => {
  const iconModuleUrl = (() => {
    const self = [...document.scripts].find((s) => s.src.includes('demo-code.js'));
    if (self) return new URL('../components/media/icon.js', self.src).href;
    return new URL('../components/media/icon.js', location.href).href;
  })();

  /** Carga un módulo de componente si la página no lo trae ya. */
  const ensureComponent = (tag, relPath) => {
    if (customElements.get(tag)) return customElements.whenDefined(tag);
    const url = new URL(relPath, iconModuleUrl).href;
    if (![...document.querySelectorAll('script[type="module"]')].some((s) => s.src === url)) {
      const el = document.createElement('script');
      el.type = 'module';
      el.src = url;
      document.head.appendChild(el);
    }
    return customElements.whenDefined(tag);
  };

  /** El chrome del panel usa is-icon, is-dropdown e is-copy-button. */
  const ensureChrome = () => Promise.all([
    ensureComponent('is-icon', './icon.js'),
    ensureComponent('is-dropdown', '../actions/dropdown.js'),
    ensureComponent('is-copy-button', '../actions/copy-button.js'),
  ]);

  /** CDN base — el snippet debe usar URLs públicas para que sea portable. */
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn';

  /** Componentes que sí exponen CSS propio (los demás sólo JS). */
  const COMPONENTS_WITH_CSS = new Set([
    'avatar', 'badge', 'block-diagram', 'button', 'button-group', 'bar-chart',
    'bubble-chart', 'card', 'chart', 'check-icon-button', 'checkbox',
    'class-diagram', 'color-picker', 'combobox', 'copy-button', 'data-grid',
    'date-field', 'date-input', 'date-picker', 'date-range-input',
    'date-range-picker', 'date-time-field', 'date-time-input',
    'diagram-lightbox', 'divider', 'doughnut-chart', 'dropdown',
    'dropdown-item', 'er-diagram', 'file-input', 'flowchart',
    'funnel-chart', 'gantt', 'input', 'lightbox', 'line-chart', 'main',
    'marks-cartesian', 'marks-funnel', 'marks-radial', 'marks-waterfall',
    'mindmap', 'month-calendar', 'mutation-observer', 'pie-chart',
    'polar-area-chart', 'popover', 'popup', 'progress-bar', 'progress-ring',
    'radio', 'radio-group', 'radar-chart', 'rating', 'relative-time',
    'resize-observer', 'scatter-chart', 'select', 'sequence-diagram',
    'skeleton', 'slider', 'sparkline', 'split-panel', 'state-diagram',
    'switch', 'tag', 'textarea', 'theme-toggle', 'timeline',
    'time-clock', 'time-field', 'time-input', 'toast', 'toast-item',
    'tooltip', 'treemap', 'video', 'video-playlist', 'waterfall-chart',
    'year-calendar',
  ]);

  /** Devuelve un Set con los nombres cortos (sin prefijo `is-`) de los
   *  componentes <is-*> que aparecen dentro del demo. */
  const collectTags = (root) => {
    const tags = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.closest?.('.demo-code-dd')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT),
    });
    if (root.nodeType === 1 && root.tagName.toLowerCase().startsWith('is-')) {
      tags.add(root.tagName.toLowerCase().slice(3));
    }
    let n;
    while ((n = walker.nextNode())) {
      const tag = n.tagName.toLowerCase();
      if (tag.startsWith('is-')) tags.add(tag.slice(3));
    }
    return [...tags].sort();
  };

  /** HTML pretty del demo sin el chrome del propio botón. */
  const serializeDemoHtml = (demo) => {
    const parts = [];
    for (const node of demo.childNodes) {
      if (node.nodeType === 1) {
        if (node.matches('.demo-code-dd, .demo-code-btn, .demo-code-pop, dialog')) continue;
        parts.push(node.outerHTML);
      } else if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (t) parts.push(t);
      }
    }
    return pretty(parts.join('\n'));
  };

  const pretty = (html) => {
    const flat = html
      .replace(/>\s+</g, '>\n<')
      .replace(/^\s+|\s+$/g, '');
    const lines = flat.split('\n');
    let depth = 0;
    const out = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^<\//.test(trimmed)) depth = Math.max(0, depth - 1);
      out.push(`${'  '.repeat(depth)}${trimmed}`);
      if (/^<[^/!][^>]*[^/]>$/.test(trimmed) && !/^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(trimmed)) {
        depth += 1;
      }
    }
    return out.join('\n');
  };

  /** Fragmento mínimo: dependencias del CDN arriba, markup del ejemplo debajo. */
  const buildSnippet = async (demo) => {
    const raw = demo.getAttribute('data-code');
    const inner = raw != null && raw !== ''
      ? raw.trim()
      : serializeDemoHtml(demo);

    const tags = collectTags(demo);
    const cssTags = tags.filter((t) => COMPONENTS_WITH_CSS.has(t));

    const lines = [];
    lines.push('<link rel="stylesheet" href="' + CDN_BASE + '/is-base.min.css">');
    lines.push('<link rel="stylesheet" href="' + CDN_BASE + '/palettes.min.css">');
    for (const t of cssTags) {
      lines.push(`<link rel="stylesheet" href="${CDN_BASE}/${t}.min.css">`);
    }
    // Los módulos ya son diferidos: no hace falta `defer` ni ponerlos al final.
    for (const t of tags) {
      lines.push(`<script type="module" src="${CDN_BASE}/${t}.min.js"><\/script>`);
    }
    if (lines.length) lines.push('');
    lines.push(inner);

    return lines.join('\n');
  };

  const highlight = (pre) => {
    if (!pre.getAttribute('data-lang')) pre.setAttribute('data-lang', 'html');
    delete pre.dataset.cm;
    if (typeof window.__isHighlightCode === 'function') {
      window.__isHighlightCode(pre);
      return;
    }
    if (typeof CodeMirror?.runMode === 'function') {
      const text = pre.textContent;
      pre.textContent = '';
      CodeMirror.runMode(text, 'htmlmixed', pre);
      pre.classList.add('cm-s-material-darker');
      pre.dataset.cm = '1';
    }
  };

  const enhance = (demo) => {
    if (demo.dataset.codeReady || demo.hasAttribute('data-no-code')) return;
    demo.dataset.codeReady = '1';
    demo.classList.add('demo--with-code');

    // is-dropdown ancla el panel al trigger y lo reposiciona en scroll/resize.
    // Antes era un popover con coordenadas calculadas a mano que se despegaba.
    const dd = document.createElement('is-dropdown');
    dd.className = 'demo-code-dd';
    dd.setAttribute('placement', 'bottom-end');
    dd.setAttribute('distance', '8');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.slot = 'trigger';
    btn.className = 'demo-code-btn';
    btn.setAttribute('aria-label', 'Ver código del ejemplo');
    btn.title = 'Ver código';
    btn.innerHTML = '<is-icon icon="mdi:code-tags"></is-icon>';

    const pop = document.createElement('div');
    pop.className = 'demo-code-pop';
    pop.innerHTML = `
      <div class="demo-code-pop__bar">
        <span class="demo-code-pop__title">Código del ejemplo</span>
        <is-copy-button class="demo-code-pop__copy" copy-label="Copiar" success-label="Copiado"
                        tooltip-placement="left"></is-copy-button>
      </div>
      <pre class="code demo-code-pop__pre"></pre>
    `;

    const pre = pop.querySelector('pre');
    const copyBtn = pop.querySelector('is-copy-button');

    const renderSnippet = async () => {
      const snippet = await buildSnippet(demo);
      copyBtn.setAttribute('value', snippet);
      if (pre.dataset.filled === '1' && pre.dataset.src === snippet) return;
      pre.textContent = snippet;
      pre.dataset.src = snippet;
      delete pre.dataset.cm;
      highlight(pre);
      pre.dataset.filled = '1';
    };

    // El snippet se calcula al abrir: el demo puede haber cambiado por JS.
    dd.addEventListener('is-show', () => { renderSnippet().catch(console.error); });

    dd.append(btn, pop);
    demo.append(dd);
  };

  const boot = async () => {
    try { await ensureChrome(); } catch { /* chrome degradado, ok */ }
    document.querySelectorAll('.demo').forEach(enhance);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot().catch(console.error); });
  } else {
    boot().catch(console.error);
  }
})();
