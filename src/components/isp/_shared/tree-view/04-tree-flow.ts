/**
 * TATreeFlow — flujo de mutaciones del árbol (reorder, nest, commit, refresh).
 *
 * Re-implementa las operaciones CRUD declaradas en `TAModel` (`addNode`,
 * `removeNode`, `updateNode`) con la lógica real: ordenamiento, remapeo
 * de flatPaths, persistencia en `List2Rows`, refresco de UI.
 *
 * Notas de tipado
 * ---------------
 * - `_expandedFlatPaths`, `_selectedFlatPath`, `_focusedFlatPath`,
 *   `_treeNodes`, `lastNodesRef`, `lastObjRefId`, `currentNode`,
 *   `lastProcessedNode`, `didNodesExpand`, `_pendingExpandedSnapshot` son
 *   campos heredados vía `__publicField` (invisibles a TS) — los re-declaramos
 *   aquí para tipar.
 * - `_customs` y `customs` ya están declarados en `TATreeShape`.
 */
import { TObject } from "./helpers.js";
import { objRootsToNodes } from "./tree-data.js";
import { TATreeShape } from "./03-tree-shape.js";
import {
  DropPosition,
  MoveDirection,
  TNode,
  TRecord,
  TreeCustoms,
} from "./_types.js";

/** Comparador estable por la última sección numérica del `flatPath`. */
function flatPathTailCmp(a: TNode, b: TNode): number {
  const oa = +String(a.flatPath || "").split(".").pop()! || 0;
  const ob = +String(b.flatPath || "").split(".").pop()! || 0;
  return oa - ob;
}

/** Tipo del callback `onchangecurso` / `onprocessobj` (hooks de consumidor). */
type CursorHook = () => void;

class TATreeFlow extends TATreeShape {
  // ── Re-declaraciones de campos heredados (vienen de __publicField) ─────
  declare _expandedFlatPaths: string[];
  declare _selectedFlatPath: string;
  declare _focusedFlatPath: string;
  declare _treeNodes: TNode[];
  declare _pendingExpandedSnapshot: string[];
  declare lastNodesRef: TNode[];
  declare lastObjRefId: string;
  declare currentNode: TNode | null;
  declare lastProcessedNode: TNode | null;
  declare didNodesExpand: boolean;

  // ── Drag & drop ────────────────────────────────────────────────────────
  /**
   * ¿Se puede soltar `sourceId` cerca de `targetId` con la `position` dada?
   * Considera jerarquía, hermeticidad, y reglas del root.
   */
  canDrop(sourceId: string, targetId: string, position: DropPosition): boolean {
    const src = this.findNodeByFlatPath(this.normalizeFlatPath(sourceId));
    const tgt = this.findNodeByFlatPath(this.normalizeFlatPath(targetId));
    if (!src || !tgt) return false;
    if (this.isDescendant(tgt, src)) return false;
    const srcParent = this.findReferenceBranchInTree(
      this.rootNodes,
      this.normalizeFlatPath(src.flatPath),
    );
    const newParent =
      position === "into"
        ? tgt
        : this.findReferenceBranchInTree(
            this.rootNodes,
            this.normalizeFlatPath(tgt.flatPath),
          );
    if (srcParent !== newParent) {
      if (srcParent && (srcParent.isHermetic || srcParent.isFreezer)) return false;
      if (newParent && newParent.isHermetic) return false;
    }
    if (position === "into") return true;
    return this.canDropAtRoot(src, tgt, position);
  }

  /** Hook a sobreescribir: reglas extra para drop en root. */
  canDropAtRoot(_src: TNode, _tgt: TNode, _position: DropPosition): boolean {
    return true;
  }

