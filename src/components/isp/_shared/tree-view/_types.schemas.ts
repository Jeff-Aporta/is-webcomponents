/**
 * _types.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TNodeSchema = z.object({
  flatPath: z.string(),
  pathInit: z.string().optional(),
  childrens: z.array(TNodeSchema).optional(),
  depth: z.number().optional(),
  topology: z.string().optional(),
  containment: z.string().optional(),
  mobility: z.string().optional(),
  freeze: z.boolean().optional(),
  hasChildren: z.boolean().optional(),
  /* TODO: parse fail readonly isAtom?: boolean */
  /* TODO: parse fail readonly isGroupActor?: boolean */
  /* TODO: parse fail readonly isPrison?: boolean */
  /* TODO: parse fail readonly isHermetic?: boolean */
  /* TODO: parse fail readonly isCell?: boolean */
  /* TODO: parse fail readonly isFreezer?: boolean */
  /* TODO: parse fail readonly isUnanchored?: boolean */
  /* TODO: parse fail readonly isEmpty?: boolean */
  /* TODO: parse fail [key: string]: unknown */
});
export type TNode = z.infer<typeof TNodeSchema>;


export const TRecordSchema = z.object({
  iplan: z.string().optional(),
  idrow: z.string().optional(),
});
export type TRecord = z.infer<typeof TRecordSchema>;


export const TreeActionSpecSchema = z.object({
  icon: z.string().optional(),
  iconTrue: z.string().optional(),
  iconFalse: z.string().optional(),
  label: z.string().optional(),
  title: z.string().optional(),
  hotkey: z.string().optional(),
  color: z.string().optional(),
  colorFalse: z.string().optional(),
  checked: z.boolean().optional(),
  disabled: z.boolean().optional(),
  separator: z.boolean().optional(),
  onClick: z.function({ input: [], output: z.void() }).optional(),
});
export type TreeActionSpec = z.infer<typeof TreeActionSpecSchema>;


export const TreeActionEntrySchema = z.union([TreeActionSpecSchema, z.array(TreeActionEntrySchema), z.null(), z.undefined(), z.literal(false)]);
export type TreeActionEntry = z.infer<typeof TreeActionEntrySchema>;


export const IconConfigSchema = z.object({
  icon: z.string(),
  color: z.string().optional(),
  style: z.string().optional(),
  title: z.string().optional(),
});
export type IconConfig = z.infer<typeof IconConfigSchema>;


export const FloatCardConfigSchema = z.object({
  e: z.number().optional(),
  ty: z.union([z.number(), z.string()]).optional(),
  /* TODO: parse fail [key: string]: unknown */
});
export type FloatCardConfig = z.infer<typeof FloatCardConfigSchema>;


export const RowConfigSchema = z.object({
  icono: IconConfigSchema.optional(),
  actions: z.array(TreeActionEntrySchema),
  cascadeOptions: z.array(TreeActionEntrySchema),
  floatCard: FloatCardConfigSchema.optional(),
  draggable: z.boolean().optional(),
  isFirst: z.boolean().optional(),
  isLast: z.boolean().optional(),
  events: z.object({
  onclick: z.function({ input: [], output: z.void() }).optional(),
  onopen: z.function({ input: [], output: z.void() }).optional(),
  onclose: z.function({ input: [], output: z.void() }).optional(),
  onfocus: z.function({ input: [], output: z.void() }).optional(),
  onblur: z.function({ input: [], output: z.void() }).optional(),
  onleadiconclick: z.function({ input: [], output: z.void() }).optional(),
}).optional(),
});
export type RowConfig = z.infer<typeof RowConfigSchema>;


export const SiblingPositionSchema = z.object({
  isFirst: z.boolean(),
  isLast: z.boolean(),
});
export type SiblingPosition = z.infer<typeof SiblingPositionSchema>;


export const DropPositionSchema = z.union([z.literal("before"), z.literal("after"), z.literal("into")]);
export type DropPosition = z.infer<typeof DropPositionSchema>;


