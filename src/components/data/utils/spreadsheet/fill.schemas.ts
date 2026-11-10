// @contexto INDICE.md · src/components/data/README.md
// fill.schemas.ts: contratos de tipos de fill.ts.
/** Celda fuente de un relleno. */
export interface FillSource { v?: number | string | boolean; f?: string; isDate?: boolean }

/** Resultado por celda: índice de la fuente y valor generado (undefined copia la fuente). */
export interface FillStep { from: number; v?: number | string }

/** Generador de una serie: índice n (1 = primer valor nuevo) a valor. */
export type Series = (n: number) => number | string;
