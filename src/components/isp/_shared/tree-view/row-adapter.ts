import { TRADrag } from "./row-adapter-drag.js";
import type { TNode, TreeActionEntry } from "./_types.js";

/** Detalle con un evento custom del row-adapter (summary/pointer). */
interface _SummaryEvent extends Event {
  currentTarget: HTMLElement;
}

/** Subset extendido del adapter que `TreeRowAdapter` consume (más allá de TreeAdapterLike). */
interface _RowAdapter extends TRAAccessible {
  onrowclick(node: TNode): void;
  onrowdblclick(node: TNode): void;
  syncRowSelectionChrome(): void;
  syncHoverFloats(): void;
  buildCustomsRuntime(): unknown;
  customs?: {
    hotkeys?: Record<string, (node: TNode, runtime: unknown, e: KeyboardEvent) => void>;
    topMenuActions?: (rt: unknown) => TreeActionEntry[];
  } | null;
  findHotkeyHandler(
    sources: ReadonlyArray<TreeActionEntry[] | undefined>,
    combo: string,
  ): (() => void) | null;
  hoveredNode: { flatPath: string } | null;
  normalizeFlatPath(id: string | null | undefined): string;
  blurTreeSummariesExcept(summary: HTMLElement): void;
  onrowfocus(node: TNode): void;
}

/** `TRADrag` no expone `treeAdapter` con todos los métodos que usamos aquí. */
interface TRAAccessible {
  treeAdapter: TRAAccessible & _RowAdapter;
  mergedDisabled: boolean;
  hasChildren: boolean;
  isNodeOpen: boolean;
  rowNode: TNode | null;
  flatPath: string;
  effectiveRowConfig?: {
    events?: {
      onclick?: () => void;
      onopen?: () => void;
      onclose?: () => void;
      onfocus?: () => void;
      onblur?: () => void;
    };
    actions?: TreeActionEntry[];
    cascadeOptions?: TreeActionEntry[];
  };
  onrowtoggle(open: boolean): void;
  requestRowUiSync(): void;
  getVisibleSummaries(treeItem: Element): HTMLElement[];
  focusSummary(summary: HTMLElement): void;
}

class TreeRowAdapter extends TRADrag {
  /** Timer para limpiar el hover tras pointerleave. */
  declare _hoverLeaveTid: ReturnType<typeof setTimeout> | undefined;

  /** Helper para tratar `this.treeAdapter` con todos los métodos que usamos. */
  get ta(): _RowAdapter {
    return (this as unknown as { treeAdapter: _RowAdapter }).treeAdapter;
  }

  get selfProps(): TRAAccessible {
    return this as unknown as TRAAccessible;
  }

