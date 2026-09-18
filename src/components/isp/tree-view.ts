import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../actions/button-group.js';
import '../actions/check-icon-button.js';
import '../actions/dropdown.js';
import '../actions/dropdown-item.js';
import '../media/icon.js';
import '../layout/drawer.js';
import '../layout/dialog.js';
import '../layout/divider.js';
import './confirm-delete.js';
import './flex-options.js';
import './float-card.js';
import { TreeRowViewAdapter } from './_shared/tree-view/adapter.js';
import { TreeCustomsBase } from './_shared/tree-view/customs-base.js';
import { paintForest } from './_shared/tree-view/render-rows.js';
import type { TNode, TRecord, TreeActionEntry, TreeCustoms } from './_shared/tree-view/_types.js';

/** Subset del adapter que `IsTreeView` consume (no necesita el tipo completo). */
interface _AdapterLike {
  treeRootId: string;
  _domRoot?: HTMLElement | null;
  customs?: TreeCustoms | null;
  menu?: TreeActionEntry[];
  moreMenu?: TreeActionEntry[];
  currentDragFlatPath: string;
  record: TRecord | null;
  rootNodes: TNode[];
  decorateHotkeyTitles(actions: TreeActionEntry[]): TreeActionEntry[];
  buildCustomsRuntime(): unknown;
  notifySelect: () => void;
  isPendingInsertPath?: (flatPath: string) => boolean;
  isProtected: boolean;
  canMutate: boolean;
  onbranchexpand?: () => void;
  walkAncestors(node: TNode): TNode[];
  getRecordSecurityCode(node: TNode): string;
  showDelete(obj: unknown): void;
  closeEditForm?(): void;
  clearDragOverlays(): void;
  clearDropIndicators(): void;
  confirmProtectionRelease(): void;
  historyCanRedo: boolean;
  isProtectionPromptOpen: boolean;
  historyRedoAll(): void;
  dismissProtectionPrompt(): void;
  ontreeoutsidepointerdown(e: Event): void;
  confirmDelete(value: string): Promise<boolean>;
  onrequestopendrawer?: (mode: string) => void;
  onrequestclosedrawer?: () => void;
  onrequesteditshow?: (node: TNode, mode: string) => void;
  onrequestdelete?: (node: TNode) => void;
  onError?: (msg: string) => void;
  addUiListener(fn: () => void): () => void;
  runCustomsPreSubmit?(): unknown;
  lastNodesRef: unknown;
  onstateupdate(state: Record<string, unknown>): void;
}

export { TreeRowViewAdapter, TreeRowViewAdapter as TreeAdapter, TreeCustomsBase };
export { objRootsToNodes, TreeNode, groupedWithSeparators } from './_shared/tree-view/tree-data.js';
export { TreeRowAdapter } from './_shared/tree-view/row-adapter.js';

/**
 * <is-tree-view> — port de TreeRowView.svelte (ClientesIS / cursos).
 *
 * Árbol editable: drag, historial, protección, drawer de ficha y
 * confirm-delete. La cascada del adapter se trae tal cual; la UI
 * Svelte (FlexLayout / FlexOptions / ObjJConfig) se traduce a is-*.
 *
 * Props JS
 *   list / List2Rows   array plano o roots (vía customs.list o este array)
 *   customs            ITreeCustoms (getFlatPath, rowActions, topMenuActions…)
 *   treeController     instancia de TreeRowViewAdapter (se crea si falta)
 *   bAllowed           { Crear, Modificar, Eliminar, Visualizar }
 *   onError            (msg) => void
 *   renderRow          (node, el) => void  — pinta el label de fila
 *   renderHelper       (node, el) => void
 *
 * Atributos
 *   readonly / draggable / disabled / label-field / helper-field
 *
 * Slots: header, frm
 * Eventos: is-frm-open, is-frm-close, is-select, is-error, is-action
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="root" class="isp-tree-host isp-tree" data-tree-root="">
    <div part="toolbar" class="isp-tree-toolbar" hidden></div>
    <slot name="header"></slot>
    <div part="body" class="isp-tree-body isp-tree-focus-scope" data-testid="tree" role="tree"></div>
    <is-drawer part="drawer" class="drawer" light-dismiss label="Ficha">
      <div class="drawer-body"><slot name="frm"></slot></div>
    </is-drawer>
    <is-confirm-delete class="modal-delete" case-sensitive></is-confirm-delete>
    <is-dialog class="protect-dlg" label="Árbol protegido">
      <p class="protect-msg">El árbol está protegido contra edición. ¿Cómo desea continuar?</p>
      <div slot="footer" class="protect-actions">
        <is-button class="protect-cancel" color="neutral" variant="outlined" data-dialog="close">Cancelar</is-button>
        <is-button class="protect-redo" color="warning" variant="ghost">Rehacer al actual</is-button>
        <is-button class="protect-ok" color="warning">Desproteger</is-button>
      </div>
    </is-dialog>
  </div>
`;

const OBSERVED = ['readonly', 'draggable', 'disabled', 'label-field', 'helper-field'];

/** Drawer con show/hide y label. */
interface _DrawerLike extends HTMLElement {
  show?: () => void;
  hide?: () => void;
  label?: string;
}

