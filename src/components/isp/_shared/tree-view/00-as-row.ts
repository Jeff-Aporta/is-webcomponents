/**
 * TARowBase — utilidades de filas, focus, drag overlay, row-adapter registry.
 *
 * El adapter consume customs (`TreeCustoms`) y mantiene estado de selección /
 * foco / hover sobre `flatPath`s normalizados. La selección DOM se sincroniza
 * vía `_domRoot` (querySelectorAll sobre el host del componente).
 *
 * Notas de tipado
 * ---------------
 * Las clases base (00-context, 01-contract, ...) declaran campos vía
 * `__publicField(...)` que escapa al análisis estático de TS. Para evitar
 * propagar `any`, este archivo usa `declare` para re-declarar las propiedades
 * heredadas con tipos concretos (mismas instancias en runtime). Los getters
 * heredados (selectedNode, focusedNode, isReadOnly, etc.) ya tienen tipo
 * `any` en el padre, así que se consumen vía `this` directamente sin
 * re-tipado aquí.
 */
import { resolveColor } from "./helpers.js";
import { TreeRowAdapter } from "./row-adapter.js";
import { TARoles } from "./07-roles.js";
import {
  asActionSpec,
  asNumber,
  asRecord,
  CustomsRuntime,
  DropPosition,
  FloatCardConfig,
  IconConfig,
  MoveDirection,
  PendingDeleteSnapshot,
  RowConfig,
  RowAdapterBridge,
  SiblingPosition,
  TreeActionEntry,
  TreeActionSpec,
  TreeContext,
  TreeCustoms,
  TNode,
  TRecord,
} from "./_types.js";

/** Stats de invocación de `getOrCreateRowAdapter` para rate-limit. */
interface BridgeCallStat {
  count: number;
  since: number;
  loggedAt?: number;
  cutAt?: number;
}

/** Config parcial para `applyAdapterConfig`. */
interface AdapterConfig {
  floatCard?: FloatCardConfig;
  [key: string]: unknown;
}

/** Resultado de `findHotkeyHandler`. */
type HotkeyClickHandler = (() => void) | null;

/** Lista de entradas de acciones pasada a `findHotkeyHandler`. */
type HotkeyList = (TreeActionEntry | undefined | null | false)[];

class TARowBase extends TARoles {
  // ── Nuevos campos de instancia ────────────────────────────────────────
  declare _adapterConfig: AdapterConfig;
  declare _lastFocusedFlatPath: string;
  declare currentDragFlatPath: string;
  declare _autoExpandedSeen: Set<string>;
  declare consumeronrowfocus:
    | ((n: TNode | null | undefined) => void)
    | undefined;
  declare consumeronrowreorder:
    | ((s: string, t: string, p: DropPosition) => void)
    | undefined;
  declare _bridgeCallStats: Map<string, BridgeCallStat>;

  // ── Re-declaraciones de campos heredados (vienen de __publicField en
  //    los padres; invisibles a TS, los declaramos aquí para tipar). ──────
  declare context: TreeContext;
  declare _selectedFlatPath: string;
  declare _focusedFlatPath: string;
  declare _hoveredFlatPath: string;
  declare record: TRecord | null;
  declare _expandedFlatPaths: string[];
  declare _domRoot: HTMLElement | undefined;
  declare didNodesExpand: boolean;
  declare rowAdapters: Map<string, TreeRowAdapter>;

