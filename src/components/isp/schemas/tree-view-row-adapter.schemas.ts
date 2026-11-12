// @contexto INDICE.md · src/components/isp/README.md
/**
 * row-adapter.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type {
  CustomsRuntime,
  TNode,
  TreeActionEntry,
} from './tree-view-types.schemas.js';

/**
 * Evento del `<summary>` de una fila: un evento de raton con el destino ya
 * resuelto (el `currentTarget` real del listener).
 */
export type _SummaryEvent = MouseEvent & { currentTarget: HTMLElement };

const _SummaryEventSchema = z.custom<_SummaryEvent>();

const _RowAdapterSchema = z.object({
  onrowclick: z.function({ input: [z.custom<TNode>()], output: z.void() }),
  onrowdblclick: z.function({ input: [z.custom<TNode>()], output: z.void() }),
  syncRowSelectionChrome: z.function({ input: [], output: z.void() }),
  syncHoverFloats: z.function({ input: [], output: z.void() }),
  buildCustomsRuntime: z.function({ input: [], output: z.custom<CustomsRuntime>() }),
  customs: z.union([z.object({
  hotkeys: z.record(z.string(), z.function({ input: [z.custom<TNode>(), z.custom<CustomsRuntime>(), z.custom<KeyboardEvent>()], output: z.void() })).optional(),
  topMenuActions: z.function({ input: [z.custom<CustomsRuntime>()], output: z.array(z.custom<TreeActionEntry>()) }).optional(),
}), z.null()]).optional(),
  findHotkeyHandler: z.function({ input: [z.unknown(), z.string()], output: z.union([z.function({ input: [], output: z.void() }), z.null()]) }),
  hoveredNode: z.union([z.custom<TNode>(), z.null()]),
  normalizeFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.string() }),
  blurTreeSummariesExcept: z.function({ input: [z.custom<HTMLElement>()], output: z.void() }),
  onrowfocus: z.function({ input: [z.custom<TNode>()], output: z.void() }),
});
export type _RowAdapter = z.infer<typeof _RowAdapterSchema>;

const TRAAccessibleSchema = z.object({
  get treeAdapter(): z.ZodIntersection<typeof TRAAccessibleSchema, typeof _RowAdapterSchema> { return z.intersection(TRAAccessibleSchema, _RowAdapterSchema); },
  mergedDisabled: z.boolean(),
  hasChildren: z.boolean(),
  isNodeOpen: z.boolean(),
  rowNode: z.union([z.custom<TNode>(), z.null()]),
  flatPath: z.string(),
  effectiveRowConfig: z.object({
  events: z.object({
  onclick: z.function({ input: [], output: z.void() }).optional(),
  onopen: z.function({ input: [], output: z.void() }).optional(),
  onclose: z.function({ input: [], output: z.void() }).optional(),
  onfocus: z.function({ input: [], output: z.void() }).optional(),
  onblur: z.function({ input: [], output: z.void() }).optional(),
}).optional(),
  actions: z.array(z.custom<TreeActionEntry>()).optional(),
  cascadeOptions: z.array(z.custom<TreeActionEntry>()).optional(),
}).optional(),
  onrowtoggle: z.function({ input: [z.boolean()], output: z.void() }),
  requestRowUiSync: z.function({ input: [], output: z.void() }),
  getVisibleSummaries: z.function({ input: [z.custom<Element>()], output: z.array(z.custom<HTMLElement>()) }),
  focusSummary: z.function({ input: [z.custom<HTMLElement>()], output: z.void() }),
});
export type TRAAccessible = z.infer<typeof TRAAccessibleSchema>;

