/**
 * main.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MainElSchema = z.object({
  scrollToTop: z.function({ input: [z.unknown() /* TODO: ref ScrollToOptions */], output: z.void() }),
  saveScroll: z.function({ input: [], output: z.void() }),
  clearRememberedScroll: z.function({ input: [], output: z.void() }),
});
export type MainEl = z.infer<typeof MainElSchema>;

