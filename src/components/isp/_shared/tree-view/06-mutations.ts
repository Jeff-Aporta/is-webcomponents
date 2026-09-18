/**
 * TAMutations — operaciones de insert / move / delete sobre el árbol.
 *
 * Implementa los entrypoints que el consumidor (o el adapter UI) invoca:
 * `onaddroot`, `onaddsibling`, `onaddchild`, `onselectlastlevel`, `move`,
 * `reorder`, `nestInto`, `requestDelete`, `ondeleteconfirmed`,
 * `rollbackPendingInsert`, `openEdit`, `openViewNode`, `oneditaccept`,
 * `closeEditForm`, etc.
 *
 * Notas de tipado
 * ---------------
 * - `_selectedFlatPath`, `_focusedFlatPath`, `_expandedFlatPaths`,
 *   `_pendingDeleteFlatPath`, `_pendingDeleteSnapshot`,
 *   `_pendingInsertFlatPath`, `_pendingExpandedSnapshot`,
 *   `_pendingLastLevelParentFlatPath`, `bcanMoveOutside`, `record` son
 *   campos heredados vía `__publicField` (invisibles a TS) — los
 *   re-declaramos aquí para tipar.
 * - Las firmas se ajustan a los tipos concretos para evitar `any`.
 */
import { TAView } from "./05-view.js";
import {
  DropPosition,
  MoveDirection,
  PendingDeleteSnapshot,
  TNode,
  TRecord,
} from "./_types.js";

/** Resultado de las operaciones async de mutación. */
type MutationResult = {
  selectedNode: string;
  flashRowFlatPaths: string[];
  ensureExpandedIds?: string[];
};

class TAMutations extends TAView {
  // ── Re-declaraciones de campos heredados ───────────────────────────────
  declare _selectedFlatPath: string;
  declare _focusedFlatPath: string;
  declare _expandedFlatPaths: string[];
  declare _pendingDeleteFlatPath: string;
  declare _pendingDeleteSnapshot: PendingDeleteSnapshot | null;
  declare _pendingInsertFlatPath: string;
  declare _pendingExpandedSnapshot: string[];
  declare _pendingLastLevelParentFlatPath: string;
  declare bcanMoveOutside: boolean;

  // ── Inserciones ────────────────────────────────────────────────────────
  /** Crea un nuevo root y abre el form de edición para él. */
  onaddroot(): void {
    if (!this.canMutate) return;
    this.historyPush();
    const nodeId = this.getNextFlatPath("");
    const uxItem = this.toNode({ flatPath: nodeId } as Partial<TNode>);
    if (!uxItem) return;
    this.invokeUpdateNode(uxItem, true);
    void (this as unknown as { ActInsertar: (n: TRecord) => Promise<boolean> })
      .ActInsertar?.(uxItem as TRecord);
    this.applySelection(uxItem);
    this._pendingInsertFlatPath = this._selectedFlatPath;
    this.onrefresh();
    this.syncAllRowAdapters();
    const cleanId = this._selectedFlatPath;
    const found = this.findNodeByFlatPath(cleanId);
    (this as unknown as { showFrmModificar?: (n: TRecord) => void })
      .showFrmModificar?.(found ?? (uxItem as TRecord));
  }

  /**
   * Calcula el siguiente flatPath disponible para un nuevo hermano de `ref`.
   * No inserta nada: devuelve el id que `openSiblingDrawer` usará.
   */
  insertSiblingNode(ref: TNode, _pos: string): string {
    this._pendingExpandedSnapshot = [...this._expandedFlatPaths];
    const refId = this.normalizeFlatPath(ref.flatPath);
    const lastDot = refId.lastIndexOf(".");
    const parentId = lastDot >= 0 ? refId.slice(0, lastDot) : "";
    return this.getNextFlatPath(parentId);
  }

