/**
 * sequence-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SequenceActorSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.union([z.literal('participant'), z.literal('actor')]).optional(),
  icon: z.string().optional(),
  hue: z.number().optional(),
});
export type SequenceActorSpec = z.infer<typeof SequenceActorSpecSchema>;


export const SequenceMessageSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string(),
  log: z.string().optional(),
  description: z.string().optional(),
  group: z.string().optional(),
  kind: z.union([z.literal('self'), z.literal('sync'), z.literal('async'), z.string()]).optional(),
  step: z.number(),
});
export type SequenceMessageSpec = z.infer<typeof SequenceMessageSpecSchema>;


export const SequenceAltSpecSchema = z.object({
  branches: z.array(z.object({
  condition: z.string(),
  messages: z.array(SequenceMessageSpecSchema),
})),
});
export type SequenceAltSpec = z.infer<typeof SequenceAltSpecSchema>;


export const SequenceResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  actors: z.array(SequenceActorSpecSchema),
  groups: z.array(z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
})).optional(),
  messages: z.array(SequenceMessageSpecSchema).optional(),
  preamble: z.array(SequenceMessageSpecSchema).optional(),
  alt: SequenceAltSpecSchema.optional(),
  epilogue: z.array(SequenceMessageSpecSchema).optional(),
});
export type SequenceResolvedSpec = z.infer<typeof SequenceResolvedSpecSchema>;


export const LeadingIconTokenSchema = z.object({
  iconId: z.string(),
  hue: z.number().optional(),
  rest: z.string(),
});
export type LeadingIconToken = z.infer<typeof LeadingIconTokenSchema>;


export const FlatMessageSchema = z.object({
  m: SequenceMessageSpecSchema,
  kind: z.union([z.literal('self'), z.literal('sync'), z.literal('async'), z.string()]),
  fromIdx: z.number(),
  toIdx: z.number(),
  labelW: z.number(),
  branch: z.string().optional(),
  branchFirst: z.boolean().optional(),
});
export type FlatMessage = z.infer<typeof FlatMessageSchema>;


export const SequenceLayoutActorSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  label: z.string(),
  icon: z.string(),
  hue: z.number(),
  kind: z.string(),
});
export type SequenceLayoutActor = z.infer<typeof SequenceLayoutActorSchema>;


export const SequenceLayoutLifelineSchema = z.object({
  id: z.string(),
  x: z.number(),
  y1: z.number(),
  y2: z.number(),
});
export type SequenceLayoutLifeline = z.infer<typeof SequenceLayoutLifelineSchema>;


export const SequenceLayoutMessageSchema = z.object({
  id: z.string(),
  step: z.number(),
  label: z.string(),
  log: z.string().optional(),
  description: z.string().optional(),
  kind: z.string(),
  y: z.number(),
  fromX: z.number(),
  toX: z.number(),
  path: z.string(),
  lineX1: z.number(),
  lineX2: z.number(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowDir: z.number(),
  labelX: z.number(),
  labelW: z.number(),
  labelY: z.number(),
  labelH: z.number(),
  branch: z.string().optional(),
  branchFirst: z.boolean().optional(),
  groupHue: z.number().optional(),
});
export type SequenceLayoutMessage = z.infer<typeof SequenceLayoutMessageSchema>;


export const SequenceLayoutAltBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string(),
});
export type SequenceLayoutAltBox = z.infer<typeof SequenceLayoutAltBoxSchema>;


export const SequenceLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  actors: z.array(SequenceLayoutActorSchema),
  lifelines: z.array(SequenceLayoutLifelineSchema),
  messages: z.array(SequenceLayoutMessageSchema),
  altBox: SequenceLayoutAltBoxSchema.optional(),
  groups: z.array(z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
})).optional(),
  legendX: z.number(),
  legendColX: z.array(z.number()),
  legendMaxRows: z.number(),
});
export type SequenceLayout = z.infer<typeof SequenceLayoutSchema>;

