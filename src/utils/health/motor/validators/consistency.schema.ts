/**
 * consistency.schema.ts — esquemas Zod para tipos locales del validador de consistencia.
 */
import { z } from "zod";

/** Forma mínima del JSON que necesitamos para consistencia. */
export const DefSchema = z.object({
  tag: z.string(),
  sections: z.array(z.object({ blocks: z.array(z.unknown()).optional() })).optional(),
});
export type Def = z.infer<typeof DefSchema>;