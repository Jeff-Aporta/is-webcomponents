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
 * Es un módulo ES: importa lo que necesita (manifest, cdn-ref, el pintor y los
 * componentes del chrome) en vez de leerlo de `window.__*`.
 */
import '../src/components/media/icon.js';
import '../src/components/actions/dropdown.js';
import '../src/components/actions/copy-button.js';
import '../src/components/navigation/tab-group.js';
import './highlight-pre.js';
import { ensureCodeMirror, paint } from '../src/components/_shared/highlight-code.js';
import { resolveRef, jsdelivrBase } from '../src/components/_shared/cdn-ref.js';
import manifest from '../manifest.js';

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

  /** Tamaño humano-legible: 812 → "812 B", 12800 → "12.5 KB". */
  const humanSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  /** sizes.json lo emite el build: {ruta relativa a dist/cdn → bytes}. Se pide
   *  UNA vez (promesa cacheada) en vez de un HEAD por archivo, que era lento y
   *  jsDelivr no siempre responde con Content-Length. */
  let sizesPromise = null;
  const loadSizes = () => {
    sizesPromise ??= cdnBase()
      .then((base) => fetch(`${base}/sizes.json`))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    return sizesPromise;
  };

  /** Suma el peso REAL de lo que descarga el snippet. `all.min.js` y los
   *  `category.*.min.js` son sólo listas de imports (~250 B), así que sumar la
   *  url literal daría el resultado al revés: "all" saldría como el más
   *  liviano. Aquí se expanden a los archivos que acaban bajando. */
  const totalSize = async (urls) => {
    const sizes = await loadSizes();
    const keys = Object.keys(sizes);
    if (!keys.length) return null;

    const paths = new Set();
    const isComponentJs = (k) => /^[^/]+\/[^/]+\.min\.js$/.test(k) && !/\/category\./.test(k);
    for (const url of urls) {
      const path = url.replace(/^https:\/\/cdn\.jsdelivr\.net\/gh\/[^@]+@[^/]+\/dist\/cdn\//, '');
      paths.add(path);
      if (path === 'all.min.js') {
        for (const k of keys) if (isComponentJs(k)) paths.add(k);
      } else {
        const cat = path.match(/^([^/]+)\/category\.[^/]+\.min\.js$/)?.[1];
        if (cat) for (const k of keys) if (isComponentJs(k) && k.startsWith(`${cat}/`)) paths.add(k);
      }
    }

    const known = [...paths].map((p) => sizes[p]).filter((s) => typeof s === 'number');
    if (!known.length) return null;
    return known.reduce((a, b) => a + b, 0);
  };

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

  /** Niveles de minimalidad del snippet, del más al menos granular. */
  const LEVELS = ['component', 'category', 'all'];
  const DEFAULT_LEVEL = 'all';

  /** Cuántos <script> emite cada nivel para los tags de un demo. Es lo único
   *  que los diferencia ahora que el CSS no se enlaza: sirve de badge en los
   *  tabs para que se vea el trade-off (menos archivos ↔ más peso). */
  const levelScriptCount = (tags, level) => {
    if (level === 'all') return 1;
    if (level === 'category') return new Set(tags.map(catOf)).size;
    return tags.length;
  };

  // dist/cdn folderizado: cada componente vive en <categoria>/<tag>.min.js.
  const catOf = (t) => {
    const entry = manifest.find((c) => c.tag === `is-${t}` || c.tag === t);
    return entry?.category || 'helpers';
  };

  /** Fragmento mínimo: dependencias del CDN arriba, markup del ejemplo debajo.
   *  `level` controla cuánto se agrupan los `<script>`/`<link>` de los
   *  componentes detectados: "component" (uno por tag, default), "category"
   *  (un bundle por categoría única) o "all" (el bundle global). Devuelve
   *  también `urls`: las direcciones usadas, para poder sumar su peso. */
  const buildSnippet = async (demo, level = DEFAULT_LEVEL) => {
    const raw = demo.getAttribute('data-code');
    const inner = raw != null && raw !== ''
      ? withSnippetContext(raw.trim())
      : serializeDemoHtml(demo);

    const CDN = await cdnBase();
    const tags = collectTags(demo);
    const cssTags = tags.filter((t) => COMPONENTS_WITH_CSS.has(t));

    const lines = [];
    const urls = [];
    const pushCss = (href) => { lines.push(`<link rel="stylesheet" href="${href}">`); urls.push(href); };
    const pushJs = (src) => { lines.push(`<script type="module" src="${src}"><\/script>`); urls.push(src); };

    pushCss(`${CDN}/is-base.min.css`);
    // Sólo hay un palettes.min.css con las 3 paletas juntas (no hay archivo
    // por paleta), así que siempre se referencia entero.
    pushCss(`${CDN}/palettes.min.css`);

    // El .min.css de cada componente NO se enlaza: adoptCss() lo carga solo
    // en el shadow leyendo la ruta hermana del .min.js. Igual pesa, así que
    // entra en el cálculo aunque no aparezca en el snippet.
    for (const t of cssTags) urls.push(`${CDN}/${catOf(t)}/${t}.min.css`);

    if (level === 'all') {
      pushJs(`${CDN}/all.min.js`);
    } else if (level === 'category') {
      const cats = [...new Set(tags.map(catOf))].sort();
      for (const c of cats) pushJs(`${CDN}/${c}/category.${c}.min.js`);
    } else {
      // Los módulos ya son diferidos: no hace falta `defer` ni ponerlos al final.
      for (const t of tags) pushJs(`${CDN}/${catOf(t)}/${t}.min.js`);
    }

    if (lines.length) lines.push('');
    lines.push(inner);

    return { snippet: lines.join('\n'), urls };
  };

  const highlight = (pre) => {
    if (!pre.getAttribute('data-lang')) pre.setAttribute('data-lang', 'html');
    delete pre.dataset.cm;
    // paintOne() prioriza dataset.cmSource sobre textContent: si queda el del
    // render anterior, al cambiar de nivel se repinta el snippet viejo.
    delete pre.dataset.cmSource;
    // Si el panel se abre antes de que CodeMirror termine de bajar, pintamos
    // en cuanto esté: `paint()` sale sin hacer nada si aún no cargó.
    ensureCodeMirror().then(() => paint(pre)).catch(console.error);
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
          <is-tab-group class="demo-code-pop__level" active="${DEFAULT_LEVEL}" activation="manual"
                         without-scroll-controls aria-label="Nivel de agrupado">
            ${LEVELS.map((id) => `<is-tab slot="nav" panel="${id}">${id}<span slot="end" class="demo-code-pop__count" data-level="${id}"></span></is-tab>`).join('')}
          </is-tab-group>
          <span class="demo-code-pop__size" aria-live="polite"></span>
        </div>
        <is-copy-button class="demo-code-pop__copy" copy-label="Copiar" success-label="Copiado"
                        tooltip-placement="left"></is-copy-button>
      </div>
      <pre class="code demo-code-pop__pre"></pre>
    `;

    const pre = pop.querySelector('pre');
    const copyBtn = pop.querySelector('is-copy-button');
    const sizeEl = pop.querySelector('.demo-code-pop__size');
    const levelTabs = pop.querySelector('.demo-code-pop__level');
    let level = DEFAULT_LEVEL;
    let panelOpen = false;

    const renderSnippet = async () => {
      const tags = collectTags(demo);
      for (const el of pop.querySelectorAll('.demo-code-pop__count')) {
        const n = levelScriptCount(tags, el.dataset.level);
        el.textContent = n;
        el.title = `${n} ${n === 1 ? 'script' : 'scripts'}`;
      }
      const { snippet, urls } = await buildSnippet(demo, level);
      copyBtn.setAttribute('value', snippet);
      if (!(pre.dataset.filled === '1' && pre.dataset.src === snippet)) {
        pre.textContent = snippet;
        pre.dataset.src = snippet;
        delete pre.dataset.cm;
        highlight(pre);
        pre.dataset.filled = '1';
      }
      sizeEl.textContent = 'calculando peso…';
      const bytes = await totalSize(urls);
      sizeEl.textContent = bytes == null ? '' : `≈ ${humanSize(bytes)}`;
    };

    /** Tema/paleta del preview cambiaron → invalidar cache y, si el panel
     *  está abierto, regenerar el snippet con los attrs actuales. */
    const onContextChange = () => {
      delete pre.dataset.filled;
      delete pre.dataset.src;
      if (panelOpen) renderSnippet().catch(console.error);
    };

    levelTabs.addEventListener('is-tab-show', (e) => {
      if (e.detail.name === level) return;
      level = e.detail.name;
      delete pre.dataset.filled;
      delete pre.dataset.src;
      renderSnippet().catch(console.error);
    });

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