  // ── Filtros / hotkeys ──────────────────────────────────────────────────
  /**
   * Filtra `actions` ocultando botones no válidos según contexto (primero,
   * último, frozen). Conserva la estructura de grupos anidados.
   */
  filterRowActions(
    cfg: { actions?: TreeActionEntry[]; isFirst?: boolean; isLast?: boolean } | null | undefined,
    frozen: boolean | undefined,
  ): TreeActionEntry[] {
    const keep = (item: unknown): boolean => {
      if (!item || typeof item !== "object") return !!item;
      const btn = asRecord(item);
      if (cfg?.isFirst && btn["icon"] === "mdi:arrow-up") return false;
      if (cfg?.isLast && btn["icon"] === "mdi:arrow-down") return false;
      if (
        frozen &&
        (btn["icon"] === "mdi:arrow-up" || btn["icon"] === "mdi:arrow-down")
      ) {
        return false;
      }
      return true;
    };
    const out: TreeActionEntry[] = [];
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

  /** Formatea un combo hotkey (`ArrowUp+KeyZ`) a etiqueta legible (`Up+Ctrl+Z`). */
  formatHotkeyDisplay(combo: string): string {
    if (!combo) return "";
    const parts = combo
      .split("+")
      .map((p: string) => p.trim())
      .filter(Boolean);
    const map: Record<string, string> = {
      ArrowUp: "Up",
      ArrowDown: "Down",
      ArrowLeft: "Left",
      ArrowRight: "Right",
      Insert: "Ins",
      Delete: "Supr",
      Escape: "Esc",
    };
    return parts
      .map((p: string) => {
        const mapped = map[p];
        if (mapped) return mapped;
        if (p.startsWith("Key") && p.length === 4) return p.slice(3);
        if (p.startsWith("Digit") && p.length === 6) return p.slice(5);
        return p;
      })
      .join("+");
  }

  /** Decora los títulos de los botones añadiendo el hotkey display. */
  decorateHotkeyTitles(actions: TreeActionEntry[] | undefined): TreeActionEntry[] {
    const decorate = (raw: unknown): TreeActionEntry => {
      if (!raw || typeof raw !== "object") {
        return null as unknown as TreeActionEntry;
      }
      const btn = raw as TreeActionSpec;
      const hotkey = typeof btn.hotkey === "string" ? btn.hotkey : "";
      if (!hotkey) return btn;
      const display = this.formatHotkeyDisplay(hotkey);
      if (!display) return btn;
      const baseTitle = typeof btn.title === "string" ? btn.title : "";
      if (baseTitle.includes(`| ${display}`)) return btn;
      const newTitle = baseTitle ? `${baseTitle} | ${display}` : display;
      return { ...btn, title: newTitle };
    };
    const out: TreeActionEntry[] = [];
    for (const entry of actions ?? []) {
      if (!entry) {
        out.push(entry as TreeActionEntry);
        continue;
      }
      if (Array.isArray(entry)) {
        const arr: TreeActionEntry[] = entry.map((b) =>
          decorate(b as unknown),
        ) as TreeActionEntry[];
        out.push(arr);
        continue;
      }
      out.push(decorate(entry as unknown));
    }
    return out;
  }

  /** Busca un handler de hotkey en una lista de grupos de acciones. */
  findHotkeyHandler(
    lists: (HotkeyList | undefined)[],
    combo: string | null | undefined,
  ): HotkeyClickHandler {
    if (!combo) return null;
    const visit = (raw: unknown): HotkeyClickHandler => {
      if (!raw || typeof raw !== "object") return null;
      const btn = raw as TreeActionSpec;
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

  /** Resuelve el ícono de una config (icon + color + style → mergedStyle CSS). */
  iconParts(
    o: IconConfig | null | undefined,
  ): { icon: string; rest: Record<string, unknown>; mergedStyle: string } | null {
    if (!o?.icon) return null;
    const icon = o.icon;
    const color = o.color;
    const iconStyle = o.style;
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "icon" || k === "color" || k === "style") continue;
      rest[k] = v;
    }
    const mergedStyle = [
      typeof iconStyle === "string" ? iconStyle : "",
      color ? `color: ${resolveColor(color)}` : "",
      "font-size: 1.1rem",
    ]
      .filter(Boolean)
      .join("; ");
    return { icon, rest, mergedStyle };
  }

  // ── Selección / foco ───────────────────────────────────────────────────
  /** Nodo enfocado actual (`_focusedFlatPath` o el último persistido). */
  get lastFocusedNode(): TNode | null {
    if (this._focusedFlatPath) return this.findNodeByFlatPath(this._focusedFlatPath);
    if (this._lastFocusedFlatPath)
      return this.findNodeByFlatPath(this._lastFocusedFlatPath);
    return null;
  }

  /** Mezcla nueva config sobre la acumulada del adapter. */
  applyAdapterConfig(cfg: AdapterConfig | null | undefined): void {
    if (!cfg) return;
    this._adapterConfig = { ...this._adapterConfig, ...cfg };
  }

  /** FloatCard config efectiva (defaults + overrides acumulados). */
  get floatCard(): FloatCardConfig {
    const cfg = this._adapterConfig.floatCard ?? {};
    return { e: 0.8, ...cfg };
  }

  /** ¿Este nodo debe auto-expandirse al materializarse? */
  shouldAutoExpand(node: TNode | null | undefined): boolean {
    return this.isGrouper(node);
  }

  /** Aplica auto-expansión a nodos nuevos que califiquen como grouper. */
  applyDefaultExpansion(): void {
    if (!this.rootNodes.length) return;
    const currentIds = new Set<string>(this._expandedFlatPaths);
    let changed = false;
    const walk = (nodes: TNode[]): void => {
      for (const n of nodes) {
        const key = this.normalizeFlatPath(n.flatPath);
        if (
          key &&
          this.shouldAutoExpand(n) &&
          !this._autoExpandedSeen.has(key)
        ) {
          this._autoExpandedSeen.add(key);
          if (!currentIds.has(key)) {
            currentIds.add(key);
            changed = true;
          }
        }
        if (n.childrens?.length) walk(n.childrens);
      }
    };
    walk(this.rootNodes);
    if (!changed) return;
    this.expandedFlatPaths = [...currentIds];
    this.syncAllRowAdapters();
    this.didNodesExpand = true;
  }

  override onrefresh(): void {
    super.onrefresh();
    if (this.rootNodes.length) this.applyDefaultExpansion();
  }

  // ── Handlers de fila ───────────────────────────────────────────────────
  onrowclick(node: TNode): void {
    this._selectedFlatPath = this.normalizeFlatPath(node.flatPath);
    this.record = node as TRecord;
    this.syncRowSelectionChrome();
    (this as unknown as { notifySelect?: () => void }).notifySelect?.();
  }

  onrowdblclick(node: TNode): void {
    if (this.isReadOnly) this.openViewNode(node);
    else this.openEdit(node);
  }

  onrowfocus(node: TNode | null | undefined): void {
    const next = this.normalizeFlatPath(node?.flatPath ?? "");
    if (next && next === this._focusedFlatPath) {
      this.consumeronrowfocus?.(node);
      return;
    }
    // Bypass del setter heredado (que tiene firma `any` pero TS lo infiere
    // restrictivo bajo strict): escribimos el backing field directamente.
    this._focusedFlatPath = next;
    this._lastFocusedFlatPath = String(node?.flatPath ?? "");
    this.syncRowSelectionChrome();
    this.consumeronrowfocus?.(node);
  }

  onrowtoggle(node: TNode, open: boolean): void {
    if (!node?.isGroupActor) return;
    if (!this.canMutate) return;
    const handler: ((n: TNode, rt: CustomsRuntime) => void) | undefined = open
      ? this.customs?.onExpand
      : this.customs?.onCollapse;
    if (!handler) return;
    handler(node, this.buildCustomsRuntime());
  }

  onrowdelete(node: TNode): void {
    if (!this.requestDelete(node)) return;
    void this.ondeleteconfirmed();
  }

  onrowreorder(
    sourceId: string,
    targetId: string,
    position: DropPosition,
  ): void {
    const newId =
      position === "into"
        ? this.nestInto(sourceId, targetId)
        : this.reorder(sourceId, targetId, position);
    this.commitAndFlash(newId);
    this.consumeronrowreorder?.(sourceId, targetId, position);
  }

  // ── Row adapter registry ───────────────────────────────────────────────
  /** Registra un row adapter (idempotente sobre el mismo `flatPath`). */
  registerRowAdapter(rowAdapter: TreeRowAdapter): void {
    const key = this.normalizeFlatPath(rowAdapter.flatPath);
    if (key.length === 0) return;
    const existing = Array.from(this.rowAdapters.values()).find(
      (item: TreeRowAdapter) => item.flatPath === rowAdapter.flatPath,
    );
    if (!existing) this.rowAdapters.set(key, rowAdapter);
  }

  unregisterRowAdapter(rowAdapter: TreeRowAdapter): void {
    const key = this.normalizeFlatPath(rowAdapter.flatPath);
    if (key.length === 0) return;
    this.rowAdapters.delete(key);
  }

  /** Obtiene o crea un row adapter para el `bridge.node`, con rate-limit. */
  getOrCreateRowAdapter(bridge: RowAdapterBridge): TreeRowAdapter {
    const node = bridge.node;
    if (node == null) {
      throw new Error(
        "TreeAdapter.getOrCreateRowAdapter: `bridge.node` es obligatorio",
      );
    }
    const idKey = this.normalizeFlatPath(node.flatPath);
    if (idKey.length === 0) {
      throw new Error(
        "TreeAdapter.getOrCreateRowAdapter: `bridge.node.flatPath` no puede quedar vacío tras normalizar",
      );
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
        if (!stat.cutAt) stat.cutAt = now;
        return existing;
      }
      existing.applyBridge(bridge);
      existing.sync();
      return existing;
    }
    const created = new TreeRowAdapter(
      bridge,
      this as unknown as ConstructorParameters<typeof TreeRowAdapter>[1],
    );
    this.registerRowAdapter(created);
    this.rowAdapters.set(idKey, created);
    created.sync();
    return created;
  }