/** Modal de confirmación con loading. */
interface _ModalDeleteLike extends HTMLElement {
  show?: () => void;
  hide?: () => void;
  loading?: boolean;
  entity?: string;
}

/** Diálogo de protección. */
interface _DialogLike extends HTMLElement {
  show?: () => void;
  hide?: () => void;
}

class IsTreeView extends HTMLElement {
  static get observedAttributes(): string[] { return OBSERVED; }

  #mounted = false;
  #root!: HTMLElement;
  #toolbar!: HTMLElement;
  #body!: HTMLElement;
  #drawer!: _DrawerLike;
  #modalDelete!: _ModalDeleteLike;
  #protectDlg!: _DialogLike;
  #protectRedo!: HTMLElement;
  #protectOk!: HTMLElement;
  #offUi: (() => void) | null = null;
  #adapter: _AdapterLike | null = null;
  #list: unknown[] = [];
  #customs: TreeCustoms | null | undefined = undefined;
  #bAllowed: { Crear?: boolean; Modificar?: boolean; Eliminar?: boolean; Visualizar?: boolean } | undefined = undefined;
  #onError: ((msg: string) => void) | null = null;
  #renderRow: ((node: TNode, el: HTMLElement) => void) | undefined = undefined;
  #renderHelper: ((node: TNode, el: HTMLElement) => void) | undefined = undefined;
  #editMode: string = 'view';
  #pendingRecord: TNode | null = null;
  #lastSelectPath: string = '';

