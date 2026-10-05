/**
 * prompt-md.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const BodySegmentSchema = z.union([z.object({
  type: z.literal('text'),
  value: z.string(),
}), z.object({
  type: z.literal('var'),
  name: z.string(),
})]);
export type BodySegment = z.infer<typeof BodySegmentSchema>;


export const VarPlaceholderSchema = z.object({
  token: z.string(),
  name: z.string(),
});
export type VarPlaceholder = z.infer<typeof VarPlaceholderSchema>;

