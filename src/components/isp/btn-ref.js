import { adoptCss } from '../_shared/adopt-css.js';
import {
  attachFormInternals, setFormValue, setValidity, clearValidity,
} from '../_shared/form-associated.js';
import '../actions/button.js';
import '../forms/input.js';
import '../media/icon.js';
import '../layout/dialog.js';
import './catalogo-gen.js';
import {
  asStr, getProp, isPresent,
} from '../_shared/isp-record-utils.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
/**
 * <is-btn-ref> — port de `src/lib/form/BtnRef.svelte` (ISP).
 *
 * Campo de texto + botón filtro que abre un modal con `<is-catalogo-gen
 * select-mode>` para elegir un registro. Muestra la etiqueta resuelta
 * (`ColumnsBtnRef`) bajo el valor.
 *
 * Propiedades JS
 *   controller        ICtxBtnRef: primaryKeys, Columns/columns, ColumnsBtnRef,
 *                     Lista, … (mismas acciones opcionales que el catálogo)
 *   onSelectedRecord  (record) => void
 *   onChange / onTypingEnd / handleInput  callbacks opcionales
 *
 * Atributos
 *   label, value, name, id, required, optional, readonly, maxlength
 *
 * Eventos (bubbles + composed)
 *   is-change           detail: { value }
 *   is-typing-end       detail: { value }
 *   is-selected-record  detail: { record, value, label }
 *   is-input            detail: { value }
 *
 * Métodos: focus(), open(), close()
 *
 * CSS Parts: ::part(base) ::part(label-text) ::part(open)
 */

