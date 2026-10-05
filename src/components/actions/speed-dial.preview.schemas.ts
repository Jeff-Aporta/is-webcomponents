/**
 * speed-dial.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CustomEventWithDetailSchema = z.object({
  detail: z.unknown() /* TODO: ref T */.optional(),
});
export type CustomEventWithDetail = z.infer<typeof CustomEventWithDetailSchema>;

