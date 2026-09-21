import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-progress-ring> — Web Component (vanilla).
 *
 * Anillo de progreso SVG.
 *
 * Atributos
 *   value           number 0–100
 *   label           string — aria-label / texto central
 *   indeterminate   boolean — g07 (Cat 27): oculta valuenow y entra en busy.
 *
 * CSS Parts: ::part(progress-ring) ::part(track) ::part(indicator) ::part(label)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="progress-ring" class="ring-wrap" role="progressbar">
      <svg class="svg" viewBox="0 0 36 36" aria-hidden="true">
        <circle part="track" class="track" cx="18" cy="18" r="15.9155"></circle>
        <circle part="indicator" class="indicator" cx="18" cy="18" r="15.9155"></circle>
      </svg>
      <span part="label" class="label"></span>
    </div>
  `;

  const OBSERVED = ['value', 'label', 'indeterminate'];
  const CIRC = 2 * Math.PI * 15.9155;

  class IsProgressRing extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    'track-width': '--is-progress-ring-track-width',
    width: '--is-progress-ring-width',
    'track-color': { prop: '--is-progress-ring-track-color', onlyColorValues: true },
    color: { prop: '--is-progress-ring-color', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'track-width', 'width', 'track-color', 'color']; }

    #wrap!: HTMLElement;
    #indicator!: HTMLElement;
    #labelEl!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#wrap = shadow.querySelector<HTMLElement>('.ring-wrap')!;
      this.#indicator = shadow.querySelector<HTMLElement>('.indicator')!;
      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
    }

    onConnected() {
      this.#render();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#render();
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

    /** g07 (Cat 27): nuevo atributo `indeterminate` para modo sin progreso real. */
    get indeterminate() { return this.hasAttribute('indeterminate'); }
    set indeterminate(v) { this.toggleAttribute('indeterminate', !!v); }

    #render() {
      const indet = this.indeterminate;
      const val = this.value;
      const label = this.label.trim();

      this.#wrap.setAttribute('aria-valuemin', '0');
      this.#wrap.setAttribute('aria-valuemax', '100');

      if (indet) {
        // g07 (Cat 27): sin valuenow + busy=true. Mantenemos el ring como
        // progressbar para que el SR lo identifique como tal, pero dejamos
        // el label interno vacío para no duplicar el porcentaje.
        this.#wrap.removeAttribute('aria-valuenow');
        this.#wrap.setAttribute('aria-busy', 'true');
        this.#wrap.setAttribute('aria-valuetext', label || '');
        this.#indicator.classList.add('is-indeterminate');
      } else {
        const offset = CIRC * (1 - val / 100);
        this.#indicator.style.strokeDasharray = `${CIRC}`;
        this.#indicator.style.strokeDashoffset = `${offset}`;
        this.#wrap.setAttribute('aria-valuenow', String(val));
        this.#wrap.setAttribute('aria-busy', 'false');
        this.#wrap.setAttribute('aria-valuetext', label || `${val}%`);
        this.#indicator.classList.remove('is-indeterminate');
      }

      if (label) {
        this.#wrap.setAttribute('aria-label', label);
        this.#labelEl.textContent = label;
        this.#labelEl.hidden = false;
      } else if (indet) {
        // g07 (Cat 27): sin label ni valor, el texto central queda vacío.
        this.#wrap.removeAttribute('aria-label');
        this.#labelEl.textContent = '';
        this.#labelEl.hidden = true;
      } else {
        this.#wrap.removeAttribute('aria-label');
        this.#labelEl.textContent = `${Math.round(val)}%`;
        this.#labelEl.hidden = false;
      }
    }
  }

  defineElement('is-progress-ring', IsProgressRing, 'IsProgressRing');
})();
