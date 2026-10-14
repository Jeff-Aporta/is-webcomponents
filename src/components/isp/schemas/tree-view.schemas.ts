/**
 * tree-view.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const _AdapterLikeSchema = z.object({
  treeRootId: z.string(),
  _domRoot: z.union([z.unknown() /* TODO: ref HTMLElement */, z.null()]).optional(),
  customs: z.union([z.unknown() /* TODO: ref TreeCustoms */, z.null()]).optional(),
  menu: z.array(z.unknown() /* TODO: ref TreeActionEntry */).optional(),
  moreMenu: z.array(z.unknown() /* TODO: ref TreeActionEntry */).optional(),
  currentDragFlatPath: z.string(),
  record: z.union([z.unknown() /* TODO: ref TRecord */, z.null()]),
  rootNodes: z.array(z.unknown() /* TODO: ref TNode */),
  decorateHotkeyTitles: z.function({ input: [z.array(z.unknown() /* TODO: ref TreeActionEntry */)], output: z.array(z.unknown() /* TODO: ref TreeActionEntry */) }),
  buildCustomsRuntime: z.function({ input: [], output: z.unknown() }),
  notifySelect: z.function({ input: [], output: z.void() }),
  isPendingInsertPath: z.function({ input: [z.string()], output: z.boolean() }).optional(),
  isProtected: z.boolean(),
  canMutate: z.boolean(),
  onbranchexpand: z.function({ input: [], output: z.void() }).optional(),
  walkAncestors: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.array(z.unknown() /* TODO: ref TNode */) }),
  getRecordSecurityCode: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.string() }),
  showDelete: z.function({ input: [z.unknown()], output: z.void() }),
  closeEditForm: z.function({ input: [], output: z.void() }).optional(),
  clearDragOverlays: z.function({ input: [], output: z.void() }),
  clearDropIndicators: z.function({ input: [], output: z.void() }),
  confirmProtectionRelease: z.function({ input: [], output: z.void() }),
  historyCanRedo: z.boolean(),
  isProtectionPromptOpen: z.boolean(),
  historyRedoAll: z.function({ input: [], output: z.void() }),
  dismissProtectionPrompt: z.function({ input: [], output: z.void() }),
  ontreeoutsidepointerdown: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }),
  confirmDelete: z.function({ input: [z.string()], output: z.promise(z.boolean()) }),
  onrequestopendrawer: z.function({ input: [z.string()], output: z.void() }).optional(),
  onrequestclosedrawer: z.function({ input: [], output: z.void() }).optional(),
  onrequesteditshow: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.string()], output: z.void() }).optional(),
  onrequestdelete: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.void() }).optional(),
  onError: z.function({ input: [z.string()], output: z.void() }).optional(),
  addUiListener: z.function({ input: [z.function({ input: [], output: z.void() })], output: z.function({ input: [], output: z.void() }) }),
  runCustomsPreSubmit: z.function({ input: [], output: z.unknown() }).optional(),
  lastNodesRef: z.unknown(),
  onstateupdate: z.function({ input: [z.record(z.string(), z.unknown())], output: z.void() }),
});
export type _AdapterLike = z.infer<typeof _AdapterLikeSchema>;


export const _DrawerLikeSchema = z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
  label: z.string().optional(),
});
export type _DrawerLike = z.infer<typeof _DrawerLikeSchema>;


export const _ModalDeleteLikeSchema = z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
  loading: z.boolean().optional(),
  entity: z.string().optional(),
});
export type _ModalDeleteLike = z.infer<typeof _ModalDeleteLikeSchema>;


export const _DialogLikeSchema = z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
});
export type _DialogLike = z.infer<typeof _DialogLikeSchema>;

