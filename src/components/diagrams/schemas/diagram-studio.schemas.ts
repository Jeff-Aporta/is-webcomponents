/**
 * diagram-studio.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DiagramKindSchema = z.object({
  kind: z.string(),
  title: z.string(),
  tag: z.string(),
  file: z.string(),
  preview: z.string(),
  editor: z.object({
  tag: z.string(),
  file: z.string(),
}).optional(),
});
export type DiagramKind = z.infer<typeof DiagramKindSchema>;


export const HostSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  payload: z.unknown().optional(),
  exportJson: z.function({ input: [], output: z.string() }).optional(),
}));
export type Host = z.infer<typeof HostSchema>;


export const CodeElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  value: z.string(),
}));
export type CodeEl = z.infer<typeof CodeElSchema>;


export const ShareElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  url: z.string(),
  shareTitle: z.string(),
  text: z.string(),
}));
export type ShareEl = z.infer<typeof ShareElSchema>;

