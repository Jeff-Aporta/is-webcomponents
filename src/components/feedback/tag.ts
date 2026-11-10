// @contexto INDICE.md · src/components/feedback/tag.md
import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import { ocultarSlotsVacios } from '@jeff-aporta/iswc-base/core/dom.js';
import { INTENT, TONE } from '@jeff-aporta/iswc-base/core/attrs.js';
import css from 'iswc:css';
import type { TagEventos } from './schemas/tag.schemas.js';

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
        hidden
      >
        <iswc-icon icon="mdi:close" aria-hidden="true"></iswc-icon>
      </iswc-button>
    </span>
  `;

  registrarTerminos('es', { etiquetaColor: (color) => `Etiqueta ${color}`, quitar: 'Quitar' });

  const OBSERVED = ['color', 'variant', 'pill', 'with-remove', 'remove-label'];
  const VALID_COLOR = [...INTENT]; // 'info' ya es parte de INTENT
  const VALID_VARIANT = TONE.filter((t) => t !== 'plain');

  class IswcTag extends IswcReactive {
    static override tag = 'iswc-tag';
    declare static events: TagEventos;
    static override css = css;
    static override deps = ['iswc-icon', 'iswc-button'];
    static override observed = OBSERVED;

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

    override onConnected() {
      if (!this.hasAttribute('color')) this.setAttribute('color', 'brand');
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'filled-outlined');
      this.#syncRemove();
      // g07 (Cat 30): observar el slot para reflejar cambios en la
      // etiqueta accesible automática (p.ej. icon-only tag).
      this.#watchA11y();
      this.#syncAria();
    }

    override onDisconnected() {
      this.#mo?.disconnect();
      this.#mo = null;
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
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

    /** Repinta los textos por defecto al cambiar el idioma heredado. */
    override actualizado(): void {
      if (!this.mounted) return;
      this.#syncRemove();
      this.#syncAria();
    }

    #syncRemove() {
      this.#remove.hidden = !this.withRemove;
      this.#remove.setAttribute('aria-label', this.getAttribute('remove-label') || this.t('quitar'));
    }

    /** g07 (Cat 30): etiqueta accesible automática cuando el slot principal
     *  está vacío. Mismo criterio que badge.ts: "Etiqueta {color}". */
    #syncAria() {
      const actual = this.getAttribute('aria-label');
      if (actual !== null && actual !== this.#labelAuto) return; // la puso el consumidor
      // Con texto, o con otro slot lleno, el contenido ya se nombra solo.
      const vacio = !this.textContent?.trim() && !this.querySelector('[slot]:not([slot="start"]):not([slot="end"])');
      this.#labelAuto = vacio ? this.t('etiquetaColor', this.getAttribute('color') || 'brand') : '';
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
