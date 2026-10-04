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

/* --------------------------------------------------------------------------
 * TOC estándar: las 7 secciones de "Referencia completa" del doc de un
 * componente (Phase O). Anatomía y Ejemplos se quedan en el main content.
 *
 * El detector mira primero el `id` (forma normalizada, sin separadores) y
 * luego el `title` (case-insensitive, normalizado). Si una sección empareja
 * con uno de los 7 ids, va al TOC con la etiqueta canónica (no la del .md).
 *
 * El orden del array es el orden estricto del estándar del usuario. Aunque
 * el orden del `.md` manda dentro del main, en el TOC fijamos este orden
 * para que siempre sea: Atributos → Custom states → Eventos → Slots → CSS
 * Parts → API JavaScript → Métodos. Esto evita que un componente que pone
 * "API" antes que "Estados" rompa la coherencia entre docs.
 * ------------------------------------------------------------------------*/
export interface StandardTocEntry {
  /** Etiqueta canónica del TOC. */
  readonly label: string;
  /** Ids equivalentes (normalizados a `[a-z0-9]`). */
  readonly ids: readonly string[];
  /** Títulos equivalentes (case-insensitive). */
  readonly titles: readonly string[];
}

/** 7 secciones estándar del TOC. Exportado para tests. */
export const STANDARD_TOC: readonly StandardTocEntry[] = [
  { label: 'Atributos / propiedades', ids: ['atributos', 'attributes', 'attrs', 'props', 'propiedades'], titles: ['atributos', 'atributo', 'attributes', 'attrs', 'props', 'propiedades', 'propiedad'] },
  { label: 'Custom states',           ids: ['states', 'customstates', 'estados'],               titles: ['custom states', 'states', 'estados'] },
  { label: 'Eventos',                 ids: ['eventos', 'events'],                                                 titles: ['eventos', 'events'] },
  { label: 'Slots',                   ids: ['slots'],                                                              titles: ['slots'] },
  { label: 'CSS Parts',               ids: ['parts', 'partes', 'cssparts'],                                       titles: ['css parts', 'parts', 'partes'] },
  { label: 'API JavaScript',          ids: ['apijs', 'api', 'apijavascript', 'jsapi', 'javascriptapi'],           titles: ['api javascript', 'api', 'javascript api', 'js api'] },
  { label: 'Métodos',                 ids: ['methods', 'metodos'],                                                titles: ['métodos', 'methods', 'metodos'] },
];

/** Ids / títulos que viven en main content y NO entran al TOC. */
export const EXCLUDED_FROM_TOC: ReadonlySet<string> = new Set([
  'anatomy', 'anatomia', 'anatomía',
  'examples', 'ejemplos', 'example',
  'intro', // el intro es bienvenida, no referencia
]);

function normId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normTitle(title: string): string {
  return title.toLowerCase().trim();
}

/**
 * Devuelve la entrada estándar del TOC si la sección empareja. `null` en
 * otro caso (no es sección de referencia o va en el main content).
 */
export function matchStandardToc(section: PreviewSection): StandardTocEntry | null {
  if (!section || !section.id) return null;
  if (EXCLUDED_FROM_TOC.has(normId(section.id))) return null;
  const idN = normId(section.id);
  const titleN = normTitle(section.title || '');
  for (const entry of STANDARD_TOC) {
    if (entry.ids.includes(idN)) return entry;
  }
  if (titleN) {
    for (const entry of STANDARD_TOC) {
      if (entry.titles.includes(titleN)) return entry;
    }
  }
  return null;
}

