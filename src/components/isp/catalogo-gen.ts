import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../forms/input.js';
import '../media/icon.js';
import '../data/ag-grid.js';
import '../layout/drawer.js';
import '../layout/dialog.js';
import './confirm-delete.js';
import './modal-verificacion.js';
import './form.js';
import './heading.js';
import './controller-from-config.js';

import type { IspRecord, IspController } from './controller-from-config.js';
import {
  asStr,
  cloneRecord,
  columnsFromController,
  getProp,
  isPresent,
  lowerCase,
  setProp,
  toGridRow,
} from '../_shared/isp-record-utils.js';
/**
 * <is-catalogo-gen> — port de `src/lib/base/CatalogoGen.svelte` (ISP).
 *
 * Catálogo CRUD: toolbar de acciones + `<is-ag-grid>` + drawer de ficha
 * (`slot="frm"`) + modales Verificar / Eliminar / Recodificar / Duplicar /
 * Consolidar. Cada botón aparece solo si el `controller` expone la acción.
 *
 * Propiedades JS
 *   controller   ICtxAction & ICtxGrid (Lista, Columns/columns, primaryKeys,
 *                actCrear?, actModificar?, …, CtxBtnRef?)
 *   bAllowed     { Crear, Modificar, Visualizar, Verificar, Duplicar,
 *                  Recodificar, Eliminar, Consolidar }
 *   onError      (msg) => void
 *   onNewObject  () => Promise<record>
 *   selectionData  array (vivo; se actualiza al seleccionar)
 *
 * Atributos
 *   show-header / show-search / mode-filter / multi-select / select-mode
 *   q-registros / q-rows-header
 *   icon-crear … icon-refrescar
 *
 * Slots
 *   frm   contenido del formulario en el drawer (create/edit/view)
 *
 * Eventos
 *   is-selection-change  { records }
 *   is-double-click      { record }
 *   is-action            { action, record? }
 *   is-error             { message }
 *   is-frm-open          { mode, record }
 *   is-frm-close         {}
 *
 * Métodos: refreshGrid(), showFrmCrear(), showFrmModificar(r), …
 */

/* ──────────────────────────── Tipos locales ───────────────────────────── */

type ActionLabel =
  | 'Crear'
  | 'Modificar'
  | 'Visualizar'
  | 'Verificar'
  | 'Duplicar'
  | 'Recodificar'
  | 'Eliminar'
  | 'Consolidar';

interface BAllowed {
  Crear: boolean;
  Modificar: boolean;
  Visualizar: boolean;
  Verificar: boolean;
  Duplicar: boolean;
  Recodificar: boolean;
  Eliminar: boolean;
  Consolidar: boolean;
}

type IconKind =
  | 'crear'
  | 'modificar'
  | 'visualizar'
  | 'verificar'
  | 'recodificar'
  | 'duplicar'
  | 'eliminar'
  | 'consolidar'
  | 'refrescar';

type FrmMode = 'create' | 'edit' | 'view';

/** Subset de la API del `<is-input>` que consume este componente. */
interface InputElement extends HTMLElement {
  value: string;
  label: string;
  readonly: boolean;
  required: boolean;
  tabIndex: number;
  maxlength: number | null;
}

/** Subset de la API del `<is-button>` que consume este componente. */
interface ButtonElement extends HTMLElement {
  disabled: boolean;
  loading: boolean;
}

/** Subset de la API del `<is-ag-grid>` que consume este componente. */
interface AgGridElement extends HTMLElement {
  api: {
    setRows(rows: Array<IspRecord & { id: string; __record?: IspRecord }>): void;
    setColumns(defs: Array<{ field: string; header?: string }>): void;
    setQuickFilter(text: string): void;
  };
}

/** Subset de la API del `<is-modal-verificacion>` que consume este componente. */
interface VerifyModalElement extends HTMLElement {
  controller: IspController | null;
  record: IspRecord | null;
  entity: string;
  onError: (msg: string) => void;
  show(): void;
  hide(): void;
}

