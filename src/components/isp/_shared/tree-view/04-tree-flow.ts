import { TObject } from "./helpers.js";
import { objRootsToNodes } from "./tree-data.js";
import { TATreeShape } from "./03-tree-shape.js";
class TATreeFlow extends TATreeShape {
  canDrop(sourceId, targetId, position) {
    const src = this.findNodeByFlatPath(this.normalizeFlatPath(sourceId));
    const tgt = this.findNodeByFlatPath(this.normalizeFlatPath(targetId));
    if (!src || !tgt) return false;
    if (this.isDescendant(tgt, src)) return false;
    const srcParent = this.findReferenceBranchInTree(this.rootNodes, this.normalizeFlatPath(src.flatPath));
    const newParent = position === "into" ? tgt : this.findReferenceBranchInTree(this.rootNodes, this.normalizeFlatPath(tgt.flatPath));
    if (srcParent !== newParent) {
      if (srcParent && (srcParent.isHermetic || srcParent.isFreezer)) return false;
      if (newParent && newParent.isHermetic) return false;
    }
    if (position === "into") return true;
    return this.canDropAtRoot(src, tgt, position);
  }
  canDropAtRoot(_src, _tgt, _position) {
    return true;
  }
  nestNodeInTree(sourceId, targetId) {
    if (!this.rootNodes.length) return null;
    const srcId = this.normalizeFlatPath(sourceId);
    const tgtId = this.normalizeFlatPath(targetId);
    if (!srcId || !tgtId || srcId === tgtId) return null;
    if (!this.canDrop(srcId, tgtId, "into")) return null;
    const srcReference = this.findReferenceBranchInTree(this.rootNodes, srcId);
    const tgtNode = this.findNodeByFlatPath(tgtId);
    if (!tgtNode) return null;
    const srcSiblings = srcReference ? srcReference.childrens ?? [] : this.rootNodes;
    const srcIdx = srcSiblings.findIndex((n) => this.normalizeFlatPath(n.flatPath) === srcId);
    if (srcIdx === -1) return null;
    const [moving] = srcSiblings.splice(srcIdx, 1);
    tgtNode.childrens = tgtNode.childrens ?? [];
    tgtNode.childrens.push(moving);
    this.oncommittreeorder(this.rootNodes);
    const tgtClean = this.normalizeFlatPath(tgtNode.flatPath);
    return `${tgtClean}.${tgtNode.childrens.length}`;
  }
  buildTree(planes) {
    const map = /* @__PURE__ */ new Map();
    const roots = [];
    const uxList = [];
    const hasGetFlatPath = !!this.customs?.getFlatPath;
    planes.forEach((p, idx: number) => {
      const ux = this.materializeNode(p);
      if (!hasGetFlatPath && !this.normalizeFlatPath(ux.flatPath)) {
        ux.flatPath = String(idx + 1);
      }
      ux.childrens = [];
      map.set(this.normalizeFlatPath(ux.flatPath), ux);
      uxList.push(ux);
    });
    const ensureAncestors = (childPath: string) => {
      const parts = childPath.split(".");
      if (parts.length <= 1) return null;
      let parentBuilt = null;
      for (let i = 1; i < parts.length; i++) {
        const ancestorPath = parts.slice(0, i).join(".");
        if (!map.has(ancestorPath)) {
          const stub = this.toNode({ flatPath: ancestorPath });
          stub.childrens = [];
          this.invokeUpdateNode(stub, false);
          map.set(ancestorPath, stub);
          uxList.push(stub);
          if (i === 1) roots.push(stub);
          else {
            const grand = map.get(parts.slice(0, i - 1).join("."));
            grand && grand.childrens.push(stub);
          }
          parentBuilt = stub;
        } else {
          parentBuilt = map.get(ancestorPath) ?? null;
        }
      }
      return parentBuilt;
    };
    uxList.slice().forEach((ux) => {
      const uxId = this.normalizeFlatPath(ux.flatPath);
      const parts = uxId.split(".");
      const referenceId = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
      if (referenceId) {
        if (!map.has(referenceId)) ensureAncestors(uxId);
        const referenceUx = map.get(referenceId);
        if (referenceUx && referenceUx !== ux && !referenceUx.childrens.includes(ux)) referenceUx.childrens.push(ux);
        else if (!referenceUx) roots.push(ux);
      } else if (!roots.includes(ux)) {
        roots.push(ux);
      }
    });
    const sortFn = (a, b) => this.sortChildrens(a, b);
    roots.sort(sortFn);
    map.forEach((ux) => {
      ux.childrens.sort(sortFn);
      if (ux.childrens.length > 0) {
        ux.topology = "group";
        ux.hasChildren = true;
      }
    });
    return roots;
  }
  flattenTree(roots) {
    const result = [];
    const idMap = /* @__PURE__ */ new Map();
    const traverse = (nodes, referenceId) => {
      nodes.forEach((node, index: number) => {
        const oldId = this.normalizeFlatPath(node.flatPath);
        const newId = referenceId ? `${referenceId}.${index + 1}` : `${index + 1}`;
        if (oldId && oldId !== newId) idMap.set(oldId, newId);
        node.flatPath = newId;
        result.push(node);
        node.childrens.length && traverse(node.childrens, newId);
      });
    };
    traverse(roots, "");
    this.remapExpandedByIdMap(idMap);
    return result;
  }
  rebuildFlatTree(sort) {
    const cmp = sort ?? ((a, b) => this.sortChildrens(a, b));
    const list = this.List2RowsNodes;
    if (!list.length) return;
    const nodes = list.map((row) => {
      const key = this.normalizeFlatPath(row.flatPath);
      const parts = key.split(".");
      const parent = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
      return { row, key, parent, childrens: [] };
    });
    const byId = /* @__PURE__ */ new Map();
    nodes.forEach((n) => byId.set(n.key, n));
    const roots = [];
    nodes.forEach((n) => {
      const parentNode = n.parent ? byId.get(n.parent) : void 0;
      if (parentNode) parentNode.childrens.push(n);
      else roots.push(n);
    });
    const flat = [];
    const traverse = (arr) => {
      arr.sort((a, b) => cmp(a.row, b.row)).forEach((n) => {
        flat.push(n);
        traverse(n.childrens);
      });
    };
    traverse(roots);
    this.List2Rows = flat.map((n) => n.row);
  }
  oncommittreeorder(roots) {
    const result = [];
    const idMap = /* @__PURE__ */ new Map();
    const traverse = (nodes, referenceId) => {
      nodes.forEach((node, index: number) => {
        const oldId = this.normalizeFlatPath(node.flatPath);
        const newId = referenceId ? `${referenceId}.${index + 1}` : `${index + 1}`;
        if (oldId && oldId !== newId) idMap.set(oldId, newId);
        node.flatPath = newId;
        result.push(node);
        node.childrens.length && traverse(node.childrens, newId);
      });
    };
    traverse(roots, "");
    this.remapExpandedByIdMap(idMap);
    this.applyDomainSync(result, idMap);
    this.prepareTreeForSave(result, idMap);
  }
  applyDomainSync(flat, idMap) {
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
  remapExpandedByIdMap(idMap) {
    if (idMap.size === 0) return;
    const remap = (id) => idMap.get(id) ?? id;
    this._expandedFlatPaths = [...new Set(this._expandedFlatPaths.map(remap))];
    const sel = remap(this._selectedFlatPath);
    if (sel !== this._selectedFlatPath) this._selectedFlatPath = sel;
    const foc = remap(this._focusedFlatPath);
    if (foc !== this._focusedFlatPath) this._focusedFlatPath = foc;
  }
  prepareTreeForSave(flat, _idMap) {
    this.List2Rows = flat;
  }
  commitNodeForSave(node, _tree) {
    const fp = String(node.flatPath ?? "").trim();
    if (fp) this.customs?.setFlatPath?.(node, fp);
    return node;
  }
  commitTreeForSave(flat) {
    const getInit = this.customs?.getFlatPath;
    const remap = this.customs?.remapReferences;
    if (remap && getInit) {
      const idMap = /* @__PURE__ */ new Map();
      for (const node of flat) {
        const init = String(getInit(node) ?? "").trim();
        const curr = String(node.flatPath ?? "").trim();
        if (init && curr && init !== curr) idMap.set(init, curr);
      }
      if (idMap.size > 0) for (const node of flat) remap(node, idMap);
    }
    const next = [];
    for (const node of flat) next.push(this.commitNodeForSave(node, this));
    this.List2Rows = next;
  }
  commitFlatPaths() {
    this.oncommittreeorder(this.rootNodes);
    const flat = [];
    const walk = (nodes) => {
      for (const n of nodes) {
        flat.push(n);
        if (n.childrens?.length) walk(n.childrens);
      }
    };
    walk(this.rootNodes);
    this.commitTreeForSave(flat);
  }
  serializeRowToJSON(row) {
    if (row instanceof TObject) {
      const j = { ...row.toJSON(false) };
      delete j.childrens;
      return j;
    }
    return { ...row };
  }
  addNode(data, onDuplicate) {
    const node = this.toNode(data);
    if (this.findFlatNodeIndex(node) !== -1) return onDuplicate?.(node), null;
    this.List2Rows = [...this.List2RowsNodes, node];
    this.rebuildFlatTree();
    return node;
  }
  updateNode(data, mutate) {
    const node = this.toNode(data);
    const idx = this.findFlatNodeIndex(node);
    if (idx === -1) return false;
    const list = this.List2RowsNodes;
    if (mutate) mutate(list[idx], node);
    else Object.assign(list[idx], node);
    this.List2Rows = list;
    this.rebuildFlatTree();
    return true;
  }
  removeNode(data) {
    const sId = this.toNode(data).flatPath;
    if (!sId) return false;
    this.List2Rows = this.List2RowsNodes.filter((n) => n.flatPath !== sId && !n.flatPath.startsWith(sId + "."));
    this.rebuildFlatTree();
    return true;
  }
  onrefresh() {
    const getInit = this.customs?.getFlatPath;
    const initFn = getInit ? (obj) => this.normalizeFlatPath(String(getInit(obj) ?? "")) : void 0;
    const { result: rootsTree, pending } = this.withDeferredMaterialize(() => this.buildTree(this.List2Rows));
    const nextNodes = objRootsToNodes(rootsTree, initFn);
    this._treeNodes = [...nextNodes];
    this.flushPendingMaterialize(pending);
    this.notifyUI();
  }
  onstateupdate(ctx) {
    const prevReadonly = this.context.readonly;
    this.syncTreeViewBindState(ctx);
    Object.assign(this.context, ctx);
    const readonlyChanged = prevReadonly !== this.context.readonly;
    this.onchangecurso();
    this.onbranchexpand();
    this.onprocessobj();
    this.onupdate();
    this.onensurefirstselection();
    if (readonlyChanged) {
      this.syncAllRowAdapters();
    }
  }
  onupdate() {
    const nodesRef = this.rootNodes;
    if (nodesRef !== this.lastNodesRef) {
      this.onrefresh();
      this.lastNodesRef = this.rootNodes;
    }
  }
  onbranchexpand() {
    if (!this.rootNodes.length || this.didNodesExpand) return;
    this.expandedNodes = [...this.rootNodes];
    this.didNodesExpand = true;
  }
  onprocessobj() {
    const record = this.context.record ?? null;
    if (!record) return;
    const resolvedBranch = this.selectedNode ?? record;
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
  onchangecurso() {
    const objId = this.normalizeFlatPath(this.context.record?.flatPath);
    if (objId !== this.lastObjRefId) {
      this.lastObjRefId = objId;
      if (!this._expandedFlatPaths.length) this.didNodesExpand = false;
    }
  }
  onensurefirstselection() {
    if (this._selectedFlatPath || !this.rootNodes.length) return;
    const first = this.rootNodes[0];
    if (!first) return;
    this.applySelection(first);
  }
  syncTreeViewBindState(ctx) {
    if (!this.selectedNode && this.rootNodes.length) this.selectedNode = this.rootNodes[0];
    const adapterObj = this.record ?? null;
    const ctxObjId = this.normalizeFlatPath(ctx.record?.flatPath);
    const adapterObjId = this.normalizeFlatPath(adapterObj?.flatPath);
    if (ctxObjId !== adapterObjId) ctx.record = adapterObj;
    if (!this.focusedNode && this.selectedNode) this.focusedNode = this.selectedNode;
  }
  async onAfterCatalogModificar() {
    this._pendingInsertFlatPath = "";
    this._pendingExpandedSnapshot = [];
    this.onrefresh();
    this.syncAllRowAdapters();
  }
}
export {
  TATreeFlow
};
