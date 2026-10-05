/**
 * Tipos compartidos del módulo TreeView (port vanilla de `iswc-tree`).
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

/** Forma mínima del `record` del contexto (lo que el adapter expone al consumidor). */

// ── Acciones / botones ───────────────────────────────────────────────────

/** Spec de un botón de acción del treeview. */

/** Una entrada de `actions` / `cascadeOptions` puede ser un grupo, un item o `null`. */

// ── Config de filas ──────────────────────────────────────────────────────

/** Config devuelta por `getNodeIcon` (customs). */

/** Config de FloatCard (mezcla de `treeAdapter.floatCard` + overrides por fila). */

/** Config calculada por `buildDefaultRowConfig` / `getRowConfig`. */

/** Posición que devuelve `getSiblingPosition`. */

// ── Posiciones / direcciones ─────────────────────────────────────────────

/** Posición relativa al target en operaciones de drop. */

/** Dirección de `move`. */

// ── Snapshot / runtime ───────────────────────────────────────────────────

/** Snapshot del pending delete (para restaurar la selección). */

/** Bridge que `TreeRowAdapter` consume (lo que `paintRow` le pasa). */

// ── Contexto / customs ───────────────────────────────────────────────────

/** Shape del `context` que el adapter recibe del consumidor. */

/** Args que recibe `levelName` (`{ depth }`). */

/** Args que recibe `getNodeIcon`. */

/** Hook runtime que `buildCustomsRuntime` expone a los customs. */

/** Hotkey handler signature (`customs.hotkeys[combo]`). */

/** Customs interface — hooks que el consumidor puede sobreescribir. */

// ── Helpers de casteo (convención `asRecord(v: unknown)`) ─────────────────

/** Castea `unknown` a `Record<string, unknown>` de forma segura. */
import type { TNode, TRecord, TreeActionSpec, TreeActionEntry, IconConfig, FloatCardConfig, RowConfig, SiblingPosition, DropPosition, MoveDirection, PendingDeleteSnapshot, RowAdapterBridge, TreeContext, LevelNameArgs, NodeIconArgs, CustomsRuntime, HotkeyHandler, TreeCustoms } from "./_types.schemas.js";
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
