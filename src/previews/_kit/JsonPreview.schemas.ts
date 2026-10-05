/**
 * JsonPreview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DefinicionPreviewSchema = z.object({
  tag: z.string(),
  category: z.string().optional(),
  /* TODO: member $schema?: string */
  sections: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  /* TODO: member [key: string]: unknown */
});
export type DefinicionPreview = z.infer<typeof DefinicionPreviewSchema>;


export const CtxMontajeSchema = z.object({
  main: z.union([z.unknown() /* TODO: ref HTMLElement */, z.null()]).optional(),
  root: z.union([z.unknown() /* TODO: ref HTMLElement */, z.null()]).optional(),
  aside: z.union([z.unknown() /* TODO: ref HTMLElement */, z.null()]).optional(),
});
export type CtxMontaje = z.infer<typeof CtxMontajeSchema>;


export const ModuloBehaviorSchema = z.object({
  mount: z.function({ input: [z.unknown() /* TODO: ref CtxMontaje */, z.unknown()], output: z.unknown() }).optional(),
  unmount: z.function({ input: [z.unknown() /* TODO: ref CtxMontaje */, z.unknown()], output: z.void() }).optional(),
});
export type ModuloBehavior = z.infer<typeof ModuloBehaviorSchema>;


export const ConDefinicionSchema = z.object({
  definition: z.unknown() /* TODO: ref PreviewDefinition */,
});
export type ConDefinicion = z.infer<typeof ConDefinicionSchema>;

