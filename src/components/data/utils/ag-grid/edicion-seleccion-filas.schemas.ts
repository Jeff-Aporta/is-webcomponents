// @contexto INDICE.md · src/components/data/README.md
/** Tipos de seleccion-filas.ts. */

export type Seleccionable = (id: string) => boolean;

export type UniversoFilas = { todas: string[]; filtradas: string[]; pagina: string[] };
