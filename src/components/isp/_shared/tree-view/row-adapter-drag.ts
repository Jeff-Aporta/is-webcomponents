import { TRABase } from "./row-adapter-base.js";

/**
 * Posición relativa al target durante una operación de drag & drop.
 * Coincide con `DropPosition` en `_types.ts`, redeclarada localmente para no
 * importar (lock WT-0051).
 */
type DragOverPosition = "before" | "after" | "into";

/**
 * Summary rect cacheado durante un drag activo.
 */
interface SummaryRect {
  top: number;
  height: number;
}

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
      ghost.style.cssText = "position:absolute;top:-1000px;left:-1000px;padding:0.3rem 0.7rem;border-radius:0.35rem;font:600 13px/1.2 system-ui,sans-serif;background:var(--is-accent,#1976d2);color:#fff;box-shadow:0 4px 12px #0004;white-space:nowrap;pointer-events:none;z-index:99999;";
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
