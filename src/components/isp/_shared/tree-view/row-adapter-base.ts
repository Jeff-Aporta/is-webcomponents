import type {
  FloatCardConfig,
  IconConfig,
  RowAdapterBridge,
  RowConfig,
  TNode,
  TreeActionEntry,
} from "./_types.js";

/**
 * Subset de la API del TreeAdapter (TARowBase + mixins) que TRABase consume.
 *
 * No podemos tipar contra la clase entera porque vive en archivos que aún
 * están migrándose a tipado explícito (WT-0051). Esta interfaz es la mínima
 * necesaria para que TRABase compile bajo `strict` sin necesidad de `any`.
 */
interface TreeAdapterLike {
  // ── Estado / contexto (00-context.ts, 01-contract.ts) ──────────────────
  readonly context: Record<string, unknown>;
  readonly disabled: boolean;
  readonly isProtected: boolean;
  readonly isReadOnly: boolean;
  readonly canMutate: boolean;
  readonly disabledNodes: string[];
  readonly flashFlatPaths: string[];
  readonly flashErrorFlatPaths: string[];
  readonly expandedFlatPaths: string[];
  readonly expandedNodes: TNode[];
  readonly rootNodes: TNode[];
  readonly focusedNode: TNode | null;
  readonly selectedNode: TNode | null;
  readonly hoveredNode: TNode | null;
  readonly floatCard: FloatCardConfig;
  readonly currentDragFlatPath: string;
  readonly _domRoot?: HTMLElement | null;

  // ── Normalización / navegación (03-tree-shape.ts) ──────────────────────
  normalizeFlatPath(id: string | null | undefined): string;
  findNodeByFlatPath(id: string | null | undefined): TNode | null;

  // ── Acciones de fila (00-as-row.ts) ────────────────────────────────────
  filterRowActions(cfg: RowConfig | undefined, frozen: boolean): TreeActionEntry[];
  getRowConfig(node: TNode): RowConfig;
  iconParts(o: IconConfig | undefined): { icon: string; rest: Record<string, unknown>; mergedStyle: string } | null;
  isGrouper(node: TNode): boolean;
  isFrozen(node: TNode): boolean;

  // ── Mutaciones / callbacks (02-model.ts, 05-view.ts) ──────────────────
  onrowfocus(node: TNode): void;
  onrowtoggle(node: TNode, open: boolean): void;
  onaddsibling(flatPath: string, pos: "above" | "below"): void;
  onaddchild(flatPath: string): void;
  expandedNodesAfterToggle(source: TNode[], id: string, open: boolean): TNode[];
  setExpandedNodesFn(nodes: TNode[]): void;

  // ── Drag & drop (00-as-row.ts, row-adapter-drag.ts) ───────────────────
  flashRowErrorFlatPaths(flatPaths: string[]): void;
  canDrop(sourceFlatPath: string, targetFlatPath: string, position: "before" | "after" | "into"): boolean;
  clearDragOverlays(): void;
  clearOtherDragOverlays(keepFlatPath: string): void;
  onrowreorder(sourceFlatPath: string, targetFlatPath: string, position: "before" | "after" | "into"): void;

  // ── Render registry (01-contract.ts) ──────────────────────────────────
  unregisterRowAdapter(adapter: TRABase): void;

  // ── DOM helpers (05-view.ts) ──────────────────────────────────────────
  blurTreeSummariesExcept(summary: HTMLElement): void;
}

/** Bridge que `paintRow` pasa a `TreeRowAdapter` (alias local tipado). */
type TRAContext = RowAdapterBridge & { forceRefresh?: () => void };

export class TRABase {
  context!: Record<string, unknown>;
  treeAdapter: TreeAdapterLike;

  // Estado mutable expuesto por TRABase y/o TRADrag.
  dragOver: "before" | "after" | "into" | null = null;
  dragForbidden = false;
  dragEnterCount = 0;
  dragPlaceholderHeight = 0;
  filteredActions: TreeActionEntry[] = [];
  cascadeOptions: TreeActionEntry[] = [];
  hasRowTools = false;
  showOptions = false;

  constructor(bridge: TRAContext, treeAdapter: TreeAdapterLike) {
    this.treeAdapter = treeAdapter;
    this.context = {};
    this.applyBridge(bridge);
  }

  onstateupdate(ctx: Record<string, unknown>): void {
    Object.defineProperties(this.context, Object.getOwnPropertyDescriptors(ctx));
  }

  dispose(): void {
    this.treeAdapter.unregisterRowAdapter(this);
  }

  applyBridge(bridge: TRAContext): void {
    for (const key of Reflect.ownKeys(bridge)) {
      if (key === "__proto__") continue;
      const d = Object.getOwnPropertyDescriptor(bridge, key);
      if (d) Object.defineProperty(this.context, key, d);
    }
  }

  requestRowUiSync(): void {
    const fr = this.context.forceRefresh;
    if (typeof fr === "function") fr();
  }

  requestRowUiSyncPublic(): void {
    const fr = this.context.forceRefresh;
    if (typeof fr === "function") fr();
  }