const FILTER_SVG = `<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M14.037,20.937a1.015,1.015,0,0,1-.518-.145l-3.334-2a2.551,2.551,0,0,1-1.233-2.176V12.091a1.526,1.526,0,0,0-.284-.891L4.013,4.658a1.01,1.01,0,0,1,.822-1.6h14.33a1.009,1.009,0,0,1,.822,1.6h0L15.332,11.2a1.527,1.527,0,0,0-.285.891v7.834a1.013,1.013,0,0,1-1.01,1.012ZM4.835,4.063,9.482,10.62a2.515,2.515,0,0,1,.47,1.471v4.524a1.543,1.543,0,0,0,.747,1.318l3.334,2,.014-7.843a2.516,2.516,0,0,1,.471-1.471l4.654-6.542,0,0Z"></path>
</svg>`;

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <is-input class="field" label-placement="float"></is-input>
      <span part="label-text" class="value-label"></span>
      <button type="button" part="open" class="open" aria-label="Open BtnRef">${FILTER_SVG}</button>
    </div>
    <is-dialog class="dlg" label="Seleccionar" light-dismiss style="--width: min(90vw, 40rem);">
      <is-catalogo-gen class="cat" select-mode show-header="false" multi-select q-rows-header="1"></is-catalogo-gen>
      <div slot="footer" class="dlg-footer">
        <is-button class="cancel" color="neutral" variant="outlined">Cancelar</is-button>
        <is-button class="pick" color="brand">Seleccionar</is-button>
      </div>
    </is-dialog>
  `;

  const OBSERVED = [
    'label', 'value', 'name', 'id', 'required', 'optional', 'readonly', 'maxlength',
  ];

  class IsBtnRef extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #field;
    #valueLabel;
    #openBtn;
    #dlg;
    #cat;
    #cancelBtn;
    #pickBtn;
    #internals;
    #typingTimer = 0;
    #prevValue = Symbol('init');

    /** @type {object|null} */
    controller = null;
    /** @type {(record: object) => void} */
    onSelectedRecord = () => {};
    /** @type {() => void} */
    onChange = () => {};
    /** @type {() => void} */
    onTypingEnd = () => {};
    /** @type {() => void} */
    handleInput = () => {};

    constructor() {
      super();
      this.#internals = attachFormInternals(this);
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#field = shadow.querySelector('.field');
      this.#valueLabel = shadow.querySelector('.value-label');
      this.#openBtn = shadow.querySelector('.open');
      this.#dlg = shadow.querySelector('.dlg');
      this.#cat = shadow.querySelector('.cat');
      this.#cancelBtn = shadow.querySelector('.cancel');
      this.#pickBtn = shadow.querySelector('.pick');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProps();
      this.#syncFieldAttrs();
      this.#field.addEventListener('is-input', this.#onInput);
      this.#field.addEventListener('is-change', this.#onFieldChange);
      this.#field.addEventListener('is-typing-end', this.#onTypingEndEvt);
      this.#openBtn.addEventListener('click', this.#onOpen);
      this.#cancelBtn.addEventListener('click', () => this.close());
      this.#pickBtn.addEventListener('click', this.#onPick);
      this.#cat.addEventListener('is-double-click', this.#onCatDbl);
      this.#valueLabel.addEventListener('click', () => this.focus());
      if (this.controller) this.#cat.controller = this.controller;
      void this.#resolveLabel();
      this.#syncValidity();
    }

    disconnectedCallback() {
      this.#mounted = false;
      clearTimeout(this.#typingTimer);
      this.#field.removeEventListener('is-input', this.#onInput);
      this.#field.removeEventListener('is-change', this.#onFieldChange);
      this.#field.removeEventListener('is-typing-end', this.#onTypingEndEvt);
      this.#openBtn.removeEventListener('click', this.#onOpen);
      this.#pickBtn.removeEventListener('click', this.#onPick);
      this.#cat.removeEventListener('is-double-click', this.#onCatDbl);
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      this.#syncFieldAttrs();
      if (name === 'value') void this.#resolveLabel();
      this.#syncValidity();
    }

    #upgradeProps() {
      for (const k of ['controller', 'onSelectedRecord', 'onChange', 'onTypingEnd', 'handleInput', 'value']) {
        if (Object.prototype.hasOwnProperty.call(this, k)) {
          const v = this[k];
          delete this[k];
          this[k] = v;
        }
      }
    }

    get label() { return this.getAttribute('label') || ''; }
    set label(v) { this.setAttribute('label', v ?? ''); }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) {
      const next = v == null ? '' : String(v);
      if (this.getAttribute('value') === next) {
        void this.#resolveLabel();
        return;
      }
      this.setAttribute('value', next);
    }

    get name() { return this.getAttribute('name') || ''; }
    set name(v) { this.setAttribute('name', v ?? ''); }

    get required() { return this.hasAttribute('required') && !this.optional; }
    set required(v) { this.toggleAttribute('required', !!v); }

    get optional() { return this.hasAttribute('optional'); }
    set optional(v) { this.toggleAttribute('optional', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get maxlength() {
      const n = Number(this.getAttribute('maxlength'));
      return Number.isFinite(n) && n > 0 ? n : 20;
    }
    set maxlength(v) { this.setAttribute('maxlength', String(v)); }

    focus() {
      setTimeout(() => this.#field?.focus?.(), 50);
    }

    open() {
      if (this.readonly) return;
      if (this.controller) this.#cat.controller = this.controller;
      void this.#cat.refreshGrid?.();
      this.#dlg.show?.();
    }

    close() {
      this.#dlg.hide?.();
    }

    #syncFieldAttrs() {
      this.#field.label = this.label;
      this.#field.value = this.value;
      if (this.name) this.#field.name = this.name;
      this.#field.required = this.required;
      this.#field.readonly = this.readonly;
      this.#field.setAttribute('maxlength', String(this.maxlength));
      this.#field.style.setProperty('padding-right', '2rem');
      this.#openBtn.disabled = this.readonly;
      this.#openBtn.classList.toggle('focus-required', false);
      this.#openBtn.classList.toggle('focus-optional', false);
      setFormValue(this.#internals, this.value);
    }

    #syncValidity() {
      if (this.required && !isPresent(this.value)) {
        setValidity(this.#internals, { valueMissing: true }, 'Campo obligatorio', this.#field);
      } else {
        clearValidity(this.#internals);
      }
    }

    #pk() {
      const keys = this.controller?.primaryKeys;
      return keys?.length ? asStr(keys.at(-1)) : 'id';
    }

    #columnsBtnRef() {
      const c = this.controller?.ColumnsBtnRef;
      if (Array.isArray(c)) return c;
      if (typeof c === 'function') return c.call(this.controller) || [];
      // getter en clase
      try {
        const g = this.controller && Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(this.controller),
          'ColumnsBtnRef',
        );
        if (g?.get) return g.get.call(this.controller) || [];
      } catch { /* empty */ }
      return [];
    }

    #setValueLabel(text, missing) {
      if (missing) {
        this.#valueLabel.innerHTML = `<span class="missing">${asStr(text)}</span>`;
      } else {
        this.#valueLabel.textContent = asStr(text).trim();
      }
    }

    async #resolveLabel() {
      const value = this.value;
      if (!isPresent(value)) {
        this.#setValueLabel('', false);
        this.#prevValue = value;
        return;
      }
      if (value === this.#prevValue && this.#valueLabel.textContent) return;
      this.#prevValue = value;
      this.#setValueLabel('Cargando...', false);

      const ctrl = this.controller;
      if (!ctrl || typeof ctrl.Lista !== 'function') {
        this.#setValueLabel(value, true);
        return;
      }
      const pk = this.#pk();
      try {
        const lista = await ctrl.Lista({
          pagina: 1,
          qregistros: 1,
          filtro: { sql: ` ${pk}='${value}' ` },
        });
        const datos = lista?.datos || [];
        const arr = Array.isArray(datos) ? datos : [...datos];
        const record = arr.find((r) => asStr(getProp(r, pk)) === asStr(value)) || arr[0];
        if (!record) {
          this.#setValueLabel(value, true);
          return;
        }
        let label = '';
        for (const key of this.#columnsBtnRef()) {
          label += ` ${asStr(getProp(record, key))}`;
        }
        this.#setValueLabel(label || value, !label);
      } catch {
        this.#setValueLabel(value, true);
      }
    }

    #applyRecord(record) {
      if (!record) return;
      const pk = this.#pk();
      const value = asStr(getProp(record, pk));
      this.value = value;
      let label = '';
      for (const key of this.#columnsBtnRef()) {
        label += ` ${asStr(getProp(record, key))}`;
      }
      this.#setValueLabel(label || value, !label);
      this.onSelectedRecord(record);
      this.onChange();
      emit(this, 'is-selected-record', { record, value, label: label.trim() });
      emit(this, 'is-change', { value });
      this.#syncValidity();
      this.close();
    }

    #onOpen = () => this.open();

    #onPick = () => {
      const rec = this.#cat.selectionData?.[0];
      this.#applyRecord(rec);
    };

    #onCatDbl = (e) => {
      this.#applyRecord(e.detail?.record);
    };

    #onInput = () => {
      let v = asStr(this.#field.value);
      if (v.length > this.maxlength) {
        v = v.slice(0, this.maxlength);
        this.#field.value = v;
      }
      this.setAttribute('value', v);
      this.handleInput();
      emit(this, 'is-input', { value: v });
      this.#syncValidity();
    };

    #onFieldChange = () => {
      this.onChange();
      emit(this, 'is-change', { value: this.value });
    };

    #onTypingEndEvt = () => {
      void this.#resolveLabel();
      this.onTypingEnd();
      emit(this, 'is-typing-end', { value: this.value });
    };
  }

  defineElement('is-btn-ref', IsBtnRef);
})();
