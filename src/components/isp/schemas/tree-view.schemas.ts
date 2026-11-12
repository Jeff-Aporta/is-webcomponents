// @contexto INDICE.md · src/components/isp/README.md
/**
 * tree-view.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type {
  CustomsRuntime,
  TNode,
  TRecord,
  TreeActionEntry,
  TreeCustoms,
} from './tree-view-types.schemas.js';

const _AdapterLikeSchema = z.object({
  treeRootId: z.string(),
  _domRoot: z.custom<HTMLElement>().nullable().optional(),
  customs: z.custom<TreeCustoms>().nullable().optional(),
  menu: z.array(z.custom<TreeActionEntry>()).optional(),
  moreMenu: z.array(z.custom<TreeActionEntry>()).optional(),
  currentDragFlatPath: z.string(),
  record: z.union([z.custom<TRecord>(), z.null()]),
  rootNodes: z.array(z.custom<TNode>()),
  decorateHotkeyTitles: z.function({ input: [z.array(z.custom<TreeActionEntry>())], output: z.array(z.custom<TreeActionEntry>()) }),
  buildCustomsRuntime: z.function({ input: [], output: z.custom<CustomsRuntime>() }),
  notifySelect: z.function({ input: [], output: z.void() }),
  isPendingInsertPath: z.function({ input: [z.string()], output: z.boolean() }).optional(),
  isProtected: z.boolean(),
  canMutate: z.boolean(),
  onbranchexpand: z.function({ input: [], output: z.void() }).optional(),
  walkAncestors: z.function({ input: [z.custom<TNode>()], output: z.array(z.custom<TNode>()) }),
  getRecordSecurityCode: z.function({ input: [z.custom<TRecord>()], output: z.string() }),
  showDelete: z.function({ input: [z.unknown()], output: z.void() }),
  closeEditForm: z.function({ input: [], output: z.void() }).optional(),
  clearDragOverlays: z.function({ input: [], output: z.void() }),
  clearDropIndicators: z.function({ input: [], output: z.void() }),
  confirmProtectionRelease: z.function({ input: [], output: z.void() }),
  historyCanRedo: z.boolean(),
  isProtectionPromptOpen: z.boolean(),
  historyRedoAll: z.function({ input: [], output: z.void() }),
  dismissProtectionPrompt: z.function({ input: [], output: z.void() }),
  ontreeoutsidepointerdown: z.function({ input: [z.custom<Event>()], output: z.void() }),
  confirmDelete: z.function({ input: [z.string()], output: z.promise(z.boolean()) }),
  onrequestopendrawer: z.function({ input: [z.string()], output: z.void() }).optional(),
  onrequestclosedrawer: z.function({ input: [], output: z.void() }).optional(),
  onrequesteditshow: z.function({ input: [z.custom<TNode>(), z.string()], output: z.void() }).optional(),
  onrequestdelete: z.function({ input: [z.custom<TNode>()], output: z.void() }).optional(),
  onError: z.function({ input: [z.string()], output: z.void() }).optional(),
  addUiListener: z.function({ input: [z.function({ input: [], output: z.void() })], output: z.function({ input: [], output: z.void() }) }),
  runCustomsPreSubmit: z.function({ input: [], output: z.unknown() }).optional(),
  lastNodesRef: z.unknown(),
  onstateupdate: z.function({ input: [z.record(z.string(), z.unknown())], output: z.void() }),
});
export type _AdapterLike = z.infer<typeof _AdapterLikeSchema>;

/** `<iswc-drawer>` de la ficha. */
const _DrawerLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
  label: z.string().optional(),
}));
export type _DrawerLike = z.infer<typeof _DrawerLikeSchema>;

/** `<iswc-modal-delete>` del arbol. */
const _ModalDeleteLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
  loading: z.boolean().optional(),
  entity: z.string().optional(),
}));
export type _ModalDeleteLike = z.infer<typeof _ModalDeleteLikeSchema>;

/** `<iswc-dialog>` de proteccion. */
const _DialogLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
}));
export type _DialogLike = z.infer<typeof _DialogLikeSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TreeViewEventos = { 'iswc-error': { message: string }; 'iswc-select': { node: unknown; flatPath: string }; 'iswc-frm-open': { record: unknown; itdForm: string; ancestors: unknown[]; isNew: boolean }; 'iswc-frm-close': Record<string, never> };
