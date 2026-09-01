import { TATreeFlow } from "./04-tree-flow.js";
class TAView extends TATreeFlow {
  applySelection(edit) {
    const newItem = edit ? this.toNode(edit) : null;
    if (!newItem) {
      this._selectedFlatPath = "";
      this.record = null;
      return;
    }
    this._selectedFlatPath = this.normalizeFlatPath(newItem.flatPath);
    this.record = newItem;
  }
  resyncExpandedToCurrentTree() {
    if (!this.rootNodes.length) return;
    const expandedInits = /* @__PURE__ */ new Set();
    for (const raw of this._expandedFlatPaths) {
      const id = this.normalizeFlatPath(raw);
      if (!id) continue;
      const node = this.findNodeByFlatPath(id);
      const init = node ? this.normalizeFlatPath(node.pathInit) : id;
      if (init) expandedInits.add(init);
    }
    const next = /* @__PURE__ */ new Set();
    const walk = (nodes) => {
      for (const n of nodes) {
        const fp = this.normalizeFlatPath(n.flatPath);
        const pi = this.normalizeFlatPath(n.pathInit);
        if (fp && expandedInits.has(pi)) next.add(fp);
        n.childrens?.length && walk(n.childrens);
      }
    };
    walk(this.rootNodes);
    for (const trail of [this._selectedFlatPath, this._focusedFlatPath]) {
      const clean = this.normalizeFlatPath(trail);
      if (!clean) continue;
      const parts = clean.split(".");
      for (let i = 1; i < parts.length; i++) {
        const anc = parts.slice(0, i).join(".");
        const branch = this.findNodeByFlatPath(anc);
        if (branch?.isGroupActor) next.add(anc);
      }
    }
    this._expandedFlatPaths = [...next];
  }
  setSelectedFlatPath(id, _context) {
    const cleanId = this.normalizeFlatPath(id);
    const node = cleanId.length > 0 ? this.findNodeByFlatPath(cleanId) : null;
    this.selectedNode = node;
    this.focusedNode = node;
    this.syncAllRowAdapters();
  }
  focusRowByFlatPath(nodeId) {
    if (typeof window === "undefined" || !nodeId) return;
    const attempt = () => {
      const scope = this._domRoot || document.querySelector<HTMLElement>(`[data-tree-root="${CSS.escape(this.treeRootId)}"]`);
      if (!scope) return;
      const row = scope.querySelector<HTMLElement>(`[data-flatpath="${CSS.escape(nodeId)}"]`);
      const summary = row?.querySelector<HTMLElement>("details.trvwr-itm > summary") || null;
      if (!summary) return;
      this.blurTreeSummariesExcept(summary);
      summary.focus();
    };
    queueMicrotask(attempt);
    requestAnimationFrame(attempt);
  }
  refocusFocusedRowSummary() {
    if (typeof window === "undefined") return;
    const id = this._focusedFlatPath;
    if (!id) return;
    const scope = this._domRoot || document;
    const sel = `[data-tree-root="${CSS.escape(this.treeRootId)}"] [data-flatpath="${CSS.escape(id)}"] > details.trvwr-itm > summary`;
    const tryFocus = () => {
      const summary = (scope.querySelector ? scope : document).querySelector<HTMLElement>(this._domRoot ? `[data-flatpath="${CSS.escape(id)}"] > details.trvwr-itm > summary` : sel);
      if (!summary) return false;
      if (!summary.hasAttribute("tabindex")) summary.setAttribute("tabindex", "-1");
      summary.focus({ preventScroll: false });
      return document.activeElement === summary;
    };
    let attempts = 0;
    const tick = () => {
      if (tryFocus()) return;
      if (++attempts < 6) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  blurTreeSummariesExcept(activeSummary: HTMLElement) {
    if (!activeSummary) return;
    const root = activeSummary.closest(".isp-tree, [data-tree-root]");
    if (!root) return;
    root.querySelectorAll<HTMLElement>("details.trvwr-itm > summary").forEach((s) => {
      if (s !== activeSummary && document.activeElement === s) s.blur();
    });
  }
  commitAndFlash(id) {
    const clean = this.normalizeFlatPath(id);
    if (clean.length === 0) return;
    this.setSelectedFlatPath?.(clean, this);
    this.flashRowFlatPaths?.([clean], void 0, this);
    this.syncAllRowAdapters();
  }
  flashRowFlatPaths(ids, durationMs = 650, _context) {
    const cleanIds = (ids ?? []).map((x) => this.normalizeFlatPath(x)).filter((c) => c.length > 0);
    this.flashFlatPaths = cleanIds;
    this.flashClearTimer && clearTimeout(this.flashClearTimer);
    this.flashClearTimer = setTimeout(() => {
      this.flashFlatPaths = [];
      this.flashClearTimer = void 0;
    }, durationMs);
  }
  flashRowErrorFlatPaths(ids, durationMs = 650, _context) {
    const cleanIds = (ids ?? []).map((x) => this.normalizeFlatPath(x)).filter((c) => c.length > 0);
    this.flashErrorFlatPaths = cleanIds;
    this.flashErrorClearTimer && clearTimeout(this.flashErrorClearTimer);
    const touch = (touchIds) => {
      for (const cid of touchIds) {
        const ra = this.rowAdapters.get(cid);
        ra?.requestRowUiSyncPublic?.();
      }
    };
    touch(cleanIds);
    this.flashErrorClearTimer = setTimeout(() => {
      const prev = this.flashErrorFlatPaths;
      this.flashErrorFlatPaths = [];
      this.flashErrorClearTimer = void 0;
      touch(prev);
    }, durationMs);
  }
  expandAll() {
    if (!this.rootNodes.length) return;
    const expandableIds = this.collectBranchIds(this.rootNodes);
    const currentIds = this.expandedNodes.map((node) => node.flatPath);
    const nextIds = [.../* @__PURE__ */ new Set([...currentIds, ...expandableIds])];
    this.expandedNodes = nextIds.map((id) => this.findNodeByFlatPath(id)).filter((node) => !!node);
    this.syncAllRowAdapters();
  }
  collapseAll() {
    this.expandedNodes = [];
    this.syncAllRowAdapters();
  }
  expandedNodesAfterToggle(expandedNodes, id, open) {
    const needle = this.normalizeFlatPath(id);
    const alreadyExpanded = expandedNodes.some((node) => this.normalizeFlatPath(node.flatPath) === needle);
    if (open) {
      if (alreadyExpanded) return [...expandedNodes];
      const nextBranch = this.findNodeByFlatPath(needle);
      return nextBranch ? [...expandedNodes, nextBranch] : [...expandedNodes];
    }
    return expandedNodes.filter((node) => this.normalizeFlatPath(node.flatPath) !== needle);
  }
  setExpandedNodesFn(nodes) {
    this.expandedNodes = nodes;
  }
  restoreExpandedFromSnapshot(ids) {
    if (!ids?.length) return;
    this.expandedFlatPaths = ids;
  }
}
export {
  TAView
};