export const MoveDirectionSchema = z.union([z.literal("up"), z.literal("down")]);
export type MoveDirection = z.infer<typeof MoveDirectionSchema>;


export const PendingDeleteSnapshotSchema = z.object({
  prevVisibleIds: z.array(z.string()),
  prevDeleteIdx: z.number(),
});
export type PendingDeleteSnapshot = z.infer<typeof PendingDeleteSnapshotSchema>;


export const RowAdapterBridgeSchema = z.object({
  treeController: z.unknown().optional(),
  node: TNodeSchema.optional(),
  forceRefresh: z.function({ input: [], output: z.void() }).optional(),
});
export type RowAdapterBridge = z.infer<typeof RowAdapterBridgeSchema>;


export const TreeContextSchema = z.object({
  readonly: z.boolean().optional(),
  disabled: z.boolean().optional(),
  draggable: z.boolean().optional(),
  bAllowed: z.object({
  Crear: z.boolean().optional(),
  Modificar: z.boolean().optional(),
  Eliminar: z.boolean().optional(),
  Visualizar: z.boolean().optional(),
}).optional(),
  record: z.union([TRecordSchema, z.null()]).optional(),
  List2Rows: z.array(TNodeSchema).optional(),
  /* TODO: parse fail [key: string]: unknown */
});
export type TreeContext = z.infer<typeof TreeContextSchema>;


export const LevelNameArgsSchema = z.object({
  depth: z.number(),
});
export type LevelNameArgs = z.infer<typeof LevelNameArgsSchema>;


export const NodeIconArgsSchema = z.object({
  isLastNode: z.boolean(),
  isFolder: z.boolean(),
  hasChildren: z.boolean(),
  isExpanded: z.boolean(),
  isEmptyFolder: z.boolean(),
});
export type NodeIconArgs = z.infer<typeof NodeIconArgsSchema>;


export const CustomsRuntimeSchema = z.object({
  /* TODO: parse fail readonly record: TRecord | null */
  /* TODO: parse fail readonly rootNodes: TNode[] */
  /* TODO: parse fail readonly canCollapseAll: boolean */
  /* TODO: parse fail readonly canExpandAll: boolean */
  /* TODO: parse fail readonly historyCanUndo: boolean */
  /* TODO: parse fail readonly historyCanRedo: boolean */
  /* TODO: parse fail readonly historyIsViewingPast: boolean */
  /* TODO: parse fail readonly isProtected: boolean */
  /* TODO: parse fail readonly canToggleProtection: boolean */
  /* TODO: parse fail readonly isReadOnlyExternal: boolean */
  /* TODO: parse fail readonly isReadOnly: boolean */
  /* TODO: parse fail readonly canMutate: boolean */
  findByFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.union([z.unknown() /* TODO: ref TNode */, z.undefined()]) }),
  findByPathInit: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.union([z.unknown() /* TODO: ref TNode */, z.undefined()]) }),
  sanitizeFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.string() }),
  move: z.function({ input: [z.unknown() /* TODO: ref TRecord */, z.unknown() /* TODO: ref MoveDirection */], output: z.promise(z.union([z.string(), z.null(), z.undefined()])) }),
  addChild: z.function({ input: [z.unknown() /* TODO: ref TRecord */], output: z.void() }),
  addSibling: z.function({ input: [z.unknown() /* TODO: ref TRecord */, z.string()], output: z.void() }),
  openEdit: z.function({ input: [z.unknown() /* TODO: ref TRecord */], output: z.void() }),
  openView: z.function({ input: [z.unknown() /* TODO: ref TRecord */], output: z.void() }),
  openViewNode: z.function({ input: [z.unknown() /* TODO: ref TRecord */], output: z.void() }),
  extinguish: z.function({ input: [z.unknown() /* TODO: ref TRecord */], output: z.void() }),
  remove: z.function({ input: [z.unknown() /* TODO: ref TRecord */], output: z.void() }),
  release: z.function({ input: [z.unknown() /* TODO: ref TRecord */], output: z.void() }),
  addRoot: z.function({ input: [], output: z.void() }),
  collapseAll: z.function({ input: [], output: z.void() }),
  expandAll: z.function({ input: [], output: z.void() }),
  historyUndo: z.function({ input: [], output: z.void() }),
  historyRedo: z.function({ input: [], output: z.void() }),
  historyRecover: z.function({ input: [], output: z.void() }),
  protectionToggle: z.function({ input: [], output: z.void() }),
  setProtected: z.function({ input: [z.boolean()], output: z.void() }),
  actorActions: z.array(z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.unknown() /* TODO: ref TreeActionSpec */ })),
  addChildLabel: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.string() }),
  isFirstSibling: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.boolean() }),
  isLastSibling: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.boolean() }),
  isPrisonOnly: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.boolean() }),
});
export type CustomsRuntime = z.infer<typeof CustomsRuntimeSchema>;


