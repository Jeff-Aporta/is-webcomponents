/**
 * row-adapter.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const _SummaryEventSchema = z.object({
  currentTarget: z.unknown() /* TODO: ref HTMLElement */,
});
export type _SummaryEvent = z.infer<typeof _SummaryEventSchema>;


export const _RowAdapterSchema = z.object({
  onrowclick: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.void() }),
  onrowdblclick: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.void() }),
  syncRowSelectionChrome: z.function({ input: [], output: z.void() }),
  syncHoverFloats: z.function({ input: [], output: z.void() }),
  buildCustomsRuntime: z.function({ input: [], output: z.unknown() }),
  customs: z.union([z.object({
  hotkeys: z.record(z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */).optional(),
  topMenuActions: z.array(z.function({ input: [z.unknown()], output: z.unknown() /* TODO: ref TreeActionEntry */ })).optional(),
}), z.null()]).optional(),
  findHotkeyHandler: z.function({ input: [z.unknown(), z.unknown(), z.unknown()], output: z.union([z.function({ input: [], output: z.void() }), z.null()]) }),
  hoveredNode: z.union([z.object({
  flatPath: z.string(),
}), z.null()]),
  normalizeFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.string() }),
  blurTreeSummariesExcept: z.function({ input: [z.unknown() /* TODO: ref HTMLElement */], output: z.void() }),
  onrowfocus: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.void() }),
});
export type _RowAdapter = z.infer<typeof _RowAdapterSchema>;


export const TRAAccessibleSchema = z.object({
  treeAdapter: z.intersection(TRAAccessibleSchema, _RowAdapterSchema),
  mergedDisabled: z.boolean(),
  hasChildren: z.boolean(),
  isNodeOpen: z.boolean(),
  rowNode: z.union([z.unknown() /* TODO: ref TNode */, z.null()]),
  flatPath: z.string(),
  effectiveRowConfig: z.object({
  events: z.object({
  onclick: z.function({ input: [], output: z.void() }).optional(),
  onopen: z.function({ input: [], output: z.void() }).optional(),
  onclose: z.function({ input: [], output: z.void() }).optional(),
  onfocus: z.function({ input: [], output: z.void() }).optional(),
  onblur: z.function({ input: [], output: z.void() }).optional(),
}).optional(),
  actions: z.array(z.unknown() /* TODO: ref TreeActionEntry */).optional(),
  cascadeOptions: z.array(z.unknown() /* TODO: ref TreeActionEntry */).optional(),
}).optional(),
  onrowtoggle: z.function({ input: [z.boolean()], output: z.void() }),
  requestRowUiSync: z.function({ input: [], output: z.void() }),
  getVisibleSummaries: z.function({ input: [z.unknown() /* TODO: ref Element */], output: z.array(z.unknown() /* TODO: ref HTMLElement */) }),
  focusSummary: z.function({ input: [z.unknown() /* TODO: ref HTMLElement */], output: z.void() }),
});
export type TRAAccessible = z.infer<typeof TRAAccessibleSchema>;

