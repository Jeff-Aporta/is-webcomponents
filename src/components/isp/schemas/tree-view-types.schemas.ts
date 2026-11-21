// @contexto INDICE.md · src/components/isp/README.md
/**
 * _types.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const TNodeSchema = z.object({
  flatPath: z.string(),
  pathInit: z.string().optional(),
  get childrens(): z.ZodOptional<z.ZodArray<typeof TNodeSchema>> { return z.array(TNodeSchema).optional(); },
  depth: z.number().optional(),
  topology: z.string().optional(),
  containment: z.string().optional(),
  mobility: z.string().optional(),
  freeze: z.boolean().optional(),
  hasChildren: z.boolean().optional(),
  /**
   * Flags del "shape" del nodo: vienen de los getters decorados en
   * `tree-data.ts` (`isAtom`, `isGroupActor`, `isPrison`, `isHermetic`,
   * `isCell`, `isFreezer`, `isEmpty`, `isUnanchored`). Son opcionales
   * para que un nodo plano (sin decorar) siga siendo asignable.
   */
  isAtom: z.boolean().optional(),
  isGroupActor: z.boolean().optional(),
  isPrison: z.boolean().optional(),
  isHermetic: z.boolean().optional(),
  isCell: z.boolean().optional(),
  isFreezer: z.boolean().optional(),
  isUnanchored: z.boolean().optional(),
  isEmpty: z.boolean().optional(),
  /** Etiqueta y nombre: los lee `paintRow` cuando no hay renderer custom. */
  label: z.string().optional(),
  name: z.string().optional(),
});
/**
 * Nodo del árbol. El índice abierto refleja el shape real: un nodo es un
 * registro de la BD con campos arbitrarios (`titulo`, `codigo`…), y el
 * paintedor los lee por nombre (`labelField`, `helperField`).
 */
export type TNode = z.infer<typeof TNodeSchema> & { [key: string]: unknown };

const TRecordSchema = z.intersection(TNodeSchema, z.object({
  iplan: z.string().optional(),
  idrow: z.string().optional(),
}));
/**
 * Registro que el adapter expone al consumidor: un nodo del árbol con las
 * claves de fila (`iplan` / `idrow`) encima.
 */
export type TRecord = z.infer<typeof TRecordSchema> & { [key: string]: unknown };

const TreeActionSpecSchema = z.object({
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

/** Una entrada de `actions` / `cascadeOptions` puede ser un grupo, un item o `null`. */
export type TreeActionEntry = TreeActionSpec | TreeActionEntry[] | null | undefined | false;
const TreeActionEntrySchema: z.ZodType<TreeActionEntry> = z.lazy(() =>
  z.union([TreeActionSpecSchema, z.array(TreeActionEntrySchema), z.null(), z.undefined(), z.literal(false)])
);

const IconConfigSchema = z.object({
  icon: z.string(),
  color: z.string().optional(),
  style: z.string().optional(),
  title: z.string().optional(),
});
export type IconConfig = z.infer<typeof IconConfigSchema>;

const FloatCardConfigSchema = z.object({
  e: z.number().optional(),
  ty: z.union([z.number(), z.string()]).optional(),
});
/** Config de FloatCard: la del adapter + los overrides por fila. */
export type FloatCardConfig = z.infer<typeof FloatCardConfigSchema> & { [key: string]: unknown };

const RowConfigSchema = z.object({
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

const SiblingPositionSchema = z.object({
  isFirst: z.boolean(),
  isLast: z.boolean(),
});
export type SiblingPosition = z.infer<typeof SiblingPositionSchema>;

const DropPositionSchema = z.union([z.literal("before"), z.literal("after"), z.literal("into")]);
export type DropPosition = z.infer<typeof DropPositionSchema>;

const MoveDirectionSchema = z.union([z.literal("up"), z.literal("down")]);
export type MoveDirection = z.infer<typeof MoveDirectionSchema>;

const PendingDeleteSnapshotSchema = z.object({
  prevVisibleIds: z.array(z.string()),
  prevDeleteIdx: z.number(),
});
export type PendingDeleteSnapshot = z.infer<typeof PendingDeleteSnapshotSchema>;

const RowAdapterBridgeSchema = z.object({
  treeController: z.custom<TreeControllerLike>().optional(),
  node: TNodeSchema.optional(),
  forceRefresh: z.function({ input: [], output: z.void() }).optional(),
});
export type RowAdapterBridge = z.infer<typeof RowAdapterBridgeSchema>;

const TreeContextSchema = z.object({
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
});
export type TreeContext = z.infer<typeof TreeContextSchema>;

const LevelNameArgsSchema = z.object({
  depth: z.number(),
});
export type LevelNameArgs = z.infer<typeof LevelNameArgsSchema>;

/** Args que recibe `getNodeIcon`. */
const NodeIconArgsSchema = z.object({
  isLastNode: z.boolean(),
  isFolder: z.boolean(),
  hasChildren: z.boolean(),
  isExpanded: z.boolean(),
  isEmptyFolder: z.boolean(),
});

const CustomsRuntimeSchema = z.object({
  record: z.union([TRecordSchema, z.null()]),
  rootNodes: z.array(TNodeSchema),
  canCollapseAll: z.boolean(),
  canExpandAll: z.boolean(),
  historyCanUndo: z.boolean(),
  historyCanRedo: z.boolean(),
  historyIsViewingPast: z.boolean(),
  isProtected: z.boolean(),
  canToggleProtection: z.boolean(),
  isReadOnlyExternal: z.boolean(),
  isReadOnly: z.boolean(),
  canMutate: z.boolean(),
  findByFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.union([TNodeSchema, z.undefined()]) }),
  findByPathInit: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.union([TNodeSchema, z.undefined()]) }),
  sanitizeFlatPath: z.function({ input: [z.union([z.string(), z.null(), z.undefined()])], output: z.string() }),
  move: z.function({ input: [TRecordSchema, MoveDirectionSchema], output: z.promise(z.union([z.string(), z.null(), z.undefined()])) }),
  addChild: z.function({ input: [TRecordSchema], output: z.void() }),
  addSibling: z.function({ input: [TRecordSchema, z.string()], output: z.void() }),
  openEdit: z.function({ input: [TRecordSchema], output: z.void() }),
  openView: z.function({ input: [TRecordSchema], output: z.void() }),
  openViewNode: z.function({ input: [TRecordSchema], output: z.void() }),
  extinguish: z.function({ input: [TRecordSchema], output: z.void() }),
  remove: z.function({ input: [TRecordSchema], output: z.void() }),
  release: z.function({ input: [TRecordSchema], output: z.void() }),
  addRoot: z.function({ input: [], output: z.void() }),
  collapseAll: z.function({ input: [], output: z.void() }),
  expandAll: z.function({ input: [], output: z.void() }),
  historyUndo: z.function({ input: [], output: z.void() }),
  historyRedo: z.function({ input: [], output: z.void() }),
  historyRecover: z.function({ input: [], output: z.void() }),
  protectionToggle: z.function({ input: [], output: z.void() }),
  setProtected: z.function({ input: [z.boolean()], output: z.void() }),
  actorActions: z.function({ input: [TNodeSchema], output: z.array(TreeActionSpecSchema) }),
  addChildLabel: z.function({ input: [TNodeSchema], output: z.string() }),
  isFirstSibling: z.function({ input: [TNodeSchema], output: z.boolean() }),
  isLastSibling: z.function({ input: [TNodeSchema], output: z.boolean() }),
  isPrisonOnly: z.function({ input: [TNodeSchema], output: z.boolean() }),
});
export type CustomsRuntime = z.infer<typeof CustomsRuntimeSchema>;

