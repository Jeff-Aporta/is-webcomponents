var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { TTreeAdapterContract } from "./01-contract.js";
class TAModel extends TTreeAdapterContract {
  constructor() {
    super(...arguments);
    __publicField(this, "onrequestopendrawer");
    __publicField(this, "onrequestclosedrawer");
    __publicField(this, "onrequesteditshow");
    __publicField(this, "onrequestdelete");
    __publicField(this, "onError");
    __publicField(this, "_pendingInsertFlatPath", "");
    __publicField(this, "_pendingLastLevelParentFlatPath", "");
    __publicField(this, "_pendingExpandedSnapshot", []);
    __publicField(this, "ActInsertar", async (slaveNode) => {
      return !!this.addNode(slaveNode, (n) => this.onError?.(`El índice "${n.flatPath}" ya existe.`));
    });
    __publicField(this, "actEliminar", async (slaveNode) => {
      if (!this.removeNode(slaveNode)) throw new Error("No se pudo eliminar el nodo.");
      return slaveNode;
    });
    __publicField(this, "actModificar", async (slaveNode) => {
      const found = this.findNode(slaveNode);
      if (!found) throw new Error("No se encontró el nodo a modificar.");
      const sNode = slaveNode;
      if (typeof found.loadFromJSON === "function" && typeof sNode.toJSON === "function") found.loadFromJSON(sNode.toJSON());
      else Object.assign(found, sNode);
      this.rebuildFlatTree();
      this.notifyUI();
      return found;
    });
    __publicField(this, "actVisualizar", async (slaveNode) => {
      const found = this.findNode(slaveNode);
      if (!found) return slaveNode;
      const src = found;
      const dst = slaveNode;
      for (const k of Object.keys(src)) if (k !== "f") dst[k] = src[k];
      return slaveNode;
    });
    __publicField(this, "Actualizar", async (slaveNode) => {
      return this.updateNode(slaveNode);
    });
  }
  addNode(_data, _onDuplicate) {
    return null;
  }
  removeNode(_data) {
    return false;
  }
  updateNode(_data, _mutate) {
    return false;
  }
  findNode(_data) {
    return void 0;
  }
  get List2RowsNodes() {
    return this.List2Rows.map((p) => this.toNode(p));
  }
  sortChildrens(a, b) {
    const oa = +String(a.flatPath || "").split(".").pop() || 0;
    const ob = +String(b.flatPath || "").split(".").pop() || 0;
    return oa - ob;
  }
  setShowFrm(b) {
    if (b) this.onrequestopendrawer?.("create");
    else this.onrequestclosedrawer?.();
  }
  codeToDelete(value) {
    return String(value ?? "").trim().padStart(5, "X");
  }
  getRecordSecurityCode(node) {
    const asObj = node;
    const source = asObj?.iplan ?? asObj?.idrow ?? "";
    return this.codeToDelete(String(source).replace(/^(_UP_|_M_)/, ""));
  }
  workingRow(node) {
    return node ?? null;
  }
  findNodeByObj(nodes, row) {
    for (const node of nodes) {
      if (node === row) return node;
      if (node.childrens?.length) {
        const found = this.findNodeByObj(node.childrens, row);
        if (found) return found;
      }
    }
    return null;
  }
  findNodeForAction(objRef) {
    const asRec = objRef;
    const rawCurrent = asRec?.flatPath;
    const cleanCurrent = rawCurrent != null ? this.normalizeFlatPath(String(rawCurrent)) : "";
    if (cleanCurrent.length > 0) {
      const found = this.findNodeByFlatPath(cleanCurrent);
      if (found) return found;
    }
    const rawId = asRec?.idrow ?? asRec?.iplan;
    const cleanId = rawId != null ? this.normalizeFlatPath(String(rawId)) : "";
    if (cleanId.length > 0) {
      const found = this.findNodeByFlatPath(cleanId);
      if (found) return found;
    }
    return this.findNodeByObj(this.rootNodes, objRef);
  }
  closeEditDrawer() {
    this.onrequestclosedrawer?.();
    this.closeEditForm();
  }
  showFrmModificar(objRef) {
    const node = this.findNodeForAction(objRef);
    if (!node) return;
    this.record = node;
    const mode = this.canMutate ? "edit" : "view";
    if (mode === "edit" && !this._pendingInsertFlatPath) this.historyPush();
    this.onrequesteditshow?.(node, mode);
  }
  showFrmVisualizar(objRef) {
    const node = this.findNodeForAction(objRef);
    if (!node) return;
    this.record = node;
    this.onrequesteditshow?.(node, "view");
  }
  showDelete(objRef) {
    const node = this.findNodeForAction(objRef);
    if (node) this.record = node;
    if (node) this.onrequestdelete?.(node);
  }
  async postSubmit(_o, action) {
    if (action === "Eliminar") await this.ondeleteconfirmed();
    else if (action === "Modificar" || action === "Crear") await this.onAfterCatalogModificar();
    this.closeEditDrawer();
  }
  async confirmDelete(codigoIngresado) {
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
    } catch (e) {
      const sAdd = e instanceof Error ? `\r
${e.message}` : "";
      this.onError?.("No se pudo eliminar." + sAdd);
      return false;
    }
  }
}
export {
  TAModel
};