  /**
   * Anida `sourceId` dentro de `targetId` (mueve el nodo a `childrens` de
   * target). Devuelve el nuevo flatPath del nodo o `null` si falló.
   */
  nestNodeInTree(sourceId: string, targetId: string): string | null {
    if (!this.rootNodes.length) return null;
    const srcId = this.normalizeFlatPath(sourceId);
    const tgtId = this.normalizeFlatPath(targetId);
    if (!srcId || !tgtId || srcId === tgtId) return null;
    if (!this.canDrop(srcId, tgtId, "into")) return null;
    const srcReference = this.findReferenceBranchInTree(this.rootNodes, srcId);
    const tgtNode = this.findNodeByFlatPath(tgtId);
    if (!tgtNode) return null;
    const srcSiblings = srcReference ? srcReference.childrens ?? [] : this.rootNodes;
    const srcIdx = srcSiblings.findIndex(
      (n: TNode): boolean => this.normalizeFlatPath(n.flatPath) === srcId,
    );
    if (srcIdx === -1) return null;
    const moving = srcSiblings.splice(srcIdx, 1)[0];
    if (!moving) return null;
    tgtNode.childrens = tgtNode.childrens ?? [];
    tgtNode.childrens.push(moving);
    this.oncommittreeorder(this.rootNodes);
    const tgtClean = this.normalizeFlatPath(tgtNode.flatPath);
    return `${tgtClean}.${tgtNode.childrens.length}`;
  }

  /**
   * Construye un árbol jerárquico a partir de una lista plana de items.
   * Materializa cada item, le asegura ancestros stub si faltan, y ordena
   * los hijos por la cola numérica del `flatPath`.
   */
  buildTree(planes: TNode[]): TNode[] {
    const map = new Map<string, TNode>();
    const roots: TNode[] = [];
    const uxList: TNode[] = [];
    const hasGetFlatPath = !!this.customs?.getFlatPath;
    planes.forEach((p: TNode, idx: number) => {
      const ux = this.materializeNode(p);
      if (!hasGetFlatPath && !this.normalizeFlatPath(ux.flatPath)) {
        ux.flatPath = String(idx + 1);
      }
      ux.childrens = [];
      map.set(this.normalizeFlatPath(ux.flatPath), ux);
      uxList.push(ux);
    });
    const ensureAncestors = (childPath: string): TNode | null => {
      const parts = childPath.split(".");
      if (parts.length <= 1) return null;
      let parentBuilt: TNode | null = null;
      for (let i = 1; i < parts.length; i++) {
        const ancestorPath = parts.slice(0, i).join(".");
        if (!map.has(ancestorPath)) {
          const stub = this.toNode({ flatPath: ancestorPath });
          if (!stub) continue;
          stub.childrens = [];
          this.invokeUpdateNode(stub, false);
          map.set(ancestorPath, stub);
          uxList.push(stub);
          if (i === 1) roots.push(stub);
          else {
            const grandKey = parts.slice(0, i - 1).join(".");
            const grand = map.get(grandKey);
            if (grand) grand.childrens!.push(stub);
          }
          parentBuilt = stub;
        } else {
          parentBuilt = map.get(ancestorPath) ?? null;
        }
      }
      return parentBuilt;
    };
    uxList.slice().forEach((ux: TNode) => {
      const uxId = this.normalizeFlatPath(ux.flatPath);
      const parts = uxId.split(".");
      const referenceId = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
      if (referenceId) {
        if (!map.has(referenceId)) ensureAncestors(uxId);
        const referenceUx = map.get(referenceId);
        if (referenceUx && referenceUx !== ux && !referenceUx.childrens!.includes(ux)) {
          referenceUx.childrens!.push(ux);
        } else if (!referenceUx) {
          roots.push(ux);
        }
      } else if (!roots.includes(ux)) {
        roots.push(ux);
      }
    });
    roots.sort(flatPathTailCmp);
    map.forEach((ux: TNode) => {
      ux.childrens!.sort(flatPathTailCmp);
      if (ux.childrens!.length > 0) {
        ux.topology = "group";
        ux.hasChildren = true;
      }
    });
    return roots;
  }

  /**
   * Recorre `roots` reasignando `flatPath` según la posición en el árbol
   * (`1`, `1.1`, `1.1.1`, ...) y devuelve la lista plana. Actualiza
   * `_expandedFlatPaths` / `_selectedFlatPath` / `_focusedFlatPath` para
   * reflejar el remapeo.
   */
  flattenTree(roots: TNode[]): TNode[] {
    const result: TNode[] = [];
    const idMap = new Map<string, string>();
    const traverse = (nodes: TNode[], referenceId: string): void => {
      nodes.forEach((node: TNode, index: number) => {
        const oldId = this.normalizeFlatPath(node.flatPath);
        const newId = referenceId ? `${referenceId}.${index + 1}` : `${index + 1}`;
        if (oldId && oldId !== newId) idMap.set(oldId, newId);
        node.flatPath = newId;
        result.push(node);
        const childs = node.childrens ?? [];
        if (childs.length) traverse(childs, newId);
      });
    };
    traverse(roots, "");
    this.remapExpandedByIdMap(idMap);
    return result;
  }

