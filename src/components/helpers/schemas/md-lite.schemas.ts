/**
 * Contratos de los hooks de render de `md-lite` / `<iswc-md-render>`.
 *
 * Cada elemento del markdown se describe con sus datos ya extraídos y pasa por
 * su renderer (si el consumidor definió uno). El renderer devuelve el HTML que
 * se monta; si devuelve `undefined`/`null`, se usa el render estándar. Recibe
 * además `porDefecto()`, el HTML estándar, para envolverlo o retocarlo.
 *
 *   md.renderers = {
 *     image: ({ src, alt }) => `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${alt}"></a>`,
 *     heading: (d, porDefecto) => d.level === 1 ? `<header class="portada">${porDefecto()}</header>` : undefined,
 *   };
 */

export interface DatosHeadingMd { tipo: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string; html: string; id: string }
export interface DatosParagraphMd { tipo: 'paragraph'; text: string; html: string }
export interface DatosImageMd { tipo: 'image'; src: string; alt: string; title: string }
export interface DatosLinkMd { tipo: 'link'; href: string; text: string; html: string; title: string; external: boolean }
export interface DatosCodeMd { tipo: 'code'; code: string }
export interface DatosCodeblockMd { tipo: 'codeblock'; lang: string; code: string }
export interface DatosTableMd {
  tipo: 'table';
  /** Celdas del encabezado (texto markdown tal cual). */
  header: string[];
  /** Matriz de filas × columnas (texto markdown tal cual). */
  rows: string[][];
  /** Alineación por columna: `left` | `center` | `right` | `''`. */
  aligns: string[];
  headerHtml: string[];
  rowsHtml: string[][];
}
export interface ItemListaMd { text: string; html: string; checked: boolean | null }
export interface DatosListMd { tipo: 'list'; ordered: boolean; start: number; items: ItemListaMd[] }
export interface DatosBlockquoteMd { tipo: 'blockquote'; text: string; html: string }
/** Aviso estilo GitHub: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`. */
export interface DatosCalloutMd { tipo: 'callout'; kind: 'note' | 'tip' | 'important' | 'warning' | 'caution'; title: string; text: string; html: string }
export interface DatosHrMd { tipo: 'hr' }
/** Una pestaña de imagen: el `alt` es su nombre. */
export interface TabImagenMd { label: string; src: string; title: string; html: string }
/**
 * Tabs de imágenes: entre dos `---`, solo líneas de imagen (2 o más). Cada imagen es una pestaña y
 * su `alt` el nombre. En markdown plano se lee como separadores con imágenes.
 */
export interface DatosTabsMd { tipo: 'tabs'; tabs: TabImagenMd[] }
export interface DatosHtmlMd { tipo: 'html'; html: string }
export interface DatosDiagramMd { tipo: 'diagram'; tag: string; json: string }

export interface DatosPorTipoMd {
  heading: DatosHeadingMd;
  paragraph: DatosParagraphMd;
  image: DatosImageMd;
  link: DatosLinkMd;
  code: DatosCodeMd;
  codeblock: DatosCodeblockMd;
  table: DatosTableMd;
  list: DatosListMd;
  blockquote: DatosBlockquoteMd;
  callout: DatosCalloutMd;
  hr: DatosHrMd;
  tabs: DatosTabsMd;
  html: DatosHtmlMd;
  diagram: DatosDiagramMd;
}

export type TipoElementoMd = keyof DatosPorTipoMd;

/** Hook de un tipo: HTML propio, o `undefined`/`null` para el estándar. */
export type RendererMd<K extends TipoElementoMd> = (datos: DatosPorTipoMd[K], porDefecto: () => string) => string | null | undefined;

export type RenderersMd = { [K in TipoElementoMd]?: RendererMd<K> };

export interface OpcionesMdLite {
  renderers?: RenderersMd;
  /**
   * Renders por defecto con componentes del kit (`true`, default): código → `iswc-code` +
   * `iswc-copy-button`, tabla → `iswc-scroller`, aviso → `iswc-callout`, `---` → `iswc-divider`,
   * imagen → `iswc-theme-img`, tarea → `iswc-checkbox`. `false`: HTML plano (superficie editable,
   * que se vuelve a serializar a markdown).
   */
  componentes?: boolean;
  /** Recibe los tags `iswc-*` que introdujeron los renders por defecto (no los de los hooks). */
  tags?: Set<string>;
}
