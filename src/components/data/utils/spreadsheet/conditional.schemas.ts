// conditional.schemas.ts: contratos de tipos de conditional.ts.
import type { CfStyle } from '../../schemas/spreadsheet.schemas.js';

/** Efecto visual de las reglas sobre una celda. */
export interface CfEffect extends CfStyle { bar?: { pct: number; color: string }; icon?: string; iconColor?: string }

/** Estadísticas de un rango. */
export interface RangeStats { nums: number[]; min: number; max: number; avg: number; counts: Map<string, number> }
