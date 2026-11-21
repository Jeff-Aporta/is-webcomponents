// @contexto INDICE.md · src/components/isp/README.md
/**
 * render-rows.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';
import type { RowAdapterBridge, TNode, TreeActionEntry } from './tree-view-types.schemas.js';

const RenderOptsSchema = z.object({
  labelField: z.string().optional(),
  helperField: z.string().optional(),
  renderRow: z.function({ input: [z.custom<TNode>(), z.custom<HTMLElement>()], output: z.void() }).optional(),
  renderHelper: z.function({ input: [z.custom<TNode>(), z.custom<HTMLElement>()], output: z.void() }).optional(),
});
export type RenderOpts = z.infer<typeof RenderOptsSchema>;

/**
 * Store de handlers por elemento: cada fila guarda su `<summary>` y sus
 * listeners para poder soltarlos al repintar.
 */
export type HandlerStore = Record<string, EventListener>;

const RenderAdapterSchema = z.object({
  flatPath: z.string(),
  getOrCreateRowAdapter: z.function({ input: [z.custom<RowAdapterBridge>()], output: z.custom<RenderAdapterLike>() }),
});
export type RenderAdapter = z.infer<typeof RenderAdapterSchema>;

/** Adapter de filas que consume `paintRow`. */
type RenderAdapterLike = {
  flatPath: string;
  getOrCreateRowAdapter: (bridge: RowAdapterBridge) => unknown;
};

const RowControllerSchema = z.object({
  flatPath: z.string(),
  isSelected: z.boolean(),
  isHighlighted: z.boolean(),
  isNodeOpen: z.boolean(),
  hasChildren: z.boolean(),
  isDraggable: z.boolean(),
  mergedDisabled: z.boolean(),
  isLockedByProtection: z.boolean(),
  isFrozen: z.boolean(),
  shouldFlash: z.boolean(),
  shouldFlashError: z.boolean(),
  dragOver: z.union([z.literal("before"), z.literal("after"), z.literal("into"), z.null()]),
  dragForbidden: z.boolean(),
  showCaret: z.boolean(),
  rowIcono: z.union([z.object({
  icon: z.string(),
  mergedStyle: z.string().optional(),
}), z.null()]),
  showOptions: z.boolean(),
  hasRowTools: z.boolean(),
  filteredActions: z.array(z.custom<TreeActionEntry>()),
  cascadeOptions: z.array(z.custom<TreeActionEntry>()),
  cascadeDisabled: z.boolean(),
  floatCard: z.record(z.string(), z.unknown()),
  floatVisible: z.boolean(),
  onLeadIconClick: z.union([z.function({ input: [], output: z.void() }), z.null()]),
  ondragstart: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  ondragend: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  ondetailstoggle: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummaryclick: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummarydblclick: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onkeydown: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummaryfocus: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummaryblur: z.function({ input: [], output: z.void() }),
  onsummarypointerenter: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummarypointerleave: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummarydragenter: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummarydragover: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  onsummarydragleave: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  ondrop: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  requestRowUiSync: z.function({ input: [], output: z.void() }),
});
export type RowController = z.infer<typeof RowControllerSchema>;

/**
 * Controller de una fila con su candado: el render guarda la referencia para
 * que el pintado posterior no se pise con el suyo.
 */
export type ControllerWithLock = RowController & { _trvwrLock?: boolean };
