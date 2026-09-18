/**
 * TAView — selección, expansión, focus y flash visual del árbol.
 *
 * Implementa `applySelection`, `resyncExpandedToCurrentTree`, `expandAll`,
 * `collapseAll` y `flashRowFlatPaths` (definidos como stubs en el contrato
 * base).
 *
 * Notas de tipado
 * ---------------
 * - `_selectedFlatPath`, `_focusedFlatPath`, `_expandedFlatPaths`,
 *   `flashClearTimer`, `flashErrorClearTimer` son campos heredados vía
 *   `__publicField` (invisibles a TS) — los re-declaramos.
 * - `_domRoot` y `treeRootId` son heredados de `TTreeAdapterContext`.
 */
import { TATreeFlow } from "./04-tree-flow.js";
import {
  TreeContext,
  TNode,
  TRecord,
} from "./_types.js";

class TAView extends TATreeFlow {
  // ── Re-declaraciones de campos heredados ───────────────────────────────
  declare _selectedFlatPath: string;
  declare _focusedFlatPath: string;
  declare _expandedFlatPaths: string[];
  declare _domRoot: HTMLElement | undefined;
  declare flashClearTimer: ReturnType<typeof setTimeout> | undefined;
  declare flashErrorClearTimer: ReturnType<typeof setTimeout> | undefined;

  // ── Selección / expansión ──────────────────────────────────────────────
  /**
   * Aplica selección: si `edit` es null, limpia selección y record; si no,
   * materializa el item, lo marca como `_selectedFlatPath` y como `record`.
   */
  override applySelection(edit: TNode | null | undefined): void {
    const newItem = edit ? this.toNode(edit) : null;
    if (!newItem) {
      this._selectedFlatPath = "";
      this.record = null;
      return;
    }
    this._selectedFlatPath = this.normalizeFlatPath(newItem.flatPath);
    this.record = newItem as TRecord;
  }

