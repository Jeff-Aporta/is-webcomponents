// @contexto INDICE.md · src/components/data/README.md
// engine.schemas.ts: contratos de tipos de engine.ts.
import type { Rect } from './address.schemas.js';
import type { Node } from './parser.schemas.js';
import type { Sheet } from './engine.js';

/** Celda guardada. Inmutable: cada cambio reemplaza el objeto. */
export interface CellData { v?: number | string | boolean; f?: string; s?: number; c?: string; l?: string }

/** Dependencia sobre un rango. */
export interface RangeDep { sheet: number; rect: Rect; users: Set<number> }

/** Fórmula registrada. */
export interface FormulaInfo { sheet: Sheet; r: number; c: number; ast: Node | null; volatile: boolean; refs: { sheet: number; rect: Rect }[] }
