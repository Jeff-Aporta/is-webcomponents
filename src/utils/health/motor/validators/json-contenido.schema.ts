/**
 * json-contenido.schema.ts — esquemas Zod para tipos locales del validador de contenido.
 */
import { z } from "zod";

/** Forma mínima del JSON que necesitamos. */
export const DefSchema = z.object({
  tag: z.string(),
  sections: z.array(z.object({ blocks: z.array(z.unknown()).optional() })).optional(),
});
export type Def = z.infer<typeof DefSchema>;

/** Bloque normalizado. */
export const BloqueSchema = z.record(z.string(), z.unknown());
export type Bloque = z.infer<typeof BloqueSchema>;