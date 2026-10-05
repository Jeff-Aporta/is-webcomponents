/**
 * button.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MountCtxSchema = z.object({
  main: z.unknown() /* TODO: ref ParentNode */.optional(),
  root: z.unknown() /* TODO: ref ParentNode */.optional(),
});
export type MountCtx = z.infer<typeof MountCtxSchema>;