  /**
   * Reconstruye la jerarquía del árbol (lista plana → árbol → lista plana)
   * reasignando flatPaths. Útil tras inserciones/eliminaciones masivas.
   */
  rebuildFlatTree(sort?: (a: TNode, b: TNode) => number): void {
    const cmp = sort ?? flatPathTailCmp;
    const list = this.List2RowsNodes;
    if (!list.length) return;
    const nodes = list.map((row: TNode) => {
      const key = this.normalizeFlatPath(row.flatPath);
      const parts = key.split(".");
      const parent = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
      return { row, key, parent, childrens: [] as { row: TNode; key: string; parent: string; childrens: unknown[] }[] };
    });
    const byId = new Map<string, typeof nodes[number]>();
    nodes.forEach((n) => byId.set(n.key, n));
    const roots: typeof nodes = [];
    nodes.forEach((n) => {
      const parentNode = n.parent ? byId.get(n.parent) : undefined;
      if (parentNode) parentNode.childrens.push(n);
      else roots.push(n);
    });
    const flat: TNode[] = [];
    const traverse = (arr: typeof nodes): void => {
      arr
        .sort((a, b) => cmp(a.row, b.row))
        .forEach((n) => {
          flat.push(n.row);
          traverse(n.childrens as typeof nodes);
        });
    };
    traverse(roots);
    this.List2Rows = flat;
  }

  /**
   * Recorre `roots` reasignando flatPaths, sincronizando las referencias
   * del consumidor (`customs.remapReferences` / `customs.setFlatPath`) y
   * persistiendo en `List2Rows`.
   */
  oncommittreeorder(roots: TNode[]): void {
    const result: TNode[] = [];
    const idMap = new Map<string, string>();
    const traverse = (nodes: TNode[], referenceId: string): void => {
      nodes.forEach((node: TNode, index: number) => {
        const oldId = this.normalizeFlatPath(node.flatPath);
        const newId = referenceId ? `${referenceId}.${index + 1}` : `${index + 1}`;
        if (oldId && oldId !== newId) idMap.set(oldId, newId);
        node.flatPath = newId;
        result.push(node);
        const childs = node.childrens ?? [];
        if (childs.length) traverse(childs, newId);
      });
    };
    traverse(roots, "");
    this.remapExpandedByIdMap(idMap);
    this.applyDomainSync(result, idMap);
    this.prepareTreeForSave(result, idMap);
  }

  /**
   * Hook para sincronizar referencias externas cuando un nodo cambia de
   * `flatPath`. Recorre `flat` invocando `customs.remapReferences` /
   * `customs.setFlatPath`.
   */
  applyDomainSync(flat: TNode[], idMap: Map<string, string>): void {
    const remap = this.customs?.remapReferences;
    const setFp = this.customs?.setFlatPath;
    if (!remap && !setFp) return;
    if (remap && idMap.size > 0) for (const node of flat) remap(node, idMap);
    if (setFp) {
      for (const node of flat) {
        const fp = String(node.flatPath ?? "").trim();
        if (fp) setFp(node, fp);
      }
    }
  }

  /**
   * Tras un reorder, remapea los flatPaths persistidos
   * (`_expandedFlatPaths`, `_selectedFlatPath`, `_focusedFlatPath`) al
   * nuevo esquema de ids.
   */
  remapExpandedByIdMap(idMap: Map<string, string>): void {
    if (idMap.size === 0) return;
    const remap = (id: string): string => idMap.get(id) ?? id;
    this._expandedFlatPaths = [
      ...new Set(this._expandedFlatPaths.map(remap)),
    ];
    const sel = remap(this._selectedFlatPath);
    if (sel !== this._selectedFlatPath) this._selectedFlatPath = sel;
    const foc = remap(this._focusedFlatPath);
    if (foc !== this._focusedFlatPath) this._focusedFlatPath = foc;
  }

  /** Persiste `flat` en `List2Rows` (hook para subclases que filtren). */
  prepareTreeForSave(flat: TNode[], _idMap: Map<string, string>): void {
    this.List2Rows = flat;
  }

  /** Asegura que `node.flatPath` queda persistido antes del save. */
  commitNodeForSave(node: TNode, _tree: unknown): TNode {
    const fp = String(node.flatPath ?? "").trim();
    if (fp) this.customs?.setFlatPath?.(node, fp);
    return node;
  }

