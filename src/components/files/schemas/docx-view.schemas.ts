/**
 * docx-view.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MammothApiSchema = z.object({
  convertToHtml: z.function({ input: [z.object({
  arrayBuffer: z.unknown() /* TODO: ref ArrayBuffer */,
})], output: z.promise(z.object({
  value: z.string(),
})) }),
});
export type MammothApi = z.infer<typeof MammothApiSchema>;

