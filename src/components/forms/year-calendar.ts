import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-year-calendar> — Rejilla de años desplazable (MUI YearCalendar).
 *
 * Atributos: value (yyyy), min, max (ISO o yyyy), columns, disabled, readonly
 * Events: is-change  detail { value, year }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base" role="radiogroup"></div>
  `;

  const OBSERVED = ['value', 'min', 'max', 'columns', 'disabled', 'readonly'];

  /** Acepta `2026` o `2026-07-31`. */
  function yearOf(raw, fallback) {
    const n = Number(String(raw ?? '').slice(0, 4));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  class IsYearCalendar extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #base!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#base = shadow.querySelector<HTMLElement>('.base')!;
      this.#base.addEventListener('click', this.#onClick);
      this.#base.addEventListener('keydown', this.#onKey);
    }

    onConnected() {
      this.#render();
      this.scrollToSelection();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#render();
      if (name === 'value') this.scrollToSelection();
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get year() { return yearOf(this.value, null); }

    get min() { return yearOf(this.getAttribute('min'), new Date().getFullYear() - 100); }
    get max() { return yearOf(this.getAttribute('max'), new Date().getFullYear() + 100); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    focus(opts) {
      (this.#base.querySelector<HTMLElement>('[tabindex="0"]') || this.#base.firstElementChild)?.focus(opts);
    }

    /** Deja el año activo centrado: la lista puede abarcar dos siglos. */
    scrollToSelection() {
      const el = this.#base.querySelector<HTMLElement>('[data-selected], [data-current]');
      if (el) el.scrollIntoView({ block: 'center' });
    }

    #render() {
      const selected = this.year;
      const current = new Date().getFullYear();
      const cols = Number(this.getAttribute('columns')) || 3;
      this.#base.style.setProperty('--is-year-columns', String(cols));

      const cells = [];
      for (let y = this.min; y <= this.max; y++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'year';
        btn.setAttribute('part', 'year');
        btn.setAttribute('role', 'radio');
        btn.dataset.year = String(y);
        btn.textContent = String(y);
        const on = y === selected;
        btn.setAttribute('aria-checked', String(on));
        if (on) btn.setAttribute('data-selected', '');
        if (y === current) btn.setAttribute('data-current', '');
        if (this.disabled) btn.disabled = true;
        cells.push(btn);
      }

      const active = cells.find((c) => c.hasAttribute('data-selected'))
        || cells.find((c) => c.hasAttribute('data-current'))
        || cells[0];
      for (const c of cells) c.tabIndex = c === active ? 0 : -1;

      this.#base.replaceChildren(...cells);
    }

    #select(year: string) {
      if (this.disabled || this.readonly) return;
      this.setAttribute('value', String(year));
      emit(this, 'is-change', { value: String(year), year });
    }

    #onClick = (e: PointerEvent) => {
      const btn = e.target.closest('button.year');
      if (!btn || btn.disabled) return;
      this.#select(Number(btn.dataset.year));
    };

    #onKey = (e: KeyboardEvent) => {
      const btn = e.target.closest?.('button.year');
      if (!btn) return;
      const cols = Number(this.getAttribute('columns')) || 3;
      const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
      if (e.key in steps) {
        e.preventDefault();
        this.#moveFocus(Number(btn.dataset.year) + steps[e.key]);
        return;
      }
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        this.#moveFocus(e.key === 'Home' ? this.min : this.max);
      }
    };

    #moveFocus(year) {
      const el = this.#base.querySelector<HTMLElement>(`[data-year="${year}"]`);
      if (!el || el.disabled) return;
      for (const c of this.#base.children) c.tabIndex = c === el ? 0 : -1;
      el.focus();
    }
  }

  defineElement('is-year-calendar', IsYearCalendar, 'IsYearCalendar');
})();
