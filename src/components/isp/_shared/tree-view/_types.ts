/**
 * Tipos compartidos del módulo TreeView (port vanilla de `is-tree`).
 *
 * Este archivo NO contiene código de runtime: solo tipos e interfaces para que
 * los archivos del árbol (`00-as-row.ts`, `02-model.ts`, `03-tree-shape.ts`,
 * `04-tree-flow.ts`, `05-view.ts`, `06-mutations.ts`, `06b-history.ts`,
 * `render-rows.ts`) puedan compartir un vocabulario común sin acoplarse.
 *
 * El "shape" de un nodo viene de los getters decorados en `tree-data.ts`
 * (`isAtom`, `isGroupActor`, `isPrison`, `isHermetic`, `isCell`, `isFreezer`,
 * `isEmpty`, `isUnanchored`). Los definimos como campos opcionales de la
 * interfaz `TNode` para que se pueda pasar un nodo plano sin decoración y aún
 * así compilar.
 *
 * El archivo sigue la convención `asRecord(v: unknown): Record<string, unknown>`
 * del WIP-ROOT: nunca `any` salvo justificación extrema.
 */

// ── Tipos de dominio ─────────────────────────────────────────────────────

/** Forma mínima de un nodo del árbol (port vanilla). */
export interface TNode {
  /** Path estable tipo "1.2.3"; se normaliza quitando prefijos `_UP_` / `_M_`. */
  flatPath: string;
  /** Path original (antes de remap por reorder); se congela tras la primera decoración. */
  pathInit?: string;
  /** Hijos directos; `undefined` o `[]` para nodos hoja. */
  childrens?: TNode[];
  /** Profundidad; derivada del `flatPath` en `applyDomainDefaults`. */
  depth?: number;
  /** Forma lógica del nodo: "atom" | "group". */
  topology?: string;
  /** Modo de contención: "cell" | "prison" | "hermetic". */
  containment?: string;
  /** Movilidad: "unanchored" | "freezer". */
  mobility?: string;
  /** Congela el nodo y todos sus ancestros. */
  freeze?: boolean;
  /** Flag materializado por `applyDomainDefaults` cuando el nodo tiene hijos. */
  hasChildren?: boolean;
  // Decoradores de tree-data.ts (Object.defineProperties). Read-only.
  readonly isAtom?: boolean;
  readonly isGroupActor?: boolean;
  readonly isPrison?: boolean;
  readonly isHermetic?: boolean;
  readonly isCell?: boolean;
  readonly isFreezer?: boolean;
  readonly isUnanchored?: boolean;
  readonly isEmpty?: boolean;
  // Campos dinámicos arbitrarios (`label`, `name`, `titulo`, `iplan`, `idrow`, …).
  [key: string]: unknown;
}

/** Forma mínima del `record` del contexto (lo que el adapter expone al consumidor). */
export interface TRecord extends TNode {
  iplan?: string;
  idrow?: string;
}

// ── Acciones / botones ───────────────────────────────────────────────────

/** Spec de un botón de acción del treeview. */
export interface TreeActionSpec {
  icon?: string;
  iconTrue?: string;
  iconFalse?: string;
  label?: string;
  title?: string;
  hotkey?: string;
  color?: string;
  colorFalse?: string;
  checked?: boolean;
  disabled?: boolean;
  /** Marcador de separador (FlexOptions lo trata como `<is-divider>`). */
  separator?: boolean;
  onClick?: () => void;
}

/** Una entrada de `actions` / `cascadeOptions` puede ser un grupo, un item o `null`. */
export type TreeActionEntry =
  | TreeActionSpec
  | TreeActionEntry[]
  | null
  | undefined
  | false;

// ── Config de filas ──────────────────────────────────────────────────────

/** Config devuelta por `getNodeIcon` (customs). */
export interface IconConfig {
  icon: string;
  color?: string;
  style?: string;
  title?: string;
}

/** Config de FloatCard (mezcla de `treeAdapter.floatCard` + overrides por fila). */
export interface FloatCardConfig {
  e?: number;
  ty?: number | string;
  [key: string]: unknown;
}

/** Config calculada por `buildDefaultRowConfig` / `getRowConfig`. */
export interface RowConfig {
  icono?: IconConfig;
  actions: TreeActionEntry[];
  cascadeOptions: TreeActionEntry[];
  floatCard?: FloatCardConfig;
  draggable?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  events?: {
    onclick?: () => void;
    onopen?: () => void;
    onclose?: () => void;
    onfocus?: () => void;
    onblur?: () => void;
    onleadiconclick?: () => void;
  };
}

/** Posición que devuelve `getSiblingPosition`. */
export interface SiblingPosition {
  isFirst: boolean;
  isLast: boolean;
}

// ── Posiciones / direcciones ─────────────────────────────────────────────

/** Posición relativa al target en operaciones de drop. */
export type DropPosition = "before" | "after" | "into";

/** Dirección de `move`. */
export type MoveDirection = "up" | "down";

// ── Snapshot / runtime ───────────────────────────────────────────────────

