import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';
import './button.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-check-icon-button> — botón icon-only con dos estados (unchecked / checked).
 *
 * Muestra un solo icono a la vez según `checked`. Similar a un toggle/switch visual.
 *
 * Atributos
 *   checked         boolean reflected
 *   icon            Iconify id cuando unchecked (ej. mdi:play)
 *   checked-icon    Iconify id cuando checked (ej. mdi:pause)
 *   label           aria-label unchecked
 *   checked-label   aria-label checked (fallback: label)
 *   variant      "plain" → compacto y hereda color (chrome oscura: vídeo)
 *   disabled        boolean
 *
 * Events (bubbles, composed)
 *   is-change  { checked: boolean }  — tras cada toggle
 *
 * CSS Parts: ::part(button) ::part(icon)
 *
 * La superficie que se pinta es un <is-button variant="text">, no un <button>
 * suelto: así el hover, el active, el estado disabled y la conversión a
 * enlace salen del botón del kit en vez de reimplementarse aquí.
 *
 * El control accesible SIGUE siendo el host (role=button, tabindex, teclado):
 * es lo que esperan is-video, is-speed-dial y is-theme-toggle, que lo
 * estilizan y lo enfocan como si fuera un botón. Por eso el is-button interno
 * va con `tabindex="-1"` y `aria-hidden` — pinta, no participa.
 */

(() => {
  const TEMPLATE = document.createElement('template');
  // `exportparts` conserva los nombres de part que ya publicaba el
  // componente: ::part(button) sigue apuntando a la caja que se pinta.
  TEMPLATE.innerHTML = /* html */ `
    <is-button
      class="btn"
      variant="text"
      color="neutral"
      tabindex="-1"
      aria-hidden="true"
      exportparts="button: button"
    >
      <is-icon part="icon" class="ico" aria-hidden="true"></is-icon>
    </is-button>
  `;

  const OBSERVED = ['checked', 'icon', 'checked-icon', 'label', 'checked-label', 'disabled'];

  class IsCheckIconButton extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }

    #btn!: HTMLElement;
    #ico!: HTMLElement;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector<HTMLElement>('is-button')!;
      this.#ico = shadow.querySelector<HTMLElement>('.ico')!;
      // El control accesible es el host, no el <button> interno: escuchar aquí
      // hace que el click del usuario (que burbujea) y `el.click()` coincidan.
      this.addEventListener('click', this.#onClick);
    }

    connectedCallback(): void {
      this.#mounted = true;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
      this.addEventListener('keydown', this.#onKeydown);
      this.#render();
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.removeEventListener('keydown', this.#onKeydown);
    }

    attributeChangedCallback(_n: string, oldVal: string | null, newVal: string | null): void {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) { this.toggleAttribute('checked', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get icon() { return this.getAttribute('icon') ?? ''; }
    set icon(v) { setStringAttr(this, 'icon', v); }

    get checkedIcon() { return this.getAttribute('checked-icon') ?? ''; }
    set checkedIcon(v) {
      setStringAttr(this, 'checked-icon', v);
    }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { setStringAttr(this, 'label', v); }

    get checkedLabel() { return this.getAttribute('checked-label') ?? ''; }
    set checkedLabel(v) {
      setStringAttr(this, 'checked-label', v);
    }

    toggle(force?: boolean) {
      if (typeof force === 'boolean') this.checked = force;
      else this.checked = !this.checked;
      this.#emit();
    }

    #onClick = (e: PointerEvent) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.checked = !this.checked;
      this.#emit();
    };

    #onKeydown = (e: KeyboardEvent) => {
      if (this.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.checked = !this.checked;
        this.#emit();
      }
    };

    #emit() {
      emit(this, 'is-change', { checked: this.checked });
    }

    #render() {
      const on = this.checked;
      const icon = (on ? this.checkedIcon : this.icon) || this.icon || this.checkedIcon;
      const label = on
        ? (this.checkedLabel || this.label || '')
        : (this.label || this.checkedLabel || '');

      if (icon) this.#ico.setAttribute('icon', icon);
      else this.#ico.removeAttribute('icon');

      this.#btn.toggleAttribute('disabled', this.disabled);
      this.setAttribute('aria-pressed', String(on));
      if (label) this.setAttribute('aria-label', label);
      else this.removeAttribute('aria-label');
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }

  defineElement('is-check-icon-button', IsCheckIconButton, 'IsCheckIconButton');
})();