  /**
   * Re-sincroniza la lista de expandidos: para cada id expandido en el
   * estado actual, busca el nodo en el árbol nuevo (post-refresh) y agrega
   * su `flatPath` actual. También expande los ancestros de
   * `_selectedFlatPath` / `_focusedFlatPath` si son `isGroupActor`.
   */
  override resyncExpandedToCurrentTree(): void {
    if (!this.rootNodes.length) return;
    const expandedInits = new Set<string>();
    for (const raw of this._expandedFlatPaths) {
      const id = this.normalizeFlatPath(raw);
      if (!id) continue;
      const node = this.findNodeByFlatPath(id);
      const init = node ? this.normalizeFlatPath(node.pathInit) : id;
      if (init) expandedInits.add(init);
    }
    const next = new Set<string>();
    const walk = (nodes: TNode[]): void => {
      for (const n of nodes) {
        const fp = this.normalizeFlatPath(n.flatPath);
        const pi = this.normalizeFlatPath(n.pathInit);
        if (fp && expandedInits.has(pi)) next.add(fp);
        const childs = n.childrens;
        if (childs?.length) walk(childs);
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

  /** Selecciona el nodo con `flatPath = id` y enfoca su summary. */
  setSelectedFlatPath(id: string | null | undefined, _context?: TreeContext): void {
    const cleanId = this.normalizeFlatPath(id);
    const node = cleanId.length > 0 ? this.findNodeByFlatPath(cleanId) : null;
    // Bypass del setter heredado (mismo motivo que en `focusedNode`): escribir
    // el backing field `_selectedFlatPath` directamente evita el error de
    // tipo del setter con parámetro implícito `any`.
    this._selectedFlatPath = node ? this.normalizeFlatPath(node.flatPath) : "";
    this._focusedFlatPath = this._selectedFlatPath;
    this.syncAllRowAdapters();
  }

  /**
   * Enfoca el `<summary>` de la fila con `flatPath = nodeId`. Usa
   * `queueMicrotask` + `requestAnimationFrame` para esperar al repintado.
   */
  focusRowByFlatPath(nodeId: string | null | undefined): void {
    if (typeof window === "undefined" || !nodeId) return;
    const cleanId = this.normalizeFlatPath(nodeId);
    if (!cleanId) return;
    const treeRootId = (this as unknown as { treeRootId: string }).treeRootId;
    const attempt = (): void => {
      const scope =
        this._domRoot ||
        document.querySelector<HTMLElement>(
          `[data-tree-root="${CSS.escape(treeRootId)}"]`,
        );
      if (!scope) return;
      const row = scope.querySelector<HTMLElement>(
        `[data-flatpath="${CSS.escape(cleanId)}"]`,
      );
      const summary =
        row?.querySelector<HTMLElement>("details.trvwr-itm > summary") || null;
      if (!summary) return;
      this.blurTreeSummariesExcept(summary);
      summary.focus();
    };
    queueMicrotask(attempt);
    requestAnimationFrame(attempt);
  }

  /** Re-enfoca el summary del `_focusedFlatPath` con retry (6 frames). */
  refocusFocusedRowSummary(): void {
    if (typeof window === "undefined") return;
    const id = this._focusedFlatPath;
    if (!id) return;
    const treeRootId = (this as unknown as { treeRootId: string }).treeRootId;
    const sel = `[data-tree-root="${CSS.escape(treeRootId)}"] [data-flatpath="${CSS.escape(id)}"] > details.trvwr-itm > summary`;
    const tryFocus = (): boolean => {
      const summary = (
        this._domRoot ? this._domRoot : document
      ).querySelector<HTMLElement>(
        this._domRoot
          ? `[data-flatpath="${CSS.escape(id)}"] > details.trvwr-itm > summary`
          : sel,
      );
      if (!summary) return false;
      if (!summary.hasAttribute("tabindex")) summary.setAttribute("tabindex", "-1");
      summary.focus({ preventScroll: false });
      return document.activeElement === summary;
    };
    let attempts = 0;
    const tick = (): void => {
      if (tryFocus()) return;
      if (++attempts < 6) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** Quita el foco de todos los `<summary>` del árbol excepto `activeSummary`. */
  blurTreeSummariesExcept(activeSummary: HTMLElement | null): void {
    if (!activeSummary) return;
    const root = activeSummary.closest(".isp-tree, [data-tree-root]");
    if (!root) return;
    const summaries = root.querySelectorAll<HTMLElement>(
      "details.trvwr-itm > summary",
    );
    summaries.forEach((s) => {
      if (s !== activeSummary && document.activeElement === s) s.blur();
    });
  }

  /** Commit + flash visual tras una mutación exitosa (`newId`). */
  commitAndFlash(id: string | null | undefined): void {
    const clean = this.normalizeFlatPath(id);
    if (clean.length === 0) return;
    this.setSelectedFlatPath(clean, this as unknown as TreeContext);
    (this as unknown as { flashRowFlatPaths?: (ids: string[], dur?: number, ctx?: unknown) => void })
      .flashRowFlatPaths?.([clean], void 0, this);
    this.syncAllRowAdapters();
  }

  /**
   * Marca `ids` como "flashing" durante `durationMs` ms. Cuando expira,
   * limpia el flag y refresca adapters.
   */
  flashRowFlatPaths(
    ids: readonly string[] | null | undefined,
    durationMs: number = 650,
    _context?: unknown,
  ): void {
    const cleanIds = (ids ?? [])
      .map((x) => this.normalizeFlatPath(x))
      .filter((c) => c.length > 0);
    (this as unknown as { flashFlatPaths: string[] }).flashFlatPaths = cleanIds;
    const flashClearTimer = (this as unknown as {
      flashClearTimer: ReturnType<typeof setTimeout> | undefined;
    }).flashClearTimer;
    if (flashClearTimer) clearTimeout(flashClearTimer);
    (this as unknown as { flashClearTimer: ReturnType<typeof setTimeout> | undefined })
      .flashClearTimer = setTimeout(() => {
        (this as unknown as { flashFlatPaths: string[] }).flashFlatPaths = [];
        (this as unknown as { flashClearTimer: ReturnType<typeof setTimeout> | undefined })
          .flashClearTimer = undefined;
      }, durationMs);
  }

  /** Igual que `flashRowFlatPaths` pero con la clase "error" + refresh inmediato. */
  flashRowErrorFlatPaths(
    ids: readonly string[] | null | undefined,
    durationMs: number = 650,
    _context?: unknown,
  ): void {
    const cleanIds = (ids ?? [])
      .map((x) => this.normalizeFlatPath(x))
      .filter((c) => c.length > 0);
    (this as unknown as { flashErrorFlatPaths: string[] }).flashErrorFlatPaths = cleanIds;
    const flashErrorClearTimer = (this as unknown as {
      flashErrorClearTimer: ReturnType<typeof setTimeout> | undefined;
    }).flashErrorClearTimer;
    const touch = (touchIds: string[]): void => {
      for (const cid of touchIds) {
        const ra = this.rowAdapters.get(cid);
        (ra as unknown as { requestRowUiSyncPublic?: () => void } | null)
          ?.requestRowUiSyncPublic?.();
      }
    };
    touch(cleanIds);
    (this as unknown as { flashErrorClearTimer: ReturnType<typeof setTimeout> | undefined })
      .flashErrorClearTimer = setTimeout(() => {
        const prev = (this as unknown as { flashErrorFlatPaths: string[] }).flashErrorFlatPaths;
        (this as unknown as { flashErrorFlatPaths: string[] }).flashErrorFlatPaths = [];
        (this as unknown as { flashErrorClearTimer: ReturnType<typeof setTimeout> | undefined })
          .flashErrorClearTimer = undefined;
        touch(prev);
      }, durationMs);
  }

  /** Expande todos los nodos con hijos. */
  expandAll(): void {
    if (!this.rootNodes.length) return;
    const expandableIds = this.collectBranchIds(this.rootNodes);
    const currentIds = this.expandedNodes.map((node) => node.flatPath);
    const nextIds = [...new Set([...currentIds, ...expandableIds])];
    this.expandedNodes = nextIds
      .map((id) => this.findNodeByFlatPath(id))
      .filter((node): node is TNode => !!node);
    this.syncAllRowAdapters();
  }

  /** Colapsa todos los nodos. */
  collapseAll(): void {
    this.expandedNodes = [];
    this.syncAllRowAdapters();
  }

  /**
   * Devuelve la lista de expandidos con un toggle aplicado:
   * - `open = true` y no estaba → agrega el nodo.
   * - `open = true` y ya estaba → no-op.
   * - `open = false` → lo quita.
   */
  expandedNodesAfterToggle(
    expandedNodes: TNode[],
    id: string,
    open: boolean,
  ): TNode[] {
    const needle = this.normalizeFlatPath(id);
    const alreadyExpanded = expandedNodes.some(
      (node) => this.normalizeFlatPath(node.flatPath) === needle,
    );
    if (open) {
      if (alreadyExpanded) return [...expandedNodes];
      const nextBranch = this.findNodeByFlatPath(needle);
      return nextBranch ? [...expandedNodes, nextBranch] : [...expandedNodes];
    }
    return expandedNodes.filter(
      (node) => this.normalizeFlatPath(node.flatPath) !== needle,
    );
  }

  /** Setter del array `expandedNodes` (re-asigna nodos resueltos). */
  setExpandedNodesFn(nodes: TNode[]): void {
    this.expandedNodes = nodes;
  }

  /** Restaura el snapshot de expandidos. */
  restoreExpandedFromSnapshot(ids: readonly string[] | null | undefined): void {
    if (!ids?.length) return;
    this.expandedFlatPaths = [...ids];
  }
}

export { TAView };
