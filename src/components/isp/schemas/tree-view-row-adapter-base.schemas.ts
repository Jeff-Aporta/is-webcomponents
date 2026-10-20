/**
 * row-adapter-base.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { TNode, FloatCardConfig } from "./tree-view-types.schemas.js";

export const TreeAdapterLikeSchema = z.object({
  context: z.record(z.string(), z.unknown()),
  disabled: z.boolean(),
  isProtected: z.boolean(),
  isReadOnly: z.boolean(),
  canMutate: z.boolean(),
  disabledNodes: z.array(z.string()),
  flashFlatPaths: z.array(z.string()),
  flashErrorFlatPaths: z.array(z.string()),
  expandedFlatPaths: z.array(z.string()),
  expandedNodes: z.array(z.custom<TNode>()),
  rootNodes: z.array(z.custom<TNode>()),
  focusedNode: z.custom<TNode>().nullable(),
  selectedNode: z.custom<TNode>().nullable(),
  hoveredNode: z.custom<TNode>().nullable(),
  floatCard: z.custom<FloatCardConfig>(),
  currentDragFlatPath: z.string(),
  _domRoot: z.custom<HTMLElement>().nullable().optional(),
  normalizeFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.string() }),
  findNodeByFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.union([z.unknown() /* TODO: ref TNode */, z.null()]) }),
  filterRowActions: z.function({ input: [z.union([z.unknown() /* TODO: ref RowConfig */, z.undefined()]), z.boolean()], output: z.array(z.unknown() /* TODO: ref TreeActionEntry */) }),
  getRowConfig: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.unknown() /* TODO: ref RowConfig */ }),
  iconParts: z.function({ input: [z.union([z.unknown() /* TODO: ref IconConfig */, z.undefined()])], output: z.union([z.object({
  icon: z.string(),
  rest: z.record(z.string(), z.unknown()),
  mergedStyle: z.string(),
}), z.null()]) }),
  isGrouper: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.boolean() }),
  isFrozen: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.boolean() }),
  onrowfocus: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.void() }),
  onrowtoggle: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.boolean()], output: z.void() }),
  onaddsibling: z.function({ input: [z.string(), z.union([z.literal("above"), z.literal("below")])], output: z.void() }),
  onaddchild: z.function({ input: [z.string()], output: z.void() }),
  expandedNodesAfterToggle: z.function({ input: [z.array(z.unknown() /* TODO: ref TNode */), z.string(), z.boolean()], output: z.array(z.unknown() /* TODO: ref TNode */) }),
  setExpandedNodesFn: z.function({ input: [z.array(z.unknown() /* TODO: ref TNode */)], output: z.void() }),
  flashRowErrorFlatPaths: z.function({ input: [z.array(z.string())], output: z.void() }),
  canDrop: z.function({ input: [z.string(), z.string(), z.union([z.literal("before"), z.literal("after"), z.literal("into")])], output: z.boolean() }),
  clearDragOverlays: z.function({ input: [], output: z.void() }),
  clearOtherDragOverlays: z.function({ input: [z.string()], output: z.void() }),
  onrowreorder: z.function({ input: [z.string(), z.string(), z.union([z.literal("before"), z.literal("after"), z.literal("into")])], output: z.void() }),
  unregisterRowAdapter: z.function({ input: [z.unknown() /* TODO: ref TRABase */], output: z.void() }),
  blurTreeSummariesExcept: z.function({ input: [z.unknown() /* TODO: ref HTMLElement */], output: z.void() }),
});
export type TreeAdapterLike = z.infer<typeof TreeAdapterLikeSchema>;

