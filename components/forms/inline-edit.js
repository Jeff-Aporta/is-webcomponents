import { adoptCss } from '../_shared/adopt-css.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import { attachFormInternals, setCustomState, setFormValue } from '../_shared/form-associated.js';

/**
 * <is-inline-edit> — "Inplace" / "Inline edit".
 *
 * Muestra `value` como texto plano; clic → input (o textarea) editable;
 * Enter guarda y sale; Esc cancela y revierte; blur guarda por defecto.
 *
 * Atributos
 *   value           Texto inicial y actual (tras guardar).
 *   mode            text (default) | textarea
 *   placeholder     visible cuando value es vacío
 *   name            form-associated
 *   disabled, readonly, required
 *   cancel-on-blur  por defecto blur guarda; este flag hace que blur cancele
 *   maxlength       (solo mode=text)
 *   rows, max-rows  (solo mode=textarea)
 *   appearance      ... ver CSS
 *
 * Slots
 *   display   contenido personalizado en lugar del value plano (útil para HTML
 *             como avatares, badges). Si se rellena, ese markup se muestra en
 *             modo lectura y se reemplaza por el editor al editar.
 *
 * Custom states: idle, editing, saved, cancelled
 * Eventos:
 *   is-edit      al entrar al modo edición
 *   is-save      detalle: { value, previous }
 *   is-cancel    detalle: { value, previous }
 *
 * Tokens CSS:
 *   --is-inline-edit-min-h   altura mínima del textarea (modo textarea)
 *   --is-inline-edit-radius
 */
(() => {
  const OBSERVED = [
    'value', 'placeholder', 'name', 'mode',
    'disabled', 'readonly', 'required', 'cancel-on-blur',
    'maxlength', 'rows', 'max-rows', 'appearance',
  ];

  class IsInlineEdit extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #internals;
    #mounted = false;
    #state = 'idle';
    #snapshot = null;
    #stateTimer = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.#internals = attachFormInternals(this);
      this.#render();
      adoptCss(this.shadowRoot, import.meta.url);
      this.addEventListener('click', (e) => this.#onClick(e));
      this.addEventListener('keydown', (e) => this.#onKeyDown(e));
    }

    connectedCallback() {
      this.#mounted = true;
      this.#sync();
      this.#syncStateClass();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value') { this.#sync(); return; }
      if (name === 'mode' || name === 'rows' || name === 'max-rows' || name === 'maxlength' || name === 'placeholder') {
        this.#render();
        this.#sync();
      }
      if (name === 'disabled' || name === 'readonly') {
        this.#syncDisabled();
      }
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) {
      v == null ? this.removeAttribute('value') : this.setAttribute('value', v);
    }

    get editing() { return this.#state === 'editing'; }

    /** Modo lectura. */
    cancel() {
      if (this.#state !== 'editing') return;
      if (this.#snapshot !== null) this.value = this.#snapshot;
      this.#dispatch('is-cancel', { value: this.value, previous: this.#snapshot });
      this.#setState('cancelled');
      this.#setState('idle', 280);
      this.#render();
    }

    /** Sale guardando. */
    save() {
      if (this.#state !== 'editing') return;
      const input = this.shadowRoot.querySelector('input,textarea');
      if (!input) return;
      this.#dispatch('is-save', { value: input.value, previous: this.#snapshot });
      this.value = input.value;
      this.#setState('saved');
      this.#setState('idle', 280);
      this.#render();
    }

    /** Entra en modo edición. */
    edit() {
      if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return;
      this.#snapshot = this.value;
      this.#setState('editing');
      this.#render();
      const input = this.shadowRoot.querySelector('input,textarea');
      if (input) {
        input.focus();
        // cursor al final
        const len = input.value.length;
        try { input.setSelectionRange(len, len); } catch { /* noop */ }
      }
      this.#dispatch('is-edit', {});
    }

    #onClick(e) {
      if (this.#state === 'editing') return;
      // ignorar clicks en el slot display personalizado (que aún así se edita)
      this.edit();
    }

    #onKeyDown(e) {
      if (this.#state !== 'editing') return;
      if (e.key === 'Enter' && this.getAttribute('mode') !== 'textarea') {
        e.preventDefault();
        this.save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancel();
      }
    }

    #sync() {
      setFormValue(this.#internals, this.value);
      const slot = this.shadowRoot.querySelector('slot[name="display"]');
      const display = this.shadowRoot.querySelector('[part="display"]');
      if (display) display.textContent = this.value || this.getAttribute('placeholder') || '';
      setCustomState(this.#internals, 'blank', !this.value);
    }

    #syncDisabled() {
      const dis = this.hasAttribute('disabled');
      const ro = this.hasAttribute('readonly');
      const input = this.shadowRoot.querySelector('input,textarea');
      if (input) {
        input.disabled = dis;
        input.readOnly = ro;
      }
    }

    #render() {
      const mode = this.getAttribute('mode') || 'text';
      const placeholder = this.getAttribute('placeholder') || '';
      const value = this.value;
      const editing = this.#state === 'editing';
      const disabled = this.hasAttribute('disabled');
      const readonly = this.hasAttribute('readonly');
      const maxlength = this.getAttribute('maxlength') || '';
      const rows = this.getAttribute('rows') || '';
      const cancelOnBlur = this.hasAttribute('cancel-on-blur');

      const editorAttrs = [
        `part="editor"`,
        `id="editor"`,
        mode === 'textarea' ? 'multiline' : '',
        `placeholder="${placeholder.replace(/"/g, '&quot;')}"`,
        maxlength ? `maxlength="${maxlength}"` : '',
        rows ? `rows="${rows}"` : '',
        disabled ? 'disabled' : '',
        readonly ? 'readonly' : '',
      ].filter(Boolean).join(' ');

      const editorEl = mode === 'textarea'
        ? `<textarea ${editorAttrs}>${escapeHtml(value)}</textarea>`
        : `<input ${editorAttrs} type="text" value="${escapeHtml(value)}" />`;

      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root ${editing ? 'is-editing' : 'is-idle'}">
          <div part="display" class="display">
            <slot name="display"></slot>
            <span class="text"></span>
          </div>
          <div part="editor-wrap" class="editor-wrap">
            ${editorEl}
          </div>
        </div>
      `;
      // texto del display re-poblado
      this.shadowRoot.querySelector('[part="display"] .text').textContent =
        value || placeholder || '';

      const input = this.shadowRoot.querySelector('input,textarea');
      if (input) {
        input.addEventListener('blur', () => {
          if (!this.#mounted) return;
          if (this.#state !== 'editing') return;
          if (cancelOnBlur) this.cancel();
          else this.save();
        });
        input.addEventListener('input', () => setCustomState(this.#internals, 'blank', !input.value));
      }
    }

    #setState(name, autoRevertMs) {
      this.#state = name;
      setCustomState(this.#internals, name === 'idle' ? undefined : name, true);
      if (name !== 'idle') setCustomState(this.#internals, 'idle', false);
      this.#syncStateClass();
      if (autoRevertMs) {
        clearTimeout(this.#stateTimer);
        this.#stateTimer = setTimeout(() => {
          if (this.#state === name) {
            this.#state = 'idle';
            setCustomState(this.#internals, name, false);
            this.#syncStateClass();
          }
        }, autoRevertMs);
      }
    }

    #syncStateClass() {
      const root = this.shadowRoot.querySelector('.root');
      if (root) root.className = `root is-${this.#state}`;
    }

    #dispatch(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
    }

  }

  if (!customElements.get('is-inline-edit')) customElements.define('is-inline-edit', IsInlineEdit);
})();