  onsummaryclick(e: _SummaryEvent): void {
    let paint = false;
    const sp = this.selfProps;
    const ta = this.ta;
    try {
      const summaryEl: HTMLElement = e.currentTarget;
      if (sp.mergedDisabled) {
        e.preventDefault();
        return;
      }
      ta.blurTreeSummariesExcept(summaryEl);
      const target = e.target as Element | null;
      if (target?.closest(".trvwr-drag-handle")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const clickedSymbol = target?.closest(".trvwr-itm-symb");
      if (sp.hasChildren) {
        e.preventDefault();
        if (clickedSymbol) {
          sp.onrowtoggle(!sp.isNodeOpen);
          paint = true;
        }
      }
      if (clickedSymbol) {
        sp.rowNode && ta.onrowfocus(sp.rowNode);
        summaryEl.focus({ preventScroll: true });
        return;
      }
      sp.rowNode && ta.onrowfocus(sp.rowNode);
      sp.rowNode && ta.onrowclick(sp.rowNode);
      sp.effectiveRowConfig?.events?.onclick?.();
      summaryEl.focus({ preventScroll: true });
    } finally {
      if (paint) sp.requestRowUiSync();
      else ta.syncRowSelectionChrome();
    }
  }
  onsummarydblclick(e: _SummaryEvent): void {
    const sp = this.selfProps;
    const ta = this.ta;
    try {
      if (sp.mergedDisabled) {
        e.preventDefault();
        return;
      }
      const target = e.target as Element | null;
      if (target?.closest(".trvwr-itm-symb")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      sp.rowNode && ta.onrowdblclick(sp.rowNode);
    } finally {
      sp.requestRowUiSync();
    }
  }
  ondetailstoggle(e: _SummaryEvent): void {
    const sp = this.selfProps;
    try {
      const el: HTMLElement & { _trvwrSyncOpen?: boolean } = e.currentTarget;
      if (el._trvwrSyncOpen) return;
      if (sp.mergedDisabled) {
        el._trvwrSyncOpen = true;
        (el as unknown as { open: boolean }).open = sp.isNodeOpen;
        el._trvwrSyncOpen = false;
        return;
      }
      const open = (el as unknown as { open: boolean }).open;
      if (open !== sp.isNodeOpen) {
        sp.onrowtoggle(open);
        if (open) sp.effectiveRowConfig?.events?.onopen?.();
        else sp.effectiveRowConfig?.events?.onclose?.();
      }
    } finally {
      sp.requestRowUiSync();
    }
  }
  onkeydown(e: _SummaryEvent & KeyboardEvent): void {
    let paint = false;
    const sp = this.selfProps;
    const ta = this.ta;
    try {
      if (document.activeElement !== e.currentTarget) return;
      const treeItem = (e.currentTarget as HTMLElement).closest?.("details.trvwr-itm");
      if (!treeItem) return;
      const visibleSummaries = sp.getVisibleSummaries(treeItem);
      const currentSummary: HTMLElement = e.currentTarget;
      const currentIdx = visibleSummaries.indexOf(currentSummary);
      const hasMods = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
      let handledByDefault = false;
      if (!hasMods) {
        switch (e.code) {
          case "ArrowDown":
            e.preventDefault();
            handledByDefault = true;
            if (currentIdx >= 0 && currentIdx < visibleSummaries.length - 1) {
              sp.focusSummary(visibleSummaries[currentIdx + 1]!);
            }
            break;
          case "ArrowUp":
            e.preventDefault();
            handledByDefault = true;
            if (currentIdx > 0) sp.focusSummary(visibleSummaries[currentIdx - 1]!);
            break;
          case "ArrowRight":
            e.preventDefault();
            handledByDefault = true;
            if (sp.hasChildren && !sp.isNodeOpen) {
              sp.onrowtoggle(true);
              paint = true;
            }
            break;
          case "ArrowLeft":
            e.preventDefault();
            handledByDefault = true;
            if (sp.hasChildren && sp.isNodeOpen) {
              sp.onrowtoggle(false);
              paint = true;
            }
            break;
          case "Home":
            e.preventDefault();
            handledByDefault = true;
            if (visibleSummaries.length) sp.focusSummary(visibleSummaries[0]!);
            break;
          case "End":
            e.preventDefault();
            handledByDefault = true;
            if (visibleSummaries.length) sp.focusSummary(visibleSummaries[visibleSummaries.length - 1]!);
            break;
        }
      }
      if (handledByDefault) return;
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      parts.push(e.code);
      const combo = parts.join("+");
      const cfg = sp.effectiveRowConfig;
      const rt = ta.buildCustomsRuntime();
      const toolbarActions = ta.customs?.topMenuActions?.(rt);
      const buttonHandler = ta.findHotkeyHandler([cfg?.actions, cfg?.cascadeOptions, toolbarActions], combo);
      if (buttonHandler && sp.rowNode) {
        e.preventDefault();
        e.stopPropagation();
        buttonHandler();
        return;
      }
      const hotkeys = ta.customs?.hotkeys;
      if (!hotkeys) return;
      const handler = hotkeys[combo];
      if (!handler || !sp.rowNode) return;
      e.preventDefault();
      e.stopPropagation();
      const runtime = ta.buildCustomsRuntime();
      handler(sp.rowNode, runtime, e);
    } finally {
      if (paint) sp.requestRowUiSync();
      else ta.syncRowSelectionChrome();
    }
  }
  onsummaryfocus(e: _SummaryEvent): void {
    const sp = this.selfProps;
    const ta = this.ta;
    const summaryEl: HTMLElement = e.currentTarget;
    ta.blurTreeSummariesExcept(summaryEl);
    sp.rowNode && ta.onrowfocus(sp.rowNode);
    sp.effectiveRowConfig?.events?.onfocus?.();
  }
  onsummaryblur(): void {
    const sp = this.selfProps;
    sp.effectiveRowConfig?.events?.onblur?.();
  }
  onsummarypointerenter(e: _SummaryEvent): void {
    const sp = this.selfProps;
    const ta = this.ta;
    clearTimeout(this._hoverLeaveTid);
    const rel = (e as unknown as { relatedTarget: Element | null }).relatedTarget;
    if (rel && (e.currentTarget as HTMLElement).contains(rel)) return;
    if (!sp.rowNode) return;
    const prevFlatPath = ta.hoveredNode ? ta.normalizeFlatPath(ta.hoveredNode.flatPath) : "";
    if (prevFlatPath === sp.flatPath) return;
    ta.hoveredNode = sp.rowNode;
    ta.syncHoverFloats();
  }
  onsummarypointerleave(e: _SummaryEvent): void {
    const sp = this.selfProps;
    const ta = this.ta;
    const rel = (e as unknown as { relatedTarget: Element | null }).relatedTarget;
    if (rel && (e.currentTarget as HTMLElement).contains(rel)) return;
    const other = rel?.closest?.("summary.trvwr-itm-sum");
    if (other && other !== e.currentTarget) return;
    const sum: HTMLElement = e.currentTarget;
    const prev = sp.flatPath;
    clearTimeout(this._hoverLeaveTid);
    this._hoverLeaveTid = setTimeout(() => {
      const fc = sum.querySelector?.("is-float-card") as (HTMLElement & { locked?: boolean }) | null;
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
