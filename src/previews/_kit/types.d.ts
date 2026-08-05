/**
 * Tipos del sistema de previews homogeneizados.
 * Fuente de verdad para ISComponentPreview / is-preview-component.
 *
 * Contrato:
 * - La ESTRUCTURA (secciones, demos, callouts, code, tablas) es datos tipados
 *   serializables (strings HTML para markup estático de demos).
 * - El COMPORTAMIENTO nunca va en string: vive en métodos de ISComponentPreview
 *   (mount / unmount) con listeners y lógica real.
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

export interface PreviewDefinition {
  /** Tag del catálogo (manifest), p. ej. is-button-group */
  tag: string;
  /** Título visible del H2 intro (texto o HTML escapado a mano si titleHtml) */
  title: string;
  titleHtml?: boolean;
  description?: string;
  /** CSS local del preview (string de estilos, no comportamiento). */
  styles?: string;
  /** Clave remember-scroll de is-main */
  storageKey?: string;
  sections: PreviewSection[];
}

export interface PreviewMountContext {
  root: HTMLElement;
  main: HTMLElement;
  aside: HTMLElement;
  definition: PreviewDefinition;
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
