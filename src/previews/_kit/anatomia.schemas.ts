// @contexto INDICE.md · src/previews/README.md
// anatomia.schemas.ts: contratos de tipos de anatomia.ts.
import type { Anatomia } from './schemas/anatomia.schemas.js';
import type { PreviewBlock } from './schemas/preview.schemas.js';

export type DefinicionConAnatomia = {
  tag: string;
  anatomy?: Anatomia | undefined;
  sections?: Array<{ blocks?: PreviewBlock[] | undefined }> | undefined;
};
