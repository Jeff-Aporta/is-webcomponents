/** Tipos de portapapeles-ctl.ts. */

export type Procesador = (p: Record<string, unknown>) => unknown;

export type ParametrosCopia = { includeHeaders?: boolean; };
