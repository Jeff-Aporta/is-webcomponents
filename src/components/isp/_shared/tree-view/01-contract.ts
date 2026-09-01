var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { TTreeAdapterContext } from "./00-context.js";
class TTreeAdapterContract extends TTreeAdapterContext {
  constructor() {
    super(...arguments);
    __publicField(this, "disabledNodes", []);
    __publicField(this, "flashFlatPaths", []);
    __publicField(this, "flashErrorFlatPaths", []);
    __publicField(this, "didNodesExpand", false);
    __publicField(this, "currentNode", null);
    __publicField(this, "lastProcessedNode", null);
    __publicField(this, "rowAdapters", /* @__PURE__ */ new Map());
    __publicField(this, "uiTick", 0);
    __publicField(this, "_uiListeners", []);
    __publicField(this, "lastNodesRef", []);
    __publicField(this, "lastObjRefId", "");
    __publicField(this, "flashClearTimer");
    __publicField(this, "flashErrorClearTimer");
  }
  getReferenceFlatPath(node) {
    const id = String(node.flatPath ?? "").trim();
    const idx = id.lastIndexOf(".");
    return idx >= 0 ? id.slice(0, idx) : "";
  }
  addUiListener(fn) {
    this._uiListeners.push(fn);
    return () => {
      this._uiListeners = this._uiListeners.filter((l) => l !== fn);
    };
  }
  notifyUI() {
    this.uiTick++;
    for (const fn of this._uiListeners) fn();
  }
  onstateupdate(ctx) {
    const prevReadonly = !!this.context.readonly;
    const prevDisabled = !!this.context.disabled;
    const prevDraggable = this.context.draggable !== false;
    super.onstateupdate(ctx);
    const nextReadonly = !!this.context.readonly;
    const nextDisabled = !!this.context.disabled;
    const nextDraggable = this.context.draggable !== false;
    if (prevReadonly !== nextReadonly || prevDisabled !== nextDisabled || prevDraggable !== nextDraggable) {
      this.notifyUI();
    }
  }
  getVisibleFlatPaths(nodes, expandedSet) {
    const ids = [];
    const walk = (list) => {
      for (const node of list) {
        ids.push(node.flatPath);
        if (node.childrens?.length && expandedSet.has(node.flatPath)) walk(node.childrens);
      }
    };
    walk(nodes);
    return ids;
  }
  toNode(_obj, _isCopy) {
    return null;
  }
  onrefresh() {
  }
  applySelection(_obj) {
  }
  resyncExpandedToCurrentTree() {
  }
  syncAllRowAdapters() {
  }
  syncRowAdaptersByFlatPaths(_ids) {
  }
  createNode(_data) {
    return null;
  }
  get List2Rows() {
    return [];
  }
  set List2Rows(_value) {
  }
  getEditAttrsForLevel(driverAttrs, _plan) {
    return driverAttrs;
  }
  canEditSelectResource(plan, draft) {
    return !!plan?.isAtom || !!draft?.isAtom;
  }
}
export {
  TTreeAdapterContract
};
