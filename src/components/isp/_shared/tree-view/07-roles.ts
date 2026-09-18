import { TAHistory } from "./06b-history.js";
import { TNode, TRecord } from "./_types.js";
import type { TreeActionSpec } from "./_types.js";

interface TARolesInternals {
  onrowdelete(node: TNode): void;
}

class TARoles extends TAHistory {
  get groupTypes(): string[] {
    return [];
  }
  get actionTypes(): string[] {
    return [];
  }
  allowsChildEscape(node: TNode): boolean {
    if (node.isHermetic) return false;
    if (node.isFreezer) return false;
    return true;
  }
  getAncestors(node: TNode): Iterable<TNode> {
    return this.walkAncestors(node);
  }
  actorActions(node: TNode): TreeActionSpec[] {
    const out: TreeActionSpec[] = [];
    if (node.isAtom) return out;
    if (node.isPrison && !node.isHermetic) {
      const readOnly = !this.canMutate;
      out.push({
        icon: "mdi:exit-run",
        title: "Liberar (los hijos toman su lugar conservando el orden)",
        color: "neutral",
        disabled: readOnly || undefined,
        onClick: () => {
          if (!readOnly) this.onrelease(node);
        },
      });
    }
    return out;
  }
  resume(node: TNode): TNode {
    return { ...node, ...this.cloneNodeData(node) };
  }
  cloneNodeData(data: TNode & { clone?: () => unknown }): Partial<TNode> {
    const fn = data.clone;
    if (typeof fn === "function") return fn.call(data) as Partial<TNode>;
    return { ...data };
  }
  onrelease(_node: TNode): void {
  }
  extinguishNode(record: TRecord): void {
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
    (this as unknown as TARolesInternals).onrowdelete(node);
  }
  promoteChildrenAndDelete(_node: TNode): void {
    (this as unknown as TARolesInternals).onrowdelete(_node);
  }
  isActionGrouper(node: TNode): boolean {
    const t = (node as unknown as { type?: string }).type;
    const list = this.actionTypes;
    if (!t || list.length === 0) return !!node.isGroupActor;
    return list.includes(t);
  }
  isGrouper(node: TNode): boolean {
    if (node.isGroupActor) return true;
    const t = (node as unknown as { type?: string }).type;
    const list = this.groupTypes;
    if (list.length > 0) return !!t && list.includes(t);
    return !node.isAtom;
  }
  isFrozen(node: TNode): boolean {
    for (const anc of this.getAncestors(node)) {
      if (anc.isFreezer) return true;
    }
    return !!node.freeze;
  }
  canAddChild(_node: TNode): boolean {
    return true;
  }
}
export {
  TARoles
};
