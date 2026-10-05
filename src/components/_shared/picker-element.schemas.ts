/**
 * picker-element.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PickerKindSchema = z.union([z.literal('date'), z.literal('time'), z.literal('datetime')]);
export type PickerKind = z.infer<typeof PickerKindSchema>;


export const PickerPanelDefSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  dataset: z.object({
  role: z.string().optional(),
  which: z.string().optional(),
  sync: z.string().optional(),
}),
  setAttribute: z.function({ input: [z.string(), z.string()], output: z.void() }),
  removeAttribute: z.function({ input: [z.string()], output: z.void() }),
  focus: z.function({ input: [z.object({
  preventScroll: z.boolean().optional(),
})], output: z.void() }),
  addEventListener: z.function({ input: [z.string(), z.unknown() /* TODO: ref EventListener */, z.union([z.unknown() /* TODO: ref AddEventListenerOptions */, z.boolean()])], output: z.void() }),
}));
export type PickerPanelDef = z.infer<typeof PickerPanelDefSchema>;


export const PickerFieldSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  value: z.string(),
  setAttribute: z.function({ input: [z.string(), z.string()], output: z.void() }),
  removeAttribute: z.function({ input: [z.string()], output: z.void() }),
  checkValidity: z.function({ input: [], output: z.boolean() }).optional(),
  reportValidity: z.function({ input: [], output: z.boolean() }).optional(),
  focus: z.function({ input: [z.object({
  preventScroll: z.boolean().optional(),
})], output: z.void() }).optional(),
}));
export type PickerField = z.infer<typeof PickerFieldSchema>;


export const PanelsBuilderSchema = z.array(z.function({ input: [z.object({
  host: z.unknown() /* TODO: ref HTMLElement */,
  range: z.boolean(),
})], output: z.unknown() /* TODO: ref PickerPanelDef */ }));
export type PanelsBuilder = z.infer<typeof PanelsBuilderSchema>;


export const DefinePickerInputOptsSchema = z.object({
  tag: z.string(),
  kind: PickerKindSchema,
  cssUrl: z.string(),
  fieldTag: z.string(),
  panels: PanelsBuilderSchema,
  range: z.boolean().optional(),
  styleAttrs: z.record(z.string(), z.string()).optional(),
});
export type DefinePickerInputOpts = z.infer<typeof DefinePickerInputOptsSchema>;

