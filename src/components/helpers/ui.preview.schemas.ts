/**
 * ui.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IsUiApiSchema = z.object({
  html: z.unknown() /* TODO: cannot convert */,
  esc: z.unknown() /* TODO: cannot convert */,
  define: z.function({ input: [z.string(), z.unknown() /* TODO: ref CustomElementConstructor */], output: z.void() }),
  css: z.function({ input: [z.unknown() /* TODO: ref ShadowRoot */, z.string()], output: z.void() }),
});
export type IsUiApi = z.infer<typeof IsUiApiSchema>;