/** Snapshot del pending delete (para restaurar la selección). */
export interface PendingDeleteSnapshot {
  prevVisibleIds: string[];
  prevDeleteIdx: number;
}

/** Bridge que `TreeRowAdapter` consume (lo que `paintRow` le pasa). */
export interface RowAdapterBridge {
  treeController?: unknown;
  node?: TNode;
  forceRefresh?: () => void;
}

// ── Contexto / customs ───────────────────────────────────────────────────

/** Shape del `context` que el adapter recibe del consumidor. */
export interface TreeContext {
  readonly?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  bAllowed?: {
    Crear?: boolean;
    Modificar?: boolean;
    Eliminar?: boolean;
    Visualizar?: boolean;
  };
  record?: TRecord | null;
  List2Rows?: TNode[];
  [key: string]: unknown;
}

/** Args que recibe `levelName` (`{ depth }`). */
export interface LevelNameArgs {
  depth: number;
}

/** Args que recibe `getNodeIcon`. */
export interface NodeIconArgs {
  isLastNode: boolean;
  isFolder: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  isEmptyFolder: boolean;
}

/** Hook runtime que `buildCustomsRuntime` expone a los customs. */
export interface CustomsRuntime {
  readonly record: TRecord | null;
  readonly rootNodes: TNode[];
  readonly canCollapseAll: boolean;
  readonly canExpandAll: boolean;
  readonly historyCanUndo: boolean;
  readonly historyCanRedo: boolean;
  readonly historyIsViewingPast: boolean;
  readonly isProtected: boolean;
  readonly canToggleProtection: boolean;
  readonly isReadOnlyExternal: boolean;
  readonly isReadOnly: boolean;
  readonly canMutate: boolean;
  findByFlatPath: (path: string | null | undefined) => TNode | undefined;
  findByPathInit: (pathInit: string | null | undefined) => TNode | undefined;
  sanitizeFlatPath: (id: string | null | undefined) => string;
  move: (rec: TRecord, dir: MoveDirection) => Promise<string | null | undefined>;
  addChild: (rec: TRecord) => void;
  addSibling: (rec: TRecord, pos: string) => void;
  openEdit: (rec: TRecord) => void;
  openView: (rec: TRecord) => void;
  openViewNode: (rec: TRecord) => void;
  extinguish: (rec: TRecord) => void;
  remove: (rec: TRecord) => void;
  release: (rec: TRecord) => void;
  addRoot: () => void;
  collapseAll: () => void;
  expandAll: () => void;
  historyUndo: () => void;
  historyRedo: () => void;
  historyRecover: () => void;
  protectionToggle: () => void;
  setProtected: (v: boolean) => void;
  actorActions: (node: TNode) => TreeActionSpec[];
  addChildLabel: (node: TNode) => string;
  isFirstSibling: (node: TNode) => boolean;
  isLastSibling: (node: TNode) => boolean;
  isPrisonOnly: (node: TNode) => boolean;
}

/** Hotkey handler signature (`customs.hotkeys[combo]`). */
export type HotkeyHandler = (
  node: TNode,
  runtime: CustomsRuntime,
  e: KeyboardEvent,
) => void;

/** Customs interface — hooks que el consumidor puede sobreescribir. */
export interface TreeCustoms {
  entrie?: string;
  entries?: string;
  /** Clase para materializar nodos cuando el item es plano. */
  klass?: new (...args: unknown[]) => TNode;
  /** Override de la lista fuente. */
  list?: () => TNode[] | null | undefined;
  /** Hook para construir un item nuevo desde un payload parcial. */
  newItem?: (data: Partial<TNode> | undefined) => TNode;
  /** Hook llamado al materializar / actualizar un nodo. */
  updateNode?: (
    node: TNode,
    isNew: boolean,
    runtime: CustomsRuntime,
  ) => void | Promise<void>;
  /** Override del ícono de fila. */
  getNodeIcon?: (node: TNode, ctx: NodeIconArgs) => IconConfig | null;
  /** Etiqueta de nivel (ej: "Sector", "Subsector"). */
  levelName?: (args: LevelNameArgs) => string | undefined;
  /** Acciones inline por fila. */
  rowActions?: (node: TNode, runtime: CustomsRuntime) => TreeActionEntry[];
  /** Acciones cascada (dropdown "más opciones"). */
  rowCascadeOptions?: (node: TNode, runtime: CustomsRuntime) => TreeActionEntry[];
  /** Toolbar top-menu. */
  topMenuActions?: (runtime: CustomsRuntime) => TreeActionEntry[];
  /** Mapa de hotkeys (`combo -> handler`). */
  hotkeys?: Record<string, HotkeyHandler>;
  /** Override por fila de la config por defecto. */
  getRowConfig?: (node: TNode, defaultConfig: RowConfig) => RowConfig;
  /** Lee el pathInit desde el modelo del consumidor. */
  getFlatPath?: (node: TNode) => string;
  /** Persiste flatPath en el modelo del consumidor. */
  setFlatPath?: (node: TNode, flatPath: string) => void;
  /** Remapea referencias cuando cambia el flatPath. */
  remapReferences?: (node: TNode, idMap: Map<string, string>) => void;
  /** Abre selector para el último nivel (hojas). */
  openLastLevelSelector?: () => void;
  onExpand?: (node: TNode, runtime: CustomsRuntime) => void;
  onCollapse?: (node: TNode, runtime: CustomsRuntime) => void;
}

