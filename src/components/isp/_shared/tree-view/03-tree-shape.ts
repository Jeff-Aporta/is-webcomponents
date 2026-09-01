var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { TObject, capitalizar } from "./helpers.js";
import { TAModel } from "./02-model.js";
class TATreeShape extends TAModel {
  constructor() {
    super(...arguments);
    __publicField(this, "_customs");
    __publicField(this, "_pendingMaterialize", null);
  }
  get customs() {
    return this._customs;
  }
  set customs(value) {
    if (this._customs === value) return;
    this._customs = value;
    this.notifyUI();
  }
  get entrie() {
    const level = this._customs?.levelName?.({ depth: Number(this.record?.depth ?? 0) });
    return capitalizar(String(level || this._customs?.entrie || "").trim());
  }
  get entries() {
    return this._customs?.entries ?? "";
  }
  siblingsOf(node) {
    const id = this.normalizeFlatPath(node.flatPath);
    if (!id) return [];
    const parentRef = this.findReferenceBranchInTree(this.rootNodes, id);
    return parentRef ? parentRef.childrens ?? [] : this.rootNodes;
  }
  async runCustomsPreSubmit() {
    const hook = this.customs?.updateNode;
    const runtime = hook ? this.buildCustomsRuntime() : null;
    const walk = async (nodes) => {
      for (const node of nodes) {
        if (hook && runtime) await hook(node, false, runtime);
        if (node.childrens?.length) await walk(node.childrens);
      }
    };
    await walk(this.rootNodes);
    this.commitFlatPaths();
  }
  currPathByInit(pathInit) {
    const needle = this.normalizeFlatPath(pathInit);
    if (!needle) return "";
    const byInit = this.findNodeByPathInit(needle);
    if (byInit) return this.normalizeFlatPath(byInit.flatPath);
    return needle;
  }
  prepareGetNode(data) {
    return data;
  }
  isNodeInstance(data) {
    const d = data;
    return typeof d?.flatPath === "string" && Array.isArray(d?.childrens);
  }
  createNode(data) {
    const partial = data;
    if (this.isNodeInstance(partial)) return partial;
    if (this.customs?.newItem) return this.customs.newItem(partial);
    const Klass = this.customs?.klass;
    if (Klass) {
      const item2 = this.safeAssign(new Klass(), partial);
      const flatPath2 = String(partial?.flatPath ?? this.customs?.getFlatPath?.(item2) ?? "").trim();
      if (flatPath2) {
        item2.flatPath = flatPath2;
        this.customs?.setFlatPath?.(item2, flatPath2);
      }
      return item2;
    }
    const item = { ...partial };
    if (!Array.isArray(item.childrens)) {
      item.childrens = [];
    }
    const flatPath = String(partial?.flatPath ?? this.customs?.getFlatPath?.(item) ?? "").trim();
    if (flatPath) {
      item.flatPath = flatPath;
      this.customs?.setFlatPath?.(item, flatPath);
    }
    return item;
  }
  safeAssign(target, source) {
    if (!source) return target;
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (value === void 0) continue;
      if (this.isAssignableProperty(target, key)) {
        try {
          target[key] = value;
        } catch {
        }
      }
    }
    return target;
  }
  isAssignableProperty(target, key) {
    let proto = target;
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
  getList2RowsSource() {
    if (this.customs?.list) {
      const l = this.customs.list();
      return l ?? null;
    }
    const raw = this.context.List2Rows;
    return Array.isArray(raw) ? raw : null;
  }
  get List2Rows() {
    return this.getList2RowsSource() ?? [];
  }
  set List2Rows(value) {
    const target = this.getList2RowsSource();
    if (!target) return;
    while (target.length > 0) target.pop();
    for (const item of value) target.push(item);
  }
  prepareLastLevelNodeData(baseData, _record) {
    return baseData;
  }
  invokeUpdateNode(node, isNew) {
    const fn = this.customs?.updateNode;
    if (!fn) return;
    if (!isNew && this._pendingMaterialize) {
      this._pendingMaterialize.push(node);
      return;
    }
    void fn(node, isNew, this.buildCustomsRuntime());
  }
  withDeferredMaterialize(fn) {
    const prev = this._pendingMaterialize;
    this._pendingMaterialize = [];
    let result;
    try {
      result = fn();
    } finally {
    }
    const pending = this._pendingMaterialize ?? [];
    this._pendingMaterialize = prev;
    return { result, pending };
  }
  flushPendingMaterialize(nodes) {
    const fn = this.customs?.updateNode;
    if (!fn) return;
    const runtime = this.buildCustomsRuntime();
    for (const node of nodes) void fn(node, false, runtime);
  }
  materializeNode(data) {
    const node = this.createNode(data);
    this.applyDomainDefaults(node);
    this.invokeUpdateNode(node, false);
    return node;
  }
  applyDomainDefaults(node) {
    const flatPath = String(node.flatPath ?? "").trim();
    if (!flatPath) return;
    const depth = (flatPath.match(/\./g) || []).length;
    if (this.isAssignableProperty(node, "depth")) node.depth = depth;
    if (!node.topology && this.isAssignableProperty(node, "topology")) node.topology = "group";
    if (this.isAssignableProperty(node, "hasChildren")) node.hasChildren = this.computeNodeHasChildren(flatPath);
  }
  computeNodeHasChildren(flatPath) {
    const list = this.List2Rows ?? [];
    const myPrefix = flatPath + ".";
    for (const item of list) {
      if (!item) continue;
      const pid = String(item.flatPath ?? item.iplan ?? "").trim();
      if (!pid) continue;
      const idxDot = pid.lastIndexOf(".");
      const parentId = idxDot >= 0 ? pid.slice(0, idxDot) : "";
      if (parentId === flatPath || flatPath === "" && !pid.includes(".")) return true;
      if (pid.startsWith(myPrefix)) return true;
    }
    return false;
  }
  toNode(data, clone = false) {
    const src = clone ? data instanceof TObject ? data.clone() : structuredClone(data) : data;
    if (!clone && this.isNodeInstance(src)) return src;
    const prepared = this.prepareGetNode(src);
    return this.materializeNode(this.safeAssign(new TObject(), prepared));
  }
  normalizeFlatPath(id: string) {
    if (id === void 0 || id === null) return "";
    return String(id).replace(/^(_UP_|_M_)/, "").trim();
  }
  findNodeByFlatPath(id, branches = this.rootNodes) {
    const needle = this.normalizeFlatPath(id);
    if (needle.length === 0) return null;
    for (const branch of branches) {
      if (this.normalizeFlatPath(branch.flatPath) === needle) return branch;
      if (branch.childrens?.length) {
        const found = this.findNodeByFlatPath(needle, branch.childrens);
        if (found) return found;
      }
    }
    return null;
  }
  findNodeByPathInit(pathInit, branches = this.rootNodes) {
    const needle = this.normalizeFlatPath(pathInit);
    if (needle.length === 0) return null;
    for (const branch of branches) {
      if (this.normalizeFlatPath(branch.pathInit) === needle) return branch;
      if (branch.childrens?.length) {
        const found = this.findNodeByPathInit(needle, branch.childrens);
        if (found) return found;
      }
    }
    return null;
  }
  findFlatNodeIndex(item) {
    const list = this.List2RowsNodes;
    if (!list.length) return -1;
    const sId = this.normalizeFlatPath(item.flatPath);
    return list.findIndex((n) => this.normalizeFlatPath(n.flatPath) === sId);
  }
  findNode(data) {
    const sId = this.normalizeFlatPath(this.toNode(data).flatPath);
    if (!sId) return void 0;
    return this.List2RowsNodes.find((n) => this.normalizeFlatPath(n.flatPath) === sId);
  }
  findBranchByObject(branches, objRow) {
    for (const branch of branches) {
      if (branch === objRow) return branch;
      if (branch.childrens?.length) {
        const foundBranch = this.findBranchByObject(branch.childrens, objRow);
        if (foundBranch) return foundBranch;
      }
    }
    return null;
  }
  findReferenceBranchInTree(branches, childId, referenceBranch = null) {
    const needle = this.normalizeFlatPath(childId);
    for (const branch of branches) {
      if (this.normalizeFlatPath(branch.flatPath) === needle) return referenceBranch;
      if (branch.childrens?.length) {
        const inner = this.findReferenceBranchInTree(branch.childrens, childId, branch);
        if (inner !== null) return inner;
      }
    }
    return null;
  }
  getNodeByFlatPath(nodeId) {
    const node = this.findNodeByFlatPath(nodeId);
    return node ?? void 0;
  }
  isPendingInsertPath(flatPath) {
    const norm = this.normalizeFlatPath(flatPath);
    if (!norm) return false;
    return this.normalizeFlatPath(this._pendingInsertFlatPath) === norm;
  }
  getSiblingPosition(nodeId) {
    const branches = this.rootNodes;
    const n = this.normalizeFlatPath(nodeId);
    if (!branches?.length || n.length === 0) return { isFirst: false, isLast: false };
    const referenceBranch = this.findReferenceBranchInTree(branches, n);
    const siblings = referenceBranch ? referenceBranch.childrens ?? [] : branches;
    const idx = siblings.findIndex((ch) => this.normalizeFlatPath(ch.flatPath) === n);
    return { isFirst: idx === 0, isLast: idx === siblings.length - 1 };
  }
  walkAncestors(node) {
    const out = [];
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
  isDescendant(candidate, ancestor) {
    const aid = this.normalizeFlatPath(ancestor.flatPath);
    const cid = this.normalizeFlatPath(candidate.flatPath);
    return cid === aid || cid.startsWith(aid + ".");
  }
  collectBranchAndLeafIds(branch) {
    const out = [branch.flatPath];
    branch.childrens?.forEach((leafOrBranch) => out.push(...this.collectBranchAndLeafIds(leafOrBranch)));
    return out;
  }
  collectBranchIds(branches = this.rootNodes) {
    const out = [];
    for (const branch of branches) {
      if (branch.childrens?.length) out.push(branch.flatPath, ...this.collectBranchIds(branch.childrens));
    }
    return out;
  }
}
export {
  TATreeShape
};
