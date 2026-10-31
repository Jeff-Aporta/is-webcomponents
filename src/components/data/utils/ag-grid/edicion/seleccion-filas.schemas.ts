/** Tipos de seleccion-filas.ts. */

export type Seleccionable = (id: string) => boolean;

export type UniversoFilas = { todas: string[]; filtradas: string[]; pagina: string[] };
