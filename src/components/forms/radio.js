import { adoptCss } from '../_shared/adopt-css.js';
import { attachFormInternals, setCustomState } from '../_shared/form-associated.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { setOptionalAttr } from '../_shared/reflect.js';

/**
 * <is-radio> — Opción de radio. NO es form-associated a propósito: el valor lo
 * publica <is-radio-group>, que es quien participa en el <form>.
 *
 * Atributos
 *   value, checked, disabled
 *   color          brand (default) | neutral | success | warning | danger
 *   label-placement  end (default) | start | top | bottom
 *   Sin color / label-placement propios se hereda el del grupo.
 *
 * Slots: default (etiqueta), description (texto secundario)
 * Parts: base, control, dot, text, label, description
 * Custom states: placement-* readonly error (heredados del grupo)
 * Events: is-radio-select { value } — lo consume el grupo. Sin grupo, se marca solo.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <span part="control" class="control">
        <span part="dot" class="dot"></span>
      </span>
      <span part="text" class="text">
        <span part="label" class="label"><slot></slot></span>
        <span part="description" class="description" hidden><slot name="description"></slot></span>
      </span>
    </div>
  `;

  const OBSERVED = ['value', 'checked', 'disabled', 'color', 'label-placement'];
  const VARIANTS = ['brand', 'neutral', 'success', 'warning', 'danger'];
  const PLACEMENTS = ['end', 'start', 'top', 'bottom'];

  class IsRadio extends ElementBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    accent: { prop: '--is-radio-accent', onlyColorValues: true },
    };

    static get observedAttributes() { return [...OBSERVED, 'accent']; }

    #internals = null;
    #descEl;
    #descSlot;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#internals = attachFormInternals(this);
      this.#descEl = shadow.querySelector('.description');
      this.#descSlot = this.#descEl.querySelector('slot');

      this.#descSlot.addEventListener('slotchange', this.#syncDescription);
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKey);
    }

    onConnected() {
      if (!this.hasAttribute('role')) this.setAttribute('role', 'radio');
      this.#syncDescription();
      this.#sync();
    }

    onAttributeChanged(_name, oldVal, newVal) {
      this.#sync();
    }

    /** Sin atributo, el valor es el texto de la etiqueta (no el de description). */
    get value() {
      if (this.hasAttribute('value')) return this.getAttribute('value');
      return [...this.childNodes]
        .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.slot))
        .map((n) => n.textContent)
        .join('')
        .trim();
    }
    set value(v) { setOptionalAttr(this, 'value', v); }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) { this.toggleAttribute('checked', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    /** '' = hereda el del grupo. */
    get color() {
      const v = this.getAttribute('color');
      return VARIANTS.includes(v) ? v : '';
    }
    set color(v) {
      if (VARIANTS.includes(v)) this.setAttribute('color', v);
      else this.removeAttribute('color');
    }

    /** '' = hereda el del grupo. */
    get labelPlacement() {
      const v = this.getAttribute('label-placement');
      return PLACEMENTS.includes(v) ? v : '';
    }
    set labelPlacement(v) {
      if (PLACEMENTS.includes(v)) this.setAttribute('label-placement', v);
      else this.removeAttribute('label-placement');
    }

    get group() { return this.closest('is-radio-group'); }

    /**
     * Recalcula lo que hereda del grupo. Lo llama el grupo.
     * El color no pasa por aquí: viaja como custom property heredada.
     */
    syncFromGroup() {
      const group = this.group;
      const placement = this.#inherit('label-placement', PLACEMENTS, group) ?? 'end';
      for (const p of PLACEMENTS) setCustomState(this.#internals, `placement-${p}`, p !== 'end' && p === placement);
      setCustomState(this.#internals, 'readonly', !!group?.readonly);
      setCustomState(this.#internals, 'error', !!group?.error);
    }

    #inherit(attr, allowed, group) {
      const own = this.getAttribute(attr);
      if (allowed.includes(own)) return own;
      const fromGroup = group?.getAttribute(attr);
      return allowed.includes(fromGroup) ? fromGroup : null;
    }

    #syncDescription = () => {
      this.#descEl.hidden = !this.#descSlot.assignedNodes({ flatten: true })
        .some((n) => n.nodeType === 1 || n.textContent.trim());
    };

    #sync() {
      this.setAttribute('aria-checked', String(this.checked));
      this.setAttribute('aria-disabled', String(this.disabled));
      // El tabindex de un radio en grupo lo gobierna el grupo (roving tabindex).
      if (!this.group) this.setAttribute('tabindex', this.disabled ? '-1' : '0');
      this.syncFromGroup();
    }

    #select() {
      if (this.disabled) return;
      const group = this.group;
      if (!group) {
        this.checked = true;
        return;
      }
      if (group.disabled || group.readonly) return;
      emit(this, 'is-radio-select', { value: this.value });
    }

    #onClick = (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      this.#select();
    };

    #onKey = (e) => {
      if (e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      this.#select();
    };
  }

  defineElement('is-radio', IsRadio, 'IsRadio');
})();
