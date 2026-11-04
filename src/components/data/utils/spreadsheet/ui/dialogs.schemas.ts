// dialogs.schemas.ts: contratos de tipos de dialogs.ts.
import type { SpreadsheetDoc } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/document.js';
import type { Sheet } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/engine.js';
import type { Rect } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/address.schemas.js';

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
