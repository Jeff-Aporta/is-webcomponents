/**
 * TAModel — operaciones CRUD de un nodo del árbol.
 *
 * Mantiene los callbacks que el adapter expone al consumidor (`onError`,
 * `onrequestopendrawer`, …) y los métodos que las subclases re-implementan
 * (`addNode`, `removeNode`, …). Las versiones declaradas aquí son los
 * contratos vacíos (retornan `null` / `false`) y serán sustituidas por las
 * implementaciones reales en 04-tree-flow.ts.
 *
 * Notas de tipado
 * ---------------
 * Los callbacks (`onrequestopendrawer`, etc.) son declarados como campos
 * heredados invisibles a TS — los re-declaramos aquí con tipos concretos.
 * El resto de la implementación trabaja sobre `TRecord` (forma mínima del
 * nodo con `iplan` / `idrow` opcional).
 */
import { TTreeAdapterContract } from "./01-contract.js";
import { TNode, TRecord, TreeActionSpec } from "./_types.js";

/** Resultado de las acciones `ActInsertar` / `actEliminar` / etc. */
type ActionResult<T> = Promise<T>;

/** Tipo del callback `onAfterCatalogModificar` (definido en 04-tree-flow.ts). */
type AfterCatalogFn = () => Promise<void>;

/** Tipo del callback `ondeleteconfirmed` (definido en 06-mutations.ts). */
type DeleteConfirmedFn = () => Promise<void>;

/** Tipo del callback `historyPush` (definido en 06b-history.ts). */
type HistoryPushFn = () => void;

/** Tipo del callback `closeEditForm` (definido en 06-mutations.ts). */
type CloseEditFormFn = () => void;

/** Tipo del callback `rebuildFlatTree` (definido en 04-tree-flow.ts). */
type RebuildFlatTreeFn = (sort?: (a: TNode, b: TNode) => number) => void;

class TAModel extends TTreeAdapterContract {
  // ── Callbacks externos (re-declarados para tipado) ─────────────────────
  declare onrequestopendrawer: ((mode: "create" | "edit" | "view") => void) | undefined;
  declare onrequestclosedrawer: (() => void) | undefined;
  declare onrequesteditshow:
    | ((node: TRecord, mode: "edit" | "view") => void)
    | undefined;
  declare onrequestdelete: ((node: TRecord) => void) | undefined;
  declare onError: ((msg: string) => void) | undefined;

  // ── Estado interno ─────────────────────────────────────────────────────
  declare record: TRecord | null;
  declare _pendingInsertFlatPath: string;
  declare _pendingLastLevelParentFlatPath: string;
  declare _pendingExpandedSnapshot: string[];

  // ── Acciones públicas (arrow fields) ───────────────────────────────────
  /**
   * Inserta un nodo vía `addNode`; si el adapter emite `onError` cuando el
   * flatPath ya existe, se invoca con el nodo duplicado.
   */
  ActInsertar: (slaveNode: TRecord) => Promise<boolean> = async (slaveNode) => {
    return !!this.addNode(slaveNode, (n: TNode) =>
      this.onError?.(`El índice "${n.flatPath}" ya existe.`),
    );
  };

  /** Elimina el nodo vía `removeNode`. */
  actEliminar: (slaveNode: TRecord) => ActionResult<TRecord> = async (slaveNode) => {
    if (!this.removeNode(slaveNode))
      throw new Error("No se pudo eliminar el nodo.");
    return slaveNode;
  };

  /** Modifica el nodo: usa `loadFromJSON` si ambos lados lo exponen. */
  actModificar: (slaveNode: TRecord) => ActionResult<TRecord> = async (slaveNode) => {
    const found = this.findNode(slaveNode);
    if (!found) throw new Error("No se encontró el nodo a modificar.");
    const sNode = slaveNode as TRecord & { toJSON?: () => unknown };
    const fNode = found as TRecord & { loadFromJSON?: (j: unknown) => void };
    if (
      typeof fNode.loadFromJSON === "function" &&
      typeof sNode.toJSON === "function"
    ) {
      fNode.loadFromJSON(sNode.toJSON());
    } else {
      Object.assign(found, sNode);
    }
    this.rebuildFlatTree();
    this.notifyUI();
    return found;
  };

