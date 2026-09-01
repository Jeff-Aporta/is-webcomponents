var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const _TTreeAdapterContext = class _TTreeAdapterContext {
  constructor(props, restProps, syncProps) {
    __publicField(this, "context");
    __publicField(this, "treeRootId", `tree-${++_TTreeAdapterContext._rootIdSeq}`);
    __publicField(this, "bshowFrm", false);
    __publicField(this, "bLostFocus", false);
    __publicField(this, "_selectedFlatPath", "");
    __publicField(this, "_focusedFlatPath", "");
    __publicField(this, "_hoveredFlatPath", "");
    __publicField(this, "record", null);
    __publicField(this, "_pendingDeleteFlatPath", "");
    __publicField(this, "_pendingDeleteSnapshot", null);
    __publicField(this, "_lastProcessedObj", null);
    __publicField(this, "_expandedFlatPaths", []);
    __publicField(this, "_treeNodes", []);
    __publicField(this, "bcanMoveOutside", true);
    this.context = { ...props, ...restProps ?? {}, ...syncProps ?? {} };
  }
  onstateupdate(ctx) {
    Object.defineProperties(this.context, Object.getOwnPropertyDescriptors(ctx));
  }
  get disabled() {
    return !!this.context.disabled;
  }
  set disabled(value) {
    this.context.disabled = !!value;
  }
  get selectedNode() {
    return this.findNodeByFlatPath(this._selectedFlatPath);
  }
  set selectedNode(value) {
    this._selectedFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get focusedNode() {
    return this.findNodeByFlatPath(this._focusedFlatPath);
  }
  set focusedNode(value) {
    this._focusedFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get hoveredNode() {
    return this.findNodeByFlatPath(this._hoveredFlatPath);
  }
  set hoveredNode(value) {
    this._hoveredFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get rootNodes() {
    return this._treeNodes;
  }
  get treeNodes() {
    return this._treeNodes;
  }
  set treeNodes(value) {
    this._treeNodes = value;
  }
  get expandedNodes() {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const id of this._expandedFlatPaths) {
      if (!id || seen.has(id)) continue;
      const node = this.findNodeByFlatPath(id);
      if (node) {
        seen.add(id);
        out.push(node);
      }
    }
    return out;
  }
  set expandedNodes(value) {
    const seen = /* @__PURE__ */ new Set();
    const ids = [];
    for (const node of value || []) {
      const id = this.normalizeFlatPath(node?.flatPath);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    this._expandedFlatPaths = ids;
  }
  get expandedFlatPaths() {
    return [...this._expandedFlatPaths];
  }
  set expandedFlatPaths(value) {
    const seen = /* @__PURE__ */ new Set();
    const ids = [];
    for (const raw of value || []) {
      const id = this.normalizeFlatPath(raw);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    this._expandedFlatPaths = ids;
  }
  get isReadOnly() {
    return !!this.context.readonly;
  }
  get canMutate() {
    return !this.isReadOnly;
  }
  get canCreate() {
    return this.context.bAllowed?.Crear ?? true;
  }
  get canModify() {
    return this.context.bAllowed?.Modificar ?? true;
  }
  get canDelete() {
    return this.context.bAllowed?.Eliminar ?? true;
  }
  get draggable() {
    return this.context.draggable !== false;
  }
  normalizeFlatPath(_id) {
    return "";
  }
  findNodeByFlatPath(_id, _branches) {
    return null;
  }
};
__publicField(_TTreeAdapterContext, "_rootIdSeq", 0);
let TTreeAdapterContext = _TTreeAdapterContext;
export {
  TTreeAdapterContext
};