/** Subset de la API del `<is-confirm-delete>` que consume este componente. */
interface ConfirmDeleteElement extends HTMLElement {
  entity: string;
  show(): void;
  hide(): void;
}

/** Subset de la API del `<is-dialog>` que consume este componente. */
interface DialogElement extends HTMLElement {
  show(): void;
  hide(): void;
}

/** Subset del `<is-drawer>` que consume este componente. */
interface DrawerElement extends HTMLElement {
  label: string;
  show(): void;
  hide(): void;
}

/** Detalle del evento `is-row-select` de `<is-ag-grid>`. */
interface GridRowSelectDetail {
  rows: Array<{ id?: string | number; __record?: IspRecord }>;
}

/** Detalle del evento `is-cell-click` de `<is-ag-grid>`. */
interface GridCellClickDetail {
  row: { id?: string | number; __record?: IspRecord };
}

interface PkModalField {
  key: string;
  label: string;
  value?: string;
  readonly?: boolean;
  required?: boolean;
  btnRef?: boolean;
}

interface PkModalCfg {
  title: string;
  fields: PkModalField[];
  okLabel: string;
  hint?: string;
}

/* ──────────────────────────── Constantes ─────────────────────────────── */

const DEFAULT_ALLOWED: BAllowed = {
  Crear: true,
  Modificar: true,
  Visualizar: true,
  Verificar: true,
  Duplicar: true,
  Recodificar: true,
  Eliminar: true,
  Consolidar: true,
};

const DEFAULT_ICONS: Record<IconKind, string> = {
  crear: 'mdi:add',
  modificar: 'mdi:pencil-outline',
  visualizar: 'mdi:eye-outline',
  verificar: 'mdi:check',
  recodificar: 'mdi:key-variant',
  duplicar: 'mdi:content-duplicate',
  eliminar: 'mdi:trash-can-outline',
  consolidar: 'mdi:merge',
  refrescar: 'mdi:refresh',
};

