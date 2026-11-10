// @contexto INDICE.md · src/components/data/README.md
// host.schemas.ts: contratos de tipos de host.ts.
import type { Rect } from './address.schemas.js';
import type { MacroValue } from './macro-interp.schemas.js';

/** Lo que la macro necesita de la vista. Todo opcional: sin vista corre sobre el documento. */
export interface MacroView { getSelection?(): Rect; select?(r: Rect): void; message?(text: string): void; log?(text: string): void; refresh?(): void }

/** Resultado de ejecutar una macro. */
export interface MacroResult { ok: boolean; value?: MacroValue; error?: string; line?: number }
