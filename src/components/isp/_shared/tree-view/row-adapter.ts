import { TRADrag } from "./row-adapter-drag.js";
class TreeRowAdapter extends TRADrag {
  onsummaryclick(e) {
    let paint = false;
    try {
      const summaryEl = e.currentTarget;
      if (this.mergedDisabled) {
        e.preventDefault();
        return;
      }
      this.treeAdapter.blurTreeSummariesExcept(summaryEl);
      const target = e.target;
      if (target?.closest(".trvwr-drag-handle")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const clickedSymbol = target?.closest(".trvwr-itm-symb");
      if (this.hasChildren) {
        e.preventDefault();
        if (clickedSymbol) {
          this.onrowtoggle(!this.isNodeOpen);
          paint = true;
        }
      }
      if (clickedSymbol) {
        this.rowNode && this.treeAdapter.onrowfocus(this.rowNode);
        summaryEl.focus({ preventScroll: true });
        return;
      }
      this.rowNode && this.treeAdapter.onrowfocus(this.rowNode);
      this.rowNode && this.treeAdapter.onrowclick(this.rowNode);
      this.effectiveRowConfig?.events?.onclick?.();
      summaryEl.focus({ preventScroll: true });
    } finally {
      if (paint) this.requestRowUiSync();
      else this.treeAdapter.syncRowSelectionChrome();
    }
  }
  onsummarydblclick(e) {
    try {
      if (this.mergedDisabled) {
        e.preventDefault();
        return;
      }
      const target = e.target;
      if (target?.closest(".trvwr-itm-symb")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.rowNode && this.treeAdapter.onrowdblclick(this.rowNode);
    } finally {
      this.requestRowUiSync();
    }
  }
  ondetailstoggle(e) {
    try {
      const el = e.currentTarget;
      if (el._trvwrSyncOpen) return;
      if (this.mergedDisabled) {
        el._trvwrSyncOpen = true;
        el.open = this.isNodeOpen;
        el._trvwrSyncOpen = false;
        return;
      }
      if (el.open !== this.isNodeOpen) {
        this.onrowtoggle(el.open);
        if (el.open) this.effectiveRowConfig?.events?.onopen?.();
        else this.effectiveRowConfig?.events?.onclose?.();
      }
    } finally {
      this.requestRowUiSync();
    }
  }
  onkeydown(e) {
    let paint = false;
    try {
      if (document.activeElement !== e.currentTarget) return;
      const treeItem = e.currentTarget.closest?.("details.trvwr-itm");
      if (!treeItem) return;
      const visibleSummaries = this.getVisibleSummaries(treeItem);
      const currentSummary = e.currentTarget;
      const currentIdx = visibleSummaries.indexOf(currentSummary);
      const hasMods = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
      let handledByDefault = false;
      if (!hasMods) {
        switch (e.code) {
          case "ArrowDown":
            e.preventDefault();
            handledByDefault = true;
            if (currentIdx >= 0 && currentIdx < visibleSummaries.length - 1) {
              this.focusSummary(visibleSummaries[currentIdx + 1]);
            }
            break;
          case "ArrowUp":
            e.preventDefault();
            handledByDefault = true;
            if (currentIdx > 0) this.focusSummary(visibleSummaries[currentIdx - 1]);
            break;
          case "ArrowRight":
            e.preventDefault();
            handledByDefault = true;
            if (this.hasChildren && !this.isNodeOpen) {
              this.onrowtoggle(true);
              paint = true;
            }
            break;
          case "ArrowLeft":
            e.preventDefault();
            handledByDefault = true;
            if (this.hasChildren && this.isNodeOpen) {
              this.onrowtoggle(false);
              paint = true;
            }
            break;
          case "Home":
            e.preventDefault();
            handledByDefault = true;
            visibleSummaries.length && this.focusSummary(visibleSummaries[0]);
            break;
          case "End":
            e.preventDefault();
            handledByDefault = true;
            visibleSummaries.length && this.focusSummary(visibleSummaries[visibleSummaries.length - 1]);
            break;
        }
      }
      if (handledByDefault) return;
      const ta = this.treeAdapter;
      const parts = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      parts.push(e.code);
      const combo = parts.join("+");
      const cfg = this.effectiveRowConfig;
      const rt = ta.buildCustomsRuntime();
      const toolbarActions = ta.customs?.topMenuActions?.(rt);
      const buttonHandler = ta.findHotkeyHandler([cfg?.actions, cfg?.cascadeOptions, toolbarActions], combo);
      if (buttonHandler && this.rowNode) {
        e.preventDefault();
        e.stopPropagation();
        buttonHandler();
        return;
      }
      const hotkeys = ta.customs?.hotkeys;
      if (!hotkeys) return;
      const handler = hotkeys[combo];
      if (!handler || !this.rowNode) return;
      e.preventDefault();
      e.stopPropagation();
      const runtime = ta.buildCustomsRuntime();
      handler(this.rowNode, runtime, e);
    } finally {
      if (paint) this.requestRowUiSync();
      else this.treeAdapter.syncRowSelectionChrome();
    }
  }
  onsummaryfocus(e) {
    const summaryEl = e.currentTarget;
    this.treeAdapter.blurTreeSummariesExcept(summaryEl);
    this.rowNode && this.treeAdapter.onrowfocus(this.rowNode);
    this.effectiveRowConfig?.events?.onfocus?.();
  }
  onsummaryblur() {
    this.effectiveRowConfig?.events?.onblur?.();
  }
  onsummarypointerenter(e) {
    clearTimeout(this._hoverLeaveTid);
    const rel = e?.relatedTarget;
    if (rel && e.currentTarget.contains(rel)) return;
    const ta = this.treeAdapter;
    if (!this.rowNode) return;
    const prevFlatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    if (prevFlatPath === this.flatPath) return;
    ta.hoveredNode = this.rowNode;
    ta.syncHoverFloats();
  }
  onsummarypointerleave(e) {
    const rel = e?.relatedTarget;
    if (rel && e.currentTarget.contains(rel)) return;
    const ta = this.treeAdapter;
    const other = rel?.closest?.("summary.trvwr-itm-sum");
    if (other && other !== e.currentTarget) return;
    const sum = e.currentTarget;
    const prev = this.flatPath;
    clearTimeout(this._hoverLeaveTid);
    this._hoverLeaveTid = setTimeout(() => {
      const fc = sum.querySelector?.("is-float-card");
      if (fc?.locked) return;
      const cur = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
      if (cur !== prev) return;
      ta.hoveredNode = null;
      ta.syncHoverFloats();
    }, 40);
  }
}
export {
  TreeRowAdapter
};
