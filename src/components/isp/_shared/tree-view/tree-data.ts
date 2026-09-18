type _NodeAny = Record<string, unknown> & { flatPath: string; childrens?: _NodeAny[]; topology?: unknown; containment?: unknown; mobility?: unknown; pathInit?: unknown; f?: _NodeAny };
type _TreeRoot = _NodeAny & { childrens: _NodeAny[]; flatPath?: string };

/** Constructor genérico que `TreeNode(Base)` acepta. */
type _TreeBaseCtor = new (...args: unknown[]) => Record<string, unknown>;

/** Spec mínimo de los `groups` que pinta `groupedWithSeparators`. */
type _GroupEntry = { separator?: boolean; [key: string]: unknown };

/** Self shape de los getters de NODE_DIM_DESCRIPTORS. */
interface _DecoratedSelf {
  topology?: string;
  containment?: string;
  mobility?: string;
  childrens?: unknown[];
}

const NODE_DECORATED = /* @__PURE__ */ new WeakSet<object>();
const NODE_DIM_DESCRIPTORS: Record<string, PropertyDescriptor> = {
  isAtom: { get() {
      const self = this as unknown as _DecoratedSelf;
      return self.topology === "atom";
    }, configurable: true },
  isGroupActor: { get() {
      const self = this as unknown as _DecoratedSelf;
      return (self.topology ?? "group") === "group";
    }, configurable: true },
  isPrison: { get() {
      const self = this as unknown as _DecoratedSelf;
      return self.topology !== "atom" && self.containment === "prison";
    }, configurable: true },
  isHermetic: { get() {
      const self = this as unknown as _DecoratedSelf;
      return self.topology !== "atom" && self.containment === "hermetic";
    }, configurable: true },
  isCell: { get() {
      const self = this as unknown as _DecoratedSelf;
      return self.topology !== "atom" && (self.containment ?? "cell") === "cell";
    }, configurable: true },
  isUnanchored: { get() {
      const self = this as unknown as _DecoratedSelf;
      return (self.mobility ?? "unanchored") === "unanchored";
    }, configurable: true },
  isFreezer: { get() {
      const self = this as unknown as _DecoratedSelf;
      return self.mobility === "freezer";
    }, configurable: true },
  isEmpty: {
    get() {
      const self = this as unknown as _DecoratedSelf;
      if (self.topology === "atom") return true;
      return !self.childrens || self.childrens.length === 0;
    },
    configurable: true
  }
};
function decorateAsNode(rec: _NodeAny, init: { flatPath: string; pathInit: string; childrens: _NodeAny[] }): _NodeAny {
  const r = rec;
  r.flatPath = init.flatPath;
  // pathInit congelado: no pisar si el registro ya lo tenía (reordenar no cambia identidad DOM)
  r.pathInit = String(r.pathInit ?? "").trim() || init.pathInit;
  r.childrens = init.childrens;
  if (!NODE_DECORATED.has(rec)) {
    NODE_DECORATED.add(rec);
    Object.defineProperties(rec, NODE_DIM_DESCRIPTORS);
  }
  return r;
}
function objRootsToNodes(roots: _TreeRoot[], pathInitFn?: (node: _NodeAny) => unknown): _NodeAny[] {
  return roots.map((r) => {
    const rawFlatPath = String(r.flatPath || "").replace(/^(_UP_|_M_)/, "").trim() || String(r.flatPath || "");
    const injected = pathInitFn ? String(pathInitFn(r) ?? "").trim() : "";
    const rawPathInit = String(r.pathInit ?? "").trim() || injected || rawFlatPath;
    const childrenArr: _NodeAny[] = r.childrens;
    return decorateAsNode(r, {
      flatPath: rawFlatPath,
      pathInit: rawPathInit,
      childrens: childrenArr.length ? objRootsToNodes(childrenArr as _TreeRoot[], pathInitFn) : []
    });
  });
}
function groupedWithSeparators(groups: ReadonlyArray<_GroupEntry | _GroupEntry[] | false | null | undefined>): _GroupEntry[] {
  const result: _GroupEntry[] = [];
  for (const group of groups) {
    if (!group) continue;
    const items = (Array.isArray(group) ? group : [group]).filter(Boolean) as _GroupEntry[];
    if (items.length === 0) continue;
    if (result.length > 0) result.push({ separator: true });
    result.push(...items);
  }
  return result;
}
function TreeNode(Base: _TreeBaseCtor) {
  class C extends Base {
    /** Bag de flags (mapeo 1:1 al objeto plano de BD). */
    declare f: _NodeAny;
    get depth(): unknown {
      return this.f.depth;
    }
    set depth(v: unknown) {
      this.f.depth = v;
    }
    get isSelected(): unknown {
      return this.f.isSelected;
    }
    set isSelected(v: unknown) {
      this.f.isSelected = v;
    }
    get hasChildren(): unknown {
      return this.f.hasChildren;
    }
    set hasChildren(v: unknown) {
      this.f.hasChildren = v;
    }
    get isCollapsed(): unknown {
      return this.f.isCollapsed;
    }
    set isCollapsed(v: unknown) {
      this.f.isCollapsed = v;
    }
    get flatPath(): string {
      return String(this.f.flatPath ?? "").trim();
    }
    set flatPath(v: string | null | undefined) {
      const flat = String(v ?? "").trim();
      this.f.flatPath = flat;
      if (this.f.pathInit == null || this.f.pathInit === "") this.f.pathInit = flat;
    }
    get pathInit(): string {
      return String(this.f.pathInit ?? "").trim();
    }
    set pathInit(v: string | null | undefined) {
      const next = String(v ?? "").trim() || String(this.f.flatPath ?? "");
      if (this.f.pathInit == null || this.f.pathInit === "") this.f.pathInit = next;
    }
    get topology(): unknown {
      return this.f.topology;
    }
    set topology(v: unknown) {
      this.f.topology = v;
    }
    get containment(): unknown {
      return this.f.containment;
    }
    set containment(v: unknown) {
      this.f.containment = v;
    }
    get mobility(): unknown {
      return this.f.mobility;
    }
    set mobility(v: unknown) {
      this.f.mobility = v;
    }
    get freeze(): unknown {
      return this.f.freeze;
    }
    set freeze(v: unknown) {
      this.f.freeze = v;
    }
    get isAtom(): boolean {
      return this.topology === "atom";
    }
    get isGroupActor(): boolean {
      return (this.topology ?? "group") === "group";
    }
    get isPrison(): boolean {
      return !this.isAtom && this.containment === "prison";
    }
    get isHermetic(): boolean {
      return !this.isAtom && this.containment === "hermetic";
    }
    get isCell(): boolean {
      return !this.isAtom && (this.containment ?? "cell") === "cell";
    }
    get isUnanchored(): boolean {
      return (this.mobility ?? "unanchored") === "unanchored";
    }
    get isFreezer(): boolean {
      return this.mobility === "freezer";
    }
    get isEmpty(): boolean {
      if (this.isAtom) return true;
      const children = this.f.childrens;
      return !children || children.length === 0;
    }
    get childrens(): unknown {
      return this.f.childrens;
    }
    set childrens(v: unknown) {
      this.f.childrens = (Array.isArray(v) ? v : []) as _NodeAny[];
    }
    recomputeHasChildren(siblings: unknown[] | null | undefined, getPath: (item: unknown) => unknown): void {
      const myId = this.flatPath;
      const myPrefix = myId + ".";
      const list = siblings ?? [];
      for (const item of list) {
        const pid = String(getPath(item) ?? "").trim();
        if (!pid) continue;
        const idxDot = pid.lastIndexOf(".");
        const parentId = idxDot >= 0 ? pid.slice(0, idxDot) : "";
        if (parentId === myId || myId === "" && !pid.includes(".") || pid.startsWith(myPrefix)) {
          this.hasChildren = true;
          return;
        }
      }
      this.hasChildren = false;
    }
  }
  return C;
}
export {
  TreeNode,
  groupedWithSeparators,
  objRootsToNodes
};
