// @contexto INDICE.md · src/components/data/README.md
// criteria.schemas.ts: contratos de tipos de criteria.ts.
import type { Scalar } from './values.schemas.js';

/** Prueba de un valor. */
export type Predicate = (v: Scalar) => boolean;