  /**
   * Inserta un hermano de `ref` en la posición `pos` y abre el form de
   * edición. `pos` es "above" / "below".
   */
  async openSiblingDrawer(ref: TNode, pos: string): Promise<void> {
    this.historyPush();
    const refIdStr = String(ref.flatPath ?? "").trim();
    const refDot = refIdStr.lastIndexOf(".");
    const referenceId = refDot >= 0
      ? this.normalizeFlatPath(refIdStr.slice(0, refDot))
      : "";
    const newId = this.insertSiblingNode(ref, pos);
    const uxItem = this.toNode({ flatPath: newId } as Partial<TNode>);
    if (!uxItem) return;
    this.invokeUpdateNode(uxItem, true);
    await (this as unknown as { ActInsertar: (n: TRecord) => Promise<boolean> })
      .ActInsertar?.(uxItem as TRecord);
    this.applySelection(uxItem);
    this._pendingInsertFlatPath = this._selectedFlatPath;
  }

  /** Rebind: si `flatPath` existe tras un refresh, `record` apunta al nuevo nodo. */
  rebindRecordToFreshNode(flatPath: string): void {
    const fresh = this.findNodeByFlatPath(this.normalizeFlatPath(flatPath));
    if (fresh) this.record = fresh as TRecord;
  }

  /** Entry-point async: agregar hermano y mostrar form. */
  async onaddsibling(
    nodeId: string,
    position: string,
  ): Promise<MutationResult | Record<string, never>> {
    const plan = this.getNodeByFlatPath(nodeId);
    if (!plan) return {};
    await this.openSiblingDrawer(plan, position);
    this.onrefresh();
    const cleanSid = this._selectedFlatPath;
    this.rebindRecordToFreshNode(cleanSid);
    this.syncAllRowAdapters();
    const item = this.record;
    if (item) (this as unknown as { showFrmModificar?: (n: TRecord) => void })
      .showFrmModificar?.(item);
    else (this as unknown as { setShowFrm?: (v: boolean) => void })
      .setShowFrm?.(true);
    return {
      selectedNode: cleanSid,
      flashRowFlatPaths: cleanSid.length > 0 ? [cleanSid] : [],
    };
  }

  /** Wrapper que dispara `onaddsibling` y aplica selección + flash. */
  handleaddsibling(nodeId: string, position: string): Promise<void> {
    return this.onaddsibling(nodeId, position).then((result) => {
      const r = result as MutationResult | undefined;
      if (r?.selectedNode) this.setSelectedFlatPath(r.selectedNode, this as unknown as import("./_types.js").TreeContext);
      if (r?.flashRowFlatPaths?.length)
        this.flashRowFlatPaths(r.flashRowFlatPaths, void 0, this);
    });
  }

  /**
   * Abre el selector de "último nivel" si el padre es hoja; en caso
   * contrario abre un nuevo hijo directo.
   */
  onAddChildLastLevel(referenceId: string): void {
    this._pendingLastLevelParentFlatPath = this.normalizeFlatPath(referenceId);
    (this as unknown as { customs?: { openLastLevelSelector?: () => void } })
      .customs?.openLastLevelSelector?.();
    this.syncAllRowAdapters();
  }

  /** Encuentra el primer nodo con `pathInit` definido en `branches`. */
  findNodeWithPathInit(branches: TNode[] = this.rootNodes): TNode | null {
    for (const n of branches) {
      if (n.pathInit) return n;
      const c = this.findNodeWithPathInit(n.childrens ?? []);
      if (c) return c;
    }
    return null;
  }

  /** Entry-point async: agregar hijo. Si el padre es "último nivel", abre selector. */
  async onaddchild(referenceId: string): Promise<MutationResult | Record<string, never>> {
    const uxPadre =
      this.findNodeByFlatPath(referenceId) ??
      (this.getNodeByFlatPath(referenceId) as TNode | undefined);
    const childDepth = (uxPadre?.["depth"] as number | undefined ?? 0) + 1;
    const grandLevel = String(
      (this as unknown as { customs?: { levelName?: (a: { depth: number }) => string } })
        .customs?.levelName?.({ depth: childDepth + 1 }) ?? "",
    ).trim();
    const childIsLastLevel = !grandLevel || grandLevel === "---";
    const customs = (this as unknown as { customs?: { openLastLevelSelector?: () => void } })
      .customs;
    const shouldOpenSelector = !!(uxPadre && customs?.openLastLevelSelector && childIsLastLevel);
    if (shouldOpenSelector) {
      this.onAddChildLastLevel(referenceId);
      return {};
    }
    this.historyPush();
    const nodeId = this.getNextFlatPath(referenceId);
    const uxItem = this.toNode({ flatPath: nodeId } as Partial<TNode>);
    if (!uxItem) return {};
    this.invokeUpdateNode(uxItem, true);
    await (this as unknown as { ActInsertar: (n: TRecord) => Promise<boolean> })
      .ActInsertar?.(uxItem as TRecord);
    this.applySelection(uxItem);
    this.onrefresh();
    const cleanSid = this._selectedFlatPath;
    this.rebindRecordToFreshNode(cleanSid);
    this.syncAllRowAdapters();
    const item2 = this.record;
    if (item2) (this as unknown as { showFrmModificar?: (n: TRecord) => void })
      .showFrmModificar?.(item2);
    else (this as unknown as { setShowFrm?: (v: boolean) => void })
      .setShowFrm?.(true);
    return {
      selectedNode: cleanSid,
      flashRowFlatPaths: cleanSid.length > 0 ? [cleanSid] : [],
      ensureExpandedIds: [referenceId],
    };
  }

