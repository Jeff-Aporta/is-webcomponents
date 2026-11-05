/**
 * state-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const StateKindSchema = z.union([z.literal('start'), z.literal('end'), z.literal('normal'), z.literal('choice')]);
export type StateKind = z.infer<typeof StateKindSchema>;

const StateDirectionSchema = z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]);
export type StateDirection = z.infer<typeof StateDirectionSchema>;

const AnchorSideSchema = z.union([z.literal('left'), z.literal('right'), z.literal('top'), z.literal('bottom')]);
export type AnchorSide = z.infer<typeof AnchorSideSchema>;

const StateSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: StateKindSchema,
  group: z.string().optional(),
  hue: z.number().optional(),
  description: z.string().optional(),
});
export type StateSpec = z.infer<typeof StateSpecSchema>;

const StateTransitionSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  group: z.string().optional(),
});
export type StateTransitionSpec = z.infer<typeof StateTransitionSpecSchema>;

const StateGroupSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type StateGroupSpec = z.infer<typeof StateGroupSpecSchema>;

const StateResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: StateDirectionSchema,
  groups: z.array(StateGroupSpecSchema).optional(),
  states: z.array(StateSpecSchema),
  transitions: z.array(StateTransitionSpecSchema),
});
export type StateResolvedSpec = z.infer<typeof StateResolvedSpecSchema>;

const StateLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  label: z.string(),
  kind: StateKindSchema,
  description: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
});
export type StateLayoutNode = z.infer<typeof StateLayoutNodeSchema>;

const StateLayoutTransitionSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowAngle: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  hue: z.number().optional(),
});
export type StateLayoutTransition = z.infer<typeof StateLayoutTransitionSchema>;

const StateLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(StateLayoutNodeSchema),
  edges: z.array(StateLayoutTransitionSchema),
  groups: z.array(StateGroupSpecSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type StateLayout = z.infer<typeof StateLayoutSchema>;

