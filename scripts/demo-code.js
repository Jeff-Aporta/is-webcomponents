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
 *
 * No entra al snippet: botones «Ver código» / «Ver fuentes», `.demo-label`,
 * `.demo-caption`, `.demo__heading` ni modales — solo markup replicable.
 *
 * Sí entra un bloque `<style>` cuando el ejemplo usa clases de layout de la
 * galería (`.matrix`, `.demo-row`, …) o estilos del preview (`styles` en JSON).
 *
 * Es un módulo ES: importa lo que necesita (manifest, cdn-ref, el pintor y los
 * componentes del chrome) en vez de leerlo de `window.__*`.
 */
import '../src/components/media/icon.js';
import '../src/components/actions/dropdown.js';
import '../src/components/actions/copy-button.js';
import './highlight-pre.js';
import { paint } from '../src/components/_shared/highlight-code.js';
import { resolveRef, jsdelivrBase } from '../src/components/_shared/cdn-ref.js';
import { totalCdnSize } from '../src/components/_shared/cdn-sizes.js';
import manifest from '../manifest.js';
import { buildDemoSnippetStyles } from '../src/previews/_kit/demo-snippet-styles.js';

{
  /** CDN base — el snippet debe usar URLs públicas para que sea portable. */
  /** Base de arranque. El snippet se emite con el commit resuelto (ver
   *  `cdnBase()`): `@main` cambiaría bajo los pies de quien lo pegó. */
  const CDN_BASE = jsdelivrBase('main');

  /** Base congelada al último commit. */
  const cdnBase = async () => {
    try {
      const ref = await resolveRef();
      if (ref) return jsdelivrBase(ref);
    } catch { /* sin red: se queda en main */ }
    return CDN_BASE;
  };

  /** Componentes que sí exponen CSS propio (los demás sólo JS). */
  const COMPONENTS_WITH_CSS = new Set([
    'avatar', 'badge', 'block-diagram', 'button', 'button-group', 'bar-chart',
    'bubble-chart', 'card', 'chart', 'check-icon-button', 'checkbox',
    'class-diagram', 'color-picker', 'combobox', 'component-diagram', 'copy-button', 'data-grid',
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
    'year-calendar', 'code',
  ]);

  /** Tamaño humano-legible: 812 → "812 B", 12800 → "12.5 KB". */
  const humanSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  /** sizes.json + expansión category/all: ver `_shared/cdn-sizes.js`. */

  /** UI de la galería que NO va al snippet pegable (botones, rótulos, modales). */
  const SNIPPET_CHROME_SEL = [
    '.demo-code-dd',
    '.demo-code-btn',
    '.demo-code-pop',
    '.demo-sources-btn',
    '.demo__heading',
    '.demo-label',
    '.demo-caption',
    'dialog',
  ].join(', ');

  const isSnippetChrome = (el) => el?.nodeType === 1 && el.matches?.(SNIPPET_CHROME_SEL);

  const stripSnippetChrome = (root) => {
    root.querySelectorAll(SNIPPET_CHROME_SEL).forEach((el) => el.remove());
    return root;
  };

  /** Devuelve un Set con los nombres cortos (sin prefijo `is-`) de los
   *  componentes <is-*> que aparecen dentro del demo. */
  const collectTags = (root) => {
    const tags = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.closest?.(SNIPPET_CHROME_SEL)
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

  /** Tema / paleta activos en el preview (html). */
  const currentTheme = () => (
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  );
  const currentPalette = () => (
    document.documentElement.dataset.palette || 'contapyme'
  );

  /** Sella data-theme + data-palette + .theme-* en un nodo raíz del snippet
   *  para que, al pegarlo, el ejemplo herede el contexto sin pintar toda la
   *  página (el canvas lo decide la app). */
  const stampContext = (el, theme, palette) => {
    el.setAttribute('data-theme', theme);
    el.setAttribute('data-palette', palette);
    el.classList.remove('theme-dark', 'theme-light');
    el.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
  };

  /** Inyecta el contexto actual en la(s) raíz(ces) del markup serializado. */
  const withSnippetContext = (html) => {
    const theme = currentTheme();
    const palette = currentPalette();
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    const elements = [...tpl.content.children];
    if (elements.length === 1) {
      stampContext(elements[0], theme, palette);
    } else if (elements.length > 1) {
      const wrap = document.createElement('div');
      stampContext(wrap, theme, palette);
      for (const el of elements) wrap.appendChild(el);
      tpl.content.replaceChildren(wrap);
    } else {
      const wrap = document.createElement('div');
      stampContext(wrap, theme, palette);
      wrap.append(...tpl.content.childNodes);
      tpl.content.replaceChildren(wrap);
    }
    return pretty(dropEmptyAttrValues(
      [...tpl.content.childNodes]
        .map((n) => (n.nodeType === 1 ? n.outerHTML : n.textContent))
        .join('\n'),
    ));
  };

  /** HTML pretty del demo sin chrome de la galería (botones, rótulos, modales). */
  const serializeDemoHtml = (demo) => {
    const wrap = document.createElement('div');
    for (const node of demo.childNodes) {
      if (node.nodeType === 1) {
        if (isSnippetChrome(node)) continue;
        wrap.appendChild(node.cloneNode(true));
      } else if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (t) wrap.appendChild(document.createTextNode(t));
      }
    }
    stripSnippetChrome(wrap);
    const parts = [];
    for (const node of wrap.childNodes) {
      if (node.nodeType === 1) parts.push(node.outerHTML);
      else if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (t) parts.push(t);
      }
    }
    return withSnippetContext(pretty(dropEmptyAttrValues(parts.join('\n'))));
  };

  /** `outerHTML` serializa los booleanos como `pill=""`. En HTML eso es lo
   *  mismo que `pill` a secas, que es como se escriben a mano y como se leen
   *  mejor en el snippet. Solo se quita el `=""`: un valor real no se toca. */
  const dropEmptyAttrValues = (html) => html.replace(/(\s[a-zA-Z][\w-]*)=""/g, '$1');

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

  const catOf = (t) => {
    const entry = manifest.find((c) => c.tag === `is-${t}` || c.tag === t);
    return entry?.category || 'helpers';
  };

  /** Fragmento mínimo: loader + L.load(tags del demo) + markup. */
  const buildSnippet = async (demo) => {
    const raw = demo.getAttribute('data-code');
    const inner = raw != null && raw !== ''
      ? withSnippetContext(raw.trim())
      : serializeDemoHtml(demo);

    const CDN = await cdnBase();
    const tags = collectTags(demo);
    const cssTags = tags.filter((t) => COMPONENTS_WITH_CSS.has(t));

    const lines = [];
    const urls = [`${CDN}/loader.min.js`, `${CDN}/is-base.min.css`, `${CDN}/palettes.min.css`];
    for (const t of cssTags) urls.push(`${CDN}/${catOf(t)}/${t}.min.css`);
    for (const t of tags) urls.push(`${CDN}/${catOf(t)}/${t}.min.js`);

    const args = tags.map((t) => JSON.stringify(`is-${t}`)).join(', ');
    lines.push(`<script type="module" src="${CDN}/loader.min.js"><\/script>`);
    lines.push('<script type="module">');
    lines.push('  const L = globalThis.ISWebComponentsLoader;');
    lines.push('  await L.loadCSSBase();');
    lines.push('  await L.loadCSSPalettesDefault();');
    if (args) lines.push(`  await L.load(${args});`);
    lines.push('<\/script>');

    const previewStyles = demo.closest('is-preview-component')?.preview?.definition?.styles ?? '';
    const styleCss = buildDemoSnippetStyles(inner, previewStyles);

    if (lines.length) lines.push('');
    if (styleCss) {
      lines.push('<style>');
      lines.push(styleCss);
      lines.push('</style>');
      lines.push('');
    }
    lines.push(inner);

    return { snippet: lines.join('\n'), urls };
  };

  const highlight = (el) => {
    if (!el.getAttribute('lang') && !el.getAttribute('data-lang')) {
      el.setAttribute('lang', 'html');
      el.setAttribute('data-lang', 'html');
    }
    delete el.dataset.cm;
    delete el.dataset.cmSource;
    paint(el).catch(console.error);
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
        <div class="demo-code-pop__meta">
          <span class="demo-code-pop__hint">loader.min.js</span>
          <span class="demo-code-pop__size" aria-live="polite"></span>
        </div>
        <is-copy-button class="demo-code-pop__copy" copy-label="Copiar" success-label="Copiado"
                        tooltip-placement="left"></is-copy-button>
      </div>
    `;

    /** Editor lazy: montar solo cuando el snippet existe, no al crear el dropdown. */
    let pre = null;
    const mountCodeEl = (snippet) => {
      if (pre?.isConnected) return pre;
      pre = document.createElement('is-code');
      pre.className = 'code demo-code-pop__pre is-code-view';
      pre.setAttribute('readonly', '');
      pre.setAttribute('compact', '');
      pre.setAttribute('wrap', '');
      pre.setAttribute('line-numbers', 'false');
      pre.setAttribute('lang', 'html');
      pre.dataset.src = snippet;
      pre.dataset.cmSource = snippet;
      pre.dataset.forceCm = '1';
      pre.setAttribute('value', snippet);
      pop.appendChild(pre);
      return pre;
    };

    const copyBtn = pop.querySelector('is-copy-button');
    const sizeEl = pop.querySelector('.demo-code-pop__size');
    let panelOpen = false;

    const renderSnippet = async () => {
      const { snippet, urls } = await buildSnippet(demo);
      copyBtn.setAttribute('value', snippet);
      await customElements.whenDefined('is-code');
      const codeEl = pre?.isConnected ? pre : mountCodeEl(snippet);
      const contentOk = () => (codeEl.value || codeEl.dataset.cmSource || codeEl.dataset.src || '').trim();
      if (!(codeEl.dataset.filled === '1' && codeEl.dataset.src === snippet && contentOk())) {
        codeEl.dataset.src = snippet;
        codeEl.dataset.cmSource = snippet;
        codeEl.dataset.forceCm = '1';
        delete codeEl.dataset.cm;
        codeEl.setAttribute('lang', 'html');
        codeEl.setAttribute('value', snippet);
        codeEl.value = snippet;
        await highlight(codeEl);
        codeEl.dataset.filled = '1';
        requestAnimationFrame(() => codeEl.refresh?.());
      }
      sizeEl.textContent = 'calculando peso…';
      const base = await cdnBase();
      const bytes = await totalCdnSize(urls, base);
      sizeEl.textContent = bytes == null ? '' : `≈ ${humanSize(bytes)}`;
    };

    /** Tema/paleta del preview cambiaron → invalidar cache y, si el panel
     *  está abierto, regenerar el snippet con los attrs actuales. */
    const onContextChange = () => {
      if (pre) {
        delete pre.dataset.filled;
        delete pre.dataset.src;
        delete pre.dataset.cmSource;
      }
      if (panelOpen) renderSnippet().catch(console.error);
    };

    // El snippet se calcula al abrir: el demo puede haber cambiado por JS.
    dd.addEventListener('is-show', () => {
      panelOpen = true;
      renderSnippet().catch(console.error);
    });
    dd.addEventListener('is-hide', () => { panelOpen = false; });

    document.addEventListener('is-theme-change', onContextChange);
    document.addEventListener('is-palette-change', onContextChange);
    const ctxObs = new MutationObserver(onContextChange);
    ctxObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-palette', 'class'],
    });

    dd.append(btn, pop);
    demo.append(dd);
  };

  // <is-demo> es un componente y no puede importar de `scripts/`, así que el
  // acople va por evento: al conectarse emite `is-demo-connected` (bubbles +
  // composed) y aquí lo recogemos. Se registra YA, antes del barrido inicial,
  // para no perder los que se conecten mientras tanto; `enhance()` es
  // idempotente (`data-code-ready`), así que un doble paso no molesta.
  document.addEventListener('is-demo-connected', (e) => {
    const el = e.target;
    if (el instanceof Element) enhance(el);
  });

  const boot = () => {
    document.querySelectorAll('.demo, is-demo').forEach(enhance);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
