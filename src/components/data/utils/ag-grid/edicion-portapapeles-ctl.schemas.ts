// @contexto INDICE.md · src/components/data/README.md
/** Tipos de portapapeles-ctl.ts. */

export type Procesador = (p: Record<string, unknown>) => unknown;

export type ParametrosCopia = { includeHeaders?: boolean; };
