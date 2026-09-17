/**
 * TATreeShape — forma del árbol, navegación, normalización, materialización.
 *
 * Esta capa es el corazón del treeview: traduce un item "plano" del modelo
 * del consumidor a un nodo decorado del árbol, expone los customs (hooks
 * de override), y mantiene la navegación por `flatPath` / `pathInit`.
 *
 * Notas de tipado
 * ---------------
 * - Los customs son `TreeCustoms` (interface en `_types.ts`).
 * - Los nodos son `TNode` (también en `_types.ts`) — index signature abierta
 *   para tolerar campos arbitrarios del modelo.
 * - `_customs` y `_pendingMaterialize` son campos heredados vía
 *   `__publicField` (TS los re-declara aquí).
 */
import { TObject, capitalizar } from "./helpers.js";
import { TAModel } from "./02-model.js";
import {
  CustomsRuntime,
  IconConfig,
  LevelNameArgs,
  NodeIconArgs,
  SiblingPosition,
  TreeCustoms,
  TNode,
  TRecord,
} from "./_types.js";

class TATreeShape extends TAModel {
  // ── Estado interno ─────────────────────────────────────────────────────
  declare _customs: TreeCustoms | undefined;
  declare _pendingMaterialize: TNode[] | null;
  declare context: import("./_types.js").TreeContext;

  // ── Customs (get/set) ──────────────────────────────────────────────────
  /** Hooks del consumidor (entrie, list, updateNode, etc.). */
  get customs(): TreeCustoms | undefined {
    return this._customs;
  }

  set customs(value: TreeCustoms | undefined) {
    if (this._customs === value) return;
    this._customs = value;
    this.notifyUI();
  }

  /** Etiqueta singular derivada de `customs.levelName({depth: record.depth})`. */
  get entrie(): string {
    const level = this._customs?.levelName?.({
      depth: Number(this.record?.depth ?? 0),
    });
    return capitalizar(String(level || this._customs?.entrie || "").trim());
  }

  /** Etiqueta plural (`customs.entries`). */
  get entries(): string {
    return this._customs?.entries ?? "";
  }

  /** Lista de hermanos de `node` (en el mismo padre). */
  siblingsOf(node: TNode): TNode[] {
    const id = this.normalizeFlatPath(node.flatPath);
    if (!id) return [];
    const parentRef = this.findReferenceBranchInTree(this.rootNodes, id);
    return parentRef ? parentRef.childrens ?? [] : this.rootNodes;
  }

  /** Recorre el árbol invocando `customs.updateNode` en cada nodo. */
  async runCustomsPreSubmit(): Promise<void> {
    const hook = this.customs?.updateNode;
    const runtime = hook ? this.buildCustomsRuntime() : null;
    const walk = async (nodes: TNode[]): Promise<void> => {
      for (const node of nodes) {
        if (hook && runtime) await hook(node, false, runtime);
        if (node.childrens?.length) await walk(node.childrens);
      }
    };
    await walk(this.rootNodes);
    this.commitFlatPaths();
  }

  /** Devuelve el flatPath actual del nodo con `pathInit` dado. */
  currPathByInit(pathInit: string | null | undefined): string {
    const needle = this.normalizeFlatPath(pathInit);
    if (!needle) return "";
    const byInit = this.findNodeByPathInit(needle);
    if (byInit) return this.normalizeFlatPath(byInit.flatPath);
    return needle;
  }

  /** Hook para preparar `data` antes de materializar (default: identity). */
  prepareGetNode(data: TNode | Partial<TNode> | null | undefined): TNode | Partial<TNode> | null | undefined {
    return data;
  }

  /** ¿`data` ya es un nodo del árbol (tiene `flatPath` + `childrens`)? */
  isNodeInstance(
    data: unknown,
  ): data is TNode {
    const d = data as Record<string, unknown> | null | undefined;
    return typeof d?.["flatPath"] === "string" && Array.isArray(d?.["childrens"]);
  }