  disposeRowAdapterByFlatPath(nodeId: string): void {
    const existing = this.rowAdapters.get(this.normalizeFlatPath(nodeId));
    if (!existing) return;
    existing.dispose();
  }

  /** Sincroniza todos los row adapters y notifica a la UI. */
  syncAllRowAdapters(): void {
    for (const adapter of this.rowAdapters.values()) adapter.sync();
    this.notifyUI();
  }

  /** Sincroniza adapters cuyo `flatPath` está en `ids`. */
  syncRowAdaptersByFlatPaths(ids: readonly string[]): void {
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

  /** Sincroniza float-cards según el nodo hovereado. */
  syncHoverFloats(): void {
    const keep = this._hoveredFlatPath;
    const root = this._domRoot;
    if (!root) return;
    const fcList = root.querySelectorAll("is-float-card");
    fcList.forEach((fc: Element) => {
      const fcEl = fc as HTMLElement & { locked?: boolean; open?: boolean };
      if (fcEl.locked) return;
      const path = this.normalizeFlatPath(
        fcEl.closest("[data-flatpath]")?.getAttribute("data-flatpath") ?? "",
      );
      const ra = path ? this.rowAdapters.get(path) ?? null : null;
      const want = !!keep && path === keep && !!ra?.hasRowTools;
      if (fcEl.open !== want) fcEl.open = want;
    });
  }

  /** Sincroniza el chrome (clases CSS, aria-selected) de cada fila visible. */
  syncRowSelectionChrome(): void {
    const root = this._domRoot;
    if (!root) return;
    for (const adapter of this.rowAdapters.values()) adapter.sync();
    const sel = this.normalizeFlatPath(this._selectedFlatPath);
    const foc = this.normalizeFlatPath(this._focusedFlatPath);
    const hosts = root.querySelectorAll("[data-flatpath].trvwr-row-host");
    hosts.forEach((hostEl: Element) => {
      const host = hostEl as HTMLElement;
      const path = this.normalizeFlatPath(host.dataset["flatpath"] ?? "");
      const ra = this.rowAdapters.get(path);
      const details = host.querySelector<HTMLDetailsElement>(
        ":scope > details.trvwr-itm",
      );
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

  /** Limpia indicadores de drop de todos los adapters y del DOM. */
  clearDropIndicators(): void {
    for (const adapter of this.rowAdapters.values()) {
      const ad = adapter as TreeRowAdapter & {
        _syncRafId?: number;
        _lastDragOverKey?: string;
        _cachedSummaryRect?: unknown;
      };
      if (ad._syncRafId) {
        cancelAnimationFrame(ad._syncRafId);
        ad._syncRafId = 0;
      }
      if (
        ad.dragOver == null &&
        !ad.dragForbidden &&
        !ad.dragEnterCount &&
        !ad.dragPlaceholderHeight
      ) {
        continue;
      }
      ad.dragOver = null;
      ad.dragForbidden = false;
      ad.dragEnterCount = 0;
      ad.dragPlaceholderHeight = 0;
      ad._lastDragOverKey = "";
      ad._cachedSummaryRect = null;
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
    const summaries = root.querySelectorAll("summary.trvwr-itm-sum");
    summaries.forEach((el: Element) => {
      (el as HTMLElement).classList.remove(...drg);
    });
  }

  /** Limpia overlays de drag del root y de cada fila marcada. */
  clearDragOverlays(): void {
    this.currentDragFlatPath = "";
    this.clearDropIndicators();
    const root = this._domRoot;
    if (!root) return;
    root.classList.remove("trvwr--dragging");
    const dragging = root.querySelectorAll(".trvwr-itm--dragging");
    dragging.forEach((el: Element) => {
      (el as HTMLElement).classList.remove("trvwr-itm--dragging");
    });
  }

  /** Limpia overlays de drag salvo en `keepFlatPath`. */
  clearOtherDragOverlays(keepFlatPath: string | null | undefined): void {
    const keep = this.normalizeFlatPath(keepFlatPath ?? "");
    for (const adapter of this.rowAdapters.values()) {
      const ad = adapter as TreeRowAdapter & {
        _syncRafId?: number;
        _lastDragOverKey?: string;
        _cachedSummaryRect?: unknown;
      };
      if (this.normalizeFlatPath(adapter.flatPath) === keep) continue;
      if (
        ad.dragOver == null &&
        !ad.dragForbidden &&
        !ad.dragEnterCount
      ) {
        continue;
      }
      if (ad._syncRafId) {
        cancelAnimationFrame(ad._syncRafId);
        ad._syncRafId = 0;
      }
      ad.dragOver = null;
      ad.dragForbidden = false;
      ad.dragEnterCount = 0;
      ad.dragPlaceholderHeight = 0;
      ad._lastDragOverKey = "";
      ad._cachedSummaryRect = null;
      ad.requestRowUiSync();
    }
  }

  /** ¿El evento `e` se originó dentro del subtree del tree-body `body`? */
  eventOriginatedInTree(e: Event | null | undefined, body: HTMLElement | null): boolean {
    if (!e || !body) return false;
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    const root = body.getRootNode?.() as Node | ShadowRoot | null;
    const host = root instanceof ShadowRoot ? root.host : null;
    const pathList: Element[] = (path as Element[]) ?? [];
    if (pathList.includes(body) || (host && pathList.includes(host as Element)))
      return true;
    const tgt = e.target as Node | null;
    if (tgt && body.contains(tgt)) return true;
    if (tgt && host && (tgt === host || (host as Node).contains(tgt))) return true;
    return false;
  }

  /** Handler de pointerdown fuera del árbol: limpia hover/foco. */
  ontreeoutsidepointerdown(e: Event): void {
    if (typeof document === "undefined") return;
    const id = (this as unknown as { treeRootId: string }).treeRootId;
    if (!id) return;
    const body =
      this._domRoot ||
      document.querySelector<HTMLElement>(
        `[data-tree-root="${CSS.escape(id)}"]`,
      );
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

  // ── Config de fila ─────────────────────────────────────────────────────
  /** Resuelve la config de una fila: hook del customs o default. */
  getRowConfig(node: TNode): RowConfig {
    const defaultCfg = this.buildDefaultRowConfig(node);
    if (this.customs?.getRowConfig)
      return this.customs.getRowConfig(node, defaultCfg);
    return defaultCfg;
  }

  /** Construye la config por defecto de una fila. */
  buildDefaultRowConfig(node: TNode): RowConfig {
    const rowController = this.rowAdapters.get(this.normalizeFlatPath(node.flatPath));
    const hasChildren =
      rowController?.hasChildren ??
      !!(node.childrens && node.childrens.length > 0);
    const isLastNode = !!node.isAtom;
    const isFolder = !isLastNode;
    const isEmptyFolder = isFolder && !hasChildren;
    const isExpanded =
      rowController?.isNodeOpen ??
      this._expandedFlatPaths.includes(this.normalizeFlatPath(node.flatPath));
    const iconCfg =
      this.customs?.getNodeIcon?.(node, {
        isLastNode,
        isFolder,
        hasChildren,
        isExpanded,
        isEmptyFolder,
      }) ?? null;
    const sibPos: SiblingPosition =
      (this.getSiblingPosition?.(node.flatPath) as SiblingPosition | undefined) ??
      { isFirst: false, isLast: false };
    const rt = this.buildCustomsRuntime();
    const actions = this.decorateHotkeyTitles(
      this.customs?.rowActions?.(node, rt) ?? [],
    );
    const cascadeOptions = this.decorateHotkeyTitles(
      this.customs?.rowCascadeOptions?.(node, rt) ?? [],
    );
    const nodeFloatCard = node.floatCard;
    const icono: IconConfig | undefined = iconCfg?.icon
      ? {
          icon: iconCfg.icon,
          ...(iconCfg.color !== undefined ? { color: iconCfg.color } : {}),
          ...(iconCfg.style !== undefined ? { style: iconCfg.style } : {}),
          ...(iconCfg.title !== undefined ? { title: iconCfg.title } : {}),
        }
      : undefined;
    const cfg: RowConfig = {
      icono,
      actions,
      cascadeOptions,
      ...(nodeFloatCard !== undefined
        ? { floatCard: nodeFloatCard as FloatCardConfig }
        : {}),
      draggable: this.draggable && this.canMutate,
      isFirst: sibPos.isFirst,
      isLast: sibPos.isLast,
      events: {
        onleadiconclick:
          isEmptyFolder && this.canMutate
            ? () => void this.handleaddchild(node.flatPath)
            : undefined,
      },
    };
    return cfg;
  }

  /** Construye el `CustomsRuntime` (DTO inmutable) para pasar a hooks. */
  buildCustomsRuntime(): CustomsRuntime {
    // Cast tipado a la forma completa de la instancia (campos + métodos heredados).
    type Full = {
      record: TRecord | null;
      rootNodes: TNode[];
      _expandedFlatPaths: string[];
      collectBranchIds(n: TNode[]): string[];
      normalizeFlatPath(id: string | null | undefined): string;
      findNodeByFlatPath(id: string | null | undefined): TNode | null;
      findNodeByPathInit(id: string | null | undefined): TNode | null;
      move(id: string, d: MoveDirection): Promise<string | null | undefined>;
      handleaddchild(id: string): void;
      handleaddsibling(id: string, pos: string): void;
      showFrmModificar(rec: TRecord): void;
      showFrmVisualizar(rec: TRecord): void;
      openViewNode(rec: TRecord): void;
      extinguishNode(rec: TRecord): void;
      onrowdelete(rec: TRecord): void;
      onrelease(rec: TRecord): void;
      onaddroot(): void;
      collapseAll(): void;
      expandAll(): void;
      historyUndo(): void;
      historyRedo(): void;
      historyRecover(): void;
      protectionToggle(): void;
      setProtected(v: boolean): void;
      commitAndFlash(id: string | null | undefined): void;
      getSiblingPosition(id: string): SiblingPosition;
      customs: TreeCustoms | undefined;
      isReadOnly: boolean;
      canMutate: boolean;
      canCollapseAll: boolean;
      canExpandAll: boolean;
      historyCanUndo: boolean;
      historyCanRedo: boolean;
      historyIsViewingPast: boolean;
      isProtected: boolean;
      canToggleProtection: boolean;
      isReadOnlyExternal: boolean;
      actorActions(n: TNode): TreeActionSpec[];
    };
    const tree = this as unknown as Full;
    const idOf = (rec: TRecord | TNode | null | undefined): string =>
      String(rec?.flatPath ?? "");
    const computeCanCollapseAll = (): boolean => {
      const expandable = tree.collectBranchIds(tree.rootNodes);
      const expanded = new Set<string>(tree._expandedFlatPaths);
      const norm: string[] = expandable
        .map((id: string) => tree.normalizeFlatPath(id))
        .filter((s: string) => s.length > 0);
      return expanded.size > 0 && norm.length > 0;
    };
    const computeCanExpandAll = (): boolean => {
      const expandable = tree.collectBranchIds(tree.rootNodes);
      const expanded = new Set<string>(tree._expandedFlatPaths);
      const norm = new Set<string>(
        expandable
          .map((id: string) => tree.normalizeFlatPath(id))
          .filter((s: string) => s.length > 0),
      );
      if (norm.size === 0) return false;
      return ![...norm].every((id: string) => expanded.has(id));
    };
    return {
      get record(): TRecord | null {
        return tree.record;
      },
      get rootNodes(): TNode[] {
        return tree.rootNodes;
      },
      findByFlatPath: (path: string | null | undefined): TNode | undefined =>
        tree.findNodeByFlatPath(path) ?? undefined,
      findByPathInit: (pathInit: string | null | undefined): TNode | undefined =>
        tree.findNodeByPathInit(pathInit) ?? undefined,
      sanitizeFlatPath: (id: string | null | undefined): string =>
        tree.normalizeFlatPath(id),
      move: async (
        rec: TRecord,
        dir: MoveDirection,
      ): Promise<string | null | undefined> => {
        const newId = await tree.move(idOf(rec), dir);
        tree.commitAndFlash(newId);
        return newId;
      },
      addChild: (rec: TRecord): void => tree.handleaddchild(idOf(rec)),
      addSibling: (rec: TRecord, pos: string): void =>
        tree.handleaddsibling(idOf(rec), pos),
      openEdit: (rec: TRecord): void => tree.showFrmModificar(rec),
      openView: (rec: TRecord): void => tree.showFrmVisualizar(rec),
      openViewNode: (rec: TRecord): void => tree.openViewNode(rec),
      extinguish: (rec: TRecord): void => tree.extinguishNode(rec),
      remove: (rec: TRecord): void => tree.onrowdelete(rec),
      release: (rec: TRecord): void => tree.onrelease(rec),
      addRoot: (): void => tree.onaddroot(),
      collapseAll: (): void => tree.collapseAll(),
      expandAll: (): void => tree.expandAll(),
      get canCollapseAll(): boolean {
        return computeCanCollapseAll();
      },
      get canExpandAll(): boolean {
        return computeCanExpandAll();
      },
      historyUndo: (): void => tree.historyUndo(),
      historyRedo: (): void => tree.historyRedo(),
      historyRecover: (): void => tree.historyRecover(),
      get historyCanUndo(): boolean {
        return tree.historyCanUndo;
      },
      get historyCanRedo(): boolean {
        return tree.historyCanRedo;
      },
      get historyIsViewingPast(): boolean {
        return tree.historyIsViewingPast;
      },
      get isProtected(): boolean {
        return tree.isProtected;
      },
      get canToggleProtection(): boolean {
        return tree.canToggleProtection;
      },
      get isReadOnlyExternal(): boolean {
        return tree.isReadOnlyExternal;
      },
      protectionToggle: (): void => tree.protectionToggle(),
      setProtected: (v: boolean): void => tree.setProtected(v),
      actorActions: (node: TNode): TreeActionSpec[] => tree.actorActions(node),
      addChildLabel: (node: TNode): string => {
        const childDepth = (asNumber(node["depth"]) || 0) + 1;
        const childLevelName = String(
          tree.customs?.levelName?.({ depth: childDepth }) ?? "",
        ).trim();
        return childLevelName ? `Agregar ${childLevelName}` : "Agregar elemento";
      },
      isFirstSibling: (node: TNode): boolean =>
        tree.getSiblingPosition(node.flatPath).isFirst,
      isLastSibling: (node: TNode): boolean =>
        tree.getSiblingPosition(node.flatPath).isLast,
      isPrisonOnly: (node: TNode): boolean => !!node.isPrison && !node.isHermetic,
      get isReadOnly(): boolean {
        return tree.isReadOnly;
      },
      get canMutate(): boolean {
        return tree.canMutate;
      },
    };
  }

  /** ¿Cambió `current` respecto a `original` (JSON.stringify)? */
  isDirty(current: unknown, original: unknown): boolean {
    return original ? JSON.stringify(current) !== JSON.stringify(original) : false;
  }
}

export { TARowBase };
// Re-exports para callers downstream.
export { asActionSpec, asRecord, asNumber };
