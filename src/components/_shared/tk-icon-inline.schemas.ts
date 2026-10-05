/**
 * tk-icon-inline.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ResolvedIconTokenSchema = z.object({
  iconId: z.string(),
  hue: z.number().optional(),
  size: z.number().optional(),
  color: z.string().optional(),
  attrs: z.record(z.string(), z.string()),
});
export type ResolvedIconToken = z.infer<typeof ResolvedIconTokenSchema>;


export const SvgIconGroupOptsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  size: z.number().optional(),
  hue: z.number().optional(),
  color: z.string().optional(),
  fallback: z.string().optional(),
});
export type SvgIconGroupOpts = z.infer<typeof SvgIconGroupOptsSchema>;


export const IconInlineOptsSchema = z.object({
  size: z.union([z.string(), z.number()]).optional(),
  className: z.string().optional(),
  hue: z.number().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
});
export type IconInlineOpts = z.infer<typeof IconInlineOptsSchema>;


export const IconHtmlRenderSchema = z.string();
export type IconHtmlRender = z.infer<typeof IconHtmlRenderSchema>;


export const IconRunSchema = z.union([z.object({
  kind: z.literal('text'),
  text: z.string(),
}), z.object({
  kind: z.literal('icon'),
  token: ResolvedIconTokenSchema,
})]);
export type IconRun = z.infer<typeof IconRunSchema>;


export const LeadingIconSchema = z.object({
  iconId: z.string(),
  hue: z.union([z.number(), z.undefined()]),
  color: z.string().optional(),
  size: z.number().optional(),
  rest: z.string(),
});
export type LeadingIcon = z.infer<typeof LeadingIconSchema>;

