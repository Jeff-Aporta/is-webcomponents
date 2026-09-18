var __defProp = Object.defineProperty;
var __defNormalProp = (obj: object, key: PropertyKey, value: unknown) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : (obj as Record<PropertyKey, unknown>)[key] = value;
var __publicField = (obj: object, key: PropertyKey, value: unknown) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { TTreeAdapterContext } from "./00-context.js";
import { asRecord, type TNode } from "./_types.js";

/**
 * TTreeAdapterContract — contrato vacío sobre `_TTreeAdapterContext`.
 *
 * Las firmas de los métodos vacíos (`toNode`, `createNode`, ...) están
 * declaradas con tipos concretos (no `any`) para que las subclases en
 * `03-tree-shape.ts` / `04-tree-flow.ts` puedan sobreescribirlas sin
 * encontrar incompatibilidades de tipo bajo strictNullChecks.
 *
 * Importante: este archivo NO está en lock de ningún WT. Cualquier WT puede
 * modificarlo mientras mantenga el contrato.
 */
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
    __publicField(this, "flashClearTimer", 0);
    __publicField(this, "flashErrorClearTimer", 0);
  }
  getReferenceFlatPath(node: TNode): string {
    const id = String(node.flatPath ?? "").trim();
    const idx = id.lastIndexOf(".");
    return idx >= 0 ? id.slice(0, idx) : "";
  }
  addUiListener(fn: () => void): () => void {
    this._uiListeners.push(fn);
    return () => {
      this._uiListeners = this._uiListeners.filter((l) => l !== fn);
    };
  }
  notifyUI(): void {
    this.uiTick++;
    for (const fn of this._uiListeners) fn();
    void asRecord;
  }
  override onstateupdate(ctx: Record<string, unknown>): void {
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
  getVisibleFlatPaths(nodes: TNode[], expandedSet: Set<string>): string[] {
    const ids: string[] = [];
    const walk = (list: TNode[]): void => {
      for (const node of list) {
        ids.push(node.flatPath);
        if (node.childrens?.length && expandedSet.has(node.flatPath)) walk(node.childrens);
      }
    };
    walk(nodes);
    return ids;
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  toNode(_obj: Partial<TNode> | TNode | null | undefined, _isCopy?: boolean): TNode | null {
    return null;
  }
  onrefresh(): void {
    /* provided by TATreeFlow */
  }
  /** Stub: las subclases (`TATreeFlow`) sobreescriben con lógica real. */
  applySelection(_obj: TNode | null | undefined): void {
    /* provided by TAView */
  }
  /** Stub: las subclases (`TAView`) sobreescriben con lógica real. */
  resyncExpandedToCurrentTree(): void {
    /* provided by TAView */
  }
  /** Stub: las subclases (`TAView`) sobreescriben con lógica real. */
  syncAllRowAdapters(): void {
    /* provided by TARowBase */
  }
  /** Stub: las subclases (`TARowBase`) sobreescriben con lógica real. */
  syncRowAdaptersByFlatPaths(_ids: readonly string[]): void {
    /* provided by TARowBase */
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  createNode(data: Partial<TNode> | TNode): TNode | null {
    void data;
    return null;
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  get List2Rows(): TNode[] {
    return [];
  }
  /** Stub: las subclases (`TATreeShape`) sobreescriben con lógica real. */
  set List2Rows(_value: TNode[]) {
    /* provided by TATreeShape */
  }
  getEditAttrsForLevel(
    driverAttrs: Record<string, unknown>,
    _plan?: TNode,
  ): Record<string, unknown> {
    return driverAttrs;
  }
  canEditSelectResource(
    plan: TNode | null | undefined,
    draft: TNode | null | undefined,
  ): boolean {
    return !!plan?.isAtom || !!draft?.isAtom;
  }
}
export {
  TTreeAdapterContract
};
