/**
 * mutation-observer.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CodeLikeSchema = z.object({
  value: z.string(),
  lang: z.string(),
});
export type CodeLike = z.infer<typeof CodeLikeSchema>;


export const DescribePartSchema = z.object({
  cls: z.string(),
  text: z.string(),
});
export type DescribePart = z.infer<typeof DescribePartSchema>;

