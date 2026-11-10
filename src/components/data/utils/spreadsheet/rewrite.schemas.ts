// @contexto INDICE.md · src/components/data/README.md
// rewrite.schemas.ts: contratos de tipos de rewrite.ts.
/** Operación estructural sobre filas o columnas. */
export interface StructuralOp { sheet: string; axis: 'row' | 'col'; at: number; count: number; insert: boolean }