  /** Wrapper que dispara `onaddchild` y aplica selección + flash + expand. */
  handleaddchild(referenceId: string): Promise<void> {
    return this.onaddchild(referenceId).then((result) => {
      const r = result as MutationResult | undefined;
      if (r?.selectedNode) this.setSelectedFlatPath(r.selectedNode, this as unknown as import("./_types.js").TreeContext);
      if (r?.flashRowFlatPaths?.length)
        this.flashRowFlatPaths(r.flashRowFlatPaths, void 0, this);
      if (r?.ensureExpandedIds?.length) {
        const nextIds = [
          ...new Set([
            ...this._expandedFlatPaths,
            ...r.ensureExpandedIds.map((id: string) => this.normalizeFlatPath(id)),
          ]),
        ];
        this.expandedFlatPaths = nextIds;
      }
    });
  }

  /**
   * Procesa la selección del selector de último nivel: crea N nodos hijos
   * con `flatPath` incrementales basados en el siguiente id disponible.
   */
  async onselectlastlevel(records: TRecord[] | TRecord | null | undefined): Promise<void> {
    const referenceId = this._pendingLastLevelParentFlatPath;
    const rawItems = Array.isArray(records) ? records : records ? [records] : [];
    const items = rawItems.filter((r): r is TRecord => !!r);
    if (!referenceId || !items.length) {
      this._pendingLastLevelParentFlatPath = "";
      return;
    }
    this.historyPush();
    const baseParts = this.getNextFlatPath(referenceId).split(".");
    const idPrefix = baseParts.slice(0, -1).join(".");
    let nextOrder = parseInt(baseParts[baseParts.length - 1] ?? "", 10) || 1;
    for (const rec of items) {
      const nodeId = (idPrefix ? `${idPrefix}.` : "") + nextOrder++;
      const baseData: Partial<TNode> = { ...rec, flatPath: nodeId };
      const prepared = this.prepareLastLevelNodeData(baseData, rec);
      const uxItem = this.toNode(prepared);
      if (!uxItem) continue;
      this.invokeUpdateNode(uxItem, true);
      await (this as unknown as { ActInsertar: (n: TRecord) => Promise<boolean> })
        .ActInsertar?.(uxItem as TRecord);
    }
    const lastId = (idPrefix ? `${idPrefix}.` : "") + (nextOrder - 1);
    this.onrefresh();
    const lastNode = this.findNodeByFlatPath(lastId);
    if (lastNode) this.applySelection(lastNode);
    if (referenceId && !this._expandedFlatPaths.includes(referenceId)) {
      this._expandedFlatPaths = [...this._expandedFlatPaths, referenceId];
    }
    this._pendingLastLevelParentFlatPath = "";
    this.syncAllRowAdapters();
  }

  /**
   * Calcula el siguiente flatPath disponible bajo `referenceId` (padre).
   * Si `referenceId` es vacío, calcula el siguiente root.
   */
  getNextFlatPath(referenceId: string): string {
    const clean = this.normalizeFlatPath(referenceId);
    const referenceNode = clean.length > 0 ? this.findNodeByFlatPath(clean) : null;
    const childSiblings = referenceNode
      ? referenceNode.childrens ?? []
      : this.rootNodes;
    const orders = childSiblings
      .map((n: TNode): number => {
        const p = n.flatPath.split(".");
        return parseInt(p[p.length - 1] ?? "", 10);
      })
      .filter((o: number): boolean => !isNaN(o));
    const max = Math.max(0, ...orders);
    return (clean ? `${clean}.` : "") + (max + 1);
  }

