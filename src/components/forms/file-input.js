import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';
import '../helpers/format-bytes.js';

/**
 * <is-file-input> — Web Component (vanilla).
 *
 * Dropzone + input file nativo oculto. Lista de archivos con quitar.
 *
 * Atributos
 *   label, hint, name, accept, capture
 *   multiple, disabled, required  (boolean)
 *
 * Propiedad
 *   files  File[]  get/set — reasignar dispara update
 *
 * Slots: label, hint, dropzone
 *
 * Custom states: blank, dragging  (:state / data-state-*)
 *
 * Eventos: change, input, is-change (bubbles, composed)
 *
 * CSS Parts: ::part(base) ::part(label) ::part(hint) ::part(dropzone)
 *            ::part(file-list) ::part(file) ::part(remove-button)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <label part="label" class="label" id="label">
        <slot name="label"></slot>
      </label>
      <div part="hint" class="hint" id="hint">
        <slot name="hint"></slot>
      </div>
      <div
        part="dropzone"
        class="dropzone"
        tabindex="0"
        role="button"
        aria-labelledby="label"
        aria-describedby="hint"
      >
        <slot name="dropzone">
          <span class="dropzone-default">
            <is-icon icon="mdi:cloud-upload" aria-hidden="true"></is-icon>
            <span class="dropzone-text">Arrastra archivos aquí o haz clic para seleccionar</span>
          </span>
        </slot>
        <input part="input" class="native" type="file" tabindex="-1" aria-hidden="true" />
      </div>
      <ul part="file-list" class="file-list" hidden></ul>
    </div>
  `;

  const OBSERVED = ['label', 'hint', 'name', 'accept', 'capture', 'multiple', 'disabled', 'required'];

  class IsFileInput extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #dropzone;
    #input;
    #labelEl;
    #hintEl;
    #list;
    #labelSlot;
    #hintSlot;
    #files = [];
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#dropzone = shadow.querySelector('.dropzone');
      this.#input = shadow.querySelector('.native');
      this.#labelEl = shadow.querySelector('.label');
      this.#hintEl = shadow.querySelector('.hint');
      this.#list = shadow.querySelector('.file-list');
      this.#labelSlot = shadow.querySelector('slot[name="label"]');
      this.#hintSlot = shadow.querySelector('slot[name="hint"]');

      if ('attachInternals' in this) {
        try { this.#internals = this.attachInternals(); } catch { /* already */ }
      }

      this.#dropzone.addEventListener('click', this.#onZoneClick);
      this.#dropzone.addEventListener('keydown', this.#onZoneKey);
      this.#dropzone.addEventListener('dragenter', this.#onDragEnter);
      this.#dropzone.addEventListener('dragover', this.#onDragOver);
      this.#dropzone.addEventListener('dragleave', this.#onDragLeave);
      this.#dropzone.addEventListener('drop', this.#onDrop);
      this.#input.addEventListener('change', this.#onNativeChange);
      this.#labelSlot.addEventListener('slotchange', () => this.#syncSlots());
      this.#hintSlot.addEventListener('slotchange', () => this.#syncSlots());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncAttrs();
      this.#syncSlots();
      this.#syncDisabled();
      this.#syncRequired();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'disabled') this.#syncDisabled();
      else if (name === 'required') this.#syncRequired();
      else if (name === 'label' || name === 'hint') this.#syncSlots();
      else this.#syncAttrs();
    }

    get files() { return this.#files.slice(); }
    set files(list) {
      const arr = Array.isArray(list) ? list.filter((f) => f instanceof File) : [];
      this.#files = arr;
      this.#syncInputFromFiles();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
      this.#syncRequired();
      this.#emitChange();
    }

    get value() {
      return this.#files.map((f) => f.name).join(', ');
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get multiple() { return this.hasAttribute('multiple'); }
    set multiple(v) { this.toggleAttribute('multiple', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    formDisabledCallback(disabled) {
      this.#syncDisabled(disabled);
    }

    #setState(name, on) {
      const s = this.#internals?.states;
      if (s) {
        if (on) s.add(name);
        else s.delete(name);
      }
      this.toggleAttribute(`data-state-${name}`, !!on);
    }

    #syncAttrs() {
      const map = ['name', 'accept', 'capture'];
      for (const a of map) {
        const v = this.getAttribute(a);
        if (v == null) this.#input.removeAttribute(a);
        else this.#input.setAttribute(a, v);
      }
      this.#input.toggleAttribute('multiple', this.multiple);
      this.#input.toggleAttribute('required', this.required);
    }

    #syncSlots() {
      const labelAttr = (this.getAttribute('label') || '').trim();
      const hintAttr = (this.getAttribute('hint') || '').trim();
      const hasLabelSlot = this.#labelSlot.assignedNodes({ flatten: true }).some(
        (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
      );
      const hasHintSlot = this.#hintSlot.assignedNodes({ flatten: true }).some(
        (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
      );

      if (!hasLabelSlot) {
        this.#labelSlot.textContent = labelAttr;
      }
      if (!hasHintSlot) {
        this.#hintSlot.textContent = hintAttr;
      }
      this.#labelEl.hidden = !labelAttr && !hasLabelSlot;
      this.#hintEl.hidden = !hintAttr && !hasHintSlot;
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.disabled;
      this.#input.disabled = disabled;
      this.#dropzone.toggleAttribute('aria-disabled', disabled);
      this.#dropzone.tabIndex = disabled ? -1 : 0;
      this.#setState('disabled', disabled);
    }

    #syncRequired() {
      if (!this.#internals) return;
      if (this.required && this.#files.length === 0) {
        this.#internals.setValidity({ valueMissing: true }, 'Selecciona al menos un archivo', this.#input);
      } else {
        this.#internals.setValidity({});
      }
    }

    #onZoneClick = (e) => {
      if (this.disabled || this.#input.disabled) return;
      if (e.target.closest('.remove')) return;
      this.#input.click();
    };

    #onZoneKey = (e) => {
      if (this.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#input.click();
      }
    };

    #onDragEnter = (e) => {
      e.preventDefault();
      if (this.disabled) return;
      this.#setState('dragging', true);
    };

    #onDragOver = (e) => {
      e.preventDefault();
      if (this.disabled) return;
      this.#setState('dragging', true);
    };

    #onDragLeave = (e) => {
      if (!this.#dropzone.contains(e.relatedTarget)) {
        this.#setState('dragging', false);
      }
    };

    #onDrop = (e) => {
      e.preventDefault();
      this.#setState('dragging', false);
      if (this.disabled) return;
      const list = e.dataTransfer?.files;
      if (!list?.length) return;
      this.#applyFileList(list);
    };

    #onNativeChange = () => {
      if (this.#input.files?.length) this.#applyFileList(this.#input.files);
    };

    #applyFileList(fileList) {
      const incoming = Array.from(fileList);
      if (this.multiple) {
        const key = (f) => `${f.name}:${f.size}:${f.lastModified}`;
        const seen = new Set(this.#files.map(key));
        for (const f of incoming) {
          if (!seen.has(key(f))) {
            this.#files.push(f);
            seen.add(key(f));
          }
        }
      } else {
        this.#files = incoming.slice(0, 1);
      }
      this.#syncInputFromFiles();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
      this.#syncRequired();
      this.#emitChange();
    }

    #syncInputFromFiles() {
      try {
        const dt = new DataTransfer();
        for (const f of this.#files) dt.items.add(f);
        this.#input.files = dt.files;
        this.#internals?.setFormValue(this.multiple ? dt.files : (this.#files[0] || null));
      } catch {
        // DataTransfer may fail in some environments; keep internal list
        this.#internals?.setFormValue(this.#files[0]?.name || '');
      }
    }

    #renderList() {
      this.#list.replaceChildren();
      if (!this.#files.length) {
        this.#list.hidden = true;
        return;
      }
      this.#list.hidden = false;
      this.#files.forEach((file, index) => {
        const li = document.createElement('li');
        li.setAttribute('part', 'file');
        li.className = 'file';

        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = file.name;

        const size = document.createElement('is-format-bytes');
        size.setAttribute('value', String(file.size));
        size.className = 'file-size';

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove';
        remove.setAttribute('part', 'remove-button');
        remove.setAttribute('aria-label', `Quitar ${file.name}`);
        remove.innerHTML = '<is-icon icon="mdi:close" aria-hidden="true"></is-icon>';
        remove.addEventListener('click', (e) => {
          e.stopPropagation();
          this.#removeAt(index);
        });

        li.append(name, size, remove);
        this.#list.appendChild(li);
      });
    }

    #removeAt(index) {
      this.#files.splice(index, 1);
      this.#syncInputFromFiles();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
      this.#syncRequired();
      this.#emitChange();
    }

    #emitChange() {
      const detail = { files: this.files };
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('is-change', { detail, bubbles: true, composed: true }));
    }
  }

  if (!customElements.get('is-file-input')) {
    customElements.define('is-file-input', IsFileInput);
  }
  if (typeof window !== 'undefined') {
    window.IsFileInput = IsFileInput;
  }
})();