  get rowNode(): TNode | undefined {
    const n = this.context.node;
    return (n && typeof n === "object") ? (n as TNode) : undefined;
  }

  sync(): void {
    const cfg = this.effectiveRowConfig;
    this.filteredActions = this.treeAdapter.filterRowActions(cfg, this.isFrozen);
    this.cascadeOptions = cfg?.cascadeOptions ?? [];
    this.hasRowTools = this.filteredActions.length > 0 || this.cascadeOptions.length > 0;
    const focusedFp = this.treeAdapter.focusedNode
      ? this.treeAdapter.normalizeFlatPath(this.treeAdapter.focusedNode.flatPath)
      : "";
    this.showOptions = this.hasRowTools && focusedFp === this.flatPath;
  }

  get mergedDisabled(): boolean {
    const cfg = this.effectiveRowConfig;
    const cfgDisabled = cfg && typeof cfg === "object" && "disabled" in cfg ? Boolean((cfg as RowConfig & { disabled?: boolean }).disabled) : false;
    return !!(this.nodeDisabled || this.treeAdapter.disabled || cfgDisabled);
  }

  get isFrozen(): boolean {
    const node = this.rowNode;
    return !!node && this.treeAdapter.isFrozen(node);
  }

  get showCaret(): boolean {
    const node = this.rowNode;
    if (!node) return false;
    if (node.isAtom) return false;
    return true;
  }

  get isDraggable(): boolean {
    return this.treeAdapter.canMutate && !this.treeAdapter.isProtected && !this.mergedDisabled && !this.isFrozen;
  }

  /**
   * `true` cuando el árbol está en modo protección y la fila sería movible si no lo estuviera.
   * Se usa para reemplazar visualmente el handle de arrastrar por un ícono de candado y
   * comunicar al usuario que la inmovilidad es deliberada (no un error).
   */
  get isLockedByProtection(): boolean {
    return this.treeAdapter.isProtected && !this.mergedDisabled && !this.isFrozen;
  }

  get rowIcono(): { icon: string; rest: Record<string, unknown>; mergedStyle: string } | null {
    return this.treeAdapter.iconParts(this.effectiveRowConfig?.icono);
  }

  get isHighlighted(): boolean {
    const ta = this.treeAdapter;
    const focusedFlatPath = ta.focusedNode ? ta.normalizeFlatPath(ta.focusedNode.flatPath) : "";
    const selectedFlatPath = ta.selectedNode ? ta.normalizeFlatPath(ta.selectedNode.flatPath) : "";
    return (focusedFlatPath.length > 0 ? this.flatPath === focusedFlatPath : false)
      || (focusedFlatPath.length === 0 && selectedFlatPath.length > 0 && this.flatPath === selectedFlatPath);
  }

  get isSelected(): boolean {
    const ta = this.treeAdapter;
    const selectedFlatPath = ta.selectedNode ? ta.normalizeFlatPath(ta.selectedNode.flatPath) : "";
    return selectedFlatPath.length > 0 && this.flatPath === selectedFlatPath;
  }

  get onLeadIconClick(): (() => void) | null {
    return this.effectiveRowConfig?.events?.onleadiconclick ?? null;
  }

  get canAddSibling(): boolean {
    return !!this.flatPath && !this.mergedDisabled && !this.treeAdapter.isReadOnly;
  }

  addSiblingAbove(): void {
    const flatPath = this.flatPath;
    if (!flatPath || !this.canAddSibling) return;
    void this.treeAdapter.onaddsibling(flatPath, "above");
  }

  addSiblingBelow(): void {
    const flatPath = this.flatPath;
    if (!flatPath || !this.canAddSibling) return;
    void this.treeAdapter.onaddsibling(flatPath, "below");
  }

  get cascadeDisabled(): boolean {
    const opts = this.cascadeOptions ?? [];
    if (opts.length === 0) return true;
    const flat: TreeActionEntry[] = [];
    for (const entry of opts) {
      if (!entry) continue;
      if (Array.isArray(entry)) flat.push(...entry);
      else flat.push(entry);
    }
    const actionable = flat.filter((it): it is Exclude<TreeActionEntry, null | undefined | false> =>
      !!it && typeof it === "object" && !("separator" in it ? it.separator : false)
    );
    return actionable.length === 0;
  }

  get canAddChild(): boolean {
    const node = this.rowNode;
    if (!node || !this.flatPath || this.mergedDisabled || this.treeAdapter.isReadOnly) return false;
    return !node.isAtom;
  }

  addChild(): void {
    const flatPath = this.flatPath;
    if (!flatPath || !this.canAddChild) return;
    void this.treeAdapter.onaddchild(flatPath);
  }

  getRootTree(treeItem: HTMLElement | null): HTMLElement | null {
    let el: HTMLElement | null = treeItem;
    while (el) {
      if (el.classList?.contains("isp-tree") || el.hasAttribute?.("data-tree-root")) return el;
      el = el.parentElement;
    }
    return null;
  }

