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

export interface PreviewTableBlock {
  kind: 'table';
  columns: string[];
  rows: string[][];
  /** HTML opcional encima de la tabla */
  captionHtml?: string;
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
  /** Si true, title se inserta como HTML (p. ej. con <code>). Default: texto. */
  titleHtml?: boolean;
  lede?: string;
  blocks: PreviewBlock[];
}

/**
 * Documento JSON canónico por tag: `src/previews/<cat>/<tag>.json`
 * Todos los previews comparten esta interface (homogeneidad).
 */
export interface PreviewDefinition {
  /** Schema id — siempre "is-preview/v1" */
  $schema: 'is-preview/v1';
  /** Tag del catálogo (manifest), p. ej. is-button-group */
  tag: string;
  /** Categoría (carpeta bajo previews/) */
  category: string;
  /** Título visible del H2 intro (texto o HTML si titleHtml) */
  title: string;
  titleHtml?: boolean;
  description?: string;
  /** CSS local del preview (string de estilos, no comportamiento). */
  styles?: string;
  /** Clave remember-scroll de is-main */
  storageKey?: string;
  /**
   * Si true, el registry carga `behaviors/<tag>.js` con export mount/unmount.
   * No poner lógica en el JSON.
   */
  hasBehavior?: boolean;
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
  mount(ctx: PreviewMountContext): void | Promise<void>;
  unmount?(ctx: PreviewMountContext): void;
}

export {};
