// @contexto INDICE.md · src/components/isp/README.md
import type { FloatCardConfig, RowConfig, TNode, TreeActionEntry } from '@jeff-aporta/iswc-base/components/isp/schemas/tree-view-types.schemas.js';
import { type TRAContext } from '@jeff-aporta/iswc-base/components/isp/schemas/tree-view-rows.schemas.js';
import type { TreeAdapterLike, DragOverPosition, SummaryRect } from '@jeff-aporta/iswc-base/components/isp/schemas/tree-view-rows.schemas.js';

/**
 * Subset de la API del TreeAdapter (TARowBase + mixins) que TRABase consume.
 *
 * No podemos tipar contra la clase entera porque vive en archivos que aún
 * están migrándose a tipado explícito (WT-0051). Esta interfaz es la mínima
 * necesaria para que TRABase compile bajo `strict` sin necesidad de `any`.
 */

/** Bridge que `paintRow` pasa a `TreeRowAdapter` (alias local tipado). */

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

// ── row-adapter-drag ──
/**
 * Posición relativa al target durante una operación de drag & drop.
 * Coincide con `DropPosition` en `_types.ts`, redeclarada localmente para no
 * importar (lock WT-0051).
 */

/**
 * Summary rect cacheado durante un drag activo.
 */

/**
 * TRADrag — extiende TRABase con la lógica de drag & drop (handle, placeholders,
 * overlay feedback, drop). Mantiene tres caches internos: el último dragOverKey
 * (para evitar repaint), el rect del summary actual y el RAF id.
 */
export class TRADrag extends TRABase {
  // Estado privado de drag (cache / rAF).
  _lastDragOverKey = "";
  _cachedSummaryRect: SummaryRect | null = null;
  _syncRafId = 0;

  /**
   * Agenda un sync de UI (forzando `forceRefresh`) en el próximo RAF.
   * Se cancela implícitamente al programar otro antes de que dispare.
   */
  requestRowUiSyncRaf(): void {
    if (this._syncRafId) return;
    this._syncRafId = requestAnimationFrame(() => {
      this._syncRafId = 0;
      if (!this.treeAdapter.currentDragFlatPath) return;
      this.requestRowUiSync();
    });
  }

  get shouldFlash(): boolean {
    return !!this.flatPath && (this.treeAdapter.flashFlatPaths ?? []).includes(this.flatPath);
  }

  get shouldFlashError(): boolean {
    return !!this.flatPath && (this.treeAdapter.flashErrorFlatPaths ?? []).includes(this.flatPath);
  }

  ondragstart(e: DragEvent): void {
    try {
      if (!this.isDraggable) {
        e.preventDefault();
        this.treeAdapter.flashRowErrorFlatPaths([this.flatPath]);
        return;
      }
      const dt = e.dataTransfer;
      if (dt) {
        dt.effectAllowed = "move";
        dt.setData("text/plain", this.flatPath);
      }
      // `currentDragFlatPath` está declarado read-only en TreeAdapterLike para
      // todos los consumidores excepto este adapter; aquí lo reasignamos vía
      // cast porque es la única fuente legítima.
      (this.treeAdapter as { currentDragFlatPath: string }).currentDragFlatPath = this.flatPath;

      const target = e.currentTarget;
      const sourceSummary = (target instanceof Element ? target.closest("summary.trvwr-itm-sum") : null)
        ?? (target instanceof HTMLElement ? target : null);
      if (!sourceSummary) return;
      const sourceHeight = Math.max(24, Math.round(sourceSummary.getBoundingClientRect().height));
      if (dt) dt.setData("application/x-trvwr-row-height", String(sourceHeight));
      const details = sourceSummary.closest?.("details.trvwr-itm");
      details?.classList.add("trvwr-itm--dragging");
      this.treeAdapter._domRoot?.classList.add("trvwr--dragging");
      const labelEl = sourceSummary.querySelector<HTMLElement>(".trvwr-itm-content");
      const label = (labelEl?.textContent?.trim() || this.flatPath);
      const ghost = document.createElement("div");
      ghost.textContent = label;
      ghost.style.cssText = "position:absolute;top:-1000px;left:-1000px;padding:.3692em .8615em;border-radius:.4308em;font:600 .8125em/1.2 system-ui,sans-serif;background:var(--iswc-accent,#1976d2);color:#fff;box-shadow:0 .3077em .9231em #0004;white-space:nowrap;pointer-events:none;z-index:99999;";
      document.body.appendChild(ghost);
      if (dt) dt.setDragImage(ghost, 16, 14);
      setTimeout(() => ghost.remove(), 50);
    } finally {
      this.requestRowUiSync();
    }
  }