  getVisibleSummaries(treeItem: HTMLElement | null): HTMLElement[] {
    const root = this.getRootTree(treeItem);
    if (!root) return [];
    const all = root.querySelectorAll<HTMLElement>("details.trvwr-itm > summary");
    return Array.from(all).filter((s) => {
      let el: HTMLElement | null = s.parentElement?.parentElement || null;
      while (el && el !== root && !el.classList?.contains("isp-tree") && !el.hasAttribute?.("data-tree-root")) {
        if (el instanceof HTMLDetailsElement && !el.open) return false;
        el = el.parentElement;
      }
      return true;
    });
  }

  getFlatPathFromSummary(summary: HTMLElement): string {
    const closest = summary.closest("[data-flatpath]");
    return closest instanceof HTMLElement ? (closest.dataset.flatpath || "") : "";
  }

  focusSummary(summary: HTMLElement): void {
    if (!summary) return;
    this.treeAdapter.blurTreeSummariesExcept(summary);
    summary.focus();
    if (document.activeElement !== summary) {
      summary.setAttribute("tabindex", "-1");
      summary.focus();
    }
    const flatPath = this.treeAdapter.normalizeFlatPath(this.getFlatPathFromSummary(summary));
    if (flatPath.length > 0) {
      const node = this.treeAdapter.findNodeByFlatPath(flatPath);
      if (node) this.treeAdapter.onrowfocus(node);
    }
  }

  get flatPath(): string {
    return this.treeAdapter.normalizeFlatPath(this.rowNode?.flatPath);
  }

  get hasChildren(): boolean {
    return !!(this.rowNode?.childrens && this.rowNode.childrens.length > 0);
  }

  get isReallyFocused(): boolean {
    const ta = this.treeAdapter;
    const flatPath = ta.focusedNode ? ta.normalizeFlatPath(ta.focusedNode.flatPath) : "";
    return flatPath.length > 0 && flatPath === this.flatPath;
  }

  get hasDescendantFocus(): boolean {
    const ta = this.treeAdapter;
    const flatPath = ta.focusedNode ? ta.normalizeFlatPath(ta.focusedNode.flatPath) : "";
    if (flatPath.length === 0 || flatPath === this.flatPath) return false;
    return this.containsDescendantFlatPath(this.rowNode?.childrens, flatPath);
  }

  get isReallyHovered(): boolean {
    const ta = this.treeAdapter;
    const flatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    return flatPath.length > 0 && flatPath === this.flatPath;
  }

  get hasDescendantHover(): boolean {
    const ta = this.treeAdapter;
    const flatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    if (flatPath.length === 0 || flatPath === this.flatPath) return false;
    return this.containsDescendantFlatPath(this.rowNode?.childrens, flatPath);
  }

  get floatVisible(): boolean {
    const ta = this.treeAdapter;
    const hoverFlatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    return hoverFlatPath.length > 0 && hoverFlatPath === this.flatPath;
  }

  get floatFocusOnly(): boolean {
    return this.floatVisible && this.isReallyFocused;
  }

  get floatHoverOnly(): boolean {
    return this.floatVisible && !this.isReallyFocused && this.isReallyHovered;
  }

  containsDescendantFlatPath(childrens: TNode[] | undefined, targetFlatPath: string): boolean {
    if (!childrens || childrens.length === 0) return false;
    const norm = this.treeAdapter.normalizeFlatPath.bind(this.treeAdapter);
    for (const c of childrens) {
      if (norm(c.flatPath) === targetFlatPath) return true;
      if (this.containsDescendantFlatPath(c.childrens, targetFlatPath)) return true;
    }
    return false;
  }

  get isNodeOpen(): boolean {
    return !!this.flatPath && (this.treeAdapter.expandedFlatPaths ?? []).includes(this.flatPath);
  }

  get nodeDisabled(): boolean {
    return !!this.flatPath && (this.treeAdapter.disabledNodes ?? []).includes(this.flatPath);
  }

  get effectiveRowConfig(): RowConfig {
    if (!this.rowNode) return { actions: [], cascadeOptions: [] };
    const cfg = this.treeAdapter.getRowConfig?.(this.rowNode);
    return cfg ?? { actions: [], cascadeOptions: [] };
  }

  get floatCard(): FloatCardConfig {
    const cfg = this.effectiveRowConfig;
    const merged: FloatCardConfig = {
      ...this.treeAdapter.floatCard,
      ...(cfg.floatCard ?? {}),
    };
    const roots = this.treeAdapter.rootNodes ?? [];
    const firstRoot = roots[0];
    if (firstRoot && this.rowNode && firstRoot.flatPath === this.rowNode.flatPath) {
      const baseTy = typeof merged.ty === "number" ? merged.ty : Number(merged.ty ?? 0) || 0;
      merged.ty = baseTy + 15;
    }
    return merged;
  }

  onrowtoggle(open: boolean): void {
    const rowNode = this.rowNode;
    if (!rowNode) return;
    const source = this.treeAdapter.expandedNodes ?? [];
    const next = this.treeAdapter.expandedNodesAfterToggle(source, rowNode.flatPath, open);
    this.treeAdapter.setExpandedNodesFn(next);
    this.treeAdapter.onrowtoggle(rowNode, open);
  }
}
