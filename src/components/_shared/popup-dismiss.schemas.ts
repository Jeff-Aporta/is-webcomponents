/**
 * popup-dismiss.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PopupDismissOpcionesSchema = z.object({
  onEscape: z.function({ input: [], output: z.void() }).optional(),
  onKeydown: z.function({ input: [z.unknown() /* TODO: ref KeyboardEvent */], output: z.void() }).optional(),
  onOutside: z.function({ input: [], output: z.void() }).optional(),
  onReposition: z.function({ input: [], output: z.void() }).optional(),
  onScroll: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }).optional(),
  scrollLock: z.boolean().optional(),
});
export type PopupDismissOpciones = z.infer<typeof PopupDismissOpcionesSchema>;

