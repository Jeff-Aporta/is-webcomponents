var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { resolveColor } from "./helpers.js";
import { TreeRowAdapter } from "./row-adapter.js";
import { TARoles } from "./07-roles.js";
class TARowBase extends TARoles {
  constructor() {
    super(...arguments);
    __publicField(this, "_adapterConfig", {});
    __publicField(this, "_lastFocusedFlatPath", "");
    __publicField(this, "currentDragFlatPath", "");
    __publicField(this, "_autoExpandedSeen", /* @__PURE__ */ new Set());
    __publicField(this, "consumeronrowfocus");
    __publicField(this, "consumeronrowreorder");
    __publicField(this, "_bridgeCallStats", /* @__PURE__ */ new Map());
  }
  filterRowActions(cfg, frozen) {
    const keep = (item) => {
      if (!item || typeof item !== "object") return !!item;
      const btn = item;
      if (cfg?.isFirst && btn.icon === "mdi:arrow-up") return false;
      if (cfg?.isLast && btn.icon === "mdi:arrow-down") return false;
      if (frozen && (btn.icon === "mdi:arrow-up" || btn.icon === "mdi:arrow-down")) return false;
      return true;
    };
    const out = [];
    for (const entry of cfg?.actions ?? []) {
      if (!entry) continue;
      if (Array.isArray(entry)) {
        const kept = entry.filter(keep);
        if (kept.length) out.push(kept);
        continue;
      }
      if (keep(entry)) out.push(entry);
    }
    return out;
  }
  formatHotkeyDisplay(combo: string) {
    if (!combo) return "";
    const parts = combo.split("+").map((p: string) => p.trim()).filter(Boolean);
    const map = {
      ArrowUp: "Up",
      ArrowDown: "Down",
      ArrowLeft: "Left",
      ArrowRight: "Right",
      Insert: "Ins",
      Delete: "Supr",
      Escape: "Esc"
    };
    return parts.map((p: string) => {
      if (map[p]) return map[p];
      if (p.startsWith("Key") && p.length === 4) return p.slice(3);
      if (p.startsWith("Digit") && p.length === 6) return p.slice(5);
      return p;
    }).join("+");
  }
  decorateHotkeyTitles(actions) {
    const decorate = (raw) => {
      if (!raw || typeof raw !== "object") return raw;
      const btn = raw;
      const hotkey = typeof btn.hotkey === "string" ? btn.hotkey : "";
      if (!hotkey) return btn;
      const display = this.formatHotkeyDisplay(hotkey);
      if (!display) return btn;
      const baseTitle = typeof btn.title === "string" ? btn.title : "";
      if (baseTitle.includes(`| ${display}`)) return btn;
      const newTitle = baseTitle ? `${baseTitle} | ${display}` : display;
      return { ...btn, title: newTitle };
    };
    const out = [];
    for (const entry of actions ?? []) {
      if (!entry) {
        out.push(entry);
        continue;
      }
      if (Array.isArray(entry)) {
        out.push(entry.map((b) => decorate(b)));
        continue;
      }
      out.push(decorate(entry));
    }
    return out;
  }
  findHotkeyHandler(lists, combo) {
    if (!combo) return null;
    const visit = (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const btn = raw;
      if (btn.hotkey !== combo) return null;
      if (btn.disabled) return null;
      const fn = btn.onClick;
      return typeof fn === "function" ? fn : null;
    };
    for (const list of lists) {
      for (const entry of list ?? []) {
        if (!entry) continue;
        if (Array.isArray(entry)) {
          for (const b of entry) {
            const h2 = visit(b);
            if (h2) return h2;
          }
          continue;
        }
        const h = visit(entry);
        if (h) return h;
      }
    }
    return null;
  }
  iconParts(o) {
    if (!o?.icon) return null;
    const { icon, color, style: iconStyle, ...rest } = o;
    const mergedStyle = [typeof iconStyle === "string" ? iconStyle : "", color ? `color: ${resolveColor(color)}` : "", "font-size: 1.1rem"].filter(Boolean).join("; ");
    return { icon, rest, mergedStyle };
  }
  get lastFocusedNode() {
    if (this._focusedFlatPath) return this.findNodeByFlatPath(this._focusedFlatPath);
    if (this._lastFocusedFlatPath) return this.findNodeByFlatPath(this._lastFocusedFlatPath);
    return null;
  }
  applyAdapterConfig(cfg) {
    if (!cfg) return;
    this._adapterConfig = { ...this._adapterConfig, ...cfg };
  }
  get floatCard() {
    const cfg = this._adapterConfig.floatCard ?? {};
    return { e: 0.8, ...cfg };
  }
  shouldAutoExpand(node) {
    return this.isGrouper(node);
  }
  applyDefaultExpansion() {
    if (!this.rootNodes.length) return;
    const currentIds = new Set(this._expandedFlatPaths);
    let changed = false;
    const walk = (nodes) => {
      for (const n of nodes) {
        const key = this.normalizeFlatPath(n.flatPath);
        if (key && this.shouldAutoExpand(n) && !this._autoExpandedSeen.has(key)) {
          this._autoExpandedSeen.add(key);
          if (!currentIds.has(key)) {
            currentIds.add(key);
            changed = true;
          }
        }
        n.childrens?.length && walk(n.childrens);
      }
    };
    walk(this.rootNodes);
    if (!changed) return;
    this.expandedFlatPaths = [...currentIds];
    this.syncAllRowAdapters();
    this.didNodesExpand = true;
  }
  onrefresh() {
    super.onrefresh();
    if (this.rootNodes.length) this.applyDefaultExpansion();
  }
  onrowclick(node) {
    this._selectedFlatPath = this.normalizeFlatPath(node.flatPath);
    this.record = node;
    this.syncRowSelectionChrome();
    this.notifySelect?.();
  }
  onrowdblclick(node) {
    if (this.isReadOnly) this.openViewNode(node);
    else this.openEdit(node);
  }
  onrowfocus(node) {
    const next = this.normalizeFlatPath(node?.flatPath);
    if (next && next === this._focusedFlatPath) {
      this.consumeronrowfocus?.(node);
      return;
    }
    this.focusedNode = node;
    this._lastFocusedFlatPath = String(node?.flatPath ?? "");
    this.syncRowSelectionChrome();
    this.consumeronrowfocus?.(node);
  }
  onrowtoggle(node, open) {
    if (!node?.isGroupActor) return;
    if (!this.canMutate) return;
    const handler = open ? this.customs?.onexpand : this.customs?.oncollapse;
    if (!handler) return;
    handler(node, this.buildCustomsRuntime());
  }
  onrowdelete(node) {
    if (!this.requestDelete(node)) return;
    this.ondeleteconfirmed();
  }
  onrowreorder(sourceId, targetId, position) {
    const newId = position === "into" ? this.nestInto(sourceId, targetId) : this.reorder(sourceId, targetId, position);
    this.commitAndFlash(newId);
    this.consumeronrowreorder?.(sourceId, targetId, position);
  }
  registerRowAdapter(rowAdapter) {
    const key = this.normalizeFlatPath(rowAdapter.flatPath);
    if (key.length === 0) return;
    const existing = Array.from(this.rowAdapters.values()).find((item) => item.flatPath === rowAdapter.flatPath);
    !existing && this.rowAdapters.set(key, rowAdapter);
  }
  unregisterRowAdapter(rowAdapter) {
    const key = this.normalizeFlatPath(rowAdapter.flatPath);
    if (key.length === 0) return;
    this.rowAdapters.delete(key);
  }
  getOrCreateRowAdapter(bridge) {
    const node = bridge.node;
    if (node == null) {
      throw new Error("TreeAdapter.getOrCreateRowAdapter: `bridge.node` es obligatorio");
    }
    const idKey = this.normalizeFlatPath(node.flatPath);
    if (idKey.length === 0) {
      throw new Error("TreeAdapter.getOrCreateRowAdapter: `bridge.node.flatPath` no puede quedar vacío tras normalizar");
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    let stat = this._bridgeCallStats.get(idKey);
    if (!stat || now - stat.since > 1e3) {
      stat = { count: 1, since: now };
      this._bridgeCallStats.set(idKey, stat);
    } else {
      stat.count++;
    }
    const overflow = stat.count > 50;
    if (overflow && !stat.loggedAt) {
      stat.loggedAt = now;
    }
    const existing = this.rowAdapters.get(idKey);
    if (existing) {
      if (stat.count > 200) {
        if (!stat.cutAt) {
          stat.cutAt = now;
        }
        return existing;
      }
      existing.applyBridge(bridge);
      existing.sync();
      return existing;
    }
    const created = new TreeRowAdapter(bridge, this);
    this.registerRowAdapter(created);
    this.rowAdapters.set(idKey, created);
    created.sync();
    return created;
  }
  disposeRowAdapterByFlatPath(nodeId) {
    const existing = this.rowAdapters.get(this.normalizeFlatPath(nodeId));
    if (!existing) return;
    existing.dispose();
  }
  syncAllRowAdapters() {
    for (const adapter of this.rowAdapters.values()) adapter.sync();
    this.notifyUI();
  }
  syncRowAdaptersByFlatPaths(ids) {
    for (const raw of ids) {
      if (!raw) continue;
      const key = this.normalizeFlatPath(raw);
      if (!key) continue;
      const adapter = this.rowAdapters.get(key);
      if (!adapter) continue;
      adapter.sync();
      adapter.requestRowUiSync();
    }
  }
  syncHoverFloats() {
    const keep = this._hoveredFlatPath;
    const root = this._domRoot;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("is-float-card").forEach((fc) => {
      if (fc.locked) return;
      const path = this.normalizeFlatPath(fc.closest("[data-flatpath]")?.dataset.flatpath);
      const ra = path ? this.rowAdapters.get(path) : null;
      const want = !!keep && path === keep && !!ra?.hasRowTools;
      if (fc.open !== want) fc.open = want;
    });
  }
  syncRowSelectionChrome() {
    const root = this._domRoot;
    if (!root) return;
    for (const adapter of this.rowAdapters.values()) adapter.sync();
    const sel = this.normalizeFlatPath(this._selectedFlatPath);
    const foc = this.normalizeFlatPath(this._focusedFlatPath);
    root.querySelectorAll<HTMLElement>("[data-flatpath].trvwr-row-host").forEach((host: HTMLElement) => {
      const path = this.normalizeFlatPath(host.dataset.flatpath);
      const ra = this.rowAdapters.get(path);
      const details = host.querySelector<HTMLDetailsElement>(":scope > details.trvwr-itm");
      const sum = details?.querySelector<HTMLElement>(":scope > summary");
      if (!details || !sum) return;
      const isSelected = !!sel && path === sel;
      const isHighlighted = (!!foc && path === foc) || (!foc && isSelected);
      const isActive = !!(ra?.showOptions || isHighlighted);
      const isFolderSelected = isSelected && !!ra?.hasChildren;
      details.classList.toggle("highlight", !!(isFolderSelected || isActive));
      sum.classList.toggle("trvwr-itm-sum--focused", isHighlighted);
      sum.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }
  clearDropIndicators() {
    for (const adapter of this.rowAdapters.values()) {
      if (adapter._syncRafId) {
        cancelAnimationFrame(adapter._syncRafId);
        adapter._syncRafId = 0;
      }
      if (adapter.dragOver == null && !adapter.dragForbidden && !adapter.dragEnterCount && !adapter.dragPlaceholderHeight) continue;
      adapter.dragOver = null;
      adapter.dragForbidden = false;
      adapter.dragEnterCount = 0;
      adapter.dragPlaceholderHeight = 0;
      adapter._lastDragOverKey = "";
      adapter._cachedSummaryRect = null;
    }
    const root = this._domRoot;
    if (!root) return;
    const drg = [
      "trvwr-itm-sum--drg-bf",
      "trvwr-itm-sum--drg-aftr",
      "trvwr-itm-sum--drg-into",
      "trvwr-itm-sum--drg-forbidden-bf",
      "trvwr-itm-sum--drg-forbidden-aftr",
      "trvwr-itm-sum--drg-forbidden-into",
    ];
    root.querySelectorAll<HTMLElement>("summary.trvwr-itm-sum").forEach((el: HTMLElement) => el.classList.remove(...drg));
  }
  clearDragOverlays() {
    this.currentDragFlatPath = "";
    this.clearDropIndicators();
    const root = this._domRoot;
    if (!root) return;
    root.classList.remove("trvwr--dragging");
    root.querySelectorAll<HTMLElement>(".trvwr-itm--dragging").forEach((el: HTMLElement) => {
      el.classList.remove("trvwr-itm--dragging");
    });
  }
  clearOtherDragOverlays(keepFlatPath) {
    const keep = this.normalizeFlatPath(keepFlatPath);
    for (const adapter of this.rowAdapters.values()) {
      if (this.normalizeFlatPath(adapter.flatPath) === keep) continue;
      if (adapter.dragOver == null && !adapter.dragForbidden && !adapter.dragEnterCount) continue;
      if (adapter._syncRafId) {
        cancelAnimationFrame(adapter._syncRafId);
        adapter._syncRafId = 0;
      }
      adapter.dragOver = null;
      adapter.dragForbidden = false;
      adapter.dragEnterCount = 0;
      adapter.dragPlaceholderHeight = 0;
      adapter._lastDragOverKey = "";
      adapter._cachedSummaryRect = null;
      adapter.requestRowUiSync();
    }
  }
  eventOriginatedInTree(e: Event, body) {
    if (!e || !body) return false;
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    const root = body.getRootNode?.();
    const host = root instanceof ShadowRoot ? root.host : null;
    if (path.includes(body) || (host && path.includes(host))) return true;
    const tgt = e.target;
    if (tgt && body.contains(tgt)) return true;
    if (tgt && host && (tgt === host || host.contains(tgt))) return true;
    return false;
  }
  ontreeoutsidepointerdown(e) {
    if (typeof document === "undefined") return;
    const id = this.treeRootId;
    if (!id) return;
    const body = this._domRoot || document.querySelector<HTMLElement>(`[data-tree-root="${CSS.escape(id)}"]`);
    if (!body) return;
    if (this.eventOriginatedInTree(e, body)) return;
    if (this._hoveredFlatPath) {
      this.hoveredNode = null;
      this.syncHoverFloats();
    }
    if (this._focusedFlatPath) {
      this.focusedNode = null;
      this.syncRowSelectionChrome();
    }
  }
  getRowConfig(node) {
    const defaultCfg = this.buildDefaultRowConfig(node);
    if (this.customs?.getRowConfig) return this.customs.getRowConfig(node, defaultCfg);
    return defaultCfg;
  }
  buildDefaultRowConfig(node) {
    const rowController = this.rowAdapters.get(this.normalizeFlatPath(node.flatPath));
    const hasChildren = rowController?.hasChildren ?? !!(node.childrens && node.childrens.length > 0);
    const isLastNode = !!node.isAtom;
    const isFolder = !isLastNode;
    const isEmptyFolder = isFolder && !hasChildren;
    const isExpanded = rowController?.isNodeOpen ?? this._expandedFlatPaths.includes(this.normalizeFlatPath(node.flatPath));
    const iconCfg = this.customs?.getNodeIcon?.(node, { isLastNode, isFolder, hasChildren, isExpanded, isEmptyFolder }) ?? null;
    const sibPos = this.getSiblingPosition?.(node.flatPath) ?? { isFirst: false, isLast: false };
    const rt = this.buildCustomsRuntime();
    const actions = this.decorateHotkeyTitles(this.customs?.rowActions?.(node, rt) ?? []);
    const cascadeOptions = this.decorateHotkeyTitles(this.customs?.rowCascadeOptions?.(node, rt) ?? []);
    const nodeFloatCard = node.floatCard;
    return {
      icono: iconCfg?.icon ? {
        icon: iconCfg.icon,
        ...iconCfg.color !== void 0 ? { color: iconCfg.color } : {},
        ...iconCfg.style !== void 0 ? { style: iconCfg.style } : {},
        ...iconCfg.title !== void 0 ? { title: iconCfg.title } : {}
      } : void 0,
      actions,
      cascadeOptions,
      ...nodeFloatCard ? { floatCard: nodeFloatCard } : {},
      draggable: this.draggable && this.canMutate,
      isFirst: sibPos.isFirst,
      isLast: sibPos.isLast,
      events: {
        onleadiconclick: isEmptyFolder && this.canMutate ? () => void this.handleaddchild(node.flatPath) : void 0
      }
    };
  }
  buildCustomsRuntime() {
    const tree = this;
    const idOf = (rec) => String(rec?.flatPath ?? "");
    const computeCanCollapseAll = () => {
      const expandable = tree.collectBranchIds(tree.rootNodes);
      const expanded = new Set(tree._expandedFlatPaths);
      const norm = expandable.map((id) => tree.normalizeFlatPath(id)).filter((s) => s.length > 0);
      return expanded.size > 0 && norm.length > 0;
    };
    const computeCanExpandAll = () => {
      const expandable = tree.collectBranchIds(tree.rootNodes);
      const expanded = new Set(tree._expandedFlatPaths);
      const norm = new Set(expandable.map((id) => tree.normalizeFlatPath(id)).filter((s) => s.length > 0));
      if (norm.size === 0) return false;
      return ![...norm].every((id) => expanded.has(id));
    };
    return {
      get record() {
        return tree.record;
      },
      get rootNodes() {
        return tree.rootNodes;
      },
      findByFlatPath: (path) => tree.findNodeByFlatPath(path) ?? void 0,
      findByPathInit: (pathInit) => tree.findNodeByPathInit(pathInit) ?? void 0,
      sanitizeFlatPath: (id) => tree.normalizeFlatPath(id),
      move: async (rec, dir) => {
        const newId = await tree.move(idOf(rec), dir);
        tree.commitAndFlash(newId);
        return newId;
      },
      addChild: (rec) => tree.handleaddchild(idOf(rec)),
      addSibling: (rec, pos) => tree.handleaddsibling(idOf(rec), pos),
      openEdit: (rec) => tree.showFrmModificar(rec),
      openView: (rec) => tree.showFrmVisualizar(rec),
      openViewNode: (rec) => tree.openViewNode(rec),
      extinguish: (rec) => tree.extinguishNode(rec),
      remove: (rec) => tree.onrowdelete(rec),
      release: (rec) => tree.onrelease(rec),
      addRoot: () => tree.onaddroot(),
      collapseAll: () => tree.collapseAll(),
      expandAll: () => tree.expandAll(),
      get canCollapseAll() {
        return computeCanCollapseAll();
      },
      get canExpandAll() {
        return computeCanExpandAll();
      },
      historyUndo: () => tree.historyUndo(),
      historyRedo: () => tree.historyRedo(),
      historyRecover: () => tree.historyRecover(),
      get historyCanUndo() {
        return tree.historyCanUndo;
      },
      get historyCanRedo() {
        return tree.historyCanRedo;
      },
      get historyIsViewingPast() {
        return tree.historyIsViewingPast;
      },
      get isProtected() {
        return tree.isProtected;
      },
      get canToggleProtection() {
        return tree.canToggleProtection;
      },
      get isReadOnlyExternal() {
        return tree.isReadOnlyExternal;
      },
      protectionToggle: () => tree.protectionToggle(),
      setProtected: (v) => tree.setProtected(v),
      actorActions: (node) => tree.actorActions(node),
      addChildLabel: (node) => {
        const childDepth = (node.depth ?? 0) + 1;
        const childLevelName = String(tree.customs?.levelName?.({ depth: childDepth }) ?? "").trim();
        return childLevelName ? `Agregar ${childLevelName}` : "Agregar elemento";
      },
      isFirstSibling: (node) => tree.getSiblingPosition(node.flatPath).isFirst,
      isLastSibling: (node) => tree.getSiblingPosition(node.flatPath).isLast,
      isPrisonOnly: (node) => !!node.isPrison && !node.isHermetic,
      get isReadOnly() {
        return tree.isReadOnly;
      },
      get canMutate() {
        return tree.canMutate;
      }
    };
  }
  isDirty(current, original) {
    return original ? JSON.stringify(current) !== JSON.stringify(original) : false;
  }
}
export {
  TARowBase
};
