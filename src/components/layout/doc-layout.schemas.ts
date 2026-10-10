/** Contratos de `<iswc-doc-layout>` (W54: los tipos viven en *.schemas.ts). */

/** Visibilidad efectiva de los paneles laterales. */
export interface PanelesDocLayout {
  start: boolean;
  end: boolean;
}

/** Preferencias guardadas por `storage-key`: lo que el usuario eligió por tamaño de pantalla. */
export interface PrefsDocLayout {
  start?: boolean;
  end?: boolean;
  endTableta?: boolean;
}

/** Entrada del índice generado: un encabezado del contenido central. */
export interface EntradaTocDocLayout {
  id: string;
  texto: string;
  nivel: number;
  el: HTMLElement;
}

/** Fuente de encabezados que la app puede inyectar (por defecto: búsqueda profunda en el contenido). */
export type FuenteTocDocLayout = (contenido: HTMLElement[]) => HTMLElement[];

/** Lo que el layout usa de `<iswc-split-panel>` (ancho inicial y llave de persistencia). */
export interface SplitPanelDocLayout extends HTMLElement {
  positionInPixels: number;
  storageKey: string | null;
}
