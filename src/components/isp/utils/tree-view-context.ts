import type { TNode, TRecord, TreeActionSpec, PendingDeleteSnapshot, TreeContext } from '@jeff-aporta/iswc-base/components/isp/schemas/tree-view-types.schemas.js';
import type { _AnyRecord, _AnyCtxProps, _BAllowedShape, _PendingDeleteSnap, _TNodeLike, _TRecordLike } from '@jeff-aporta/iswc-base/components/isp/schemas/tree-view-context.schemas.js';

/**
 * Stubs de ispgen / ispsveltecomponents para el port vanilla del TreeView.
 * El adapter original habla con TObject y resolveColor; aquí se cubre lo
 * mínimo para que la lógica corra sin esas libs.
 */

export class TObject {
  f: Record<string, unknown>;
  constructor() {
    this.f = {};
  }
  clone(): TObject {
    const o = new TObject();
    Object.assign(o, structuredClone({ ...this }));
    return o;
  }
  toJSON(): Record<string, unknown> {
    const j = { ...this } as Record<string, unknown>;
    delete j.f;
    return j;
  }
  loadFromJSON(j: Record<string, unknown>): this {
    Object.assign(this, j);
    return this;
  }
}

export function capitalizar(s: string): string {
  const t = String(s ?? '').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const COLOR_VARS: Record<string, string> = {
  border: '--iswc-border',
  bg: '--iswc-bg',
  color: '--iswc-text',
  text: '--iswc-text',
  primary: '--iswc-accent',
  brand: '--iswc-accent',
  success: '--iswc-color-success',
  danger: '--iswc-color-danger',
  warning: '--iswc-color-warning',
  info: '--iswc-color-info',
  error: '--iswc-color-danger',
  neutral: '--iswc-text-muted',
};

export function resolveColor(color: string): string {
  if (!color) return '';
  const s = String(color);
  if (/^(#|rgb|hsl|oklch|var\()/i.test(s)) return s;
  return `var(${COLOR_VARS[s] || `--iswc-color-${s}`})`;
}

// ── _types ──
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
export function asRecord(v: unknown): Record<string, unknown> {
  if (v === null || typeof v !== "object") return {};
  return v as Record<string, unknown>;
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

// Desde F9a las clases viven en este mismo archivo: las interfaces se fusionan con ellas sin `declare module`.
// TTreeAdapterContext declara campos con `__publicField` invisibles a TS.
// Re-declaramos las propiedades que las subclases consumen.
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

// TTreeAdapterContract: añade más campos via `__publicField`.
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
    // List2Rows: lo declara la clase (get/set) en este mismo archivo.
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

// ── 00-context ──
var __defProp = Object.defineProperty;
var __defNormalProp = (obj: unknown, key: string | symbol, value: unknown) => {
  const o = obj as Record<string | symbol, unknown>;
  return key in o ? __defProp(o, key, { enumerable: true, configurable: true, writable: true, value }) : o[key as string] = value;
};
var __publicField = (obj: unknown, key: string | symbol, value?: unknown) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

const _TTreeAdapterContext = class _TTreeAdapterContext {
  // Tipos explícitos para los campos `__publicField` (escape del análisis estático).
  // Las marcas `!` evitan inicialización redundante — `__publicField` ya las pone.
  context!: Record<string, unknown>;
  treeRootId!: string;
  bshowFrm!: boolean;
  bLostFocus!: boolean;
  _selectedFlatPath!: string;
  _focusedFlatPath!: string;
  _hoveredFlatPath!: string;
  record!: _TRecordLike | null;
  _pendingDeleteFlatPath!: string;
  _pendingDeleteSnapshot!: _PendingDeleteSnap;
  _lastProcessedObj!: _TRecordLike | null;
  _expandedFlatPaths!: string[];
  _treeNodes!: _TNodeLike[];
  bcanMoveOutside!: boolean;

  constructor(props: _AnyCtxProps = {} as _AnyCtxProps, restProps?: _AnyCtxProps, syncProps?: _AnyCtxProps) {
    __publicField(this, "context");
    __publicField(this, "treeRootId", `tree-${++(_TTreeAdapterContext as unknown as { _rootIdSeq: number })._rootIdSeq}`);
    __publicField(this, "bshowFrm", false);
    __publicField(this, "bLostFocus", false);
    __publicField(this, "_selectedFlatPath", "");
    __publicField(this, "_focusedFlatPath", "");
    __publicField(this, "_hoveredFlatPath", "");
    __publicField(this, "record", null);
    __publicField(this, "_pendingDeleteFlatPath", "");
    __publicField(this, "_pendingDeleteSnapshot", null);
    __publicField(this, "_lastProcessedObj", null);
    __publicField(this, "_expandedFlatPaths", []);
    __publicField(this, "_treeNodes", []);
    __publicField(this, "bcanMoveOutside", true);
    this.context = { ...props, ...restProps ?? {}, ...syncProps ?? {} };
  }
  onstateupdate(ctx: Record<string, unknown>): void {
    Object.defineProperties(this.context, Object.getOwnPropertyDescriptors(ctx));
  }
  get disabled(): boolean {
    return !!this.context.disabled;
  }
  set disabled(value: boolean) {
    this.context.disabled = !!value;
  }
  get selectedNode(): _TNodeLike | null {
    return this.findNodeByFlatPath(this._selectedFlatPath);
  }
  set selectedNode(value: _TNodeLike | null | undefined) {
    this._selectedFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get focusedNode(): _TNodeLike | null {
    return this.findNodeByFlatPath(this._focusedFlatPath);
  }
  set focusedNode(value: _TNodeLike | null | undefined) {
    this._focusedFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get hoveredNode(): _TNodeLike | null {
    return this.findNodeByFlatPath(this._hoveredFlatPath);
  }
  set hoveredNode(value: _TNodeLike | null | undefined) {
    this._hoveredFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get rootNodes(): _TNodeLike[] {
    return this._treeNodes;
  }
  get treeNodes(): _TNodeLike[] {
    return this._treeNodes;
  }
  set treeNodes(value: _TNodeLike[]) {
    this._treeNodes = value;
  }
  get expandedNodes(): _TNodeLike[] {
    const seen = /* @__PURE__ */ new Set<string>();
    const out: _TNodeLike[] = [];
    for (const id of this._expandedFlatPaths) {
      if (!id || seen.has(id)) continue;
      const node = this.findNodeByFlatPath(id);
      if (node) {
        seen.add(id);
        out.push(node);
      }
    }
    return out;
  }
  set expandedNodes(value: _TNodeLike[] | null | undefined) {
    const seen = /* @__PURE__ */ new Set<string>();
    const ids: string[] = [];
    for (const node of value || []) {
      const id = this.normalizeFlatPath(node?.flatPath);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    this._expandedFlatPaths = ids;
  }
  get expandedFlatPaths(): string[] {
    return [...this._expandedFlatPaths];
  }
  set expandedFlatPaths(value: string[] | null | undefined) {
    const seen = /* @__PURE__ */ new Set<string>();
    const ids: string[] = [];
    for (const raw of value || []) {
      const id = this.normalizeFlatPath(raw);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    this._expandedFlatPaths = ids;
  }
  get isReadOnly(): boolean {
    return !!this.context.readonly;
  }
  get canMutate(): boolean {
    return !this.isReadOnly;
  }
  get canCreate(): boolean {
    return (this.context.bAllowed as _BAllowedShape | undefined)?.Crear ?? true;
  }
  get canModify(): boolean {
    return (this.context.bAllowed as _BAllowedShape | undefined)?.Modificar ?? true;
  }
  get canDelete(): boolean {
    return (this.context.bAllowed as _BAllowedShape | undefined)?.Eliminar ?? true;
  }
  get draggable(): boolean {
    return this.context.draggable !== false;
  }
  normalizeFlatPath(_id: string | null | undefined): string {
    return "";
  }
  findNodeByFlatPath(_id: string | null | undefined, _branches?: _TNodeLike[]): _TNodeLike | null {
    return null;
  }
};
__publicField(_TTreeAdapterContext as unknown as Record<string, unknown>, "_rootIdSeq", 0);
let TTreeAdapterContext = _TTreeAdapterContext;

// ── 01-contract ──
/**
 * TTreeAdapterContract — contrato vacío sobre `_TTreeAdapterContext`.
 *
 * Las firmas de los métodos vacíos (`toNode`, `createNode`, ...) están
 * declaradas con tipos concretos (no `any`) para que las subclases en
 * `03-tree-shape.ts` / `04-tree-flow.ts` puedan sobreescribirlas sin
 * encontrar incompatibilidades de tipo bajo strictNullChecks.
 *
 * Importante: este archivo NO está en lock de ningún WT. Cualquier WT puede
 * modificarlo mientras mantenga el contrato.
 */
class TTreeAdapterContract extends TTreeAdapterContext {
  constructor() {
    super(...arguments);
    __publicField(this, "disabledNodes", []);
    __publicField(this, "flashFlatPaths", []);
    __publicField(this, "flashErrorFlatPaths", []);
    __publicField(this, "didNodesExpand", false);
    __publicField(this, "currentNode", null);
    __publicField(this, "lastProcessedNode", null);
    __publicField(this, "rowAdapters", /* @__PURE__ */ new Map());
    __publicField(this, "uiTick", 0);
    __publicField(this, "_uiListeners", []);
    __publicField(this, "lastNodesRef", []);
    __publicField(this, "lastObjRefId", "");
    __publicField(this, "flashClearTimer", 0);
    __publicField(this, "flashErrorClearTimer", 0);
  }
  getReferenceFlatPath(node: TNode): string {
    const id = String(node.flatPath ?? "").trim();
    const idx = id.lastIndexOf(".");
    return idx >= 0 ? id.slice(0, idx) : "";
  }
  addUiListener(fn: () => void): () => void {
    this._uiListeners.push(fn);
    return () => {
      this._uiListeners = this._uiListeners.filter((l) => l !== fn);
    };
  }
  notifyUI(): void {
    this.uiTick++;
    for (const fn of this._uiListeners) fn();
    void asRecord;
  }
  override onstateupdate(ctx: Record<string, unknown>): void {
    const prevReadonly = !!this.context.readonly;
    const prevDisabled = !!this.context.disabled;
    const prevDraggable = this.context.draggable !== false;
    super.onstateupdate(ctx);
    const nextReadonly = !!this.context.readonly;
    const nextDisabled = !!this.context.disabled;
    const nextDraggable = this.context.draggable !== false;
    if (prevReadonly !== nextReadonly || prevDisabled !== nextDisabled || prevDraggable !== nextDraggable) {
      this.notifyUI();
    }
  }
  getVisibleFlatPaths(nodes: TNode[], expandedSet: Set<string>): string[] {
    const ids: string[] = [];
    const walk = (list: TNode[]): void => {
      for (const node of list) {
        ids.push(node.flatPath);
        if (node.childrens?.length && expandedSet.has(node.flatPath)) walk(node.childrens);
      }
    };
    walk(nodes);
    return ids;
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  toNode(_obj: Partial<TNode> | TNode | null | undefined, _isCopy?: boolean): TNode | null {
    return null;
  }
  onrefresh(): void {
    /* provided by TATreeFlow */
  }
  /** Stub: las subclases (`TATreeFlow`) sobreescriben con lógica real. */
  applySelection(_obj: TNode | null | undefined): void {
    /* provided by TAView */
  }
  /** Stub: las subclases (`TAView`) sobreescriben con lógica real. */
  resyncExpandedToCurrentTree(): void {
    /* provided by TAView */
  }
  /** Stub: las subclases (`TAView`) sobreescriben con lógica real. */
  syncAllRowAdapters(): void {
    /* provided by TARowBase */
  }
  /** Stub: las subclases (`TARowBase`) sobreescriben con lógica real. */
  syncRowAdaptersByFlatPaths(_ids: readonly string[]): void {
    /* provided by TARowBase */
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  createNode(data: Partial<TNode> | TNode): TNode | null {
    void data;
    return null;
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  get List2Rows(): TNode[] {
    return [];
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  set List2Rows(_value: TNode[]) {
    /* provided by TATreeShape */
  }
  getEditAttrsForLevel(
    driverAttrs: Record<string, unknown>,
    _plan?: TNode,
  ): Record<string, unknown> {
    return driverAttrs;
  }
  canEditSelectResource(
    plan: TNode | null | undefined,
    draft: TNode | null | undefined,
  ): boolean {
    return !!plan?.isAtom || !!draft?.isAtom;
  }
}
export {
  TTreeAdapterContract
};