const OBSERVED = [
  'show-header', 'show-search', 'mode-filter', 'multi-select', 'select-mode',
  'q-registros', 'q-rows-header',
  'icon-crear', 'icon-modificar', 'icon-visualizar', 'icon-verificar',
  'icon-recodificar', 'icon-duplicar', 'icon-eliminar', 'icon-consolidar',
  'icon-refrescar',
] as const;

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="root" class="root">
      <section part="toolbar" class="toolbar" hidden>
        <div class="actions"></div>
        <is-input class="search" label="Buscar..." label-placement="float" data-typing-delay="400"></is-input>
      </section>
      <div part="grid-wrap" class="grid-wrap">
        <is-ag-grid class="grid" selectable toolbar="false" style="height: 100%; min-height: 16rem;"></is-ag-grid>
      </div>
      <is-drawer part="drawer" class="drawer" light-dismiss label="Ficha">
        <div class="drawer-body">
          <slot name="frm"></slot>
        </div>
      </is-drawer>
      <is-modal-verificacion class="modal-verify"></is-modal-verificacion>
      <is-confirm-delete class="modal-delete"></is-confirm-delete>
      <is-dialog class="pk-dlg" exportparts="backdrop: pk-backdrop, dialog: pk-modal">
        <span slot="label" class="pk-title"></span>
        <div class="pk-fields"></div>
        <div class="pk-actions" slot="footer">
          <is-button class="pk-cancel" color="neutral" variant="outlined"
                     data-dialog="close" tabindex="0">Cancelar</is-button>
          <is-button class="pk-ok" color="brand" tabindex="0">Aceptar</is-button>
        </div>
      </is-dialog>
    </div>
  `;

  class IsCatalogoGen extends HTMLElement {
    static get observedAttributes(): string[] { return [...OBSERVED]; }

    #mounted = false;
    #toolbar!: HTMLElement;
    #actionsEl!: HTMLElement;
    #search!: InputElement;
    #grid!: AgGridElement;
    #drawer!: DrawerElement;
    #modalVerify!: VerifyModalElement;
    #modalDelete!: ConfirmDeleteElement;
    #pkDlg!: DialogElement;
    #pkTitle!: HTMLElement;
    #pkFields!: HTMLElement;
    #pkCancel!: ButtonElement;
    #pkOk!: ButtonElement;
    #recordsById = new Map<string, IspRecord>();
    #working: IspRecord | null = null;
    #pkKind: ((value: Record<string, string> | null) => void) | null = null;
    #pkResolve: (() => Record<string, string> | null) | null = null;

    /** Controller activo. Compatible con `IspController` de `controller-from-config.ts`. */
    #controller: IspController | null = null;
    get controller(): IspController | null { return this.#controller; }
    set controller(v: IspController | null) {
      this.#controller = v;
      if (this.#mounted) {
        this.#actionsEl.replaceChildren();
        this.#rebuildToolbar();
        void this.refreshGrid();
      }
    }

    /** Permisos por acción; ausente → todas permitidas (ver `DEFAULT_ALLOWED`). */
    bAllowed: BAllowed = { ...DEFAULT_ALLOWED };

    /** Callback de error. Default: emite `is-error` + `console.error`. */
    onError: (msg: string) => void = (msg) => {
      emit(this, 'is-error', { message: msg });
      console.error(msg);
    };

    /** Cómo construir un objeto nuevo; opcional (default = `controller.klass`). */
    onNewObject: (() => Promise<IspRecord>) | null = null;

    /** Selección viva; se reescribe al disparar `is-row-select` del grid. */
    selectionData: IspRecord[] = [];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#toolbar = shadow.querySelector<HTMLElement>('.toolbar')!;
      this.#actionsEl = shadow.querySelector<HTMLElement>('.actions')!;
      this.#search = shadow.querySelector<InputElement>('.search')!;
      this.#grid = shadow.querySelector<AgGridElement>('.grid')!;
      this.#drawer = shadow.querySelector<DrawerElement>('.drawer')!;
      this.#modalVerify = shadow.querySelector<VerifyModalElement>('.modal-verify')!;
      this.#modalDelete = shadow.querySelector<ConfirmDeleteElement>('.modal-delete')!;
      this.#pkDlg = shadow.querySelector<DialogElement>('.pk-dlg')!;
      this.#pkTitle = shadow.querySelector<HTMLElement>('.pk-title')!;
      this.#pkFields = shadow.querySelector<HTMLElement>('.pk-fields')!;
      this.#pkCancel = shadow.querySelector<ButtonElement>('.pk-cancel')!;
      this.#pkOk = shadow.querySelector<ButtonElement>('.pk-ok')!;
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#upgradeProps();
      this.#search.addEventListener('is-typing-end', this.#onSearch);
      this.#grid?.addEventListener('is-row-select', this.#onRowSelect);
      this.#grid?.addEventListener('is-cell-click', this.#onCellClick);
      this.#drawer.addEventListener('is-after-hide', this.#onDrawerHide);
      this.#modalDelete.addEventListener('is-confirm-delete', this.#onDeleteConfirm);
      this.#pkOk.addEventListener('click', this.#onPkOk);
      // Cancelar lleva `data-dialog="close"`; Escape / backdrop / ese botón
      // pasan todos por `is-hide` de ModalBase, así que basta un listener.
      this.#pkDlg.addEventListener('is-hide', this.#onPkDismiss);
      this.#syncChrome();
      this.#rebuildToolbar();
      void this.refreshGrid();
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#search.removeEventListener('is-typing-end', this.#onSearch);
      this.#grid?.removeEventListener('is-row-select', this.#onRowSelect);
      this.#grid?.removeEventListener('is-cell-click', this.#onCellClick);
      this.#drawer.removeEventListener('is-after-hide', this.#onDrawerHide);
      this.#modalDelete.removeEventListener('is-confirm-delete', this.#onDeleteConfirm);
      this.#pkOk.removeEventListener('click', this.#onPkOk);
      this.#pkDlg.removeEventListener('is-hide', this.#onPkDismiss);
    }

    attributeChangedCallback(): void {
      if (!this.#mounted) return;
      this.#syncChrome();
      this.#rebuildToolbar();
    }

    #upgradeProps(): void {
      type PropKey = 'bAllowed' | 'onError' | 'onNewObject' | 'selectionData';
      const keys: PropKey[] = ['bAllowed', 'onError', 'onNewObject', 'selectionData'];
      const self = this as unknown as Record<PropKey, unknown>;
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(this, k)) {
          const v = self[k];
          delete self[k];
          self[k] = v;
        }
      }
    }

    get showHeader(): boolean {
      return this.hasAttribute('show-header') ? this.getAttribute('show-header') !== 'false' : true;
    }
    set showHeader(v: boolean) { this.toggleAttribute('show-header', !!v); }

    get showSearch(): boolean {
      return this.hasAttribute('show-search') ? this.getAttribute('show-search') !== 'false' : true;
    }
    set showSearch(v: boolean) { this.toggleAttribute('show-search', !!v); }

    get modeFilter(): boolean {
      return this.hasAttribute('mode-filter') ? this.getAttribute('mode-filter') !== 'false' : true;
    }
    set modeFilter(v: boolean) { this.toggleAttribute('mode-filter', !!v); }

    get multiSelect(): boolean { return this.hasAttribute('multi-select'); }
    set multiSelect(v: boolean) { this.toggleAttribute('multi-select', !!v); }

    get selectMode(): boolean { return this.hasAttribute('select-mode'); }
    set selectMode(v: boolean) { this.toggleAttribute('select-mode', !!v); }

    get qRegistros(): number {
      const n = Number(this.getAttribute('q-registros'));
      return Number.isFinite(n) && n > 0 ? n : 10000;
    }
    set qRegistros(v: number) { this.setAttribute('q-registros', String(v)); }

    get qRowsHeader(): number {
      const n = Number(this.getAttribute('q-rows-header'));
      return Number.isFinite(n) && n > 0 ? n : 2;
    }
    set qRowsHeader(v: number) { this.setAttribute('q-rows-header', String(v)); }

    #icon(kind: IconKind): string {
      const attr = this.getAttribute(`icon-${kind}`);
      return attr || DEFAULT_ICONS[kind] || 'mdi:circle';
    }

    #pkField(): string {
      const keys = this.controller?.primaryKeys;
      return keys?.length ? asStr(keys.at(-1)) : 'id';
    }

    #syncChrome(): void {
      this.#toolbar.hidden = !this.showHeader || this.selectMode;
      this.#search.hidden = !this.showSearch;
      this.#toolbar.style.setProperty('--is-cat-rows', String(this.qRowsHeader));
      if (!this.#grid) return;
      this.#grid.setAttribute('row-selection', this.multiSelect || this.selectMode ? 'multiple' : 'single');
      if (this.multiSelect || this.selectMode) this.#grid.setAttribute('selectable', '');
      else this.#grid.removeAttribute('selectable');
    }

    #allowed(action: ActionLabel): boolean {
      return this.bAllowed?.[action] !== false;
    }

    #hasAct(name: keyof IspController): boolean {
      return typeof this.controller?.[name] === 'function';
    }

    #rebuildToolbar(): void {
      if (this.selectMode || !this.showHeader) {
        this.#actionsEl.replaceChildren();
        return;
      }

      // Si ya hay botones, solo actualizar disabled (evita flickering al seleccionar).
      if (this.#actionsEl.childElementCount > 0) {
        this.#syncToolbarDisabled();
        return;
      }

      interface ToolDef {
        act: keyof IspController;
        allow: ActionLabel;
        icon: IconKind;
        label: string;
        needsSel: boolean;
        run: () => void;
      }

      const defs: ToolDef[] = [
        { act: 'actCrear',      allow: 'Crear',       icon: 'crear',      label: 'Crear',       needsSel: false, run: () => this.showFrmCrear() },
        { act: 'actModificar',  allow: 'Modificar',   icon: 'modificar',  label: 'Modificar',   needsSel: true,  run: () => this.showFrmModificar(this.selectionData[0]) },
        { act: 'actVisualizar', allow: 'Visualizar',  icon: 'visualizar', label: 'Visualizar',  needsSel: true,  run: () => this.showFrmVisualizar(this.selectionData[0]) },
        { act: 'actVerificar',  allow: 'Verificar',   icon: 'verificar',  label: 'Verificar',   needsSel: true,  run: () => this.showVerificar(this.selectionData[0]) },
        { act: 'actRecodificar',allow: 'Recodificar', icon: 'recodificar',label: 'Recodificar', needsSel: true,  run: () => this.showRecodificar(this.selectionData[0]) },
        { act: 'actDuplicar',   allow: 'Duplicar',    icon: 'duplicar',   label: 'Duplicar',    needsSel: true,  run: () => this.showDuplicar(this.selectionData[0]) },
        { act: 'actEliminar',   allow: 'Eliminar',    icon: 'eliminar',   label: 'Eliminar',    needsSel: true,  run: () => this.showEliminar(this.selectionData[0]) },
        { act: 'actConsolidar', allow: 'Consolidar',  icon: 'consolidar', label: 'Consolidar',  needsSel: true,  run: () => this.showConsolidar(this.selectionData[0]) },
      ];

      for (const d of defs) {
        if (!this.#hasAct(d.act)) continue;
        const btn = document.createElement('is-button') as unknown as ButtonElement;
        btn.setAttribute('variant', 'plain');
        btn.setAttribute('color', 'neutral');
        btn.className = 'tool-btn';
        btn.dataset['allow'] = d.allow;
        btn.dataset['needsSel'] = d.needsSel ? '1' : '0';
        btn.innerHTML = `<is-icon slot="start" icon="${this.#icon(d.icon)}"></is-icon>${d.label}`;
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          if (!this.#allowed(d.allow)) return this.onError(`No tiene permisos para ${d.label.toLowerCase()}`);
          d.run();
        });
        this.#actionsEl.appendChild(btn);
      }

      const refresh = document.createElement('is-button') as unknown as ButtonElement;
      refresh.setAttribute('variant', 'plain');
      refresh.setAttribute('color', 'neutral');
      refresh.className = 'tool-btn';
      refresh.dataset['static'] = 'refresh';
      refresh.innerHTML = `<is-icon slot="start" icon="${this.#icon('refrescar')}"></is-icon>Refrescar`;
      refresh.addEventListener('click', () => void this.refreshGrid());
      this.#actionsEl.appendChild(refresh);

      const modeBtn = document.createElement('is-button') as unknown as ButtonElement;
      modeBtn.setAttribute('variant', 'plain');
      modeBtn.setAttribute('color', 'neutral');
      modeBtn.className = 'tool-btn';
      modeBtn.dataset['static'] = 'mode';
      const filtro = this.modeFilter;
      modeBtn.innerHTML = `<is-icon slot="start" icon="${filtro ? 'mdi:database-arrow-down-outline' : 'mdi:download-multiple-outline'}"></is-icon>Modo&nbsp;${filtro ? 'filtro' : 'lista'}`;
      modeBtn.addEventListener('click', () => {
        this.modeFilter = !this.modeFilter;
        this.#actionsEl.replaceChildren();
        this.#rebuildToolbar();
        void this.refreshGrid();
      });
      this.#actionsEl.appendChild(modeBtn);

      this.#syncToolbarDisabled();
    }

    #syncToolbarDisabled(): void {
      const hasSel = isPresent(this.selectionData);
      for (const btn of this.#actionsEl.querySelectorAll<HTMLElement>('.tool-btn')) {
        if (btn.dataset['static']) continue;
        const needsSel = btn.dataset['needsSel'] === '1';
        const allow = btn.dataset['allow'] as ActionLabel | undefined;
        if (!allow) continue;
        btn.toggleAttribute('disabled', !this.#allowed(allow) || (needsSel && !hasSel));
      }
    }

    #onSearch = (): void => {
      const q = asStr(this.#search.value).trim();
      this.#grid?.api?.setQuickFilter?.(q);
    };

    #onRowSelect = (e: Event): void => {
      const detail = (e as CustomEvent<GridRowSelectDetail>).detail;
      const rows = detail?.rows || [];
      this.selectionData = rows
        .map((r) => r.__record ?? this.#recordsById.get(asStr(r.id)) ?? r)
        .filter((r): r is IspRecord => Boolean(r));
      this.#rebuildToolbar();
      emit(this, 'is-selection-change', { records: this.selectionData });
    };

    #lastClick: { id: string | null; t: number } = { id: null, t: 0 };
    #onCellClick = (e: Event): void => {
      const detail = (e as CustomEvent<GridCellClickDetail>).detail;
      const row = detail?.row;
      if (!row) return;
      const id = asStr(row.id);
      const now = Date.now();
      if (this.#lastClick.id === id && now - this.#lastClick.t < 400) {
        const record = row.__record ?? this.#recordsById.get(id) ?? row;
        emit(this, 'is-double-click', { record });
        if (this.selectMode) return;
        if (this.#hasAct('actModificar') && this.#allowed('Modificar')) this.showFrmModificar(record);
        else if (this.#hasAct('actVisualizar') && this.#allowed('Visualizar')) this.showFrmVisualizar(record);
      }
      this.#lastClick = { id, t: now };
    };

    #onDrawerHide = (): void => {
      emit(this, 'is-frm-close', {});
    };

    async refreshGrid(): Promise<void> {
      if (!this.#grid) return;
      const ctrl = this.controller;
      if (!ctrl || typeof ctrl.Lista !== 'function') {
        this.#grid.api?.setRows?.([]);
        return;
      }
      try {
        const cols = columnsFromController(ctrl);
        if (cols.length) this.#grid.api?.setColumns?.(cols);
        const lista = await ctrl.Lista({
          pagina: 1,
          qregistros: this.qRegistros,
          filtro: { sql: '' },
        });
        const datos = lista?.datos || [];
        const arr = Array.isArray(datos) ? datos : [...datos];
        const pks = ctrl.primaryKeys || [];
        this.#recordsById.clear();
        const rows = arr.map((rec) => {
          const row = toGridRow(rec, pks) as IspRecord & { id: string; __record?: IspRecord };
          this.#recordsById.set(asStr(row['id']), rec);
          return row;
        });
        this.#grid.api?.setRows?.(rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(msg);
      }
    }

    #openDrawer(mode: FrmMode, record: IspRecord): void {
      this.#working = record;
      this.#drawer.label = `${mode === 'create' ? 'Crear' : mode === 'edit' ? 'Modificar' : 'Visualizar'} ${asStr(this.controller?.entrie || '')}`;
      this.#drawer.show?.() ?? this.#drawer.setAttribute('open', '');
      emit(this, 'is-frm-open', { mode, record });
      emit(this, 'is-action', { action: mode === 'create' ? 'Crear' : mode === 'edit' ? 'Modificar' : 'Visualizar', record });
    }

    closeFrm(): void {
      this.#drawer.hide?.() ?? this.#drawer.removeAttribute('open');
      this.#working = null;
    }

    async showFrmCrear(): Promise<void> {
      if (!this.#allowed('Crear')) return this.onError('No tiene permisos para crear nuevos registros');
      let obj: IspRecord;
      if (this.onNewObject) obj = await this.onNewObject();
      else if (typeof this.controller?.klass === 'function') obj = new this.controller.klass();
      else obj = {};
      this.#openDrawer('create', obj);
    }

    showFrmModificar(obj: IspRecord | undefined): void {
      if (!obj) return;
      if (!this.#allowed('Modificar')) return this.onError('No tiene permisos para modificar este registro');
      this.#openDrawer('edit', obj);
    }

    showFrmVisualizar(obj: IspRecord | undefined): void {
      if (!obj) return;
      if (!this.#allowed('Visualizar')) return this.onError('No tiene permisos para visualizar este registro');
      this.#openDrawer('view', obj);
    }

    showVerificar(obj: IspRecord | undefined): void {
      if (!obj) return;
      if (!this.#allowed('Verificar')) return this.onError('No tiene permisos para verificar este registro');
      this.#modalVerify.controller = this.controller;
      this.#modalVerify.record = obj;
      this.#modalVerify.entity = asStr(this.controller?.entrie || '');
      this.#modalVerify.onError = this.onError;
      this.#modalVerify.show?.();
      emit(this, 'is-action', { action: 'Verificar', record: obj });
    }

    showEliminar(obj: IspRecord | undefined): void {
      if (!obj) return;
      if (!this.#allowed('Eliminar')) return this.onError('No tiene permisos para eliminar este registro');
      this.#working = obj;
      const pk = this.#pkField();
      const val = asStr(getProp(obj, pk));
      this.#modalDelete.entity = asStr(this.controller?.entrie || 'registro');
      this.#modalDelete.setAttribute('pk-label', asStr(this.controller?.labelPk || pk));
      this.#modalDelete.setAttribute('confirm-value', val);
      this.#modalDelete.show?.() ?? this.#modalDelete.setAttribute('open', '');
      emit(this, 'is-action', { action: 'Eliminar', record: obj });
    }

    #onDeleteConfirm = async (): Promise<void> => {
      const obj = this.#working;
      this.#modalDelete.hide?.() ?? this.#modalDelete.removeAttribute('open');
      if (!obj || !this.#hasAct('actEliminar') || !this.controller?.actEliminar) return;
      try {
        await this.controller.actEliminar(obj);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo eliminar.\n${msg}`);
      }
    };

    async showRecodificar(obj: IspRecord | undefined): Promise<void> {
      if (!obj) return;
      if (!this.#allowed('Recodificar')) return this.onError('No tiene permisos para recodificar este registro');
      const pk = this.#pkField();
      const label = lowerCase(this.controller?.labelPk || pk);
      const nuevo = await this.#openPkModal({
        title: `Recodificar ${asStr(this.controller?.entrie || '')}`,
        fields: [
          { key: 'actual', label: `Actual ${label}`, value: asStr(getProp(obj, pk)), readonly: true },
          { key: 'nuevo', label: `Nuevo ${label}`, value: '', required: true },
        ],
        okLabel: 'Recodificar',
      });
      if (!nuevo || !this.controller?.actRecodificar) return;
      try {
        const work = cloneRecord(obj);
        setProp(work, pk, nuevo['nuevo']);
        await this.controller.actRecodificar(obj, work);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo recodificar.\n${msg}`);
      }
    }

    async showDuplicar(obj: IspRecord | undefined): Promise<void> {
      if (!obj) return;
      if (!this.#allowed('Duplicar')) return this.onError('No tiene permisos para duplicar este registro');
      const pk = this.#pkField();
      const label = lowerCase(this.controller?.labelPk || pk);
      const nuevo = await this.#openPkModal({
        title: `Duplicar ${lowerCase(this.controller?.entrie || '')}`,
        fields: [
          { key: 'nuevo', label: `Nuevo ${label}`, value: '', required: true },
        ],
        okLabel: 'Duplicar',
      });
      if (!nuevo || !this.controller?.actDuplicar) return;
      try {
        const work = cloneRecord(obj);
        setProp(work, pk, nuevo['nuevo']);
        await this.controller.actDuplicar(obj, work);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo duplicar.\n${msg}`);
      }
    }

    async showConsolidar(obj: IspRecord | undefined): Promise<void> {
      if (!obj) return;
      if (!this.#allowed('Consolidar')) return this.onError('No tiene permisos para consolidar este registro');
      const pk = this.#pkField();
      const label = lowerCase(this.controller?.labelPk || pk);
      const fields: PkModalField[] = [
        { key: 'actual', label: `Actual ${label}`, value: asStr(getProp(obj, pk)), readonly: true },
        { key: 'nuevo', label: `Nuevo ${label}`, value: '', required: true, btnRef: !!this.controller?.CtxBtnRef },
      ];
      const nuevo = await this.#openPkModal({
        title: `Consolidar ${lowerCase(this.controller?.entrie || '')}`,
        fields,
        okLabel: 'Consolidar',
        hint: `Seleccione el ${label} con el cual desea consolidar`,
      });
      if (!nuevo || !this.controller?.actConsolidar) return;
      try {
        const work = cloneRecord(obj);
        setProp(work, pk, nuevo['nuevo']);
        await this.controller.actConsolidar(obj, work);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo consolidar.\n${msg}`);
      }
    }

    /**
     * Abre el modal genérico de captura/edición de PK (Recodificar, Duplicar,
     * Consolidar). Devuelve `{ key → value }` o `null` si el usuario cancela.
     */
    async #openPkModal(cfg: PkModalCfg): Promise<Record<string, string> | null> {
      this.#pkTitle.textContent = cfg.title;
      this.#pkFields.replaceChildren();
      if (cfg.hint) {
        const p = document.createElement('p');
        p.className = 'pk-hint';
        p.textContent = cfg.hint;
        this.#pkFields.appendChild(p);
      }
      const inputs = new Map<string, HTMLElement>();
      for (const f of cfg.fields) {
        if (f.btnRef && this.controller?.CtxBtnRef) {
          await import('./btn-ref.js');
          const br = document.createElement('is-btn-ref') as unknown as HTMLElement & {
            label: string;
            controller: IspController | null;
            required: boolean;
            value: string;
            tabIndex: number;
          };
          br.label = f.label;
          br.controller = this.controller.CtxBtnRef;
          br.required = !!f.required;
          br.value = f.value || '';
          br.tabIndex = 0;
          this.#pkFields.appendChild(br);
          inputs.set(f.key, br);
        } else {
          const inp = document.createElement('is-input') as unknown as InputElement;
          inp.setAttribute('label-placement', 'float');
          inp.tabIndex = 0;
          inp.label = f.label;
          inp.value = f.value || '';
          if (f.readonly) inp.readonly = true;
          if (f.required) inp.required = true;
          const max = this.controller?.sizePk;
          if (max) inp.setAttribute('maxlength', String(max));
          this.#pkFields.appendChild(inp);
          inputs.set(f.key, inp);
        }
      }
      this.#pkOk.textContent = cfg.okLabel;
      this.#pkDlg.show();
      return new Promise((resolve) => {
        this.#pkResolve = () => {
          const out: Record<string, string> = {};
          for (const [k, el] of inputs) out[k] = asStr((el as InputElement).value);
          const missing = cfg.fields.find((f) => f.required && !isPresent(out[f.key]));
          if (missing) {
            this.onError(`Complete el campo "${missing.label}"`);
            return null;
          }
          return out;
        };
        this.#pkKind = resolve;
      });
    }

    #onPkOk = (): void => { this.#closePkModal(true); };

    #onPkDismiss = (): void => { this.#closePkModal(false); };

    #closePkModal(ok: boolean): void {
      this.#pkDlg.hide();
      const resolve = this.#pkKind;
      const gather = this.#pkResolve;
      this.#pkKind = null;
      this.#pkResolve = null;
      if (!resolve) return;
      if (!ok) return resolve(null);
      resolve(gather ? gather() : null);
    }
  }

  defineElement('is-catalogo-gen', IsCatalogoGen);
})();