  /**
   * Recorre `flat`, sincroniza ids viejos→nuevos vía `customs.getFlatPath`
   * y persiste cada nodo. Termina escribiendo la lista resultante.
   */
  commitTreeForSave(flat: TNode[]): void {
    const getInit = this.customs?.getFlatPath;
    const remap = this.customs?.remapReferences;
    if (remap && getInit) {
      const idMap = new Map<string, string>();
      for (const node of flat) {
        const init = String(getInit(node) ?? "").trim();
        const curr = String(node.flatPath ?? "").trim();
        if (init && curr && init !== curr) idMap.set(init, curr);
      }
      if (idMap.size > 0) for (const node of flat) remap(node, idMap);
    }
    const next: TNode[] = [];
    for (const node of flat) next.push(this.commitNodeForSave(node, this));
    this.List2Rows = next;
  }

  /** Recorre el árbol, persiste flatPaths, y guarda en `List2Rows`. */
  commitFlatPaths(): void {
    this.oncommittreeorder(this.rootNodes);
    const flat: TNode[] = [];
    const walk = (nodes: TNode[]): void => {
      for (const n of nodes) {
        flat.push(n);
        if (n.childrens?.length) walk(n.childrens);
      }
    };
    walk(this.rootNodes);
    this.commitTreeForSave(flat);
  }

  /** Serializa una fila a JSON (sin `childrens`). */
  serializeRowToJSON(row: TNode): Record<string, unknown> {
    if (row instanceof TObject) {
      const j = { ...row.toJSON() } as Record<string, unknown>;
      delete j["childrens"];
      return j;
    }
    return { ...row };
  }

  // ── Re-implementación de operaciones de `TAModel` ──────────────────────
  /**
   * Inserta `data` en `List2Rows` (al final). Si ya existe un nodo con el
   * mismo `flatPath`, llama a `onDuplicate` y devuelve `null`.
   */
  override addNode(
    data: Partial<TNode> | TRecord,
    onDuplicate?: (n: TNode) => void,
  ): TNode | null {
    const node = this.toNode(data as Partial<TNode>);
    if (!node) return null;
    if (this.findFlatNodeIndex(node) !== -1) {
      onDuplicate?.(node);
      return null;
    }
    this.List2Rows = [...this.List2RowsNodes, node];
    this.rebuildFlatTree();
    return node;
  }

  /**
   * Actualiza el nodo equivalente a `data`. Si `mutate` está definido,
   * muta in-place; si no, hace `Object.assign`.
   */
  override updateNode(
    data: Partial<TNode> | TRecord,
    mutate?: (target: TNode, source: TNode) => void,
  ): boolean {
    const node = this.toNode(data as Partial<TNode>);
    if (!node) return false;
    const idx = this.findFlatNodeIndex(node);
    if (idx === -1) return false;
    const list = this.List2RowsNodes;
    const target = list[idx];
    if (!target) return false;
    if (mutate) mutate(target, node);
    else Object.assign(target, node);
    this.List2Rows = list;
    this.rebuildFlatTree();
    return true;
  }

  /** Elimina el nodo equivalente a `data` (y todos sus descendientes). */
  override removeNode(data: Partial<TNode> | TRecord): boolean {
    const node = this.toNode(data as Partial<TNode>);
    if (!node) return false;
    const sId = node.flatPath;
    if (!sId) return false;
    this.List2Rows = this.List2RowsNodes.filter(
      (n: TNode): boolean => n.flatPath !== sId && !n.flatPath.startsWith(sId + "."),
    );
    this.rebuildFlatTree();
    return true;
  }

  // ── Lifecycle / refresh ────────────────────────────────────────────────
  /** Reconstruye el árbol desde `List2Rows` y refresca adapters. */
  override onrefresh(): void {
    const getInit = this.customs?.getFlatPath;
    const initFn = getInit
      ? (obj: TNode): string => this.normalizeFlatPath(String(getInit(obj) ?? ""))
      : undefined;
    const { result: rootsTree, pending } = this.withDeferredMaterialize(() =>
      this.buildTree(this.List2Rows),
    );
    const nextNodes = objRootsToNodes(rootsTree, initFn);
    this._treeNodes = [...nextNodes];
    this.flushPendingMaterialize(pending);
    this.notifyUI();
  }

