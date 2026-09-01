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

class IsTreeView extends HTMLElement {
  static get observedAttributes(): string[] { return OBSERVED; }

  #mounted = false;
  #root!: HTMLElement;
  #toolbar!: HTMLElement;
  #body!: HTMLElement;
  #drawer!: HTMLElement;
  #modalDelete!: HTMLElement;
  #protectDlg!: HTMLElement;
  #protectRedo!: HTMLElement;
  #protectOk!: HTMLElement;
  #offUi;
  #adapter;
  #list = [];
  #customs;
  #bAllowed;
  #onError;
  #renderRow;
  #renderHelper;
  #editMode = 'view';
  #pendingRecord = null;
  #lastSelectPath = '';

  get list() { return this.#list; }
  set list(v) {
    this.#list = Array.isArray(v) ? v : [];
    if (this.#mounted) this.#pushState();
  }
  get List2Rows() { return this.list; }
  set List2Rows(v) { this.list = v; }

  get customs() { return this.#customs; }
  set customs(v) {
    this.#customs = v;
    if (this.#adapter) this.#adapter.customs = v;
    if (this.#mounted) this.#pushState();
  }

  get treeController() { return this.#adapter; }
  set treeController(v) {
    this.#adapter = v || this.#adapter;
    if (this.#mounted) this.#wireAdapter();
  }

  get bAllowed() { return this.#bAllowed; }
  set bAllowed(v) {
    this.#bAllowed = v;
    if (this.#mounted) this.#pushState();
  }

  get onError() { return this.#onError; }
  set onError(v) {
    this.#onError = v;
    if (this.#adapter) this.#adapter.onError = (msg) => this.#reportError(msg);
  }

  get renderRow() { return this.#renderRow; }
  set renderRow(v) { this.#renderRow = v; if (this.#mounted) this.#paint(); }

  get renderHelper() { return this.#renderHelper; }
  set renderHelper(v) { this.#renderHelper = v; if (this.#mounted) this.#paint(); }

  get readonly() { return this.hasAttribute('readonly'); }
  set readonly(v) { this.toggleAttribute('readonly', !!v); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  get draggable() { return this.getAttribute('draggable') !== 'false'; }
  set draggable(v) {
    if (v === false || v === 'false') this.setAttribute('draggable', 'false');
    else this.removeAttribute('draggable');
  }

  get labelField() { return this.getAttribute('label-field') || 'titulo'; }
  set labelField(v) { v ? this.setAttribute('label-field', v) : this.removeAttribute('label-field'); }

  get helperField() { return this.getAttribute('helper-field') || ''; }
  set helperField(v) { v ? this.setAttribute('helper-field', v) : this.removeAttribute('helper-field'); }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    adoptCss(shadow, import.meta.url);
    this.#root = shadow.querySelector<HTMLElement>('.isp-tree')!;
    this.#toolbar = shadow.querySelector<HTMLElement>('.isp-tree-toolbar')!;
    this.#body = shadow.querySelector<HTMLElement>('.isp-tree-body')!;
    this.#drawer = shadow.querySelector<HTMLElement>('.drawer')!;
    this.#modalDelete = shadow.querySelector<HTMLElement>('.modal-delete')!;
    this.#protectDlg = shadow.querySelector<HTMLElement>('.protect-dlg')!;
    this.#protectRedo = shadow.querySelector<HTMLElement>('.protect-redo')!;
    this.#protectOk = shadow.querySelector<HTMLElement>('.protect-ok')!;
  }

  connectedCallback(): void {
    this.#mounted = true;
    this.#upgrade();
    if (!this.#adapter) this.#adapter = new TreeRowViewAdapter({});
    this.#wireAdapter();
    this.#drawer.addEventListener('is-after-hide', this.#onDrawerHide);
    this.#modalDelete.addEventListener('is-confirm-delete', this.#onDeleteConfirm);
    this.#protectOk.addEventListener('click', this.#onProtectOk);
    this.#protectRedo.addEventListener('click', this.#onProtectRedo);
    this.#protectDlg.addEventListener('is-hide', this.#onProtectDismiss);
    document.addEventListener('pointerdown', this.#onOutside, true);
    document.addEventListener('dragend', this.#onDragEnd, true);
    document.addEventListener('pointerup', this.#onDragPointerUp, true);
    this.#root.addEventListener('dragleave', this.#onTreeDragLeave, true);
    this.#pushState();
  }

  disconnectedCallback(): void {
    this.#mounted = false;
    this.#offUi?.();
    this.#offUi = null;
    this.#drawer.removeEventListener('is-after-hide', this.#onDrawerHide);
    this.#modalDelete.removeEventListener('is-confirm-delete', this.#onDeleteConfirm);
    this.#protectOk.removeEventListener('click', this.#onProtectOk);
    this.#protectRedo.removeEventListener('click', this.#onProtectRedo);
    this.#protectDlg.removeEventListener('is-hide', this.#onProtectDismiss);
    document.removeEventListener('pointerdown', this.#onOutside, true);
    document.removeEventListener('dragend', this.#onDragEnd, true);
    document.removeEventListener('pointerup', this.#onDragPointerUp, true);
    this.#root.removeEventListener('dragleave', this.#onTreeDragLeave, true);
  }

  attributeChangedCallback() {
    if (!this.#mounted) return;
    this.#pushState();
  }

  #upgrade() {
    for (const p of ['list', 'List2Rows', 'customs', 'treeController', 'bAllowed', 'onError', 'renderRow', 'renderHelper', 'readonly', 'draggable', 'disabled']) {
      if (!Object.prototype.hasOwnProperty.call(this, p)) continue;
      const v = this[p];
      delete this[p];
      this[p] = v;
    }
  }

  #reportError(msg) {
    const s = String(msg || '');
    this.#onError?.(s);
    emit(this, 'is-error', { message: s });
  }

  #wireAdapter() {
    const a = this.#adapter;
    a._domRoot = this.#root;
    this.#root.setAttribute('data-tree-root', a.treeRootId);
    a.customs = this.#customs;
    a.onError = (msg) => this.#reportError(msg);
    a.onrequestopendrawer = (mode) => {
      this.#editMode = mode === 'create' ? 'edit' : mode;
      this.#openDrawer();
    };
    a.onrequestclosedrawer = () => this.#closeDrawer();
    a.onrequesteditshow = (node, mode) => {
      this.#pendingRecord = node;
      this.#editMode = mode;
      this.#openDrawer();
    };
    a.onrequestdelete = (node) => {
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
    a.notifySelect = () => this.#emitSelect();
  }

  #emitSelect() {
    const rec = this.#adapter?.record;
    const path = rec?.flatPath ?? '';
    if (path === this.#lastSelectPath) return;
    this.#lastSelectPath = path;
    if (rec) emit(this, 'is-select', { node: rec, flatPath: rec.flatPath });
  }

  #pushState() {
    const a = this.#adapter;
    if (!a) return;
    a.customs = this.#customs;
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
      onError: (msg) => this.#reportError(msg),
      get record() { return a.record; },
      set record(v) { a.record = v ?? null; },
    });
    a.onbranchexpand?.();
    this.#paint();
  }

  #paint() {
    const a = this.#adapter;
    if (!a) return;
    const rt = a.buildCustomsRuntime();
    const actions = a.decorateHotkeyTitles(a.customs?.topMenuActions?.(rt) ?? []);
    const showTb = !!(a.customs?.menu || a.customs?.moreMenu) || (actions?.length ?? 0) > 0;
    this.#toolbar.hidden = !showTb;
    if (showTb) {
      let fo = this.#toolbar.querySelector<HTMLElement>('is-flex-options');
      if (!fo) {
        fo = document.createElement('is-flex-options');
        this.#toolbar.append(fo);
      }
      fo.actions = actions;
    }
    this.#body.setAttribute('aria-label', a.customs?.entries || `Árbol de ${a.customs?.entrie || 'registro'}s`);
    this.#body.toggleAttribute('aria-disabled', this.disabled);
    paintForest(this.#body, a, a.rootNodes, {
      labelField: this.labelField,
      helperField: this.helperField,
      renderRow: this.#renderRow,
      renderHelper: this.#renderHelper,
    });
    this.#emitSelect();
  }

  #openDrawer() {
    const a = this.#adapter;
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

  #closeDrawer() {
    this.#drawer.hide?.() ?? this.#drawer.removeAttribute('open');
  }

  #onDrawerHide = () => {
    this.#adapter?.closeEditForm?.();
    emit(this, 'is-frm-close', {});
  };

  #onDeleteConfirm = async (e) => {
    const a = this.#adapter;
    this.#modalDelete.loading = true;
    try {
      const ok = await a.confirmDelete(e?.detail?.value ?? '');
      if (ok) this.#modalDelete.hide?.() ?? this.#modalDelete.removeAttribute('open');
    } finally {
      this.#modalDelete.loading = false;
    }
  };

  #syncProtect() {
    const a = this.#adapter;
    if (!a) return;
    const open = !!a.isProtectionPromptOpen;
    if (open) this.#protectDlg.show?.() ?? this.#protectDlg.setAttribute('open', '');
    else this.#protectDlg.hide?.() ?? this.#protectDlg.removeAttribute('open');
    this.#protectRedo.hidden = !a.historyCanRedo;
  }

  #onProtectOk = () => { this.#adapter?.confirmProtectionRelease(); this.#protectDlg.hide?.(); };
  #onProtectRedo = () => {
    this.#adapter?.historyRedoAll();
    this.#adapter?.confirmProtectionRelease();
    this.#protectDlg.hide?.();
  };
  #onProtectDismiss = () => { this.#adapter?.dismissProtectionPrompt(); };
  #onOutside = (e) => { this.#adapter?.ontreeoutsidepointerdown(e); };
  #onDragEnd = () => { this.#adapter?.clearDragOverlays(); };
  #onDragPointerUp = () => {
    const a = this.#adapter;
    if (!a?.currentDragFlatPath) return;
    setTimeout(() => { if (a.currentDragFlatPath) a.clearDragOverlays(); }, 50);
  };
  #onTreeDragLeave = (e) => {
    const a = this.#adapter;
    if (!a?.currentDragFlatPath) return;
    const rel = e.relatedTarget;
    if (rel && this.#root.contains(rel)) return;
    a.clearDropIndicators();
  };

  refresh() { this.#pushState(); }
  showDelete(obj) { this.#adapter?.showDelete(obj); }
  runCustomsPreSubmit() { return this.#adapter?.runCustomsPreSubmit(); }
}

defineElement('is-tree-view', IsTreeView, 'IsTreeView');
