const NODE_DECORATED = /* @__PURE__ */ new WeakSet();
const NODE_DIM_DESCRIPTORS = {
  isAtom: { get() {
    return this.topology === "atom";
  }, configurable: true },
  isGroupActor: { get() {
    return (this.topology ?? "group") === "group";
  }, configurable: true },
  isPrison: { get() {
    return this.topology !== "atom" && this.containment === "prison";
  }, configurable: true },
  isHermetic: { get() {
    return this.topology !== "atom" && this.containment === "hermetic";
  }, configurable: true },
  isCell: { get() {
    return this.topology !== "atom" && (this.containment ?? "cell") === "cell";
  }, configurable: true },
  isUnanchored: { get() {
    return (this.mobility ?? "unanchored") === "unanchored";
  }, configurable: true },
  isFreezer: { get() {
    return this.mobility === "freezer";
  }, configurable: true },
  isEmpty: {
    get() {
      if (this.topology === "atom") return true;
      return !this.childrens || this.childrens.length === 0;
    },
    configurable: true
  }
};
function decorateAsNode(rec, init) {
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
function objRootsToNodes(roots, pathInitFn) {
  return roots.map((r) => {
    const rawFlatPath = String(r.flatPath || "").replace(/^(_UP_|_M_)/, "").trim() || String(r.flatPath || "");
    const injected = pathInitFn ? String(pathInitFn(r) ?? "").trim() : "";
    const rawPathInit = String(r.pathInit ?? "").trim() || injected || rawFlatPath;
    return decorateAsNode(r, {
      flatPath: rawFlatPath,
      pathInit: rawPathInit,
      childrens: r.childrens.length ? objRootsToNodes(r.childrens, pathInitFn) : []
    });
  });
}
function groupedWithSeparators(groups) {
  const result = [];
  for (const group of groups) {
    if (!group) continue;
    const items = (Array.isArray(group) ? group : [group]).filter(Boolean);
    if (items.length === 0) continue;
    if (result.length > 0) result.push({ separator: true });
    result.push(...items);
  }
  return result;
}
function TreeNode(Base) {
  class C extends Base {
    get depth() {
      return this.f.depth;
    }
    set depth(v) {
      this.f.depth = v;
    }
    get isSelected() {
      return this.f.isSelected;
    }
    set isSelected(v) {
      this.f.isSelected = v;
    }
    get hasChildren() {
      return this.f.hasChildren;
    }
    set hasChildren(v) {
      this.f.hasChildren = v;
    }
    get isCollapsed() {
      return this.f.isCollapsed;
    }
    set isCollapsed(v) {
      this.f.isCollapsed = v;
    }
    get flatPath() {
      return String(this.f.flatPath ?? "").trim();
    }
    set flatPath(v) {
      var _a;
      this.f.flatPath = String(v ?? "").trim();
      (_a = this.f).pathInit ?? (_a.pathInit = this.f.flatPath);
    }
    get pathInit() {
      return String(this.f.pathInit ?? "").trim();
    }
    set pathInit(v) {
      var _a;
      (_a = this.f).pathInit ?? (_a.pathInit = String(v ?? "").trim() || this.f.flatPath);
    }
    get topology() {
      return this.f.topology;
    }
    set topology(v) {
      this.f.topology = v;
    }
    get containment() {
      return this.f.containment;
    }
    set containment(v) {
      this.f.containment = v;
    }
    get mobility() {
      return this.f.mobility;
    }
    set mobility(v) {
      this.f.mobility = v;
    }
    get freeze() {
      return this.f.freeze;
    }
    set freeze(v) {
      this.f.freeze = v;
    }
    get isAtom() {
      return this.topology === "atom";
    }
    get isGroupActor() {
      return (this.topology ?? "group") === "group";
    }
    get isPrison() {
      return !this.isAtom && this.containment === "prison";
    }
    get isHermetic() {
      return !this.isAtom && this.containment === "hermetic";
    }
    get isCell() {
      return !this.isAtom && (this.containment ?? "cell") === "cell";
    }
    get isUnanchored() {
      return (this.mobility ?? "unanchored") === "unanchored";
    }
    get isFreezer() {
      return this.mobility === "freezer";
    }
    get isEmpty() {
      if (this.isAtom) return true;
      const children = this.f.childrens;
      return !children || children.length === 0;
    }
    get childrens() {
      return this.f.childrens;
    }
    set childrens(v) {
      this.f.childrens = v ?? [];
    }
    recomputeHasChildren(siblings, getPath) {
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