  /**
   * Materializa un item: si ya es instancia lo devuelve; si no, lo construye
   * vía `customs.newItem` o `customs.klass`. Para items planos asigna
   * `childrens = []` si falta y aplica `customs.getFlatPath`/`setFlatPath`.
   *
   * Sobreescribe el contrato base para devolver siempre `TNode` (no nullable):
   * la versión "real" de la materialización siempre produce un nodo.
   */
  createNode(data: Partial<TNode> | TNode): TNode | null {
    const partial = data as Partial<TNode>;
    if (this.isNodeInstance(partial)) return partial;
    if (this.customs?.newItem) {
      return this.customs.newItem(partial);
    }
    const Klass = this.customs?.klass;
    if (Klass) {
      const item2 = new Klass() as unknown as TNode;
      this.safeAssign(item2, partial);
      const flatPath2 = String(
        partial?.flatPath ?? this.customs?.getFlatPath?.(item2) ?? "",
      ).trim();
      if (flatPath2) {
        item2.flatPath = flatPath2;
        this.customs?.setFlatPath?.(item2, flatPath2);
      }
      return item2;
    }
    const item: TNode = { ...(partial ?? {}) } as TNode;
    if (!Array.isArray(item.childrens)) {
      item.childrens = [];
    }
    const flatPath = String(
      partial?.flatPath ?? this.customs?.getFlatPath?.(item) ?? "",
    ).trim();
    if (flatPath) {
      item.flatPath = flatPath;
      this.customs?.setFlatPath?.(item, flatPath);
    }
    return item;
  }

