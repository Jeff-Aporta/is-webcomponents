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

const DEFAULT_ALLOWED = {
  Crear: true,
  Modificar: true,
  Visualizar: true,
  Verificar: true,
  Duplicar: true,
  Recodificar: true,
  Eliminar: true,
  Consolidar: true,
};

const DEFAULT_ICONS = {
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

  const OBSERVED = [
    'show-header', 'show-search', 'mode-filter', 'multi-select', 'select-mode',
    'q-registros', 'q-rows-header',
    'icon-crear', 'icon-modificar', 'icon-visualizar', 'icon-verificar',
    'icon-recodificar', 'icon-duplicar', 'icon-eliminar', 'icon-consolidar',
    'icon-refrescar',
  ];

  class IsCatalogoGen extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }

    #mounted = false;
    #toolbar!: HTMLElement;
    #actionsEl!: HTMLElement;
    #search!: HTMLElement;
    #grid!: HTMLElement;
    #drawer!: HTMLElement;
    #modalVerify!: HTMLElement;
    #modalDelete!: HTMLElement;
    #pkDlg!: HTMLElement;
    #pkTitle!: HTMLElement;
    #pkFields!: HTMLElement;
    #pkCancel!: HTMLElement;
    #pkOk!: HTMLElement;
    #recordsById = new Map();
    #working = null;
    #pkKind = null;
    #pkResolve = null;

    /** @type {object|null} */
    #controller = null;
    get controller() { return this.#controller; }
    set controller(v) {
      this.#controller = v;
      if (this.#mounted) {
        this.#actionsEl.replaceChildren();
        this.#rebuildToolbar();
        void this.refreshGrid();
      }
    }

    /** @type {typeof DEFAULT_ALLOWED} */
    bAllowed = { ...DEFAULT_ALLOWED };
    /** @type {(msg: string) => void} */
    onError = (msg) => {
      emit(this, 'is-error', { message: msg });
      console.error(msg);
    };
    /** @type {(() => Promise<object>)|null} */
    onNewObject = null;
    /** @type {object[]} */
    selectionData = [];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#toolbar = shadow.querySelector<HTMLElement>('.toolbar')!;
      this.#actionsEl = shadow.querySelector<HTMLElement>('.actions')!;
      this.#search = shadow.querySelector<HTMLElement>('.search')!;
      this.#grid = shadow.querySelector<HTMLElement>('.grid')!;
      this.#drawer = shadow.querySelector<HTMLElement>('.drawer')!;
      this.#modalVerify = shadow.querySelector<HTMLElement>('.modal-verify')!;
      this.#modalDelete = shadow.querySelector<HTMLElement>('.modal-delete')!;
      this.#pkDlg = shadow.querySelector<HTMLElement>('.pk-dlg')!;
      this.#pkTitle = shadow.querySelector<HTMLElement>('.pk-title')!;
      this.#pkFields = shadow.querySelector<HTMLElement>('.pk-fields')!;
      this.#pkCancel = shadow.querySelector<HTMLElement>('.pk-cancel')!;
      this.#pkOk = shadow.querySelector<HTMLElement>('.pk-ok')!;
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

    attributeChangedCallback() {
      if (!this.#mounted) return;
      this.#syncChrome();
      this.#rebuildToolbar();
    }

    #upgradeProps() {
      for (const k of ['bAllowed', 'onError', 'onNewObject', 'selectionData']) {
        if (Object.prototype.hasOwnProperty.call(this, k)) {
          const v = this[k];
          delete this[k];
          this[k] = v;
        }
      }
    }

    get showHeader() { return this.hasAttribute('show-header') ? this.getAttribute('show-header') !== 'false' : true; }
    set showHeader(v) { this.toggleAttribute('show-header', !!v); }

    get showSearch() { return this.hasAttribute('show-search') ? this.getAttribute('show-search') !== 'false' : true; }
    set showSearch(v) { this.toggleAttribute('show-search', !!v); }

    get modeFilter() { return this.hasAttribute('mode-filter') ? this.getAttribute('mode-filter') !== 'false' : true; }
    set modeFilter(v) { this.toggleAttribute('mode-filter', !!v); }

    get multiSelect() { return this.hasAttribute('multi-select'); }
    set multiSelect(v) { this.toggleAttribute('multi-select', !!v); }

    get selectMode() { return this.hasAttribute('select-mode'); }
    set selectMode(v) { this.toggleAttribute('select-mode', !!v); }

    get qRegistros() {
      const n = Number(this.getAttribute('q-registros'));
      return Number.isFinite(n) && n > 0 ? n : 10000;
    }
    set qRegistros(v) { this.setAttribute('q-registros', String(v)); }

    get qRowsHeader() {
      const n = Number(this.getAttribute('q-rows-header'));
      return Number.isFinite(n) && n > 0 ? n : 2;
    }
    set qRowsHeader(v) { this.setAttribute('q-rows-header', String(v)); }

    #icon(kind) {
      const attr = this.getAttribute(`icon-${kind}`);
      return attr || DEFAULT_ICONS[kind] || 'mdi:circle';
    }

    #pkField() {
      const keys = this.controller?.primaryKeys;
      return keys?.length ? asStr(keys.at(-1)) : 'id';
    }

    #syncChrome() {
      this.#toolbar.hidden = !this.showHeader || this.selectMode;
      this.#search.hidden = !this.showSearch;
      this.#toolbar.style.setProperty('--is-cat-rows', String(this.qRowsHeader));
      if (!this.#grid) return;
      this.#grid.setAttribute('row-selection', this.multiSelect || this.selectMode ? 'multiple' : 'single');
      if (this.multiSelect || this.selectMode) this.#grid.setAttribute('selectable', '');
      else this.#grid.removeAttribute('selectable');
    }

    #allowed(action) {
      return this.bAllowed?.[action] !== false;
    }

    #hasAct(name) {
      return typeof this.controller?.[name] === 'function';
    }

    #rebuildToolbar() {
      if (this.selectMode || !this.showHeader) {
        this.#actionsEl.replaceChildren();
        return;
      }

      // Si ya hay botones, solo actualizar disabled (evita flickering al seleccionar).
      if (this.#actionsEl.childElementCount > 0) {
        this.#syncToolbarDisabled();
        return;
      }

      const defs = [
        { act: 'actCrear', allow: 'Crear', icon: 'crear', label: 'Crear', needsSel: false, run: () => this.showFrmCrear() },
        { act: 'actModificar', allow: 'Modificar', icon: 'modificar', label: 'Modificar', needsSel: true, run: () => this.showFrmModificar(this.selectionData[0]) },
        { act: 'actVisualizar', allow: 'Visualizar', icon: 'visualizar', label: 'Visualizar', needsSel: true, run: () => this.showFrmVisualizar(this.selectionData[0]) },
        { act: 'actVerificar', allow: 'Verificar', icon: 'verificar', label: 'Verificar', needsSel: true, run: () => this.showVerificar(this.selectionData[0]) },
        { act: 'actRecodificar', allow: 'Recodificar', icon: 'recodificar', label: 'Recodificar', needsSel: true, run: () => this.showRecodificar(this.selectionData[0]) },
        { act: 'actDuplicar', allow: 'Duplicar', icon: 'duplicar', label: 'Duplicar', needsSel: true, run: () => this.showDuplicar(this.selectionData[0]) },
        { act: 'actEliminar', allow: 'Eliminar', icon: 'eliminar', label: 'Eliminar', needsSel: true, run: () => this.showEliminar(this.selectionData[0]) },
        { act: 'actConsolidar', allow: 'Consolidar', icon: 'consolidar', label: 'Consolidar', needsSel: true, run: () => this.showConsolidar(this.selectionData[0]) },
      ];

      for (const d of defs) {
        if (!this.#hasAct(d.act)) continue;
        const btn = document.createElement('is-button');
        btn.setAttribute('variant', 'plain');
        btn.setAttribute('color', 'neutral');
        btn.className = 'tool-btn';
        btn.dataset.allow = d.allow;
        btn.dataset.needsSel = d.needsSel ? '1' : '0';
        btn.innerHTML = `<is-icon slot="start" icon="${this.#icon(d.icon)}"></is-icon>${d.label}`;
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          if (!this.#allowed(d.allow)) return this.onError(`No tiene permisos para ${d.label.toLowerCase()}`);
          d.run();
        });
        this.#actionsEl.appendChild(btn);
      }

      const refresh = document.createElement('is-button');
      refresh.setAttribute('variant', 'plain');
      refresh.setAttribute('color', 'neutral');
      refresh.className = 'tool-btn';
      refresh.dataset.static = 'refresh';
      refresh.innerHTML = `<is-icon slot="start" icon="${this.#icon('refrescar')}"></is-icon>Refrescar`;
      refresh.addEventListener('click', () => void this.refreshGrid());
      this.#actionsEl.appendChild(refresh);

      const modeBtn = document.createElement('is-button');
      modeBtn.setAttribute('variant', 'plain');
      modeBtn.setAttribute('color', 'neutral');
      modeBtn.className = 'tool-btn';
      modeBtn.dataset.static = 'mode';
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

    #syncToolbarDisabled() {
      const hasSel = isPresent(this.selectionData);
      for (const btn of this.#actionsEl.querySelectorAll<HTMLElement>('.tool-btn')) {
        if (btn.dataset.static) continue;
        const needsSel = btn.dataset.needsSel === '1';
        const allow = btn.dataset.allow;
        btn.disabled = !this.#allowed(allow) || (needsSel && !hasSel);
      }
    }

    #onSearch = () => {
      const q = asStr(this.#search.value).trim();
      this.#grid?.api?.setQuickFilter?.(q);
    };

    #onRowSelect = (e) => {
      const rows = e.detail?.rows || [];
      this.selectionData = rows.map((r) => r.__record ?? this.#recordsById.get(asStr(r.id)) ?? r).filter(Boolean);
      this.#rebuildToolbar();
      emit(this, 'is-selection-change', { records: this.selectionData });
    };

    #lastClick = { id: null, t: 0 };
    #onCellClick = (e: PointerEvent) => {
      const row = e.detail?.row;
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

    #onDrawerHide = () => {
      emit(this, 'is-frm-close', {});
    };

    async refreshGrid() {
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
        const datos = lista?.datos || lista?.Datos || [];
        const arr = Array.isArray(datos) ? datos : [...datos];
        const pks = ctrl.primaryKeys || [];
        this.#recordsById.clear();
        const rows = arr.map((rec) => {
          const row = toGridRow(rec, pks);
          this.#recordsById.set(asStr(row.id), rec);
          return row;
        });
        this.#grid.api?.setRows?.(rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(msg);
      }
    }

    #openDrawer(mode, record) {
      this.#working = record;
      this.#drawer.label = `${mode === 'create' ? 'Crear' : mode === 'edit' ? 'Modificar' : 'Visualizar'} ${asStr(this.controller?.entrie || '')}`;
      this.#drawer.show?.() ?? this.#drawer.setAttribute('open', '');
      emit(this, 'is-frm-open', { mode, record });
      emit(this, 'is-action', { action: mode === 'create' ? 'Crear' : mode === 'edit' ? 'Modificar' : 'Visualizar', record });
    }

    closeFrm() {
      this.#drawer.hide?.() ?? this.#drawer.removeAttribute('open');
      this.#working = null;
    }

    async showFrmCrear() {
      if (!this.#allowed('Crear')) return this.onError('No tiene permisos para crear nuevos registros');
      let obj;
      if (this.onNewObject) obj = await this.onNewObject();
      else if (typeof this.controller?.klass === 'function') obj = new this.controller.klass();
      else obj = {};
      this.#openDrawer('create', obj);
    }

    showFrmModificar(obj) {
      if (!obj) return;
      if (!this.#allowed('Modificar')) return this.onError('No tiene permisos para modificar este registro');
      this.#openDrawer('edit', obj);
    }

    showFrmVisualizar(obj) {
      if (!obj) return;
      if (!this.#allowed('Visualizar')) return this.onError('No tiene permisos para visualizar este registro');
      this.#openDrawer('view', obj);
    }

    showVerificar(obj) {
      if (!obj) return;
      if (!this.#allowed('Verificar')) return this.onError('No tiene permisos para verificar este registro');
      this.#modalVerify.controller = this.controller;
      this.#modalVerify.record = obj;
      this.#modalVerify.entity = asStr(this.controller?.entrie || '');
      this.#modalVerify.onError = this.onError;
      this.#modalVerify.show?.();
      emit(this, 'is-action', { action: 'Verificar', record: obj });
    }

    showEliminar(obj) {
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

    #onDeleteConfirm = async () => {
      const obj = this.#working;
      this.#modalDelete.hide?.() ?? this.#modalDelete.removeAttribute('open');
      if (!obj || !this.#hasAct('actEliminar')) return;
      try {
        await this.controller.actEliminar(obj);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo eliminar.\n${msg}`);
      }
    };

    async showRecodificar(obj) {
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
      if (!nuevo) return;
      try {
        const work = cloneRecord(obj);
        setProp(work, pk, nuevo.nuevo);
        await this.controller.actRecodificar(obj, work);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo recodificar.\n${msg}`);
      }
    }

    async showDuplicar(obj) {
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
      if (!nuevo) return;
      try {
        const work = cloneRecord(obj);
        setProp(work, pk, nuevo.nuevo);
        await this.controller.actDuplicar(obj, work);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo duplicar.\n${msg}`);
      }
    }

    async showConsolidar(obj) {
      if (!obj) return;
      if (!this.#allowed('Consolidar')) return this.onError('No tiene permisos para consolidar este registro');
      const pk = this.#pkField();
      const label = lowerCase(this.controller?.labelPk || pk);
      const fields = [
        { key: 'actual', label: `Actual ${label}`, value: asStr(getProp(obj, pk)), readonly: true },
        { key: 'nuevo', label: `Nuevo ${label}`, value: '', required: true, btnRef: !!this.controller?.CtxBtnRef },
      ];
      const nuevo = await this.#openPkModal({
        title: `Consolidar ${lowerCase(this.controller?.entrie || '')}`,
        fields,
        okLabel: 'Consolidar',
        hint: `Seleccione el ${label} con el cual desea consolidar`,
      });
      if (!nuevo) return;
      try {
        const work = cloneRecord(obj);
        setProp(work, pk, nuevo.nuevo);
        await this.controller.actConsolidar(obj, work);
        await this.refreshGrid();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.onError(`No se pudo consolidar.\n${msg}`);
      }
    }

    /**
     * @param {{ title: string, fields: Array<{key:string,label:string,value?:string,readonly?:boolean,required?:boolean,btnRef?:boolean}>, okLabel: string, hint?: string }} cfg
     * @returns {Promise<Record<string,string>|null>}
     */
    async #openPkModal(cfg) {
      this.#pkTitle.textContent = cfg.title;
      this.#pkFields.replaceChildren();
      if (cfg.hint) {
        const p = document.createElement('p');
        p.className = 'pk-hint';
        p.textContent = cfg.hint;
        this.#pkFields.appendChild(p);
      }
      const inputs = new Map();
      for (const f of cfg.fields) {
        if (f.btnRef && this.controller?.CtxBtnRef) {
          await import('./btn-ref.js');
          const br = document.createElement('is-btn-ref');
          br.label = f.label;
          br.controller = this.controller.CtxBtnRef;
          br.required = !!f.required;
          br.value = f.value || '';
          br.tabIndex = 0;
          this.#pkFields.appendChild(br);
          inputs.set(f.key, br);
        } else {
          const inp = document.createElement('is-input');
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
          const out = {};
          for (const [k, el] of inputs) out[k] = asStr(el.value);
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

    #onPkOk = () => this.#closePkModal(true);

    #onPkDismiss = () => this.#closePkModal(false);

    #closePkModal(ok) {
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
