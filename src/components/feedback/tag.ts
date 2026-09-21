import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';
import '../actions/button.js';
import { ElementBase } from '../../core/element-base.js';
import { INTENT } from '../_shared/intent.js';
import { TONE } from '../_shared/tone.js';

/**
 * <is-tag> — Web Component (vanilla).
 *
 * Similar a is-badge; default variant filled-outlined, color neutral.
 * Escala con font-size del contexto (métricas en em).
 *
 * Atributos
 *   color       brand | neutral | info | success | warning | danger (default brand)
 *   variant    accent | filled | outlined | filled-outlined (default filled-outlined)
 *   pill          boolean
 *   with-remove   boolean — muestra botón de quitar
 *   remove-label  string — aria-label del botón (default Quitar)
 *
 * Eventos
 *   is-remove  — click en botón quitar (bubbles, composed)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="tag" class="tag">
      <span part="start" class="prefix"><slot name="start"></slot></span>
      <span part="label" class="label"><slot></slot></span>
      <span part="end" class="suffix"><slot name="end"></slot></span>
      <is-button
        type="button"
        part="remove-button"
        class="remove"
        variant="text"
        color="neutral"
        aria-label="Quitar"
        hidden
      >
        <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
      </is-button>
    </span>
  `;

  const OBSERVED = ['color', 'variant', 'pill', 'with-remove', 'remove-label'];
  const VALID_COLOR = [...INTENT, 'info'];
  const VALID_VARIANT = TONE.filter((t) => t !== 'plain');

  class IsTag extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #remove!: HTMLElement;
    #mo: MutationObserver | null = null;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
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
      if (this.hasAttribute('aria-label')) return;
      const text = this.textContent?.trim() ?? '';
      if (text) return;
      // Si hay un slot distinto a start/end, el consumidor está pintando
      // contenido propio en el slot por defecto → no inventar label.
      const hasOtherSlot = this.querySelector('[slot]:not([slot="start"]):not([slot="end"])');
      if (hasOtherSlot) return;
      const color = this.getAttribute('color') || 'brand';
      this.setAttribute('aria-label', `Etiqueta ${color}`);
    }

    #watchA11y() {
      this.#mo?.disconnect();
      this.#mo = new MutationObserver(() => this.#syncAria());
      this.#mo.observe(this, { childList: true, subtree: true, characterData: true });
    }

    #onRemove = (e: Event) => {
      e.stopPropagation();
      emit(this, 'is-remove');
    };
  }

  defineElement('is-tag', IsTag, 'IsTag');
})();
