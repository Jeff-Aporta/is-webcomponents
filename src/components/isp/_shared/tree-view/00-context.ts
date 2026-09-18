var __defProp = Object.defineProperty;
var __defNormalProp = (obj: unknown, key: string | symbol, value: unknown) => {
  const o = obj as Record<string | symbol, unknown>;
  return key in o ? __defProp(o, key, { enumerable: true, configurable: true, writable: true, value }) : o[key as string] = value;
};
var __publicField = (obj: unknown, key: string | symbol, value?: unknown) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
type _AnyRecord = Record<string, unknown>;
type _AnyCtxProps = _AnyRecord;
type _BAllowedShape = { Crear?: boolean; Modificar?: boolean; Eliminar?: boolean; Visualizar?: boolean };
type _PendingDeleteSnap = { prevVisibleIds: string[]; prevDeleteIdx: number } | null;
type _TNodeLike = { flatPath: string; [key: string]: unknown };
type _TRecordLike = _TNodeLike & { iplan?: string; idrow?: string };

const _TTreeAdapterContext = class _TTreeAdapterContext {
  // Tipos explícitos para los campos `__publicField` (escape del análisis estático).
  // Las marcas `!` evitan inicialización redundante — `__publicField` ya las pone.
  context!: Record<string, unknown>;
  treeRootId!: string;
  bshowFrm!: boolean;
  bLostFocus!: boolean;
  _selectedFlatPath!: string;
  _focusedFlatPath!: string;
  _hoveredFlatPath!: string;
  record!: _TRecordLike | null;
  _pendingDeleteFlatPath!: string;
  _pendingDeleteSnapshot!: _PendingDeleteSnap;
  _lastProcessedObj!: _TRecordLike | null;
  _expandedFlatPaths!: string[];
  _treeNodes!: _TNodeLike[];
  bcanMoveOutside!: boolean;

  constructor(props: _AnyCtxProps = {} as _AnyCtxProps, restProps?: _AnyCtxProps, syncProps?: _AnyCtxProps) {
    __publicField(this, "context");
    __publicField(this, "treeRootId", `tree-${++(_TTreeAdapterContext as unknown as { _rootIdSeq: number })._rootIdSeq}`);
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
  onstateupdate(ctx: Record<string, unknown>): void {
    Object.defineProperties(this.context, Object.getOwnPropertyDescriptors(ctx));
  }
  get disabled(): boolean {
    return !!this.context.disabled;
  }
  set disabled(value: boolean) {
    this.context.disabled = !!value;
  }
  get selectedNode(): _TNodeLike | null {
    return this.findNodeByFlatPath(this._selectedFlatPath);
  }
  set selectedNode(value: _TNodeLike | null | undefined) {
    this._selectedFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get focusedNode(): _TNodeLike | null {
    return this.findNodeByFlatPath(this._focusedFlatPath);
  }
  set focusedNode(value: _TNodeLike | null | undefined) {
    this._focusedFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get hoveredNode(): _TNodeLike | null {
    return this.findNodeByFlatPath(this._hoveredFlatPath);
  }
  set hoveredNode(value: _TNodeLike | null | undefined) {
    this._hoveredFlatPath = value == null ? "" : this.normalizeFlatPath(value.flatPath);
  }
  get rootNodes(): _TNodeLike[] {
    return this._treeNodes;
  }
  get treeNodes(): _TNodeLike[] {
    return this._treeNodes;
  }
  set treeNodes(value: _TNodeLike[]) {
    this._treeNodes = value;
  }
  get expandedNodes(): _TNodeLike[] {
    const seen = /* @__PURE__ */ new Set<string>();
    const out: _TNodeLike[] = [];
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
  set expandedNodes(value: _TNodeLike[] | null | undefined) {
    const seen = /* @__PURE__ */ new Set<string>();
    const ids: string[] = [];
    for (const node of value || []) {
      const id = this.normalizeFlatPath(node?.flatPath);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    this._expandedFlatPaths = ids;
  }
  get expandedFlatPaths(): string[] {
    return [...this._expandedFlatPaths];
  }
  set expandedFlatPaths(value: string[] | null | undefined) {
    const seen = /* @__PURE__ */ new Set<string>();
    const ids: string[] = [];
    for (const raw of value || []) {
      const id = this.normalizeFlatPath(raw);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    this._expandedFlatPaths = ids;
  }
  get isReadOnly(): boolean {
    return !!this.context.readonly;
  }
  get canMutate(): boolean {
    return !this.isReadOnly;
  }
  get canCreate(): boolean {
    return (this.context.bAllowed as _BAllowedShape | undefined)?.Crear ?? true;
  }
  get canModify(): boolean {
    return (this.context.bAllowed as _BAllowedShape | undefined)?.Modificar ?? true;
  }
  get canDelete(): boolean {
    return (this.context.bAllowed as _BAllowedShape | undefined)?.Eliminar ?? true;
  }
  get draggable(): boolean {
    return this.context.draggable !== false;
  }
  normalizeFlatPath(_id: string | null | undefined): string {
    return "";
  }
  findNodeByFlatPath(_id: string | null | undefined, _branches?: _TNodeLike[]): _TNodeLike | null {
    return null;
  }
};
__publicField(_TTreeAdapterContext as unknown as Record<string, unknown>, "_rootIdSeq", 0);
let TTreeAdapterContext = _TTreeAdapterContext;
export {
  TTreeAdapterContext
};
