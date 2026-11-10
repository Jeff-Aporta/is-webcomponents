// @contexto INDICE.md · src/components/feedback/progress-bar.md
import { setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import css from 'iswc:css';

/**
 * <iswc-progress-bar> — Web Component (vanilla).
 *
 * Atributos
 *   value           number 0–100
 *   label           string — aria-label
 *   indeterminate   boolean
 *   color           brand | info | success | warning | danger (default brand)
 *
 * Slots: default — texto bajo la barra
 *
 * role=progressbar
 * CSS Parts: ::part(progress-bar) ::part(indicator) ::part(label)
 */

(() => {
  registrarTerminos('es', { estadoCargando: 'Cargando' });

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="progress-bar" class="track" role="progressbar">
      <div part="indicator" class="indicator"></div>
    </div>
    <span part="label" class="label" hidden><slot></slot></span>
  `;

  const OBSERVED = ['value', 'label', 'indeterminate'];

  class IswcProgressBar extends IswcReactive {
    static override tag = 'iswc-progress-bar';
    static override css = css;

    static override observed = [...OBSERVED, 'track-height', 'track-color', 'color'];

    #track!: HTMLElement;
    #indicator!: HTMLElement;
    #label!: HTMLElement;
    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#track = shadow.querySelector<HTMLElement>('.track')!;
      this.#indicator = shadow.querySelector<HTMLElement>('.indicator')!;
      this.#label = shadow.querySelector<HTMLElement>('.label')!;
      shadow.querySelector('slot')!.addEventListener('slotchange', (e) => {
        const nodos = (e.target as HTMLSlotElement).assignedNodes();
        this.#label.hidden = !nodos.some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim());
      });
    }

    override onConnected() {
      this.#render();
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#render();
    }

    /** Repinta al cambiar el idioma heredado (el primer pintado lo hace `onConnected`). */
    override actualizado(): void {
      if (this.mounted) this.#render();
    }

    get value(): number {
      const raw = this.getAttribute('value');
      const n = raw == null || raw === '' ? NaN : parseFloat(raw);
      return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    }
    set value(v: number | string | null | undefined) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { setStringAttr(this, 'label', v); }

    get indeterminate() { return this.hasAttribute('indeterminate'); }
    set indeterminate(v) { this.toggleAttribute('indeterminate', !!v); }

    #render() {
      const indet = this.indeterminate;
      const val = this.value;
      const label = this.label.trim();

      this.#track.setAttribute('aria-valuemin', '0');
      this.#track.setAttribute('aria-valuemax', '100');

      if (indet) {
        // g07 (Cat 26): en indeterminate no hay progreso real → el role sigue
        // siendo progressbar pero aria-busy=true avisa al SR de que ignore el
        // valuenow ausente y anuncie que el proceso sigue en curso.
        this.#track.removeAttribute('aria-valuenow');
        this.#track.setAttribute('aria-valuetext', label || this.t('estadoCargando'));
        this.#track.setAttribute('aria-busy', 'true');
        this.#indicator.style.width = '';
        this.#indicator.classList.add('iswc-indeterminate');
      } else {
        this.#track.setAttribute('aria-valuenow', String(val));
        // El nombre va en aria-label: valuetext dice cuánto lleva, no qué es.
        this.#track.setAttribute('aria-valuetext', `${val}%`);
        this.#track.setAttribute('aria-busy', 'false');
        this.#indicator.style.width = `${val}%`;
        this.#indicator.classList.remove('iswc-indeterminate');
      }

      if (label) this.#track.setAttribute('aria-label', label);
      else this.#track.removeAttribute('aria-label');
    }
  }

  define(IswcProgressBar, 'IswcProgressBar');
})();
