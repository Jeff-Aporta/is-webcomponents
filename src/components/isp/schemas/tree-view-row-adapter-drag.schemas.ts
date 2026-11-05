/**
 * row-adapter-drag.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const DragOverPositionSchema = z.union([z.literal("before"), z.literal("after"), z.literal("into")]);
export type DragOverPosition = z.infer<typeof DragOverPositionSchema>;

const SummaryRectSchema = z.object({
  top: z.number(),
  height: z.number(),
});
export type SummaryRect = z.infer<typeof SummaryRectSchema>;