const HotkeyHandlerSchema = z.function({ input: [TNodeSchema, z.custom<CustomsRuntime>(), z.custom<KeyboardEvent>()], output: z.void() });

const TreeCustomsSchema = z.object({
  entrie: z.string().optional(),
  entries: z.string().optional(),
  klass: z.custom<new () => TRecord>().optional(),
  list: z.function({ input: [], output: z.union([z.array(TNodeSchema), z.null(), z.undefined()]) }).optional(),
  newItem: z.function({ input: [z.custom<Partial<TNode>>()], output: TNodeSchema }).optional(),
  updateNode: z.function({ input: [TNodeSchema, z.boolean(), z.custom<CustomsRuntime>()], output: z.union([z.void(), z.promise(z.void())]) }).optional(),
  getNodeIcon: z.function({ input: [TNodeSchema, NodeIconArgsSchema], output: z.union([IconConfigSchema, z.null()]) }).optional(),
  levelName: z.function({ input: [LevelNameArgsSchema], output: z.union([z.string(), z.undefined()]) }).optional(),
  rowActions: z.function({ input: [TNodeSchema, z.custom<CustomsRuntime>()], output: z.array(TreeActionEntrySchema) }).optional(),
  rowCascadeOptions: z.function({ input: [TNodeSchema, z.custom<CustomsRuntime>()], output: z.array(TreeActionEntrySchema) }).optional(),
  topMenuActions: z.function({ input: [z.custom<CustomsRuntime>()], output: z.array(TreeActionEntrySchema) }).optional(),
  hotkeys: z.record(z.string(), HotkeyHandlerSchema).optional(),
  getRowConfig: z.function({ input: [TNodeSchema, RowConfigSchema], output: RowConfigSchema }).optional(),
  getFlatPath: z.function({ input: [TNodeSchema], output: z.string() }).optional(),
  setFlatPath: z.function({ input: [TNodeSchema, z.string()], output: z.void() }).optional(),
  remapReferences: z.function({ input: [TNodeSchema, z.map(z.string(), z.string())], output: z.void() }).optional(),
  openLastLevelSelector: z.function({ input: [], output: z.void() }).optional(),
  onExpand: z.function({ input: [TNodeSchema, z.custom<CustomsRuntime>()], output: z.void() }).optional(),
  onCollapse: z.function({ input: [TNodeSchema, z.custom<CustomsRuntime>()], output: z.void() }).optional(),
});
export type TreeCustoms = z.infer<typeof TreeCustomsSchema>;

/**
 * Controller del árbol que consume el bridge de filas: el subset que
 * `paintRow` necesita del adapter (lo implementa `TreeRowViewAdapter`).
 */
interface TreeControllerLike {
  flatPath: string;
  [key: string]: unknown;
}