/**
 * Devuelve las secciones que forman el TOC de la derecha.
 *
 * Phase W1 — antes este helper solo incluía las 7 secciones estándar. Esto
 * rompía dos casos:
 *   1. Componentes con `<2` secciones estándar (ej. `iswc-button-group` con
 *      solo `api`) — el TOC quedaba vacío por el umbral `< 2`.
 *   2. Componentes cuyas secciones reales del `.md` no encajan con las
 *      7 canónicas (ej. `iswc-button` perdía Anatomía/Atributos/Slots
 *      porque viven dentro de `reference` como sub-headings).
 *
 * Nueva política:
 *   - Pasada 1: por cada entrada estándar en orden canónico, si alguna
 *     sección del JSON encaja por id o título, se añade con etiqueta
 *     canónica (Phase O). Esto mantiene la coherencia visual.
 *   - Pasada 2: cualquier sección restante que NO esté en
 *     `EXCLUDED_FROM_TOC` se añade con su `title` (o `id`) original.
 *     El TOC pasa a reflejar la realidad del `.md` sin obligar a renombrar
 *     secciones a las 7 canónicas.
 *   - El umbral de "TOC se renderiza" baja de `< 2` a `< 1`: con una sola
 *     entrada el panel derecho ya muestra item.
 */
export function standardTocSections(def: PreviewDefinition): { section: PreviewSection; label: string }[] {
  if (!def || !Array.isArray(def.sections)) return [];
  const out: { section: PreviewSection; label: string }[] = [];
  const used = new Set<string>();

  // Pasada 1 — secciones estándar en orden canónico.
  for (const entry of STANDARD_TOC) {
    for (const section of def.sections) {
      if (!section || !section.id || used.has(section.id)) continue;
      if (EXCLUDED_FROM_TOC.has(normId(section.id))) continue;
      const idN = normId(section.id);
      const titleN = normTitle(section.title || '');
      if (entry.ids.includes(idN) || (titleN && entry.titles.includes(titleN))) {
        out.push({ section, label: entry.label });
        used.add(section.id);
        break;
      }
    }
  }

  // Pasada 2 — secciones restantes (no excluidas), en su orden del JSON.
  for (const section of def.sections) {
    if (!section || !section.id || used.has(section.id)) continue;
    if (EXCLUDED_FROM_TOC.has(normId(section.id))) continue;
    out.push({ section, label: section.title || section.id });
    used.add(section.id);
  }

  return out;
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

  // Phase O + W1: el TOC de la derecha lista las secciones de "Referencia
  // completa" (Atributos, Custom states, Eventos, Slots, CSS Parts, API
  // JavaScript, Métodos) con etiqueta canónica + cualquier otra sección
  // navegable del JSON (Anatomía/Ejemplos siguen excluidas). El orden
  // canónico del estándar se mantiene primero aunque el `.md` los
  // ponga en otro orden — así el índice es coherente entre componentes.
  //
  // Antes el umbral era `< 2`: si un componente declaraba solo `api`,
  // el panel quedaba vacío. Ahora es `< 1`: cualquier sección navegable
  // arma el TOC, lo que arregla `iswc-button-group` (solo `api`) y
  // cualquier componente con secciones no estándar.
  const toc = standardTocSections(def);
  if (toc.length < 1) return;

  const h1 = document.createElement('h1');
  h1.textContent = def.tag;
  aside.append(h1);

  // El scroll-spy ya da feedback de "estoy en esta sección" vía
  // `aria-current="location"` + clase iswc-scrollspy-active. El sidebar
  // padre tiene `overflow-y: auto` y el h1 es sticky (presentation.css), así
  // que la posición se mantiene visible al hacer scroll del main.
  const spy = document.createElement('iswc-scrollspy');
  spy.setAttribute('target', 'iswc-main');
  spy.classList.add('docs-toc');
  for (const { section, label } of toc) {
    const a = document.createElement('a');
    a.href = `#${section.id}`;
    // Etiqueta canónica (no la del .md) para que el TOC sea coherente
    // aunque el componente declare un id/título no estándar (ej. "Estados"
    // → "Custom states").
    a.textContent = label;
    a.dataset.tocKey = label;
    spy.append(a);
  }
  aside.append(spy);
}
