// @contexto INDICE.md · src/previews/README.md
// anatomia.schemas.ts: contratos de tipos de anatomia.ts.
import type { Anatomia } from './schemas/anatomia.schemas.js';

export type DefinicionConAnatomia = {
  tag: string;
  anatomy?: Anatomia | undefined;
  sections?: Array<{ blocks?: Array<{ target?: string | undefined }> | undefined }> | undefined;
};
