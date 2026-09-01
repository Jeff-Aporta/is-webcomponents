import { TAHistory } from "./06b-history.js";
class TARoles extends TAHistory {
  get groupTypes() {
    return [];
  }
  get actionTypes() {
    return [];
  }
  allowsChildEscape(node) {
    if (node.isHermetic) return false;
    if (node.isFreezer) return false;
    return true;
  }
  getAncestors(node) {
    return this.walkAncestors(node);
  }
  actorActions(node) {
    const out = [];
    if (node.isAtom) return out;
    if (node.isPrison && !node.isHermetic) {
      const readOnly = !this.canMutate;
      out.push({
        icon: "mdi:exit-run",
        title: "Liberar (los hijos toman su lugar conservando el orden)",
        color: "neutral",
        disabled: readOnly || void 0,
        onClick: () => {
          if (!readOnly) this.onrelease(node);
        }
      });
    }
    return out;
  }
  resume(node) {
    return { ...node, ...this.cloneNodeData(node) };
  }
  cloneNodeData(data) {
    const fn = data.clone;
    if (typeof fn === "function") return fn.call(data);
    return { ...data };
  }
  onrelease(_node) {
  }
  extinguishNode(record) {
    const id = this.normalizeFlatPath(String(record?.flatPath ?? ""));
    const node = id ? this.findNodeByFlatPath(id) : null;
    if (!node) return;
    if (node.isPrison && !node.isHermetic) {
      this.onrelease(node);
      return;
    }
    if (node.isCell) {
      this.promoteChildrenAndDelete(node);
      return;
    }
    this.onrowdelete(node);
  }
  promoteChildrenAndDelete(_node) {
    this.onrowdelete(_node);
  }
  isActionGrouper(node) {
    const t = node.type;
    const list = this.actionTypes;
    if (!t || list.length === 0) return !!node.isGroupActor;
    return list.includes(t);
  }
  isGrouper(node) {
    if (node.isGroupActor) return true;
    const t = node.type;
    const list = this.groupTypes;
    if (list.length > 0) return !!t && list.includes(t);
    return !node.isAtom;
  }
  isFrozen(node) {
    for (const anc of this.getAncestors(node)) {
      if (anc.isFreezer) return true;
    }
    return !!node.freeze;
  }
  canAddChild(_node) {
    return true;
  }
}
export {
  TARoles
};
