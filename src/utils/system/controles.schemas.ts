/**
 * controles.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TipoControlSchema = z.union([z.literal('text'), z.literal('color'), z.literal('number'), z.literal('select'), z.literal('boolean'), z.literal('range'), z.literal('json')]);
export type TipoControl = z.infer<typeof TipoControlSchema>;


export const OpcionSelectSchema = z.union([z.string(), z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  label: z.string(),
  icon: z.string().optional(),
  html: z.string().optional(),
  description: z.string().optional(),
  placeholder: z.boolean().optional(),
})]);
export type OpcionSelect = z.infer<typeof OpcionSelectSchema>;


export const PanelInfoDefSchema = z.object({
  description: z.string().optional(),
  type: z.string().optional(),
  default: z.string().optional(),
  values: z.array(z.string()).optional(),
  example: z.string().optional(),
});
export type PanelInfoDef = z.infer<typeof PanelInfoDefSchema>;


export const ControlDefSchema = z.object({
  control: TipoControlSchema,
  prop: z.string(),
  label: z.string(),
  group: z.string().optional(),
  default: z.unknown().optional(),
  options: z.array(OpcionSelectSchema).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  placeholder: z.string().optional(),
  info: PanelInfoDefSchema.optional(),
});
export type ControlDef = z.infer<typeof ControlDefSchema>;


export const ControlesDeDemoSchema = z.object({
  target: z.string().optional(),
  group: z.string().optional(),
  controls: z.array(ControlDefSchema),
});
export type ControlesDeDemo = z.infer<typeof ControlesDeDemoSchema>;


export const BloqueConControlesSchema = z.intersection(z.object({
  kind: z.union([z.literal('demo'), z.literal('html')]),
  html: z.string().optional(),
}), ControlesDeDemoSchema);
export type BloqueConControles = z.infer<typeof BloqueConControlesSchema>;


export const PanelConSpecSchema = z.object({
  spec: z.array(z.unknown()),
});
export type PanelConSpec = z.infer<typeof PanelConSpecSchema>;


export const PreviewDefinitionShallowSchema = z.object({
  tag: z.string(),
  sections: z.array(z.object({
  id: z.string().optional(),
  blocks: z.array(z.record(z.string(), z.unknown())).optional(),
})).optional(),
});
export type PreviewDefinitionShallow = z.infer<typeof PreviewDefinitionShallowSchema>;


export const PreviewMountCtxShallowSchema = z.object({
  main: z.union([z.unknown() /* TODO: ref HTMLElement */, z.null()]).optional(),
  root: z.union([z.unknown() /* TODO: ref HTMLElement */, z.null()]).optional(),
});
export type PreviewMountCtxShallow = z.infer<typeof PreviewMountCtxShallowSchema>;