// ── Helpers de casteo (convención `asRecord(v: unknown)`) ─────────────────

/** Castea `unknown` a `Record<string, unknown>` de forma segura. */
export function asRecord(v: unknown): Record<string, unknown> {
  if (v === null || typeof v !== "object") return {};
  return v as Record<string, unknown>;
}

/** Castea `unknown` a `TNode | null` de forma segura. */
export function asNode(v: unknown): TNode | null {
  if (v === null || typeof v !== "object") return null;
  return v as TNode;
}

/** Convierte `unknown` a `string` (fallback por defecto `""`). */
export function asString(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

/** Convierte `unknown` a `number` finito; cae a `fallback` si no es finito. */
export function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerción segura a `boolean`. */
export function asBool(v: unknown): boolean {
  return !!v;
}

/** Narrowing de un valor a `TreeActionSpec` (omite `null`, `undefined`, `false`). */
export function asActionSpec(v: unknown): TreeActionSpec | null {
  if (!v || typeof v !== "object") return null;
  return v as TreeActionSpec;
}

// ── Module augmentation ──────────────────────────────────────────────────
//
// Las clases base del treeview declaran sus campos vía `__publicField(...)`,
// que escapa al análisis estático de TypeScript (el helper tiene tipo `any`
// y la inferencia de propiedades de clase no ve efectos secundarios). Aquí
// reabrimos los módulos y declaramos las propiedades con tipos concretos para
// que strictNullChecks + noImplicitAny no se quejen al hacer `this.foo` en
// los archivos que tipamos.

declare module "./00-context.js" {
  // TTreeAdapterContext declara campos con `__publicField` invisibles a TS.
  // Re-declaramos las propiedades que las subclases consumen.
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TTreeAdapterContext {
    context: TreeContext;
    treeRootId: string;
    bshowFrm: boolean;
    bLostFocus: boolean;
    _selectedFlatPath: string;
    _focusedFlatPath: string;
    _hoveredFlatPath: string;
    record: TRecord | null;
    _pendingDeleteFlatPath: string;
    _pendingDeleteSnapshot: PendingDeleteSnapshot | null;
    _lastProcessedObj: TRecord | null;
    _expandedFlatPaths: string[];
    _treeNodes: TNode[];
    bcanMoveOutside: boolean;
    _domRoot?: HTMLElement;
    selectedNode: TNode | null;
    focusedNode: TNode | null;
    hoveredNode: TNode | null;
    rootNodes: TNode[];
    treeNodes: TNode[];
    expandedNodes: TNode[];
    expandedFlatPaths: string[];
    isReadOnly: boolean;
    canMutate: boolean;
    canCreate: boolean;
    canModify: boolean;
    canDelete: boolean;
    draggable: boolean;
    normalizeFlatPath(id: string | null | undefined): string;
    findNodeByFlatPath(id: string | null | undefined, branches?: TNode[]): TNode | null;
    onstateupdate(ctx: Record<string, unknown>): void;
  }
}

declare module "./01-contract.js" {
  // TTreeAdapterContract: añade más campos via `__publicField`.
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TTreeAdapterContract {
    disabledNodes: string[];
    flashFlatPaths: string[];
    flashErrorFlatPaths: string[];
    didNodesExpand: boolean;
    currentNode: TNode | null;
    lastProcessedNode: TNode | null;
    rowAdapters: Map<string, unknown>;
    uiTick: number;
    _uiListeners: Array<() => void>;
    lastNodesRef: TNode[];
    lastObjRefId: string;
    flashClearTimer: ReturnType<typeof setTimeout> | undefined;
    flashErrorClearTimer: ReturnType<typeof setTimeout> | undefined;
    getReferenceFlatPath(node: TNode): string;
    addUiListener(fn: () => void): () => void;
    notifyUI(): void;
    getVisibleFlatPaths(nodes: TNode[], expandedSet: Set<string>): string[];
    toNode(obj: Partial<TNode> | TNode | null | undefined, isCopy?: boolean): TNode | null;
    onrefresh(): void;
    applySelection(obj: TNode | null | undefined): void;
    resyncExpandedToCurrentTree(): void;
    syncAllRowAdapters(): void;
    syncRowAdaptersByFlatPaths(ids: readonly string[]): void;
    createNode(data: Partial<TNode> | TNode): TNode | null;
    List2Rows: TNode[];
    findNodeByFlatPath(
      id: string | null | undefined,
      branches?: TNode[],
    ): TNode | null;
    findNodeByPathInit(
      pathInit: string | null | undefined,
      branches?: TNode[],
    ): TNode | null;
    normalizeFlatPath(id: string | null | undefined): string;
    getEditAttrsForLevel(
      driverAttrs: Record<string, unknown>,
      plan?: TNode,
    ): Record<string, unknown>;
    canEditSelectResource(plan: TNode | null | undefined, draft: TNode | null | undefined): boolean;
  }
}