  /** Procesa cambios de contexto: refresh + cursors + expansión inicial. */
  override onstateupdate(ctx: Record<string, unknown>): void {
    const prevReadonly = !!this.context.readonly;
    this.syncTreeViewBindState(ctx);
    Object.assign(this.context, ctx);
    const readonlyChanged = prevReadonly !== !!this.context.readonly;
    this.onchangecurso();
    this.onbranchexpand();
    this.onprocessobj();
    this.onupdate();
    this.onensurefirstselection();
    if (readonlyChanged) {
      this.syncAllRowAdapters();
    }
  }

  /** Refresca si `rootNodes` cambió de referencia desde el último refresh. */
  onupdate(): void {
    const nodesRef = this.rootNodes;
    if (nodesRef !== this.lastNodesRef) {
      this.onrefresh();
      this.lastNodesRef = this.rootNodes;
    }
  }

  /** Expande todos los roots en el primer render si aún no se hizo. */
  onbranchexpand(): void {
    if (!this.rootNodes.length || this.didNodesExpand) return;
    this.expandedNodes = [...this.rootNodes];
    this.didNodesExpand = true;
  }

  /**
   * Si el `record` del contexto cambió, propaga selección al árbol.
   * También asegura que el primer root quede seleccionado si no hay nada.
   */
  onprocessobj(): void {
    const record = (this.context as Record<string, unknown>)["record"] as
      | TRecord
      | null
      | undefined;
    if (!record) return;
    const resolvedBranch: TNode | null = (this.selectedNode as TNode | null) ?? record;
    if (!resolvedBranch || resolvedBranch === this.lastProcessedNode) return;
    this.currentNode = resolvedBranch;
    this.lastProcessedNode = resolvedBranch;
    if (this.rootNodes.length > 0 && !this._selectedFlatPath) {
      setTimeout(() => {
        const first = this.rootNodes[0];
        if (first && !this._selectedFlatPath) {
          this.applySelection(first);
        }
      }, 0);
    }
  }

  /** Reset del flag `didNodesExpand` cuando cambia el `record` del contexto. */
  onchangecurso(): void {
    const objId = this.normalizeFlatPath(
      ((this.context as Record<string, unknown>)["record"] as TRecord | null | undefined)
        ?.flatPath,
    );
    if (objId !== this.lastObjRefId) {
      this.lastObjRefId = objId;
      if (!this._expandedFlatPaths.length) this.didNodesExpand = false;
    }
  }

  /** Si no hay nada seleccionado y hay roots, selecciona el primero. */
  onensurefirstselection(): void {
    if (this._selectedFlatPath || !this.rootNodes.length) return;
    const first = this.rootNodes[0];
    if (!first) return;
    this.applySelection(first);
  }

  /**
   * Sincroniza `selectedNode` / `focusedNode` con el `record` del contexto.
   * Si el contexto no tiene record, usa el adapter.
   */
  syncTreeViewBindState(ctx: Record<string, unknown>): void {
    if (!this.selectedNode && this.rootNodes.length) {
      this.selectedNode = this.rootNodes[0]!;
    }
    const adapterObj = this.record;
    const ctxRecord = ctx["record"] as TRecord | null | undefined;
    const ctxObjId = this.normalizeFlatPath(ctxRecord?.flatPath);
    const adapterObjId = this.normalizeFlatPath(adapterObj?.flatPath);
    if (ctxObjId !== adapterObjId) ctx["record"] = adapterObj;
    if (!this.focusedNode && this.selectedNode) {
      this.focusedNode = this.selectedNode;
    }
  }

  /** Hook llamado por `TAModel` tras CRUD: limpia pending + refresh. */
  override async onAfterCatalogModificar(): Promise<void> {
    this._pendingInsertFlatPath = "";
    this._pendingExpandedSnapshot = [];
    this.onrefresh();
    this.syncAllRowAdapters();
  }

  // Hooks de cursor: las subclases concretas los invocan desde
  // `onstateupdate`. Aquí se exponen como métodos para tipado.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCursorHook(name: "onchangecurso" | "onprocessobj" | "onbranchexpand"): CursorHook {
    switch (name) {
      case "onchangecurso":
        return (): void => this.onchangecurso();
      case "onprocessobj":
        return (): void => this.onprocessobj();
      case "onbranchexpand":
        return (): void => this.onbranchexpand();
    }
  }
}

export { TATreeFlow };
