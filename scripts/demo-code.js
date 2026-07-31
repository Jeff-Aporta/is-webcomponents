/**
 * demo-code.js — botón "Ver código del ejemplo" en cada `.demo`.
 *
 * El snippet que se copia/pega es **completo y portable**:
 *   - Carga el tema base y la paleta de marca por separado (is-base.min.css
 *     + palettes.min.css) para que el ejemplo se vea exactamente igual al
 *     preview actual (mismo theme + palette).
 *   - Incluye un `<link>` y un `<script type="module">` por cada componente
 *     `is-*` que aparezca en el demo (descubierto por convención de nombre).
 *   - Añade comentario con las opciones alternativas: bundles por categoría y
 *     el bundle único (`all.min.js`).
 *   - El HTML del demo va dentro de un `<div class="theme-X" data-palette="Y">`
 *     para que el snippet funcione al pegarlo en cualquier HTML.
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

  const ensureIsIcon = () => {
    if (customElements.get('is-icon')) return customElements.whenDefined('is-icon');
    if (![...document.querySelectorAll('script[type="module"]')].some((s) => s.src.includes('/media/icon.js'))) {
      const el = document.createElement('script');
      el.type = 'module';
      el.src = iconModuleUrl;
      document.head.appendChild(el);
    }
    return customElements.whenDefined('is-icon');
  };

  /** CDN base — el snippet debe usar URLs públicas para que sea portable. */
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn';

  /** Theme + palette activos en el contexto actual (root). */
  const ctxTheme = () => document.documentElement.dataset.theme || 'dark';
  const ctxPalette = () => document.documentElement.dataset.palette || 'insoft';

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

  /** Carga tag → category del manifest. Lo usa `buildSnippet` para el comentario
   *  de bundles por categoría. La promesa se inicializa al boot y se reutiliza. */
  const manifestPromise = (() => {
    if (Array.isArray(window.__IS_MANIFEST__)) {
      return Promise.resolve(window.__IS_MANIFEST__);
    }
    try {
      const self = [...document.scripts].find((s) => s.src.includes('demo-code.js'));
      const base = self ? new URL('..', self.src).href : new URL('..', location.href).href;
      return import(new URL('manifest.js', base).href)
        .then((m) => m.default || m)
        .catch(() => []);
    } catch {
      return Promise.resolve([]);
    }
  })();

  /** Devuelve un Set con los nombres cortos (sin prefijo `is-`) de los
   *  componentes <is-*> que aparecen dentro del demo. */
  const collectTags = (root) => {
    const tags = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
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

  /** Indenta cada línea de `text` con `n` espacios extra. */
  const indent = (text, n) => {
    const pad = ' '.repeat(n);
    return text.split('\n').map((l) => l.length ? pad + l : l).join('\n');
  };

  /** HTML pretty del demo sin el chrome del propio botón. */
  const serializeDemoHtml = (demo) => {
    const parts = [];
    for (const node of demo.childNodes) {
      if (node.nodeType === 1) {
        if (node.matches('.demo-code-btn, .demo-code-pop, dialog')) continue;
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

  /** Construye el snippet completo: head con CDN + body con el demo envuelto. */
  const buildSnippet = async (demo) => {
    const raw = demo.getAttribute('data-code');
    const inner = raw != null && raw !== ''
      ? raw.trim()
      : serializeDemoHtml(demo);

    const tags = collectTags(demo);
    const theme = ctxTheme();
    const palette = ctxPalette();

    const cssTags = tags.filter((t) => COMPONENTS_WITH_CSS.has(t));
    const links = [
      `  <!-- 1. Tema base (tokens dark/light sin marca) -->`,
      `  <link rel="stylesheet" href="${CDN_BASE}/is-base.min.css">`,
      ``,
      `  <!-- 2. Paleta de marca (Insoft / ContaPyme / AgroWin) -->`,
      `  <link rel="stylesheet" href="${CDN_BASE}/palettes.min.css">`,
    ];
    if (cssTags.length) {
      links.push('');
      links.push('  <!-- 3. CSS por componente -->');
      for (const t of cssTags) {
        links.push(`  <link rel="stylesheet" href="${CDN_BASE}/${t}.min.css">`);
      }
    }

    const scripts = [];
    if (tags.length) {
      scripts.push('');
      scripts.push('  <!-- 4. JS por componente (defer: ejecuta tras parsear el HTML) -->');
      for (const t of tags) {
        scripts.push(`  <script type="module" src="${CDN_BASE}/${t}.min.js" defer><\/script>`);
      }
    }

    const lines = [];
    lines.push('<!DOCTYPE html>');
    lines.push(`<html lang="es" class="theme-${theme}" data-theme="${theme}" data-palette="${palette}">`);
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1">');
    lines.push('  <title>IS Web Components · snippet</title>');
    lines.push('');
    lines.push(...links);
    lines.push('</head>');
    lines.push('<body>');
    lines.push(`  <div class="theme-${theme}" data-palette="${palette}" style="padding:1.5rem;font-family:var(--is-sans,system-ui);background:var(--is-bg);color:var(--is-text);min-height:100vh">`);
    lines.push(indent(inner, 4));
    lines.push('  </div>');
    if (scripts.length) {
      lines.push(...scripts);
    }
    lines.push('</body>');
    lines.push('</html>');

    // Comentario de alternativas (categoría y all) — sólo referencia, no se incluyen.
    const manifest = await manifestPromise;
    const catMap = {};
    if (Array.isArray(manifest)) {
      for (const e of manifest) {
        const tag = String(e.tag || '').replace(/^is-/, '');
        if (tag && e.category) catMap[tag] = e.category;
      }
    }
    const cats = new Set();
    for (const t of tags) {
      const cat = catMap[t];
      if (cat) cats.add(cat);
    }
    if (cats.size) {
      lines.push('');
      lines.push('<!-- ── Alternativas (descomenta si prefieres bundles por categoría) ── -->');
      for (const cat of cats) {
        lines.push(`<!--   <link rel="stylesheet" href="${CDN_BASE}/${cat}.min.css">                  (CSS por categoría) -->`);
        lines.push(`<!--   <script type="module" src="${CDN_BASE}/${cat}.min.js" defer><\/script>  (toda la categoría) -->`);
      }
      lines.push('<!--');
      lines.push('     O el bundle único (toda la librería en un solo archivo): -->');
      lines.push(`<!--   <link rel="stylesheet" href="${CDN_BASE}/is-base.min.css"> -->`);
      lines.push(`<!--   <link rel="stylesheet" href="${CDN_BASE}/palettes.min.css"> -->`);
      lines.push(`<!--   <script type="module" src="${CDN_BASE}/all.min.js" defer><\/script>  (todos los componentes) -->`);
      lines.push('-->');
    }

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

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'demo-code-btn';
    btn.setAttribute('aria-label', 'Ver código del ejemplo');
    btn.title = 'Ver código';
    btn.innerHTML = '<is-icon icon="mdi:information-outline"></is-icon>';

    const pop = document.createElement('div');
    pop.className = 'demo-code-pop';
    pop.setAttribute('popover', 'auto');
    pop.innerHTML = `
      <div class="demo-code-pop__bar">
        <span class="demo-code-pop__title">Código</span>
        <button type="button" class="demo-code-pop__copy" title="Copiar">Copiar</button>
      </div>
      <pre class="code demo-code-pop__pre"></pre>
    `;

    const pre = pop.querySelector('pre');
    const copyBtn = pop.querySelector('.demo-code-pop__copy');

    let lastSnippet = '';
    const renderSnippet = async () => {
      lastSnippet = await buildSnippet(demo);
      if (pre.dataset.filled === '1' && pre.textContent === lastSnippet) return;
      pre.textContent = lastSnippet;
      delete pre.dataset.cm;
      highlight(pre);
      pre.dataset.filled = '1';
    };

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await renderSnippet();
      if (typeof pop.showPopover === 'function') {
        const r = btn.getBoundingClientRect();
        const w = Math.min(36 * 16, innerWidth - 32);
        const x = Math.max(12, Math.min(r.right - w, innerWidth - w - 12));
        const y = Math.min(r.bottom + 8, innerHeight - 80);
        pop.style.setProperty('--demo-code-x', `${x}px`);
        pop.style.setProperty('--demo-code-y', `${y}px`);
        if (pop.matches(':popover-open')) pop.hidePopover();
        else pop.showPopover();
      } else {
        pop.hidden = !pop.hidden;
        demo.classList.toggle('demo--code-open', !pop.hidden);
      }
    });

    copyBtn.addEventListener('click', async () => {
      await renderSnippet();
      try {
        await navigator.clipboard.writeText(lastSnippet);
        copyBtn.textContent = 'Copiado';
        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1200);
      } catch {
        copyBtn.textContent = 'Error';
      }
    });

    if (typeof pop.showPopover !== 'function') {
      pop.hidden = true;
      pop.removeAttribute('popover');
      pop.classList.add('demo-code-pop--fallback');
    }

    demo.append(btn, pop);
  };

  const boot = async () => {
    try { await ensureIsIcon(); } catch { /* botón sin icono custom ok */ }
    document.querySelectorAll('.demo').forEach(enhance);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { boot().catch(console.error); });
  } else {
    boot().catch(console.error);
  }
})();
