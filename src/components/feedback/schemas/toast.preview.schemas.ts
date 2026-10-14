/**
 * toast.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IsToastElSchema = z.object({
  create: z.function({ input: [z.string(), z.record(z.string(), z.unknown())], output: z.promise(z.unknown() /* TODO: ref HTMLElement */) }),
  /* TODO: parse fail promise<T>(p: Promise<T>, callbacks: {;    loading?: string; */
  placement: z.string(),
});
export type IsToastEl = z.infer<typeof IsToastElSchema>;

