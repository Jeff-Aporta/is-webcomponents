/**
 * Tipos del sistema de previews homogeneizados (JSON + componente común).
 *
 * Contrato:
 * - La ESTRUCTURA es `PreviewDefinition` serializable en JSON (un archivo por tag).
 * - El COMPORTAMIENTO nunca va en el JSON: vive en `behaviors/<tag>.js` (mount/unmount)
 *   o en una clase que extiende ISComponentPreview. Sin eval / new Function.
 */

export type PreviewBlockKind = 'demo' | 'callout' | 'code' | 'html' | 'table' | 'lede';

export interface PreviewDemoBlock {
  kind: 'demo';
  /** Markup del ejemplo (string HTML estático; el comportamiento se cablea en mount). */
  html: string;
  /**
   * HTML puro equivalente (sin tags `is-*`): documentación del mapeo mental
   * nativo/ARIA. Se pinta debajo del demo como sección fija.
   */
  equivHtml?: string;
  /** Nota corta bajo el título de la sección equivalente. */
  equivNote?: string;
  /**
   * Markup opcional (p. ej. `<iswc-flowchart>…`) que aclara ramas cuando hay
   * varios HTML distintos según el caso. Va debajo del `<pre>` equivalente.
   */
  equivFlow?: string;
  /** Desactiva botón "Ver código" de demo-code.js */
  noCode?: boolean;
  contain?: boolean;
  heading?: string;
}

export interface PreviewCalloutBlock {
  kind: 'callout';
  html: string;
}

export interface PreviewCodeBlock {
  kind: 'code';
  code: string;
  lang?: string;
}

export interface PreviewHtmlBlock {
  kind: 'html';
  html: string;
}

export interface PreviewCodeEjemploCell {
  /** Celda de tabla: disclosure + <iswc-code> copiable. */
  kind: 'code-ejemplo';
  /** Fuente del snippet (preferir HTML autocontenido). */
  code: string;
  /** Lenguaje de iswc-code (default html). */
  lang?: string;
  /** Texto del summary del disclosure (default "Ejemplo"). */
  summary?: string;
}

export type PreviewTableCell = string | PreviewCodeEjemploCell;

export interface PreviewTableBlock {
  kind: 'table';
  columns: string[];
  rows: PreviewTableCell[][];
  /** HTML opcional encima de la tabla */
  captionHtml?: string;
  /** Clases extra del `<table>` (además de `ref`). Ej. `ref--tokens`. */
  className?: string;
}

export interface PreviewLedeBlock {
  kind: 'lede';
  html: string;
}

export type PreviewBlock =
  | PreviewDemoBlock
  | PreviewCalloutBlock
  | PreviewCodeBlock
  | PreviewHtmlBlock
  | PreviewTableBlock
  | PreviewLedeBlock;

export interface PreviewSection {
  id: string;
  title: string;
  /**
   * Si true, title se inserta como HTML (p. ej. `<code>` / `<span>`).
   * Tags CE (`<iswc-*>`, `<paty-*>`) y el resto se escapan a `&lt;…&gt;`.
   * Default: texto (`textContent`).
   */
  titleHtml?: boolean;
  /**
   * No pintar el <h2> del chrome: el markup de la sección ya trae su propio
   * encabezado. `title` sigue siendo obligatorio porque es la etiqueta del TOC.
   */
  hideTitle?: boolean;
  /** Elemento contenedor. Default 'section'. */
  as?: 'section' | 'aside';
  /** Clases del contenedor, además de `section`. */
  className?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  /**
   * `role` ARIA opcional para la sección. Útil para que secciones con nombre
   * accesible se conviertan en landmark `region` (o cualquier otro rol válido).
   * Si se omite, el navegador deriva el rol implícito del tag (`<section>` /
   * `<aside>`) y solo lo expone como landmark cuando hay `aria-label` o
   * `aria-labelledby` definido.
   */
  role?: string;
  lede?: string;
  blocks: PreviewBlock[];
}

/**
 * Documento JSON canónico por tag: `src/previews/<cat>/<tag>.json`
 * Todos los previews comparten esta interface (homogeneidad).
 */
export interface PreviewDefinition {
  /** Schema id — siempre "iswc-preview/v1" */
  $schema: 'iswc-preview/v1';
  /** Tag del catálogo (manifest), p. ej. iswc-button-group */
  tag: string;
  /** Categoría (carpeta bajo previews/) */
  category: string;
  /**
   * Título visible del H2 intro. Con titleHtml: markup seguro (`code`/`span`);
   * tags CE se escapan a `&lt;…&gt;`. Sin titleHtml: textContent.
   */
  title: string;
  titleHtml?: boolean;
  description?: string;
  /** CSS local del preview (string de estilos, no comportamiento). */
  styles?: string;
  /** Clave remember-scroll de iswc-main */
  storageKey?: string;
  /**
   * Clases extra para el `iswc-main` del chrome. Una página completa (el home)
   * necesita marcar su propio scroller: su CSS y su behavior lo seleccionan.
   */
  mainClass?: string;
  /**
   * Clase del contenedor que envuelve TODAS las secciones. Es donde una página
   * declara sus custom properties: sin este nodo, un `var(--propia)` queda
   * vacío y la declaración que lo usa se descarta sin avisar.
   */
  wrapperClass?: string;
  /** HTML fijo antes del wrapper (p. ej. la barra de progreso de lectura). */
  prelude?: string;
  /**
   * Si true, el registry carga `behaviors/<tag>.js` con export mount/unmount.
   * No poner lógica en el JSON.
   */
  hasBehavior?: boolean;
  /**
   * Si true, el chrome no pinta TOC ni reserva el panel derecho del split
   * (p. ej. home a ancho completo). Una sola seccion hace lo mismo sola.
   */
  withoutToc?: boolean;
  /**
   * Phase W21 (zod-migration): array tipado de ejemplos que alimenta a
   * cualquier `<iswc-examples-carousel>` declarado en los bloques `demo` /
   * `html` de las secciones. Si está presente, el render inyecta estos
   * ejemplos en el/los carruseles (la propiedad `examples` del carousel
   * acepta la forma legacy `label` y la nueva `name` indistintamente).
   *
   * El tipado fuerte vive en `src/utils/section-schema.ts` (ExampleSchema /
   * ExamplesSchema); este `unknown[]` evita acoplar el sistema de render al
   * módulo de Zod.
   */
  examples?: unknown[];
  sections: PreviewSection[];
}

export interface PreviewMountContext {
  root: HTMLElement;
  main: HTMLElement;
  aside: HTMLElement;
  definition: PreviewDefinition;
}

/**
 * Módulo opcional de comportamiento (archivo behaviors/<tag>.js).
 */
export interface PreviewBehaviorModule {
  mount?(ctx: PreviewMountContext, preview: ISComponentPreviewLike): void | Promise<void>;
  unmount?(ctx: PreviewMountContext, preview: ISComponentPreviewLike): void;
}

/**
 * Contrato de una clase de preview. Implementar mount/unmount con funciones reales.
 */
export interface ISComponentPreviewLike {
  readonly definition: PreviewDefinition;
  /** Signal para listeners (se aborta en unmount). Lo expone ISComponentPreview
   *  concreto; las behaviors lo reciben como `preview.signal`. */
  readonly signal?: AbortSignal;
  mount(ctx: PreviewMountContext): void | Promise<void>;
  unmount?(ctx: PreviewMountContext): void;
}

export {};