  /** Visualizar: copia los campos de `found` sobre `slaveNode` (sin `f`). */
  actVisualizar: (slaveNode: TRecord) => ActionResult<TRecord> = async (slaveNode) => {
    const found = this.findNode(slaveNode);
    if (!found) return slaveNode;
    const src = found as Record<string, unknown>;
    const dst = slaveNode as Record<string, unknown>;
    for (const k of Object.keys(src)) if (k !== "f") dst[k] = src[k];
    return slaveNode;
  };

  /** Actualiza un nodo vía `updateNode`. */
  Actualizar: (slaveNode: TRecord) => Promise<boolean> = async (slaveNode) => {
    return this.updateNode(slaveNode);
  };

  // ── Contrato a sobreescribir por subclases ─────────────────────────────
  /** Inserta `data` en la lista plana; `onDuplicate` se llama si ya existe. */
  addNode(
    _data: Partial<TNode> | TRecord,
    _onDuplicate?: (n: TNode) => void,
  ): TNode | null {
    return null;
  }

  /** Elimina `data` (y descendientes) de la lista plana. */
  removeNode(_data: Partial<TNode> | TRecord): boolean {
    return false;
  }

  /** Actualiza un nodo; `mutate(target, source)` permite mutar in-place. */
  updateNode(
    _data: Partial<TNode> | TRecord,
    _mutate?: (target: TNode, source: TNode) => void,
  ): boolean {
    return false;
  }

  /** Encuentra el nodo equivalente a `data` por flatPath normalizado. */
  findNode(_data: Partial<TNode> | TRecord): TRecord | undefined {
    return undefined;
  }

  // ── Derivados / helpers ────────────────────────────────────────────────
  /** Proyecta cada item de `List2Rows` a un nodo materializado. */
  get List2RowsNodes(): TNode[] {
    return this.List2Rows.map((p: TNode) => this.toNode(p)).filter(
      (n: TNode | null): n is TNode => n != null,
    );
  }

  /** Compara hijos por la última sección numérica del `flatPath`. */
  sortChildrens(a: TNode, b: TNode): number {
    const oa = +String(a.flatPath || "").split(".").pop()! || 0;
    const ob = +String(b.flatPath || "").split(".").pop()! || 0;
    return oa - ob;
  }

  /** Abre/cierra el drawer de edición. */
  setShowFrm(b: boolean): void {
    if (b) this.onrequestopendrawer?.("create");
    else this.onrequestclosedrawer?.();
  }

  /** Devuelve el código de seguridad con padding (5 chars con `X`). */
  codeToDelete(value: unknown): string {
    return String(value ?? "").trim().padStart(5, "X");
  }

  /** Calcula el código de seguridad esperado para el `node`. */
  getRecordSecurityCode(node: TRecord | null | undefined): string {
    const asObj = node as Record<string, unknown> | null | undefined;
    const source = asObj?.["iplan"] ?? asObj?.["idrow"] ?? "";
    return this.codeToDelete(String(source).replace(/^(_UP_|_M_)/, ""));
  }

  /** Devuelve `node` (o `null`) como fila de trabajo. */
  workingRow<T extends TNode>(node: T | null | undefined): T | null {
    return node ?? null;
  }