  /**
   * Copia `source` en `target` respetando `Object.defineProperty` setters y
   * getters del target (no pisa campos no asignables).
   */
  safeAssign(target: TNode, source: Partial<TNode> | null | undefined): TNode {
    if (!source) return target;
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (value === undefined) continue;
      if (this.isAssignableProperty(target, key)) {
        try {
          (target as Record<string, unknown>)[key] = value;
        } catch {
          /* silent: getter-only prop */
        }
      }
    }
    return target;
  }

  /** ¿La propiedad `key` del `target` es asignable (setter o writable)? */
  isAssignableProperty(target: object, key: string): boolean {
    let proto: object | null = target;
    while (proto) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        if (desc.set) return true;
        if (desc.get && !desc.set) return false;
        return desc.writable !== false;
      }
      proto = Object.getPrototypeOf(proto);
    }
    return true;
  }

  /** Lista fuente (override del customs o `context.List2Rows`). */
  getList2RowsSource(): TNode[] | null {
    if (this.customs?.list) {
      const l = this.customs.list();
      return l ?? null;
    }
    const raw = (this.context as Record<string, unknown>)["List2Rows"];
    return Array.isArray(raw) ? (raw as TNode[]) : null;
  }

  /** Lista plana de filas (`getList2RowsSource` con fallback `[]`). */
  get List2Rows(): TNode[] {
    return this.getList2RowsSource() ?? [];
  }

  set List2Rows(value: TNode[]) {
    const target = this.getList2RowsSource();
    if (!target) return;
    while (target.length > 0) target.pop();
    for (const item of value) target.push(item);
  }

  /** Hook de pre-procesamiento de nodos del último nivel (default: identity). */
  prepareLastLevelNodeData(
    baseData: Partial<TNode>,
    _record: Partial<TNode> | TRecord | null | undefined,
  ): Partial<TNode> {
    return baseData;
  }

  /** Llama `customs.updateNode` (respeta `_pendingMaterialize`). */
  invokeUpdateNode(node: TNode, isNew: boolean): void {
    const fn = this.customs?.updateNode;
    if (!fn) return;
    if (!isNew && this._pendingMaterialize) {
      this._pendingMaterialize.push(node);
      return;
    }
    void fn(node, isNew, this.buildCustomsRuntime());
  }

  /**
   * Encuapsula `fn()` para que cualquier `invokeUpdateNode(isNew:false)` que
   * ocurra dentro se acumule en `pending` (sin invocar customs), devolviendo
   * ambos resultados al caller.
   */
  withDeferredMaterialize<T>(
    fn: () => T,
  ): { result: T; pending: TNode[] } {
    const prev = this._pendingMaterialize;
    this._pendingMaterialize = [];
    let result: T;
    try {
      result = fn();
    } finally {
      /* noop — pending se asigna abajo */
    }
    const pending = this._pendingMaterialize ?? [];
    this._pendingMaterialize = prev;
    return { result, pending };
  }

  /** Vacía la cola `_pendingMaterialize` invocando customs.updateNode. */
  flushPendingMaterialize(nodes: TNode[]): void {
    const fn = this.customs?.updateNode;
    if (!fn) return;
    const runtime = this.buildCustomsRuntime();
    for (const node of nodes) void fn(node, false, runtime);
  }

  /** Crea un nodo aplicándole `applyDomainDefaults` y `invokeUpdateNode`. */
  materializeNode(data: Partial<TNode> | TNode | null | undefined): TNode {
    const node = this.createNode(data as Partial<TNode>);
    if (!node) {
      throw new Error("materializeNode: createNode devolvió null.");
    }
    this.applyDomainDefaults(node);
    this.invokeUpdateNode(node, false);
    return node;
  }

  /**
   * Aplica defaults de dominio al nodo: `depth` (calculado del `flatPath`),
   * `topology` ("group" si no estaba), `hasChildren` (calculado).
   */
  applyDomainDefaults(node: TNode): void {
    const flatPath = String(node.flatPath ?? "").trim();
    if (!flatPath) return;
    const depth = (flatPath.match(/\./g) || []).length;
    if (this.isAssignableProperty(node, "depth")) {
      (node as Record<string, unknown>)["depth"] = depth;
    }
    if (
      !node.topology &&
      this.isAssignableProperty(node, "topology")
    ) {
      (node as Record<string, unknown>)["topology"] = "group";
    }
    if (this.isAssignableProperty(node, "hasChildren")) {
      (node as Record<string, unknown>)["hasChildren"] =
        this.computeNodeHasChildren(flatPath);
    }
  }

  /** ¿Tiene el `flatPath` indicado descendientes en `List2Rows`? */
  computeNodeHasChildren(flatPath: string): boolean {
    const list = this.List2Rows ?? [];
    const myPrefix = flatPath + ".";
    for (const item of list) {
      if (!item) continue;
      const pid = String(item.flatPath ?? (item as Record<string, unknown>)["iplan"] ?? "").trim();
      if (!pid) continue;
      const idxDot = pid.lastIndexOf(".");
      const parentId = idxDot >= 0 ? pid.slice(0, idxDot) : "";
      if (parentId === flatPath || (flatPath === "" && !pid.includes("."))) return true;
      if (pid.startsWith(myPrefix)) return true;
    }
    return false;
  }

  /**
   * Convierte `data` en un nodo. Si `clone` es true, devuelve una copia
   * profunda (`TObject.clone()` o `structuredClone`).
   */
  toNode(
    data: TNode | Partial<TNode> | null | undefined,
    clone = false,
  ): TNode | null {
    let src: TNode | Partial<TNode> | null | undefined = data;
    if (clone) {
      if (data instanceof TObject) src = data.clone() as unknown as TNode;
      else if (data != null) src = structuredClone(data) as TNode;
    }
    if (!clone && this.isNodeInstance(src)) return src;
    const prepared = this.prepareGetNode(src);
    return this.materializeNode(
      this.safeAssign(
        new TObject() as unknown as TNode,
        (prepared ?? {}) as Partial<TNode>,
      ),
    );
  }

  /** Normaliza un `flatPath` (sanea prefijos `_UP_` / `_M_`, trimea). */
  normalizeFlatPath(id: string | null | undefined): string {
    if (id === void 0 || id === null) return "";
    return String(id).replace(/^(_UP_|_M_)/, "").trim();
  }

  /** Busca recursivamente por `flatPath` normalizado. */
  findNodeByFlatPath(
    id: string | null | undefined,
    branches?: TNode[],
  ): TNode | null {
    const list = branches ?? this.rootNodes;
    const needle = this.normalizeFlatPath(id);
    if (needle.length === 0) return null;
    for (const branch of list) {
      if (this.normalizeFlatPath(branch.flatPath) === needle) return branch;
      const childs = branch.childrens;
      if (childs?.length) {
        const found = this.findNodeByFlatPath(needle, childs);
        if (found) return found;
      }
    }
    return null;
  }

  /** Busca recursivamente por `pathInit` normalizado. */
  findNodeByPathInit(
    pathInit: string | null | undefined,
    branches: TNode[] = this.rootNodes,
  ): TNode | null {
    const needle = this.normalizeFlatPath(pathInit);
    if (needle.length === 0) return null;
    for (const branch of branches) {
      if (this.normalizeFlatPath(branch.pathInit) === needle) return branch;
      const childs = branch.childrens;
      if (childs?.length) {
        const found = this.findNodeByPathInit(needle, childs);
        if (found) return found;
      }
    }
    return null;
  }

  /** Índice en `List2RowsNodes` del item con mismo `flatPath` que `item`. */
  findFlatNodeIndex(item: TNode): number {
    const list = this.List2RowsNodes;
    if (!list.length) return -1;
    const sId = this.normalizeFlatPath(item.flatPath);
    const found = list.find(
      (n: TNode | null): n is TNode => n != null && this.normalizeFlatPath(n.flatPath) === sId,
    );
    return found ? list.indexOf(found) : -1;
  }

  /** Encuentra el nodo equivalente en `List2RowsNodes` por `flatPath`. */
  findNode(data: Partial<TNode> | TRecord | null | undefined): TRecord | undefined {
    const materialized = this.toNode(data);
    if (!materialized) return undefined;
    const sId = this.normalizeFlatPath(materialized.flatPath);
    if (!sId) return undefined;
    const found = this.List2RowsNodes.find(
      (n: TNode): boolean => this.normalizeFlatPath(n.flatPath) === sId,
    );
    return found as TRecord | undefined;
  }

  /** Encuentra la rama que contiene `objRow` por identidad. */
  findBranchByObject(branches: TNode[], objRow: TNode): TNode | null {
    for (const branch of branches) {
      if (branch === objRow) return branch;
      const childs = branch.childrens;
      if (childs?.length) {
        const foundBranch = this.findBranchByObject(childs, objRow);
        if (foundBranch) return foundBranch;
      }
    }
    return null;
  }

  /**
   * Busca la rama padre de un hijo identificado por `childId`. Recorre
   * recursivamente; cuando lo encuentra, devuelve `referenceBranch` (la
   * rama en la que estaba `childId` cuando se descubrió).
   */
  findReferenceBranchInTree(
    branches: TNode[],
    childId: string | null | undefined,
    referenceBranch: TNode | null = null,
  ): TNode | null {
    const needle = this.normalizeFlatPath(childId);
    for (const branch of branches) {
      if (this.normalizeFlatPath(branch.flatPath) === needle) return referenceBranch;
      const childs = branch.childrens;
      if (childs?.length) {
        const inner = this.findReferenceBranchInTree(childs, childId, branch);
        if (inner !== null) return inner;
      }
    }
    return null;
  }

  /** Devuelve el nodo por `flatPath` o `undefined` si no existe. */
  getNodeByFlatPath(nodeId: string | null | undefined): TRecord | undefined {
    const node = this.findNodeByFlatPath(nodeId);
    return node ? (node as TRecord) : undefined;
  }

  /** ¿`flatPath` es el path pendiente de inserción actual? */
  isPendingInsertPath(flatPath: string | null | undefined): boolean {
    const norm = this.normalizeFlatPath(flatPath);
    if (!norm) return false;
    return this.normalizeFlatPath(this._pendingInsertFlatPath) === norm;
  }

  /** Posición de `nodeId` entre sus hermanos (`isFirst`, `isLast`). */
  getSiblingPosition(nodeId: string | null | undefined): SiblingPosition {
    const branches = this.rootNodes;
    const n = this.normalizeFlatPath(nodeId);
    if (!branches?.length || n.length === 0) {
      return { isFirst: false, isLast: false };
    }
    const referenceBranch = this.findReferenceBranchInTree(branches, n);
    const siblings = referenceBranch ? referenceBranch.childrens ?? [] : branches;
    const idx = siblings.findIndex(
      (ch: TNode): boolean => this.normalizeFlatPath(ch.flatPath) === n,
    );
    return { isFirst: idx === 0, isLast: idx === siblings.length - 1 };
  }

  /** Devuelve la cadena de ancestros de `node` (de más cercano a más lejano). */
  walkAncestors(node: TNode): TNode[] {
    const out: TNode[] = [];
    const id = String(node.flatPath ?? "").trim();
    if (!id || !id.includes(".")) return out;
    const parts = id.split(".");
    for (let i = parts.length - 1; i >= 1; i--) {
      const ancId = parts.slice(0, i).join(".");
      const anc = this.findNodeByFlatPath(ancId);
      if (anc) out.push(anc);
    }
    return out;
  }

  /** ¿`candidate` es descendiente (o igual) de `ancestor`? */
  isDescendant(candidate: TNode, ancestor: TNode): boolean {
    const aid = this.normalizeFlatPath(ancestor.flatPath);
    const cid = this.normalizeFlatPath(candidate.flatPath);
    return cid === aid || cid.startsWith(aid + ".");
  }

  /** Lista plana de ids del branch (incluye el root + descendientes). */
  collectBranchAndLeafIds(branch: TNode): string[] {
    const out = [branch.flatPath];
    branch.childrens?.forEach((leafOrBranch: TNode) =>
      out.push(...this.collectBranchAndLeafIds(leafOrBranch)),
    );
    return out;
  }

  /** Lista de ids de todas las ramas (no incluye hojas). */
  collectBranchIds(branches: TNode[] = this.rootNodes): string[] {
    const out: string[] = [];
    for (const branch of branches) {
      const childs = branch.childrens;
      if (childs?.length) {
        out.push(branch.flatPath, ...this.collectBranchIds(childs));
      }
    }
    return out;
  }

  // ── Métodos esperados por customs.runtime (firma, sin cuerpo útil) ─────
  // (las implementaciones reales viven en 04-tree-flow / 06-mutations / etc.)
  buildCustomsRuntime(): CustomsRuntime {
    return (
      this as unknown as { buildCustomsRuntime(): CustomsRuntime }
    ).buildCustomsRuntime();
  }

  commitFlatPaths(): void {
    /* provided by TATreeFlow */
  }
}

export { TATreeShape };
