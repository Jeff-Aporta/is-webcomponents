/**
 * mindmap.ts — Zod schemas propios del componente.
 *
 * El layout (MindmapLayout, MindmapLayoutNode, MindmapLayoutEdge) vive en
 * `mindmap-spec.schemas.ts`; aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { MindmapLayoutNodeSchema, MindmapLayoutEdgeSchema } from "./mindmap-spec.schemas.js";

export const MindmapNodeKindSchema = z.union([z.literal('root'), z.literal('branch'), z.literal('leaf')]);
export type MindmapNodeKind = z.infer<typeof MindmapNodeKindSchema>;


export const NodeEntrySchema = z.object({
  n: MindmapLayoutNodeSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type NodeEntry = z.infer<typeof NodeEntrySchema>;


export const EdgeEntrySchema = z.object({
  e: MindmapLayoutEdgeSchema,
  path: z.unknown() /* TODO: ref SVGPathElement */,
});
export type EdgeEntry = z.infer<typeof EdgeEntrySchema>;