export const HotkeyHandlerSchema = z.function({ input: [z.unknown() /* TODO: ref TNode */, z.unknown() /* TODO: ref CustomsRuntime */, z.unknown() /* TODO: ref KeyboardEvent */], output: z.void() });
export type HotkeyHandler = z.infer<typeof HotkeyHandlerSchema>;


export const TreeCustomsSchema = z.object({
  entrie: z.string().optional(),
  entries: z.string().optional(),
  klass: z.unknown() /* TODO: cannot convert */.optional(),
  list: z.function({ input: [], output: z.union([z.array(z.unknown() /* TODO: ref TNode */), z.null(), z.undefined()]) }).optional(),
  newItem: z.function({ input: [z.union([z.unknown() /* TODO: ref TNode */, z.undefined()])], output: z.unknown() /* TODO: ref TNode */ }).optional(),
  updateNode: z.function({ input: [z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */], output: z.union([z.void(), z.promise(z.void())]) }).optional(),
  getNodeIcon: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.unknown() /* TODO: ref NodeIconArgs */], output: z.union([z.unknown() /* TODO: ref IconConfig */, z.null()]) }).optional(),
  levelName: z.function({ input: [z.unknown() /* TODO: ref LevelNameArgs */], output: z.union([z.string(), z.undefined()]) }).optional(),
  rowActions: z.array(z.function({ input: [z.unknown() /* TODO: ref TNode */, z.unknown() /* TODO: ref CustomsRuntime */], output: z.unknown() /* TODO: ref TreeActionEntry */ })).optional(),
  rowCascadeOptions: z.array(z.function({ input: [z.unknown() /* TODO: ref TNode */, z.unknown() /* TODO: ref CustomsRuntime */], output: z.unknown() /* TODO: ref TreeActionEntry */ })).optional(),
  topMenuActions: z.array(z.function({ input: [z.unknown() /* TODO: ref CustomsRuntime */], output: z.unknown() /* TODO: ref TreeActionEntry */ })).optional(),
  hotkeys: z.record(z.string(), HotkeyHandlerSchema).optional(),
  getRowConfig: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.unknown() /* TODO: ref RowConfig */], output: z.unknown() /* TODO: ref RowConfig */ }).optional(),
  getFlatPath: z.function({ input: [z.unknown() /* TODO: ref TNode */], output: z.string() }).optional(),
  setFlatPath: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.string()], output: z.void() }).optional(),
  remapReferences: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.map(z.string(), z.string())], output: z.void() }).optional(),
  openLastLevelSelector: z.function({ input: [], output: z.void() }).optional(),
  onExpand: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.unknown() /* TODO: ref CustomsRuntime */], output: z.void() }).optional(),
  onCollapse: z.function({ input: [z.unknown() /* TODO: ref TNode */, z.unknown() /* TODO: ref CustomsRuntime */], output: z.void() }).optional(),
});
export type TreeCustoms = z.infer<typeof TreeCustomsSchema>;