  /** Busca un nodo por identidad de referencia dentro del árbol. */
  findNodeByObj(nodes: TNode[], row: TNode): TNode | null {
    for (const node of nodes) {
      if (node === row) return node;
      const childs = node.childrens;
      if (childs?.length) {
        const found = this.findNodeByObj(childs, row);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Encuentra el nodo asociado a una acción. Estrategia:
   *  1. Por `flatPath` normalizado.
   *  2. Por `idrow` o `iplan` normalizado.
   *  3. Por identidad de referencia.
   */
  findNodeForAction(objRef: Partial<TRecord> | TRecord | null | undefined): TRecord | null {
    const asRec = objRef as Record<string, unknown> | null | undefined;
    const rawCurrent = asRec?.["flatPath"];
    const cleanCurrent = rawCurrent != null ? this.normalizeFlatPath(String(rawCurrent)) : "";
    if (cleanCurrent.length > 0) {
      const found = this.findNodeByFlatPath(cleanCurrent, this.rootNodes);
      if (found) return found as TRecord;
    }
    const rawId = asRec?.["idrow"] ?? asRec?.["iplan"];
    const cleanId = rawId != null ? this.normalizeFlatPath(String(rawId)) : "";
    if (cleanId.length > 0) {
      const found = this.findNodeByFlatPath(cleanId, this.rootNodes);
      if (found) return found as TRecord;
    }
    const byObj = this.findNodeByObj(this.rootNodes, objRef as TNode);
    return byObj as TRecord | null;
  }

  /** Cierra el drawer y el form de edición. */
  closeEditDrawer(): void {
    this.onrequestclosedrawer?.();
    this.closeEditForm();
  }

  /** Abre el form de edición para `objRef`. Si readOnly, abre visualizer. */
  showFrmModificar(objRef: Partial<TRecord> | TRecord | null | undefined): void {
    const node = this.findNodeForAction(objRef);
    if (!node) return;
    this.record = node;
    const mode = this.canMutate ? "edit" : "view";
    if (mode === "edit" && !this._pendingInsertFlatPath) this.historyPush();
    this.onrequesteditshow?.(node, mode);
  }

  /** Abre el form de visualización para `objRef`. */
  showFrmVisualizar(objRef: Partial<TRecord> | TRecord | null | undefined): void {
    const node = this.findNodeForAction(objRef);
    if (!node) return;
    this.record = node;
    this.onrequesteditshow?.(node, "view");
  }

  /** Abre el modal de confirmación de borrado. */
  showDelete(objRef: Partial<TRecord> | TRecord | null | undefined): void {
    const node = this.findNodeForAction(objRef);
    if (node) this.record = node;
    if (node) this.onrequestdelete?.(node);
  }

  /** Despacha `postSubmit` al adapter de consumidor tras CRUD. */
  async postSubmit(
    _o: TRecord | null | undefined,
    action: "Eliminar" | "Modificar" | "Crear",
  ): Promise<void> {
    if (action === "Eliminar") await this.ondeleteconfirmed();
    else if (action === "Modificar" || action === "Crear")
      await this.onAfterCatalogModificar();
    this.closeEditDrawer();
  }

  /**
   * Confirma el borrado validando el código de seguridad. Devuelve `true`
   * si la eliminación fue exitosa.
   */
  async confirmDelete(codigoIngresado: unknown): Promise<boolean> {
    const codigo = String(codigoIngresado ?? "").trim();
    const codigoEsperado = this.getRecordSecurityCode(this.record);
    const bloqueado = codigo !== codigoEsperado;
    if (!this.canMutate || bloqueado || !this.record) return false;
    try {
      const row = this.workingRow(this.record);
      if (!row) throw new Error("No hay fila activa para eliminar.");
      this.historyPush();
      await this.actEliminar(row);
      await this.postSubmit(row, "Eliminar");
      return true;
    } catch (e: unknown) {
      const sAdd = e instanceof Error ? `\r\n${e.message}` : "";
      this.onError?.("No se pudo eliminar." + sAdd);
      return false;
    }
  }

  // ── Callbacks "definidos en otros archivos del módulo" ─────────────────
  // Los declaramos como métodos con la firma esperada para que TS los
  // reconozca sin propagar `any` cuando una subclase los consume.
  // Su implementación real vive en 06b-history / 06-mutations / 04-tree-flow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historyPush(): void {
    /* provided by TAHistory (06b-history.ts) */
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actEliminarImpl(node: TRecord): Promise<TRecord> {
    /* provided by TAModel itself (overridden by subclasses) */
    return this.actEliminar(node);
  }
  closeEditForm(): void {
    /* provided by TAMutations (06-mutations.ts) */
  }
  rebuildFlatTree(sort?: (a: TNode, b: TNode) => number): void {
    /* provided by TATreeFlow (04-tree-flow.ts) */
  }
  onAfterCatalogModificar(): Promise<void> {
    /* provided by TATreeFlow (04-tree-flow.ts) */
    return Promise.resolve();
  }
  ondeleteconfirmed(): Promise<void> {
    /* provided by TAMutations (06-mutations.ts) */
    return Promise.resolve();
  }
}

export { TAModel };