  // ── Move / reorder / nest ──────────────────────────────────────────────
  /**
   * Mueve el nodo con `nodeId` arriba o abajo entre sus hermanos.
   * Devuelve el nuevo flatPath o `undefined` si no se pudo.
   */
  async move(nodeId: string, dir: MoveDirection): Promise<string | undefined> {
    const cleanId = this.normalizeFlatPath(nodeId);
    if (!cleanId) return undefined;
    this.historyPush();
    const newId = this.moveNodeInTree(cleanId, dir);
    const cleanNewId = this.normalizeFlatPath(newId ?? "");
    if (!cleanNewId) return undefined;
    this.onrefresh();
    this.resyncExpandedToCurrentTree();
    this._selectedFlatPath = cleanNewId;
    this._focusedFlatPath = cleanNewId;
    this.syncAllRowAdapters();
    this.focusRowByFlatPath(cleanNewId);
    return cleanNewId;
  }

  /**
   * Reordena `sourceId` antes/después de `targetId` (mismo nivel).
   * Si `position === "into"` anida source dentro de target.
   */
  reorder(
    sourceId: string,
    targetId: string,
    position: DropPosition,
  ): string | undefined {
    this.historyPush();
    const newId = this.reorderNodeInTree(sourceId, targetId, position);
    const cleanNewId = this.normalizeFlatPath(newId ?? "");
    if (!cleanNewId) return undefined;
    this.onrefresh();
    this.resyncExpandedToCurrentTree();
    this._selectedFlatPath = cleanNewId;
    this._focusedFlatPath = cleanNewId;
    this.syncAllRowAdapters();
    this.focusRowByFlatPath(cleanNewId);
    return cleanNewId;
  }

  /** Anida `sourceId` dentro de `targetId`. */
  nestInto(sourceId: string, targetId: string): string | undefined {
    this.historyPush();
    const newId = this.nestNodeInTree(sourceId, targetId);
    const cleanNewId = this.normalizeFlatPath(newId ?? "");
    if (!cleanNewId) return undefined;
    this.onrefresh();
    this.resyncExpandedToCurrentTree();
    this._selectedFlatPath = cleanNewId;
    this._focusedFlatPath = cleanNewId;
    this.syncAllRowAdapters();
    this.focusRowByFlatPath(cleanNewId);
    return cleanNewId;
  }

  /**
   * Mueve un nodo dentro de sus hermanos (no entre niveles).
   * Devuelve el nuevo flatPath o `null` si no se pudo.
   */
  moveNodeInTree(nodeId: string, dir: MoveDirection): string | null {
    const referenceNode = this.findReferenceBranchInTree(this.rootNodes, nodeId);
    const siblings = referenceNode ? referenceNode.childrens ?? [] : this.rootNodes;
    const idx = siblings.findIndex(
      (n: TNode): boolean => this.normalizeFlatPath(n.flatPath) === nodeId,
    );
    if (idx === -1) return null;
    const newIdx = idx + (dir === "up" ? -1 : 1);
    if (newIdx < 0 || newIdx >= siblings.length) return null;
    const tmp = siblings[idx]!;
    siblings[idx] = siblings[newIdx]!;
    siblings[newIdx] = tmp;
    this.oncommittreeorder(this.rootNodes);
    const referenceClean = referenceNode ? this.normalizeFlatPath(referenceNode.flatPath) : "";
    return (referenceClean ? `${referenceClean}.` : "") + (newIdx + 1);
  }

