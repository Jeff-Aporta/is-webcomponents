/**
 * Render de la definición tipada → DOM (sin ejecutar lógica de preview).
 */
import type {
  PreviewDefinition,
  PreviewSection,
  PreviewBlock,
} from './types.d.ts';
import '../../components/preview/demo-section.js';

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
 * Phase W38 — el orden del TOC es EXACTAMENTE el orden de las `sections`
 * en el `def` (content order). Antes el algoritmo hacía dos pasadas:
 *   1) Por cada entrada estándar en orden canónico, buscaba la primera
 *      sección que encajara. Esto reordenaba el TOC para que las 7
 *      secciones canónicas (Atributos → Custom states → … → Métodos)
 *      aparecieran en orden fijo aunque el JSON las declarara mezcladas.
 *   2) Las secciones restantes se añadían en su orden del JSON.
 *
 * El usuario pidió que el orden del TOC coincidiera EXACTAMENTE con el
 * orden del content. La nueva política:
 *   - Se itera `def.sections` en orden (content order).
 *   - Para cada sección navegable (no excluida), se busca la primera
 *     entrada de `STANDARD_TOC` (en orden canónico) que matchee por id o
 *     título. Si hay match, se usa la etiqueta canónica (Phase O:
 *     coherencia visual entre componentes).
 *   - Si NO hay match con ninguna entrada estándar, se usa `section.title
 *     || section.id` como fallback (Phase W1: secciones navegables no
 *     estándar que el `.md` declara con títulos propios, ej.
 *     `Variantes`, `Con iconos`, `Loading`).
 *
 * Importante: el matching se hace entrada-por-entrada en orden canónico
 * (no id-primero-luego-título). Esto preserva la convención del Phase O
 * donde una sección con `id="methods"` y `title="API JavaScript"` se
 * etiqueta como "API JavaScript" (match por título contra la entrada
 * "API JavaScript", que está antes que la entrada "Métodos" en el
 * estándar canónico).
 *
 * Casos históricos que esto arregla:
 *   - `iswc-button-group` con solo `api` → antes TOC vacío por el
 *     umbral `< 2`. Ahora el panel muestra la sección.
 *   - `iswc-button` con secciones reales no canónicas → antes faltaban.
 *     Ahora aparecen con su título original, en el orden del JSON.
 */
