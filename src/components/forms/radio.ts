import { adoptCss, defineElement, emit } from '../../core/element.js';
import { attachFormInternals, setCustomState } from '../_shared/form-associated.js';
import { ElementBase } from '../../core/element-base.js';
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

  const OBSERVED: string[] = ['value', 'checked', 'disabled', 'color', 'label-placement'];
  const VARIANTS: string[] = ['brand', 'neutral', 'success', 'warning', 'danger'];
  const PLACEMENTS: string[] = ['end', 'start', 'top', 'bottom'];

  class IsRadio extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    accent: { prop: '--is-radio-accent', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'accent']; }

    #internals: ElementInternals | null = null;
    #descEl!: HTMLElement;
    #descSlot!: HTMLSlotElement;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#internals = attachFormInternals(this);
      this.#descEl = shadow.querySelector<HTMLElement>('.description')!;
      this.#descSlot = this.#descEl.querySelector<HTMLSlotElement>('slot')!;

      this.#descSlot.addEventListener('slotchange', this.#syncDescription);
      this.addEventListener('click', this.#onClick);
      this.addEventListener('keydown', this.#onKey);
    }

    onConnected(): void {
      if (!this.hasAttribute('role')) this.setAttribute('role', 'radio');
      this.#syncDescription();
      this.#sync();
    }

    onAttributeChanged(_name: string, _oldVal: string | null, _newVal: string | null): void {
      this.#sync();
    }

    /** Sin atributo, el valor es el texto de la etiqueta (no el de description). */
    get value(): string {
      if (this.hasAttribute('value')) return this.getAttribute('value') ?? '';
      return [...this.childNodes]
        .filter((n: ChildNode) => n.nodeType === 3 || (n.nodeType === 1 && !(n as Element).slot))
        .map((n: ChildNode) => n.textContent ?? '')
        .join('')
        .trim();
    }
    set value(v: string | null) { setOptionalAttr(this, 'value', v); }

    get checked(): boolean { return this.hasAttribute('checked'); }
    set checked(v: boolean) { this.toggleAttribute('checked', !!v); }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    /** '' = hereda el del grupo. */
    get color(): string {
      const v = this.getAttribute('color');
      return VARIANTS.includes(v ?? '') ? v ?? '' : '';
    }
    set color(v: string | null) {
      if (typeof v === 'string' && VARIANTS.includes(v)) this.setAttribute('color', v);
      else this.removeAttribute('color');
    }

    /** '' = hereda el del grupo. */
    get labelPlacement(): string {
      const v = this.getAttribute('label-placement');
      return PLACEMENTS.includes(v ?? '') ? v ?? '' : '';
    }
    set labelPlacement(v: string | null) {
      if (typeof v === 'string' && PLACEMENTS.includes(v)) this.setAttribute('label-placement', v);
      else this.removeAttribute('label-placement');
    }

    get group(): (HTMLElement & { disabled?: boolean; readonly?: boolean; error?: boolean }) | null { return this.closest('is-radio-group'); }

    /**
     * Recalcula lo que hereda del grupo. Lo llama el grupo.
     * El color no pasa por aquí: viaja como custom property heredada.
     */
    syncFromGroup(): void {
      const group = this.group;
      const placement = this.#inherit('label-placement', PLACEMENTS, group) ?? 'end';
      for (const p of PLACEMENTS) setCustomState(this.#internals, `placement-${p}`, p !== 'end' && p === placement);
      setCustomState(this.#internals, 'readonly', !!group?.readonly);
      setCustomState(this.#internals, 'error', !!group?.error);
    }

    #inherit(attr: string, allowed: string[], group: (HTMLElement & { disabled?: boolean; readonly?: boolean; error?: boolean }) | null): string | null {
      const own = this.getAttribute(attr);
      if (own != null && allowed.includes(own)) return own;
      const fromGroup = group?.getAttribute(attr);
      return fromGroup != null && allowed.includes(fromGroup) ? fromGroup : null;
    }

    #syncDescription = (): void => {
      this.#descEl.hidden = !this.#descSlot.assignedNodes({ flatten: true })
        .some((n: Node) => n.nodeType === 1 || !!((n as Text).textContent ?? '').trim());
    };

    #sync(): void {
      this.setAttribute('aria-checked', String(this.checked));
      this.setAttribute('aria-disabled', String(this.disabled));
      // El tabindex de un radio en grupo lo gobierna el grupo (roving tabindex).
      if (!this.group) this.setAttribute('tabindex', this.disabled ? '-1' : '0');
      this.syncFromGroup();
    }

    #select(): void {
      if (this.disabled) return;
      const group = this.group;
      if (!group) {
        this.checked = true;
        return;
      }
      if (group.disabled || group.readonly) return;
      emit(this, 'is-radio-select', { value: this.value });
    }

    #onClick = (e: PointerEvent): void => {
      if (this.disabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      this.#select();
    };

    #onKey = (e: KeyboardEvent): void => {
      if (e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      this.#select();
    };
  }

  defineElement('is-radio', IsRadio, 'IsRadio');
})();
