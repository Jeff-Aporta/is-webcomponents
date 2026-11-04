import { emit } from '@jeff-aporta/iswc-base/core/element.js';
import { ocultarSlotsVacios } from '@jeff-aporta/iswc-base/core/dom-utils.js';
import { INTENT } from '@jeff-aporta/iswc-base/core/intent.js';
import { TONE } from '@jeff-aporta/iswc-base/core/tone.js';
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * <iswc-tag> — Web Component (vanilla).
 *
 * Similar a iswc-badge; default variant filled-outlined, color neutral.
 * Escala con font-size del contexto (métricas en em).
 *
 * Atributos
 *   color       brand | neutral | text | info | success | warning | danger (default brand)
 *   variant    accent | filled | outlined | filled-outlined (default filled-outlined)
 *   pill          boolean
 *   with-remove   boolean — muestra botón de quitar
 *   remove-label  string — aria-label del botón (default Quitar)
 *
 * Eventos
 *   iswc-remove  — click en botón quitar (bubbles, composed)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="tag" class="tag">
      <span part="start" class="prefix" hidden><slot name="start"></slot></span>
      <span part="label" class="label"><slot></slot></span>
      <span part="end" class="suffix" hidden><slot name="end"></slot></span>
      <iswc-button
        type="button"
        part="remove-button"
        class="remove"
        variant="glyph"
        color="neutral"
        aria-label="Quitar"
        hidden
      >
        <iswc-icon icon="mdi:close" aria-hidden="true"></iswc-icon>
      </iswc-button>
    </span>
  `;

  const OBSERVED = ['color', 'variant', 'pill', 'with-remove', 'remove-label'];
  const VALID_COLOR = [...INTENT]; // 'info' ya es parte de INTENT
  const VALID_VARIANT = TONE.filter((t) => t !== 'plain');

  class IswcTag extends IswcElement {
    static tag = 'iswc-tag';
    static css = css;
    static deps = ['iswc-icon', 'iswc-button'];
    static observed = OBSERVED;

    #remove!: HTMLElement;
    #mo: MutationObserver | null = null;
    /** Etiqueta que puso #syncAria: se retira en cuanto llega texto, sin tocar la del consumidor. */
    #labelAuto = '';

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      ocultarSlotsVacios(shadow, '.prefix slot, .suffix slot');
      this.#remove = shadow.querySelector<HTMLElement>('.remove')!;
      this.#remove.addEventListener('click', this.#onRemove);
    }

    onConnected() {
      if (!this.hasAttribute('color')) this.setAttribute('color', 'brand');
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'filled-outlined');
      this.#syncRemove();
      // g07 (Cat 30): observar el slot para reflejar cambios en la
      // etiqueta accesible automática (p.ej. icon-only tag).
      this.#watchA11y();
      this.#syncAria();
    }

    onDisconnected() {
      this.#mo?.disconnect();
      this.#mo = null;
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'color' && newVal && !VALID_COLOR.includes(newVal)) {
        this.setAttribute('color', 'neutral');
      }
      if (name === 'variant' && newVal && !VALID_VARIANT.includes(newVal)) {
        this.setAttribute('variant', 'filled-outlined');
      }
      if (name === 'with-remove' || name === 'remove-label') this.#syncRemove();
      if (name === 'color') this.#syncAria();
    }

    get withRemove() { return this.hasAttribute('with-remove'); }
    set withRemove(v) { this.toggleAttribute('with-remove', !!v); }

    #syncRemove() {
      this.#remove.hidden = !this.withRemove;
      this.#remove.setAttribute('aria-label', this.getAttribute('remove-label') || 'Quitar');
    }

    /** g07 (Cat 30): etiqueta accesible automática cuando el slot principal
     *  está vacío. Mismo criterio que badge.ts: "Etiqueta {color}". */
    #syncAria() {
      const actual = this.getAttribute('aria-label');
      if (actual !== null && actual !== this.#labelAuto) return; // la puso el consumidor
      // Con texto, o con otro slot lleno, el contenido ya se nombra solo.
      const vacio = !this.textContent?.trim() && !this.querySelector('[slot]:not([slot="start"]):not([slot="end"])');
      this.#labelAuto = vacio ? `Etiqueta ${this.getAttribute('color') || 'brand'}` : '';
      if (vacio) this.setAttribute('aria-label', this.#labelAuto);
      else this.removeAttribute('aria-label');
    }

    #watchA11y() {
      this.#mo?.disconnect();
      this.#mo = new MutationObserver(() => this.#syncAria());
      this.#mo.observe(this, { childList: true, subtree: true, characterData: true });
    }

    #onRemove = (e: Event) => {
      e.stopPropagation();
      emit(this, 'iswc-remove');
    };
  }

  define(IswcTag, 'IswcTag');
})();