export function standardTocSections(def: PreviewDefinition): { section: PreviewSection; label: string }[] {
  if (!def || !Array.isArray(def.sections)) return [];
  const out: { section: PreviewSection; label: string }[] = [];
  const used = new Set<string>();

  for (const section of def.sections) {
    if (!section || !section.id || used.has(section.id)) continue;
    if (EXCLUDED_FROM_TOC.has(normId(section.id))) continue;
    const idN = normId(section.id);
    const titleN = normTitle(section.title || '');
    let label: string | null = null;
    // Matching entrada-por-entrada en orden canónico (Phase O). Esto
    // preserva la precedencia "API JavaScript" sobre "Métodos" cuando
    // una sección tiene id="methods" y title="API JavaScript": la
    // entrada "API JavaScript" está antes en `STANDARD_TOC` y matchea
    // por título, ganando a la entrada "Métodos" (que matchearía por id).
    for (const entry of STANDARD_TOC) {
      if (entry.ids.includes(idN) || (titleN && entry.titles.includes(titleN))) {
        label = entry.label;
        break;
      }
    }
    // Pasada 2 (Phase W1): si la sección no encaja con ninguna entrada
    // estándar del Phase O, usamos su `title` (o `id`) original para no
    // perder la navegación. Mantiene el orden del JSON.
    out.push({ section, label: label || section.title || section.id });
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

/**
 * @param section
 * @returns
 */
export function renderSection(section: PreviewSection): HTMLElement {
  // Phase W32 (zod-migration): homogeneidad visual de TODAS las secciones de
  // los demos. El wrapper `<iswc-demo-section>` proyecta el header (title +
  // lede) fuera y el contenido dentro de una card. Las clases `section`,
  // `id`, y atributos ARIA siguen en el host para que las reglas de
  // `presentation.css` (`.section h2`, `.section:first-of-type h2::after`, …)
  // sigan aplicando al header flotante.
  const wrapper = document.createElement('iswc-demo-section');
  wrapper.className = section.className ? `section ${section.className}` : 'section';
  wrapper.id = section.id;
  if (section.ariaLabel) wrapper.setAttribute('aria-label', section.ariaLabel);
  if (section.ariaLabelledby) wrapper.setAttribute('aria-labelledby', section.ariaLabelledby);
  if (section.role) {
    wrapper.setAttribute('role', section.role);
  } else if (section.as === 'aside') {
    // Conserva el semántico del JSON original: `<aside>` es landmark
    // `complementary`. Como ahora es un custom element, lo declaramos
    // explícito para no perder el landmark.
    wrapper.setAttribute('role', 'complementary');
  }

  // `hideTitle` es para las secciones cuyo markup ya trae su encabezado:
  // pintar el <h2> del chrome encima duplicaría el título de la página.
  if (!section.hideTitle) {
    const h2 = document.createElement('h2');
    h2.setAttribute('slot', 'title');
    pintarTitulo(h2, section.title, section.titleHtml === true);
    wrapper.append(h2);
  }

  if (section.lede) {
    const p = document.createElement('p');
    p.className = 'lede';
    p.setAttribute('slot', 'lede');
    p.innerHTML = resolveAssets(section.lede);
    wrapper.append(p);
  }

  for (const block of section.blocks) {
    wrapper.append(renderBlock(block));
  }
  return wrapper;
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

  // Phase W21 (zod-migration): si el JSON declara `examples` (tipado con
  // `ExampleSchema`/`ExamplesSchema` de `section-schema.ts`), inyectamos el
  // array en cada `<iswc-examples-carousel>` renderizado dentro del main.
  // El setter del carousel acepta tanto la forma legacy (`label`) como la
  // nueva (`name`) y normaliza, así que demos viejos y nuevos funcionan con
  // el mismo punto de entrada.
  if (Array.isArray(def.examples) && def.examples.length) {
    const carousels = main.querySelectorAll<HTMLElement>('iswc-examples-carousel');
    for (const c of carousels) {
      // Asignamos por la API pública; el setter dispara #render() si el
      // elemento ya está conectado al DOM.
      try {
        (c as unknown as { examples: unknown[] }).examples = def.examples;
      } catch (err) {
        // No propagamos: si un carousel concreto revienta, los demás siguen.
        console.warn('[renderDefinition] carousel no aceptó examples', err);
      }
    }
  }

  // Una sola seccion no tiene indice: el panel derecho quedaria vacio.
  if (def.withoutToc) return;

  // Phase W38: el TOC siempre tiene un header visible con el nombre del
  // componente en MAYÚSCULAS (p.ej. "ISWC-BUTTON"). Aunque no haya items
  // navegables, el panel derecho nunca queda sin título. La transformación
  // a mayúsculas la hace CSS (`text-transform: uppercase` en `.sidebar h1`);
  // aquí mandamos el tag en mayúsculas explícitamente para que el `textContent`
  // refleje el contrato aunque alguien desactive la regla de estilo.
  const h1 = document.createElement('h1');
  h1.textContent = (def.tag || '').toUpperCase();
  aside.append(h1);

  // Sin secciones: el panel queda solo con el título, sin scrollspy.
  if (def.sections.length < 1) return;

  // Phase O + W1 + W38: el TOC de la derecha lista las secciones de
  // "Referencia completa" (Atributos, Custom states, Eventos, Slots, CSS
  // Parts, API JavaScript, Métodos) con etiqueta canónica + cualquier otra
  // sección navegable del JSON (Anatomía/Ejemplos/Intro siguen excluidas).
  // Phase W38: el orden del TOC es EXACTAMENTE el orden de las sections
  // en el `def` (content order). Antes el algoritmo hacía dos pasadas
  // que reordenaban al estándar canónico; ahora `standardTocSections`
  // itera el JSON en orden para que el panel derecho refleje 1:1 el
  // orden del main content.
  const toc = standardTocSections(def);
  if (toc.length < 1) return;

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
