/**
 * Render de la definición tipada → DOM (sin ejecutar lógica de preview).
 */
import type {
  PreviewDefinition,
  PreviewSection,
  PreviewBlock,
} from './types.d.ts';

/**
 * Base de `dist/assets/` para el token `{assets}`.
 *
 * Una ruta relativa escrita en el JSON no puede acertar: los previews se pintan
 * desde `index.html` (raíz) y desde `src/previews/_shell.html`, y este módulo
 * se ejecuta tanto en fuente como inlineado en `dist/cdn/…`. Por eso la base se
 * deduce de la raíz del sitio, cortando la URL del módulo en `/src/` o
 * `/dist/cdn/`; así también acierta publicado (GitHub Pages, jsDelivr).
 *
 * Los assets viven **sólo** en `dist/assets/`: es lo que se publica y lo
 * que sirven Pages y jsDelivr. `src/assets/` se eliminó para no mantener dos
 * copias del mismo material.
 */
const RAIZ = (() => {
  const modulo = new URL(import.meta.url).href;
  const corte = modulo.search(/\/(?:dist\/cdn|src)\//);
  return corte > 0 ? modulo.slice(0, corte + 1) : new URL('./', modulo).href;
})();
const ASSETS = `${RAIZ}dist/assets/`;

/**
 * @param html
 * @returns
 */
export function resolveAssets(html: string): string {
  return typeof html === 'string' ? html.replaceAll('{assets}', ASSETS) : html;
}

/** Base64-url encode (sin padding) — mismo formato que `?s=` en gallery/app.ts. */
function b64urlEncode(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param html
 * @returns
 */
export function fragmentFromHtml(html: string): DocumentFragment {
  const tpl = document.createElement('template');
  tpl.innerHTML = resolveAssets(html).trim();
  return tpl.content.cloneNode(true) as DocumentFragment;
}

/**
 * @param block
 * @returns
 */
export function renderBlock(block: PreviewBlock): HTMLElement {
  switch (block.kind) {
    case 'lede': {
      const p = document.createElement('p');
      p.className = 'lede';
      p.innerHTML = resolveAssets(block.html);
      return p;
    }
    case 'demo': {
      const wrap = document.createElement('div');
      wrap.className = 'demo-block';
      const demo = document.createElement('iswc-demo');
      demo.className = 'demo';
      if (block.heading) demo.setAttribute('heading', block.heading);
      if (block.contain) demo.setAttribute('contain', '');
      if (block.noCode) demo.dataset.noCode = '';
      demo.append(fragmentFromHtml(block.html));
      wrap.append(demo);

      // Si el demo es un diagrama SVG (class/flowchart/state/etc),
      // agregar un enlace "Abrir en editor (new tab)" para que el usuario
      // pueda abrir el demo en su propia pestana desde la galeria/home.
      // Esto usa `window.open` con `noopener` para abrir el shell del demo
      // (mismo demo, contexto limpio, sin chrome de galeria).
      const m = /<iswc-([a-z0-9-]+)-(diagram|chart)|<iswc-(flowchart|gantt|mindmap|venn-diagram|sankey-diagram|state-diagram|sequence-diagram|swimlane-diagram|use-case-diagram|class-diagram|er-diagram|block-diagram|component-diagram|org-chart|radar-chart|scatter-chart|sparkline|treemap|waterfall-chart|polar-area-chart|funnel-chart|pie-chart|doughnut-chart|line-chart|bar-chart|quadrant-chart|journey-map|timeline)\b/.exec(block.html);
      if (m) {
        const tag = `iswc-${m[1] ? `${m[1]}-${m[2]}` : m[3]}`;
        const editorLink = document.createElement('a');
        editorLink.className = 'demo-block__editor-link';
        editorLink.href = `?s=${b64urlEncode(JSON.stringify({ component: tag }))}`;
        editorLink.target = '_blank';
        editorLink.rel = 'noopener';
        editorLink.textContent = 'Abrir editor en nueva pestaña ↗';
        editorLink.setAttribute('aria-label', `Abrir demo de ${tag} en nueva pestaña`);
        wrap.append(editorLink);
      }
      return wrap;
    }
    case 'callout': {
      const el = document.createElement('div');
      el.className = 'callout';
      el.innerHTML = resolveAssets(block.html);
      return el;
    }
    case 'code': {
      const ed = document.createElement('iswc-code');
      ed.className = 'code iswc-code-view';
      ed.setAttribute('readonly', '');
      ed.setAttribute('compact', '');
      ed.setAttribute('wrap', '');
      ed.setAttribute('line-numbers', 'false');
      const raw = block.code ?? '';
      // Sin data-cm: highlight-code.paint infiere lang + softFormat.
      // Si el JSON trae lang, lo fijamos; si no, iswc-code infiere al montar.
      if (block.lang) {
        ed.setAttribute('lang', block.lang);
        ed.dataset.lang = block.lang;
      }
      ed.setAttribute('value', raw);
      ed.dataset.cmSource = raw;
      return ed;
    }
    case 'html': {
      const wrap = document.createElement('div');
      wrap.append(fragmentFromHtml(block.html));
      return wrap;
    }
    case 'table': {
      const wrap = document.createElement('div');
      wrap.className = 'ref-wrap';
      if (block.captionHtml) {
        const cap = document.createElement('div');
        cap.innerHTML = resolveAssets(block.captionHtml);
        wrap.append(cap);
      }
      const table = document.createElement('table');
      table.className = block.className
        ? `ref ${block.className}`.trim()
        : 'ref';
      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      for (const col of block.columns) {
        const th = document.createElement('th');
        th.textContent = col;
        hr.append(th);
      }
      thead.append(hr);
      const tbody = document.createElement('tbody');
      for (const row of block.rows) {
        const tr = document.createElement('tr');
        for (const cell of row) {
          const td = document.createElement('td');
          td.innerHTML = resolveAssets(cell);
          tr.append(td);
        }
        tbody.append(tr);
      }
      table.append(thead, tbody);
      wrap.append(table);
      return wrap;
    }
    default: {
      const _exhaustive = /** @type {never} */ (block);
      void _exhaustive;
      const err = document.createElement('p');
      err.textContent = `Bloque desconocido`;
      return err;
    }
  }
}

/** Indice: texto plano. Un titulo que es solo un tag no cae en el id. */
function etiquetaIndice(title: string, id: string): string {
  const decoded = title
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&');
  const plano = decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plano) return plano;
  return id === 'intro' ? 'Uso' : id;
}

/** Escapa &, <, > y " para meter texto en HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * titleHtml solo vale si hay markup de verdad (code/span/…). Un título que es
 * el tag del CE (`<iswc-button>` o `&lt;iswc-button&gt;`) SIEMPRE va por
 * textContent: con innerHTML el navegador monta el custom element y el H2
 * queda vacío.
 */
const TITLE_HTML_OK = new Set([
  'code', 'span', 'strong', 'em', 'b', 'i', 'small', 'br', 'kbd', 'samp',
]);

function titleHtmlSeguro(html: string): string {
  return html.replace(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g, (m, name: string) => {
    if (TITLE_HTML_OK.has(name.toLowerCase())) return m;
    return escapeHtml(m);
  });
}

/** `&lt;iswc-x&gt;` → `<iswc-x>` para pintar como texto. */
function textoTitulo(title: string): string {
  return title
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&');
}

function tituloConMarkupSeguro(title: string): boolean {
  return /<\/?(?:code|span|strong|em|b|i|small|br|kbd|samp)\b/i.test(title);
}

/** H2: texto por defecto. HTML solo con markup seguro explícito. */
function pintarTitulo(h2: HTMLElement, title: string, asHtml?: boolean): void {
  if (asHtml && tituloConMarkupSeguro(title)) {
    h2.innerHTML = titleHtmlSeguro(title);
    return;
  }
  const plano = textoTitulo(title);
  h2.textContent = plano;
  // `<iswc-x>` / `<paty-x>` → tipografía mono de tag.
  if (/^<[\w-]+>(?:\s|$)/.test(plano) || /^<[\w-]+>\s*\+/.test(plano)) {
    h2.classList.add('section__tag-title');
  }
}

/** Contenedores permitidos para una sección: nunca un tag arbitrario del JSON. */
const CONTENEDORES = new Set(['section', 'aside']);

/**
 * @param section
 * @returns
 */
export function renderSection(section: PreviewSection): HTMLElement {
  const tag: 'section' | 'aside' = CONTENEDORES.has(section.as ?? '') && section.as
    ? section.as
    : 'section';
  const el = document.createElement(tag);
  el.className = section.className ? `section ${section.className}` : 'section';
  el.id = section.id;
  if (section.ariaLabel) el.setAttribute('aria-label', section.ariaLabel);
  if (section.ariaLabelledby) el.setAttribute('aria-labelledby', section.ariaLabelledby);
  if (section.role) el.setAttribute('role', section.role);

  // `hideTitle` es para las secciones cuyo markup ya trae su encabezado: pintar
  // el <h2> del chrome encima duplicaría el título de la página.
  if (!section.hideTitle) {
    const h2 = document.createElement('h2');
    pintarTitulo(h2, section.title, section.titleHtml === true);
    el.append(h2);
  }

  if (section.lede) {
    const p = document.createElement('p');
    p.className = 'lede';
    p.innerHTML = resolveAssets(section.lede);
    el.append(p);
  }

  for (const block of section.blocks) {
    el.append(renderBlock(block));
  }
  return el;
}

/**
 * @param def
 * @param targets
 */
export function renderDefinition(def: PreviewDefinition, targets: { main: HTMLElement; aside: HTMLElement }): void {
  const { main, aside } = targets;
  main.replaceChildren();
  aside.replaceChildren();

  // Las clases del preview anterior se retiran antes de poner las nuevas: el
  // `iswc-main` lo reusa el chrome entre previews, así que una clase de página
  // completa se quedaría pegada al siguiente componente.
  const previas = main.dataset.previewMainClass;
  if (previas) main.classList.remove(...previas.split(' '));
  delete main.dataset.previewMainClass;
  const clases = (def.mainClass ?? '').split(/\s+/).filter(Boolean);
  if (clases.length) {
    main.classList.add(...clases);
    main.dataset.previewMainClass = clases.join(' ');
  }

  const destino = def.wrapperClass ? document.createElement('div') : main;
  if (destino !== main) destino.className = def.wrapperClass ?? '';

  // El prelude va DENTRO del wrapper: es donde se declaran las custom
  // properties de la página, y fuera de ahí un `var(--propia)` queda vacío.
  if (def.prelude) destino.append(fragmentFromHtml(def.prelude));

  for (const section of def.sections) {
    // def.title es el H2 visible del intro (tag del componente). El JSON
    // suele dejar section.title="Uso" solo para el TOC.
    // Nunca inferir titleHtml por `/<…>/`: eso montaba el CE en el H2.
    const sec =
      section.id === 'intro' && def.title
        ? {
            ...section,
            title: def.title,
            // Solo HTML si el def lo pide Y trae markup seguro (span/code…).
            titleHtml: def.titleHtml === true && tituloConMarkupSeguro(def.title),
          }
        : section;
    destino.append(renderSection(sec));
  }
  if (destino !== main) main.append(destino);

  // Una sola seccion no tiene indice: el panel derecho quedaria vacio.
  if (def.withoutToc || def.sections.length < 2) return;

  const h1 = document.createElement('h1');
  h1.textContent = def.tag;
  aside.append(h1);

  const spy = document.createElement('iswc-scrollspy');
  spy.setAttribute('target', 'iswc-main');
  for (const section of def.sections) {
    const a = document.createElement('a');
    a.href = `#${section.id}`;
    // TOC: intro con tag HTML → etiqueta "Uso"; resto usa section.title.
    const tocTitle =
      section.id === 'intro' && def.title ? def.title : section.title;
    a.textContent = etiquetaIndice(tocTitle, section.id);
    spy.append(a);
  }
  aside.append(spy);
}
