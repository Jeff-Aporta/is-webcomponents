// @contexto INDICE.md · src/components/data/README.md
// spreadsheet.schemas.ts: contratos de tipos de spreadsheet.ts.
import type { Rect } from './utils/spreadsheet/address.schemas.js';
import type { Sheet } from './utils/spreadsheet/engine.js';
import type { ChartDef } from './schemas/spreadsheet.schemas.js';
import type { ClipBlock } from './utils/spreadsheet/document.schemas.js';

/** Estado de la selección. */
export interface Selection { r: number; c: number; ranges: Rect[] }

/** Edición en curso. */
export interface Edit { sheet: Sheet; r: number; c: number; input: HTMLInputElement; original: string; quick: boolean; source: 'cell' | 'bar' }

/** Referencia que se está apuntando. */
export interface Pointing { start: number; end: number; anchor: { r: number; c: number } }

/** Arrastre en curso. */
export interface Drag { kind: 'select' | 'fill' | 'point' | 'col' | 'row' | 'resize-col' | 'resize-row' | 'chart-move' | 'chart-size'; index?: number; start?: number; origin?: { x: number; y: number }; chart?: ChartDef; add?: boolean; target?: Rect; alternate?: boolean; pos?: { r: number; c: number } }

/** Contenido del portapapeles propio. */
export interface Clip { block: ClipBlock; cut: boolean; text: string }

/** Elemento con valor (controles del kit). */
export type ValueEl = HTMLElement & { value: string; checked?: boolean; swatches?: string[]; show?: () => void; hide?: () => void; config?: unknown };
