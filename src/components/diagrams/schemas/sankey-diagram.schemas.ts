/**
 * sankey-diagram.ts — Zod schemas propios del componente.
 *
 * El layout (SankeyLayout, SankeyLayoutNode, SankeyLayoutLink) vive en
 * `sankey-spec.schemas.ts`; aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { SankeyLayoutNodeSchema, SankeyLayoutLinkSchema } from "./sankey-spec.schemas.js";

export const NodeEntrySchema = z.object({
  n: SankeyLayoutNodeSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type NodeEntry = z.infer<typeof NodeEntrySchema>;


export const LinkEntrySchema = z.object({
  l: SankeyLayoutLinkSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type LinkEntry = z.infer<typeof LinkEntrySchema>;
