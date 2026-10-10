/** Contratos de `<iswc-doc-index>` (W54: los tipos viven en *.schemas.ts). */

/** Una entrada del índice: una página, nota, hoja, sección de un temario… */
export interface ItemDocIndex {
  /** Identidad única (p. ej. la ruta del archivo). Es lo que emite al elegirlo. */
  id: string;
  /** Texto que se muestra. */
  title: string;
  /** Grupo de primer nivel (p. ej. el módulo). Vacío = sin grupo. */
  group?: string;
  /** Subgrupo dentro del grupo (p. ej. la sección). */
  subgroup?: string;
  /** Prefijo corto en columna fija (p. ej. `010`). */
  number?: string;
  /** Ícono corto (emoji o carácter) en la columna fija, en lugar del número. */
  icon?: string;
  /** Palabras que también encuentran el ítem (tags, alias). */
  keywords?: string[];
  /** Texto completo para la búsqueda (el fragmento resaltado sale de aquí). */
  text?: string;
  /** Línea secundaria en los resultados (p. ej. la ruta). Default: `id`. */
  hint?: string;
  /** Va arriba de todo, fuera de los grupos (p. ej. la portada). */
  pinned?: boolean;
}

/** Textos de la interfaz (i18n). */
export interface TextosDocIndex {
  placeholder: string;
  sinResultados: string;
  /** Resumen bajo el buscador; `{items}` y `{grupos}` se reemplazan. Vacío = sin resumen. */
  resumen: string;
}

export interface ResultadoDocIndex {
  item: ItemDocIndex;
  puntos: number;
  fragmento: string;
}
