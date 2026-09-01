var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { TRABase } from "./row-adapter-base.js";
class TRADrag extends TRABase {
  constructor() {
    super(...arguments);
    __publicField(this, "_lastDragOverKey", "");
    __publicField(this, "_cachedSummaryRect", null);
    __publicField(this, "_syncRafId", 0);
  }
  requestRowUiSyncRaf() {
    if (this._syncRafId) return;
    this._syncRafId = requestAnimationFrame(() => {
      this._syncRafId = 0;
      if (!this.treeAdapter.currentDragFlatPath) return;
      this.requestRowUiSync();
    });
  }
  get shouldFlash() {
    return !!this.flatPath && (this.treeAdapter.flashFlatPaths ?? []).includes(this.flatPath);
  }
  get shouldFlashError() {
    return !!this.flatPath && (this.treeAdapter.flashErrorFlatPaths ?? []).includes(this.flatPath);
  }
  ondragstart(e) {
    try {
      if (!this.isDraggable) {
        e.preventDefault();
        this.treeAdapter.flashRowErrorFlatPaths([this.flatPath]);
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", this.flatPath);
      this.treeAdapter.currentDragFlatPath = this.flatPath;
      const sourceSummary = e.currentTarget.closest?.("summary.trvwr-itm-sum") ?? e.currentTarget;
      const sourceHeight = Math.max(24, Math.round(sourceSummary.getBoundingClientRect().height));
      e.dataTransfer.setData("application/x-trvwr-row-height", String(sourceHeight));
      const details = sourceSummary.closest?.("details.trvwr-itm");
      details?.classList.add("trvwr-itm--dragging");
      this.treeAdapter._domRoot?.classList.add("trvwr--dragging");
      const label = sourceSummary.querySelector<HTMLElement>(".trvwr-itm-content")?.textContent?.trim() || this.flatPath;
      const ghost = document.createElement("div");
      ghost.textContent = label;
      ghost.style.cssText = "position:absolute;top:-1000px;left:-1000px;padding:0.3rem 0.7rem;border-radius:0.35rem;font:600 13px/1.2 system-ui,sans-serif;background:var(--is-accent,#1976d2);color:#fff;box-shadow:0 4px 12px #0004;white-space:nowrap;pointer-events:none;z-index:99999;";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 16, 14);
      setTimeout(() => ghost.remove(), 50);
    } finally {
      this.requestRowUiSync();
    }
  }
  ondragend() {
    this.treeAdapter.clearDragOverlays();
  }
  onsummarydragenter(e) {
    try {
      if (this.mergedDisabled) return;
      const rel = e?.relatedTarget;
      if (rel && e.currentTarget.contains(rel)) return;
      this.dragEnterCount++;
      this._cachedSummaryRect = null;
    } finally {
      this.requestRowUiSync();
    }
  }
  onsummarydragover(e) {
    if (this.mergedDisabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
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
      const r = e.currentTarget.getBoundingClientRect();
      rect = { top: r.top, height: r.height };
      this._cachedSummaryRect = rect;
    }
    const node = this.rowNode;
    const isGrouper = !!node && this.treeAdapter.isGrouper(node);
    let nextOver;
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
    this.dragForbidden = sourceFlatPath ? !this.treeAdapter.canDrop(sourceFlatPath, this.flatPath, nextOver) : false;
    this.requestRowUiSyncRaf();
  }
  onsummarydragleave(e) {
    try {
      const rel = e?.relatedTarget;
      if (rel && e.currentTarget.contains(rel)) return;
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
  ondrop(e) {
    e.preventDefault();
    const sourceFlatPath = e.dataTransfer?.getData("text/plain") || this.treeAdapter.currentDragFlatPath;
    const wasForbidden = this.dragForbidden;
    const pos = this.dragOver;
    this.treeAdapter.clearDragOverlays();
    if (!sourceFlatPath || sourceFlatPath === this.flatPath || this.mergedDisabled || wasForbidden || !pos) {
      if (wasForbidden) {
        const flatPaths = sourceFlatPath && sourceFlatPath !== this.flatPath ? [sourceFlatPath, this.flatPath] : [this.flatPath];
        this.treeAdapter.flashRowErrorFlatPaths(flatPaths);
      }
      return;
    }
    this.treeAdapter.onrowreorder(sourceFlatPath, this.flatPath, pos);
  }
}
export {
  TRADrag
};