  /**
   * Reordena entre dos nodos (mismo nivel). Valida con `canDrop` y
   * consulta `bcanMoveOutside` para movimientos cross-parent.
   */
  reorderNodeInTree(
    sourceId: string,
    targetId: string,
    position: DropPosition,
  ): string | null {
    if (!this.rootNodes.length) return null;
    const srcId = this.normalizeFlatPath(sourceId);
    const tgtId = this.normalizeFlatPath(targetId);
    if (!srcId || !tgtId || srcId === tgtId) return null;
    const srcReference = this.findReferenceBranchInTree(this.rootNodes, srcId);
    const tgtReference = this.findReferenceBranchInTree(this.rootNodes, tgtId);
    const sameParent = srcReference === tgtReference;
    if (!this.canDrop(srcId, tgtId, position)) return null;
    if (!sameParent) {
      const allow = this.bcanMoveOutside as boolean | ((src: TNode, tgt: TNode, pos: DropPosition) => boolean);
      if (typeof allow === "function") {
        const srcNode = this.findNodeByFlatPath(srcId);
        const tgtNode = this.findNodeByFlatPath(tgtId);
        if (srcNode && tgtNode && !allow(srcNode, tgtNode, position)) return null;
      } else if (allow === false) {
        return null;
      }
    }
    const srcSiblings = srcReference ? srcReference.childrens ?? [] : this.rootNodes;
    const tgtSiblings = tgtReference ? tgtReference.childrens ?? [] : this.rootNodes;
    const srcIdx = srcSiblings.findIndex(
      (n: TNode): boolean => this.normalizeFlatPath(n.flatPath) === srcId,
    );
    const tgtIdx = tgtSiblings.findIndex(
      (n: TNode): boolean => this.normalizeFlatPath(n.flatPath) === tgtId,
    );
    if (srcIdx === -1 || tgtIdx === -1) return null;
    const moving = srcSiblings.splice(srcIdx, 1)[0];
    if (!moving) return null;
    let insertAt = tgtIdx + (position === "after" ? 1 : 0);
    if (sameParent && srcIdx < tgtIdx) insertAt -= 1;
    const insertIdx = Math.max(0, Math.min(insertAt, tgtSiblings.length));
    tgtSiblings.splice(insertIdx, 0, moving);
    this.oncommittreeorder(this.rootNodes);
    const referenceClean = tgtReference ? this.normalizeFlatPath(tgtReference.flatPath) : "";
    return (referenceClean ? `${referenceClean}.` : "") + (Math.max(0, Math.min(insertIdx, tgtSiblings.length - 1)) + 1);
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  /**
   * Pide confirmación de borrado: guarda el `_pendingDeleteFlatPath` y
   * el snapshot de selección para restaurar tras refrescar.
   */
  requestDelete(node: TNode): boolean {
    const nid = this.normalizeFlatPath(node.flatPath);
    this._pendingDeleteFlatPath = nid;
    this._selectedFlatPath = nid;
    this.record = node as TRecord;
    this._focusedFlatPath = nid;
    const expandedIds = new Set<string>(this._expandedFlatPaths);
    const prevVisibleIds = this.getVisibleFlatPaths(this.rootNodes, expandedIds);
    this._pendingDeleteSnapshot = {
      prevVisibleIds,
      prevDeleteIdx: prevVisibleIds.indexOf(nid),
    };
    (this as unknown as { showDelete: (n: TRecord) => void }).showDelete(node as TRecord);
    return false;
  }

  /**
   * Confirmado el borrado: limpia selección si corresponde, refresca el
   * árbol, y restaura la selección al vecino más cercano.
   */
  async ondeleteconfirmed(): Promise<void> {
    const pendingNorm = this.normalizeFlatPath(this._pendingDeleteFlatPath);
    const prevDeleteIdx = this._pendingDeleteSnapshot?.prevDeleteIdx ?? -1;
    const clearSelectionIfDeleted = (deletedKey: string): void => {
      const clean = this._selectedFlatPath;
      if (clean && (clean === deletedKey || clean.startsWith(deletedKey + "."))) {
        this._selectedFlatPath = "";
        this.record = null;
        (this as unknown as { setShowFrm?: (v: boolean) => void }).setShowFrm?.(false);
      }
    };
    if (pendingNorm) clearSelectionIfDeleted(pendingNorm);
    else return;
    const pendingInsertNorm = this.normalizeFlatPath(this._pendingInsertFlatPath);
    if (
      pendingInsertNorm &&
      (pendingInsertNorm === pendingNorm ||
        pendingInsertNorm.startsWith(pendingNorm + "."))
    ) {
      this._pendingInsertFlatPath = "";
      this._pendingExpandedSnapshot = [];
    }
    this.onrefresh();
    const nextExpandedIds = new Set<string>(this._expandedFlatPaths);
    const nextVisibleIds = this.getVisibleFlatPaths(this.rootNodes, nextExpandedIds);
    if (
      nextVisibleIds.length &&
      (!this._selectedFlatPath || !nextVisibleIds.includes(this._selectedFlatPath))
    ) {
      const fallbackIdx = prevDeleteIdx > 0 ? prevDeleteIdx - 1 : 0;
      const sel = nextVisibleIds[Math.min(fallbackIdx, nextVisibleIds.length - 1)] || nextVisibleIds[0];
      if (sel) this._selectedFlatPath = sel;
    }
    this._pendingDeleteFlatPath = "";
    this._pendingDeleteSnapshot = null;
    this.syncAllRowAdapters();
  }

  /**
   * Rollback de una inserción pendiente (cuando el usuario cierra el form
   * sin confirmar): elimina el nodo insertado y restaura expandidos.
   */
  async rollbackPendingInsert(
    id: string,
    expandedSnapshot: readonly string[] = [],
  ): Promise<void> {
    const node = this.findNodeByFlatPath(id);
    const row = node ?? null;
    if (!row) return;
    await (this as unknown as { actEliminar: (n: TRecord) => Promise<TRecord> })
      .actEliminar?.(row as TRecord);
    this.applySelection(null);
    this.onrefresh();
    this.restoreExpandedFromSnapshot(expandedSnapshot);
    this.syncAllRowAdapters();
  }

  // ── Edit drawer ────────────────────────────────────────────────────────
  /** Crea un draft de edición a partir del `plan` actual. */
  createEditDraft(plan: TRecord): TNode | null {
    const raw = this.findNodeByFlatPath(plan.flatPath);
    if (!raw) return null;
    return this.toNode(raw, true);
  }

  /** Acepta el draft: aplica cambios vía `Actualizar`. */
  async onEditDrawerAccept(draft: TRecord | null | undefined): Promise<void> {
    if (!draft) return;
    await this.oneditaccept(draft);
    (this as unknown as { setShowFrm?: (v: boolean) => void }).setShowFrm?.(false);
  }

  /** Cierra el drawer de edición (sin confirmar). */
  onEditDrawerClose(_plan: unknown, _draft: unknown): void {
    (this as unknown as { setShowFrm?: (v: boolean) => void }).setShowFrm?.(false);
  }

  /** Abre el drawer de edición (con release de protección si aplica). */
  openEdit(node: TNode): void {
    if ((this as unknown as { isProtected: boolean }).isProtected) {
      (this as unknown as { requestProtectionRelease: () => void })
        .requestProtectionRelease();
      return;
    }
    this.applySelection(node);
    this.onrefresh();
    this.syncAllRowAdapters();
    (this as unknown as { showFrmModificar: (n: TRecord) => void })
      .showFrmModificar(node as TRecord);
  }

  /** Abre el drawer de visualización. */
  openViewNode(node: TNode): void {
    this.applySelection(node);
    this.onrefresh();
    this.syncAllRowAdapters();
    (this as unknown as { showFrmVisualizar: (n: TRecord) => void })
      .showFrmVisualizar(node as TRecord);
  }

  /** Aplica los cambios del `node` editado al árbol. */
  async oneditaccept(node: TRecord): Promise<void> {
    await (this as unknown as { Actualizar: (n: TRecord) => Promise<boolean> })
      .Actualizar?.(node);
    this.onrefresh();
  }

  /**
   * Cierra el form de edición: si hay un pending insert, hace rollback
   * (elimina el nodo recién creado). Después re-enfoca el summary.
   */
  closeEditForm(): void {
    const pending = this._pendingInsertFlatPath;
    const snapshot = this._pendingExpandedSnapshot;
    this._pendingInsertFlatPath = "";
    this._pendingExpandedSnapshot = [];
    if (pending) void this.rollbackPendingInsert(pending, snapshot);
    this.refocusFocusedRowSummary();
  }
}

export { TAMutations };
