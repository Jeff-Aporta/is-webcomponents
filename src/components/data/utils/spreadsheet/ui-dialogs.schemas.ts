// find.schemas.ts: contratos de tipos de find.ts.
import type { Sheet } from './engine.js';
import type { SpreadsheetDoc } from './document.js';
import type { Rect } from './address.schemas.js';

/** Opciones de búsqueda. */
export interface FindOptions { matchCase?: boolean; wholeCell?: boolean; inFormulas?: boolean; allSheets?: boolean; regex?: boolean }

/** Coincidencia. */
export interface FindHit { sheet: Sheet; r: number; c: number; text: string }

// ── dialogs.schemas ──
// dialogs.schemas.ts: contratos de tipos de dialogs.ts.
/** Lectura de campos de un diálogo. */
export type Fields = { get(name: string): string; on(name: string): boolean; root: HTMLElement };

/** Opciones de apertura de un diálogo. */
export interface DialogSpec { title: string; body: string; okLabel?: string; wide?: boolean; hideOk?: boolean; onOk?: (f: Fields) => boolean | void; onOpen?: (f: Fields) => void }

/** Lo que los diálogos usan del componente. */
export interface DialogHost {
  doc: SpreadsheetDoc;
  sheet(): Sheet;
  rects(): Rect[];
  rect(): Rect;
  active(): { r: number; c: number };
  open(spec: DialogSpec): void;
  close(): void;
  toast(msg: string): void;
  refresh(): void;
  select(sheet: Sheet, r: number, c: number): void;
  selectRect(x: Rect): void;
  insertAtEditor(text: string): void;
  record(fn: string, ...args: (string | number | boolean | null | Record<string, string | number | boolean>)[]): void;
}
