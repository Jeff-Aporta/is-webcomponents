/**
 * use-case-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const UseCaseActorSideSchema = z.union([z.literal('left'), z.literal('right')]);
export type UseCaseActorSide = z.infer<typeof UseCaseActorSideSchema>;

const UseCaseLinkKindSchema = z.union([z.literal('association'), z.literal('include'), z.literal('extend'), z.literal('generalization')]);
export type UseCaseLinkKind = z.infer<typeof UseCaseLinkKindSchema>;

const UseCaseActorSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  side: UseCaseActorSideSchema,
  external: z.boolean(),
  hue: z.number().optional(),
  description: z.string().optional(),
});
export type UseCaseActorSpec = z.infer<typeof UseCaseActorSpecSchema>;

const UseCaseCaseSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string().optional(),
  hue: z.number().optional(),
  description: z.string().optional(),
});
export type UseCaseCaseSpec = z.infer<typeof UseCaseCaseSpecSchema>;

const UseCaseLinkSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: UseCaseLinkKindSchema,
  label: z.string().optional(),
});
export type UseCaseLinkSpec = z.infer<typeof UseCaseLinkSpecSchema>;

const UseCaseGroupSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type UseCaseGroupSpec = z.infer<typeof UseCaseGroupSpecSchema>;

const UseCaseResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  system: z.string().optional(),
  groups: z.array(UseCaseGroupSpecSchema).optional(),
  actors: z.array(UseCaseActorSpecSchema),
  cases: z.array(UseCaseCaseSpecSchema),
  links: z.array(UseCaseLinkSpecSchema),
});
export type UseCaseResolvedSpec = z.infer<typeof UseCaseResolvedSpecSchema>;

const UseCaseLayoutActorSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  external: z.boolean(),
  hue: z.number().optional(),
  side: UseCaseActorSideSchema,
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type UseCaseLayoutActor = z.infer<typeof UseCaseLayoutActorSchema>;

const UseCaseLayoutCaseSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  group: z.string().optional(),
  hue: z.number().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type UseCaseLayoutCase = z.infer<typeof UseCaseLayoutCaseSchema>;

const UseCaseLayoutLinkSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: UseCaseLinkKindSchema,
  label: z.string().optional(),
  stereotype: z.string().optional(),
  path: z.string(),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  hue: z.number().optional(),
});
export type UseCaseLayoutLink = z.infer<typeof UseCaseLayoutLinkSchema>;

const UseCaseLayoutSystemSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  name: z.string().optional(),
  labelX: z.number(),
  labelY: z.number(),
});
export type UseCaseLayoutSystem = z.infer<typeof UseCaseLayoutSystemSchema>;

const UseCaseLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  actors: z.array(UseCaseLayoutActorSchema),
  cases: z.array(UseCaseLayoutCaseSchema),
  links: z.array(UseCaseLayoutLinkSchema),
  system: UseCaseLayoutSystemSchema,
  groups: z.array(UseCaseGroupSpecSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
});
export type UseCaseLayout = z.infer<typeof UseCaseLayoutSchema>;

