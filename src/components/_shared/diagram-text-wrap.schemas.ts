/**
 * diagram-text-wrap.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const WrapOptsSchema = z.object({
  text: z.string(),
  maxWidth: z.number(),
  maxHeight: z.number(),
  fontSize: z.number(),
  fontFamily: z.string(),
  lineHeight: z.number().optional(),
  paddingX: z.number().optional(),
  paddingY: z.number().optional(),
  overflow: z.union([z.literal('grow'), z.literal('ellipsis')]),
});
export type WrapOpts = z.infer<typeof WrapOptsSchema>;


export const WrappedLineSchema = z.object({
  text: z.string(),
  truncated: z.boolean(),
});
export type WrappedLine = z.infer<typeof WrappedLineSchema>;


export const WrapResultSchema = z.object({
  lines: z.array(WrappedLineSchema),
  requiredHeight: z.number(),
  requiredHeightUsed: z.number(),
  grewHeight: z.boolean(),
});
export type WrapResult = z.infer<typeof WrapResultSchema>;


export const TSpanSpecSchema = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
  dy: z.number().optional(),
  textAnchor: z.union([z.literal('start'), z.literal('middle'), z.literal('end')]).optional(),
  dominantBaseline: z.union([z.literal('auto'), z.literal('middle'), z.literal('central'), z.literal('hanging'), z.literal('alphabetic'), z.literal('ideographic')]).optional(),
});
export type TSpanSpec = z.infer<typeof TSpanSpecSchema>;