  ondragend(): void {
    this.treeAdapter.clearDragOverlays();
  }

  onsummarydragenter(e: DragEvent): void {
    try {
      if (this.mergedDisabled) return;
      const rel = e?.relatedTarget as Node | null;
      const target = e.currentTarget;
      if (rel && target instanceof Node && target.contains(rel)) return;
      this.dragEnterCount++;
      this._cachedSummaryRect = null;
    } finally {
      this.requestRowUiSync();
    }
  }

  onsummarydragover(e: DragEvent): void {
    if (this.mergedDisabled) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const sourceFlatPath = this.treeAdapter.currentDragFlatPath;
    if (sourceFlatPath && sourceFlatPath === this.flatPath) {
      if (this.dragOver === null && !this.dragForbidden && !this.dragPlaceholderHeight) return;
      this.dragOver = null;
      this.dragForbidden = false;
      this.dragPlaceholderHeight = 0;
      this._lastDragOverKey = "";
      this.requestRowUiSyncRaf();
      return;
    }
    if (!this.dragPlaceholderHeight) {
      const encoded = e.dataTransfer?.getData("application/x-trvwr-row-height");
      const parsed = encoded ? Number(encoded) : NaN;
      this.dragPlaceholderHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
    }
    let rect = this._cachedSummaryRect;
    if (!rect) {
      const target = e.currentTarget;
      if (!(target instanceof Element)) return;
      const r = target.getBoundingClientRect();
      rect = { top: r.top, height: r.height };
      this._cachedSummaryRect = rect;
    }
    const node = this.rowNode;
    const isGrouper = !!node && this.treeAdapter.isGrouper(node);
    let nextOver: DragOverPosition;
    if (isGrouper) {
      const y = e.clientY - rect.top;
      const topBand = rect.height * 0.25;
      const bottomBand = rect.height * 0.75;
      nextOver = y < topBand ? "before" : y > bottomBand ? "after" : "into";
    } else {
      const midY = rect.top + rect.height / 2;
      nextOver = e.clientY < midY ? "before" : "after";
    }
    const key = `${sourceFlatPath}|${nextOver}`;
    if (key === this._lastDragOverKey) return;
    this._lastDragOverKey = key;
    this.treeAdapter.clearOtherDragOverlays(this.flatPath);
    this.dragOver = nextOver;
    this.dragForbidden = sourceFlatPath
      ? !this.treeAdapter.canDrop(sourceFlatPath, this.flatPath, nextOver)
      : false;
    this.requestRowUiSyncRaf();
  }

  onsummarydragleave(e: DragEvent): void {
    try {
      const rel = e?.relatedTarget as Node | null;
      const target = e.currentTarget;
      if (rel && target instanceof Node && target.contains(rel)) return;
      this.dragEnterCount--;
      if (this.dragEnterCount <= 0) {
        this.dragOver = null;
        this.dragForbidden = false;
        this.dragEnterCount = 0;
        this.dragPlaceholderHeight = 0;
        this._lastDragOverKey = "";
        this._cachedSummaryRect = null;
      }
    } finally {
      this.requestRowUiSync();
    }
  }

  ondrop(e: DragEvent): void {
    e.preventDefault();
    const sourceFlatPath = e.dataTransfer?.getData("text/plain") || this.treeAdapter.currentDragFlatPath;
    const wasForbidden = this.dragForbidden;
    const pos = this.dragOver;
    this.treeAdapter.clearDragOverlays();
    if (!sourceFlatPath || sourceFlatPath === this.flatPath || this.mergedDisabled || wasForbidden || !pos) {
      if (wasForbidden) {
        const flatPaths = sourceFlatPath && sourceFlatPath !== this.flatPath
          ? [sourceFlatPath, this.flatPath]
          : [this.flatPath];
        this.treeAdapter.flashRowErrorFlatPaths(flatPaths);
      }
      return;
    }
    this.treeAdapter.onrowreorder(sourceFlatPath, this.flatPath, pos);
  }
}
