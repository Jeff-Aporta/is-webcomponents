var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class TRABase {
  constructor(bridge, treeAdapter) {
    this.treeAdapter = treeAdapter;
    __publicField(this, "context");
    __publicField(this, "dragOver", null);
    __publicField(this, "dragForbidden", false);
    __publicField(this, "dragEnterCount", 0);
    __publicField(this, "dragPlaceholderHeight", 0);
    __publicField(this, "filteredActions", []);
    __publicField(this, "cascadeOptions", []);
    __publicField(this, "hasRowTools", false);
    __publicField(this, "showOptions", false);
    this.context = {};
    this.applyBridge(bridge);
  }
  onstateupdate(ctx) {
    Object.defineProperties(this.context, Object.getOwnPropertyDescriptors(ctx));
  }
  dispose() {
    this.treeAdapter.unregisterRowAdapter(this);
  }
  applyBridge(bridge) {
    for (const key of Reflect.ownKeys(bridge)) {
      if (key === "__proto__") continue;
      const d = Object.getOwnPropertyDescriptor(bridge, key);
      d && Object.defineProperty(this.context, key, d);
    }
  }
  requestRowUiSync() {
    this.context.forceRefresh?.();
  }
  requestRowUiSyncPublic() {
    this.context.forceRefresh?.();
  }
  get rowNode() {
    return this.context.node ?? void 0;
  }
  sync() {
    const cfg = this.effectiveRowConfig;
    this.filteredActions = this.treeAdapter.filterRowActions(cfg, this.isFrozen);
    this.cascadeOptions = cfg?.cascadeOptions ?? [];
    this.hasRowTools = this.filteredActions.length > 0 || this.cascadeOptions.length > 0;
    this.showOptions = this.hasRowTools && (this.treeAdapter.focusedNode ? this.treeAdapter.normalizeFlatPath(this.treeAdapter.focusedNode.flatPath) : "") === this.flatPath;
  }
  get mergedDisabled() {
    return !!(this.nodeDisabled || this.treeAdapter.disabled || this.effectiveRowConfig?.disabled);
  }
  get isFrozen() {
    const node = this.rowNode;
    return !!node && this.treeAdapter.isFrozen(node);
  }
  get showCaret() {
    const node = this.rowNode;
    if (!node) return false;
    if (node.isAtom) return false;
    return true;
  }
  get isDraggable() {
    return this.treeAdapter.canMutate && !this.treeAdapter.isProtected && !this.mergedDisabled && !this.isFrozen;
  }
  /**
   * `true` cuando el árbol está en modo protección y la fila sería movible si no lo estuviera.
   * Se usa para reemplazar visualmente el handle de arrastrar por un ícono de candado y
   * comunicar al usuario que la inmovilidad es deliberada (no un error).
   */
  get isLockedByProtection() {
    return this.treeAdapter.isProtected && !this.mergedDisabled && !this.isFrozen;
  }
  get rowIcono() {
    return this.treeAdapter.iconParts(this.effectiveRowConfig?.icono);
  }
  get isHighlighted() {
    const ta = this.treeAdapter;
    const focusedFlatPath = ta.focusedNode ? ta.normalizeFlatPath(ta.focusedNode.flatPath) : "";
    const selectedFlatPath = ta.selectedNode ? ta.normalizeFlatPath(ta.selectedNode.flatPath) : "";
    return (focusedFlatPath.length > 0 ? this.flatPath === focusedFlatPath : false) || focusedFlatPath.length === 0 && selectedFlatPath.length > 0 && this.flatPath === selectedFlatPath;
  }
  get isSelected() {
    const ta = this.treeAdapter;
    const selectedFlatPath = ta.selectedNode ? ta.normalizeFlatPath(ta.selectedNode.flatPath) : "";
    return selectedFlatPath.length > 0 && this.flatPath === selectedFlatPath;
  }
  get onLeadIconClick() {
    return this.effectiveRowConfig?.events?.onleadiconclick ?? null;
  }
  get canAddSibling() {
    return !!this.flatPath && !this.mergedDisabled && !this.treeAdapter.isReadOnly;
  }
  addSiblingAbove() {
    const flatPath = this.flatPath;
    if (!flatPath || !this.canAddSibling) return;
    void this.treeAdapter.onaddsibling(flatPath, "above");
  }
  addSiblingBelow() {
    const flatPath = this.flatPath;
    if (!flatPath || !this.canAddSibling) return;
    void this.treeAdapter.onaddsibling(flatPath, "below");
  }
  get cascadeDisabled() {
    const opts = this.cascadeOptions ?? [];
    if (opts.length === 0) return true;
    const flat = [];
    for (const entry of opts) {
      if (!entry) continue;
      if (Array.isArray(entry)) flat.push(...entry);
      else flat.push(entry);
    }
    const actionable = flat.filter((it) => it && !it.separator);
    return actionable.length === 0;
  }
  get canAddChild() {
    const node = this.rowNode;
    if (!node || !this.flatPath || this.mergedDisabled || this.treeAdapter.isReadOnly) return false;
    return !node.isAtom;
  }
  addChild() {
    const flatPath = this.flatPath;
    if (!flatPath || !this.canAddChild) return;
    void this.treeAdapter.onaddchild(flatPath);
  }
  getRootTree(treeItem) {
    let el = treeItem;
    while (el) {
      if (el.classList?.contains("isp-tree") || el.hasAttribute?.("data-tree-root")) return el;
      el = el.parentElement;
    }
    return null;
  }
  getVisibleSummaries(treeItem) {
    const root = this.getRootTree(treeItem);
    if (!root) return [];
    const all = root.querySelectorAll<HTMLElement>("details.trvwr-itm > summary");
    return Array.from(all).filter((s) => {
      let el = s.parentElement?.parentElement || null;
      while (el && el !== root && !el.classList?.contains("isp-tree") && !el.hasAttribute?.("data-tree-root")) {
        if (el.tagName === "DETAILS" && !el.open) return false;
        el = el.parentElement;
      }
      return true;
    });
  }
  getFlatPathFromSummary(summary: HTMLElement) {
    return summary.closest("[data-flatpath]")?.dataset.flatpath || "";
  }
  focusSummary(summary: HTMLElement) {
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
  get flatPath() {
    return this.treeAdapter.normalizeFlatPath(this.rowNode?.flatPath);
  }
  get hasChildren() {
    return !!(this.rowNode?.childrens && this.rowNode.childrens.length > 0);
  }
  get isReallyFocused() {
    const ta = this.treeAdapter;
    const flatPath = ta.focusedNode ? ta.normalizeFlatPath(ta.focusedNode.flatPath) : "";
    return flatPath.length > 0 && flatPath === this.flatPath;
  }
  get hasDescendantFocus() {
    const ta = this.treeAdapter;
    const flatPath = ta.focusedNode ? ta.normalizeFlatPath(ta.focusedNode.flatPath) : "";
    if (flatPath.length === 0 || flatPath === this.flatPath) return false;
    return this.containsDescendantFlatPath(this.rowNode?.childrens, flatPath);
  }
  get isReallyHovered() {
    const ta = this.treeAdapter;
    const flatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    return flatPath.length > 0 && flatPath === this.flatPath;
  }
  get hasDescendantHover() {
    const ta = this.treeAdapter;
    const flatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    if (flatPath.length === 0 || flatPath === this.flatPath) return false;
    return this.containsDescendantFlatPath(this.rowNode?.childrens, flatPath);
  }
  get floatVisible() {
    const ta = this.treeAdapter;
    const hoverFlatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    return hoverFlatPath.length > 0 && hoverFlatPath === this.flatPath;
  }
  get floatFocusOnly() {
    return this.floatVisible && this.isReallyFocused;
  }
  get floatHoverOnly() {
    return this.floatVisible && !this.isReallyFocused && this.isReallyHovered;
  }
  containsDescendantFlatPath(childrens, targetFlatPath) {
    if (!childrens || childrens.length === 0) return false;
    const norm = this.treeAdapter.normalizeFlatPath.bind(this.treeAdapter);
    for (const c of childrens) {
      if (norm(c.flatPath) === targetFlatPath) return true;
      if (this.containsDescendantFlatPath(c.childrens, targetFlatPath)) return true;
    }
    return false;
  }
  get isNodeOpen() {
    return !!this.flatPath && (this.treeAdapter.expandedFlatPaths ?? []).includes(this.flatPath);
  }
  get nodeDisabled() {
    return !!this.flatPath && (this.treeAdapter.disabledNodes ?? []).includes(this.flatPath);
  }
  get effectiveRowConfig() {
    if (!this.rowNode) return {};
    return this.treeAdapter.getRowConfig?.(this.rowNode) ?? {};
  }
  get floatCard() {
    const merged = {
      ...this.treeAdapter.floatCard,
      ...this.effectiveRowConfig.floatCard ?? {}
    };
    const roots = this.treeAdapter.rootNodes ?? [];
    const firstRoot = roots[0];
    if (firstRoot && this.rowNode && firstRoot.flatPath === this.rowNode.flatPath) {
      const baseTy = typeof merged.ty === "number" ? merged.ty : Number(merged.ty ?? 0) || 0;
      merged.ty = baseTy + 15;
    }
    return merged;
  }
  onrowtoggle(open) {
    if (!this.rowNode) return;
    const source = this.treeAdapter.expandedNodes ?? [];
    const next = this.treeAdapter.expandedNodesAfterToggle(source, this.rowNode.flatPath, open);
    this.treeAdapter.setExpandedNodesFn(next);
    this.treeAdapter.onrowtoggle(this.rowNode, open);
  }
}
export {
  TRABase
};