  get list(): unknown[] { return this.#list; }
  set list(v: unknown[]) {
    this.#list = Array.isArray(v) ? v : [];
    if (this.#mounted) this.#pushState();
  }
  get List2Rows(): unknown[] { return this.list; }
  set List2Rows(v: unknown[]) { this.list = v; }

  get customs(): TreeCustoms | null | undefined { return this.#customs; }
  set customs(v: TreeCustoms | null | undefined) {
    this.#customs = v;
    if (this.#adapter) this.#adapter.customs = v;
    if (this.#mounted) this.#pushState();
  }

  get treeController(): _AdapterLike | null { return this.#adapter; }
  set treeController(v: _AdapterLike | null) {
    this.#adapter = v || this.#adapter;
    if (this.#mounted) this.#wireAdapter();
  }

  get bAllowed(): { Crear?: boolean; Modificar?: boolean; Eliminar?: boolean; Visualizar?: boolean } | undefined { return this.#bAllowed; }
  set bAllowed(v: { Crear?: boolean; Modificar?: boolean; Eliminar?: boolean; Visualizar?: boolean } | undefined) {
    this.#bAllowed = v;
    if (this.#mounted) this.#pushState();
  }

  get onError(): ((msg: string) => void) | null { return this.#onError; }
  set onError(v: ((msg: string) => void) | null) {
    this.#onError = v;
    if (this.#adapter) this.#adapter.onError = (msg) => this.#reportError(msg);
  }

  get renderRow(): ((node: TNode, el: HTMLElement) => void) | undefined { return this.#renderRow; }
  set renderRow(v: ((node: TNode, el: HTMLElement) => void) | undefined) { this.#renderRow = v; if (this.#mounted) this.#paint(); }

  get renderHelper(): ((node: TNode, el: HTMLElement) => void) | undefined { return this.#renderHelper; }
  set renderHelper(v: ((node: TNode, el: HTMLElement) => void) | undefined) { this.#renderHelper = v; if (this.#mounted) this.#paint(); }

  get readonly(): boolean { return this.hasAttribute('readonly'); }
  set readonly(v: boolean) { this.toggleAttribute('readonly', !!v); }

  get disabled(): boolean { return this.hasAttribute('disabled'); }
  set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

  get draggable(): boolean { return this.getAttribute('draggable') !== 'false'; }
  set draggable(v: boolean | string) {
    if (v === false || v === 'false') this.setAttribute('draggable', 'false');
    else this.removeAttribute('draggable');
  }

  get labelField(): string { return this.getAttribute('label-field') || 'titulo'; }
  set labelField(v: string) { v ? this.setAttribute('label-field', v) : this.removeAttribute('label-field'); }

  get helperField(): string { return this.getAttribute('helper-field') || ''; }
  set helperField(v: string) { v ? this.setAttribute('helper-field', v) : this.removeAttribute('helper-field'); }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    adoptCss(shadow, import.meta.url);
    this.#root = shadow.querySelector<HTMLElement>('.isp-tree')!;
    this.#toolbar = shadow.querySelector<HTMLElement>('.isp-tree-toolbar')!;
    this.#body = shadow.querySelector<HTMLElement>('.isp-tree-body')!;
    this.#drawer = shadow.querySelector<HTMLElement>('.drawer') as _DrawerLike;
    this.#modalDelete = shadow.querySelector<HTMLElement>('.modal-delete') as _ModalDeleteLike;
    this.#protectDlg = shadow.querySelector<HTMLElement>('.protect-dlg') as _DialogLike;
    this.#protectRedo = shadow.querySelector<HTMLElement>('.protect-redo')!;
    this.#protectOk = shadow.querySelector<HTMLElement>('.protect-ok')!;
  }

  connectedCallback(): void {
    this.#mounted = true;
    this.#upgrade();
    if (!this.#adapter) this.#adapter = new TreeRowViewAdapter() as unknown as _AdapterLike;
    this.#wireAdapter();
    this.#drawer.addEventListener('is-after-hide', this.#onDrawerHide);
    this.#modalDelete.addEventListener('is-confirm-delete', this.#onDeleteConfirm as unknown as EventListener);
    this.#protectOk.addEventListener('click', this.#onProtectOk);
    this.#protectRedo.addEventListener('click', this.#onProtectRedo);
    this.#protectDlg.addEventListener('is-hide', this.#onProtectDismiss);
    document.addEventListener('pointerdown', this.#onOutside, true);
    document.addEventListener('dragend', this.#onDragEnd, true);
    document.addEventListener('pointerup', this.#onDragPointerUp, true);
    this.#root.addEventListener('dragleave', this.#onTreeDragLeave as EventListener, true);
    this.#pushState();
  }

  disconnectedCallback(): void {
    this.#mounted = false;
    this.#offUi?.();
    this.#offUi = null;
    this.#drawer.removeEventListener('is-after-hide', this.#onDrawerHide);
    this.#modalDelete.removeEventListener('is-confirm-delete', this.#onDeleteConfirm as unknown as EventListener);
    this.#protectOk.removeEventListener('click', this.#onProtectOk);
    this.#protectRedo.removeEventListener('click', this.#onProtectRedo);
    this.#protectDlg.removeEventListener('is-hide', this.#onProtectDismiss);
    document.removeEventListener('pointerdown', this.#onOutside, true);
    document.removeEventListener('dragend', this.#onDragEnd, true);
    document.removeEventListener('pointerup', this.#onDragPointerUp, true);
    this.#root.removeEventListener('dragleave', this.#onTreeDragLeave as EventListener, true);
  }

  attributeChangedCallback(): void {
    if (!this.#mounted) return;
    this.#pushState();
  }

  #upgrade(): void {
    for (const p of ['list', 'List2Rows', 'customs', 'treeController', 'bAllowed', 'onError', 'renderRow', 'renderHelper', 'readonly', 'draggable', 'disabled']) {
      if (!Object.prototype.hasOwnProperty.call(this, p)) continue;
      const v = (this as unknown as Record<string, unknown>)[p];
      delete (this as unknown as Record<string, unknown>)[p];
      (this as unknown as Record<string, unknown>)[p] = v;
    }
  }

  #reportError(msg: unknown): void {
    const s = String(msg || '');
    this.#onError?.(s);
    emit(this, 'is-error', { message: s });
  }

  #wireAdapter(): void {
    const a = this.#adapter;
    if (!a) return;
    (a as unknown as { _domRoot: HTMLElement | null })._domRoot = this.#root;
    this.#root.setAttribute('data-tree-root', a.treeRootId);
    (a as unknown as { customs: TreeCustoms | null | undefined }).customs = this.#customs ?? null;
    a.onError = (msg: string) => this.#reportError(msg);
    a.onrequestopendrawer = (mode: string) => {
      this.#editMode = mode === 'create' ? 'edit' : mode;
      this.#openDrawer();
    };
    a.onrequestclosedrawer = () => this.#closeDrawer();
    a.onrequesteditshow = (node: TNode, mode: string) => {
      this.#pendingRecord = node;
      this.#editMode = mode;
      this.#openDrawer();
    };
    a.onrequestdelete = (node: TNode) => {
      this.#pendingRecord = node;
      this.#modalDelete.entity = a.customs?.entrie || 'registro';
      this.#modalDelete.setAttribute('confirm-value', a.getRecordSecurityCode(node));
      this.#modalDelete.setAttribute('pk-label', 'código');
      this.#modalDelete.show?.() ?? this.#modalDelete.setAttribute('open', '');
    };
    this.#offUi?.();
    this.#offUi = a.addUiListener(() => {
      this.#syncProtect();
      this.#paint();
    });
    (a as unknown as { notifySelect: () => void }).notifySelect = () => this.#emitSelect();
  }

  #emitSelect(): void {
    const rec = this.#adapter?.record;
    const path = rec?.flatPath ?? '';
    if (path === this.#lastSelectPath) return;
    this.#lastSelectPath = path;
    if (rec) emit(this, 'is-select', { node: rec, flatPath: rec.flatPath });
  }

  #pushState(): void {
    const a = this.#adapter;
    if (!a) return;
    (a as unknown as { customs: TreeCustoms | null | undefined }).customs = this.#customs ?? null;
    const list = this.#customs?.list ? this.#customs.list() : this.#list;
    a.lastNodesRef = null;
    a.onstateupdate({
      readonly: this.readonly,
      disabled: this.disabled,
      draggable: this.draggable,
      bAllowed: this.#bAllowed,
      List2Rows: list,
      TreeController: a,
      customs: this.#customs,
      onError: (msg: string) => this.#reportError(msg),
      get record(): TRecord | null { return a.record; },
      set record(v: TRecord | null) { a.record = v ?? null; },
    });
    a.onbranchexpand?.();
    this.#paint();
  }

  #paint(): void {
    const a = this.#adapter;
    if (!a) return;
    const rt = a.buildCustomsRuntime();
    const actions = a.decorateHotkeyTitles(a.customs?.topMenuActions?.(rt as never) ?? []);
    const customsExtra = a.customs as unknown as { menu?: TreeActionEntry[]; moreMenu?: TreeActionEntry[] };
    const showTb = !!(customsExtra?.menu || customsExtra?.moreMenu) || (actions?.length ?? 0) > 0;
    this.#toolbar.hidden = !showTb;
    if (showTb) {
      let fo = this.#toolbar.querySelector<HTMLElement & { actions?: TreeActionEntry[] }>('is-flex-options');
      if (!fo) {
        fo = document.createElement('is-flex-options');
        this.#toolbar.append(fo);
      }
      fo.actions = actions;
    }
    this.#body.setAttribute('aria-label', a.customs?.entries || `Árbol de ${a.customs?.entrie || 'registro'}s`);
    this.#body.toggleAttribute('aria-disabled', this.disabled);
    paintForest(this.#body, a as unknown as Parameters<typeof paintForest>[1], a.rootNodes, {
      labelField: this.labelField,
      helperField: this.helperField,
      renderRow: this.#renderRow,
      renderHelper: this.#renderHelper,
    });
    this.#emitSelect();
  }

  #openDrawer(): void {
    const a = this.#adapter;
    if (!a) return;
    const rec = this.#pendingRecord || a.record;
    this.#drawer.label = this.#editMode === 'view' ? 'Visualizar' : this.#editMode === 'create' ? 'Crear' : 'Modificar';
    this.#drawer.show?.() ?? this.#drawer.setAttribute('open', '');
    emit(this, 'is-frm-open', {
      record: rec,
      itdForm: this.#editMode,
      ancestors: rec ? a.walkAncestors(rec) : [],
      isNew: !!(rec && a.isPendingInsertPath?.(rec.flatPath)),
    });
  }

  #closeDrawer(): void {
    this.#drawer.hide?.() ?? this.#drawer.removeAttribute('open');
  }

  #onDrawerHide = (): void => {
    this.#adapter?.closeEditForm?.();
    emit(this, 'is-frm-close', {});
  };

  #onDeleteConfirm = async (e: CustomEvent<{ value?: string }>): Promise<void> => {
    const a = this.#adapter;
    if (!a) return;
    this.#modalDelete.loading = true;
    try {
      const ok = await a.confirmDelete(e?.detail?.value ?? '');
      if (ok) this.#modalDelete.hide?.() ?? this.#modalDelete.removeAttribute('open');
    } finally {
      this.#modalDelete.loading = false;
    }
  };

  #syncProtect(): void {
    const a = this.#adapter;
    if (!a) return;
    const open = !!a.isProtectionPromptOpen;
    if (open) this.#protectDlg.show?.() ?? this.#protectDlg.setAttribute('open', '');
    else this.#protectDlg.hide?.() ?? this.#protectDlg.removeAttribute('open');
    this.#protectRedo.hidden = !a.historyCanRedo;
  }

  #onProtectOk = (): void => { this.#adapter?.confirmProtectionRelease(); this.#protectDlg.hide?.(); };
  #onProtectRedo = (): void => {
    const a = this.#adapter;
    if (!a) return;
    a.historyRedoAll();
    a.confirmProtectionRelease();
    this.#protectDlg.hide?.();
  };
  #onProtectDismiss = (): void => { this.#adapter?.dismissProtectionPrompt(); };
  #onOutside = (e: PointerEvent): void => { this.#adapter?.ontreeoutsidepointerdown(e); };
  #onDragEnd = (): void => { this.#adapter?.clearDragOverlays(); };
  #onDragPointerUp = (): void => {
    const a = this.#adapter;
    if (!a?.currentDragFlatPath) return;
    setTimeout(() => { if (a.currentDragFlatPath) a.clearDragOverlays(); }, 50);
  };
  #onTreeDragLeave = (e: DragEvent): void => {
    const a = this.#adapter;
    if (!a?.currentDragFlatPath) return;
    const rel = e.relatedTarget as Node | null;
    if (rel && this.#root.contains(rel)) return;
    a.clearDropIndicators();
  };

  refresh(): void { this.#pushState(); }
  showDelete(obj: unknown): void { this.#adapter?.showDelete(obj); }
  runCustomsPreSubmit(): unknown { return this.#adapter?.runCustomsPreSubmit?.(); }
}

defineElement('is-tree-view', IsTreeView, 'IsTreeView');
