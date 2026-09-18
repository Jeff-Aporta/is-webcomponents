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

  const OBSERVED: string[] = ['value', 'min', 'max', 'columns', 'disabled', 'readonly'];

  /** Acepta `2026` o `2026-07-31`. */
  function yearOf(raw: string | null | undefined, fallback: number | null): number | null {
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

    onConnected(): void {
      this.#render();
      this.scrollToSelection();
    }

    onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void {
      this.#render();
      if (name === 'value') this.scrollToSelection();
    }

    get value(): string { return this.getAttribute('value') ?? ''; }
    set value(v: string | number | null | undefined) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get year(): number | null { return yearOf(this.value, null); }

    get min(): number { return yearOf(this.getAttribute('min'), new Date().getFullYear() - 100) ?? (new Date().getFullYear() - 100); }
    get max(): number { return yearOf(this.getAttribute('max'), new Date().getFullYear() + 100) ?? (new Date().getFullYear() + 100); }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    get readonly(): boolean { return this.hasAttribute('readonly'); }
    set readonly(v: boolean) { this.toggleAttribute('readonly', !!v); }

    focus(opts?: FocusOptions): void {
      const tabEl = this.#base.querySelector<HTMLElement>('[tabindex="0"]') as HTMLElement | null;
      const first = this.#base.firstElementChild as HTMLElement | null;
      (tabEl || first)?.focus(opts);
    }

    /** Deja el año activo centrado: la lista puede abarcar dos siglos. */
    scrollToSelection(): void {
      const el = this.#base.querySelector<HTMLElement>('[data-selected], [data-current]');
      if (el) el.scrollIntoView({ block: 'center' });
    }

    #render(): void {
      const selected = this.year;
      const current = new Date().getFullYear();
      const cols = Number(this.getAttribute('columns')) || 3;
      this.#base.style.setProperty('--is-year-columns', String(cols));

      const cells: HTMLButtonElement[] = [];
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

      const active: HTMLButtonElement | undefined = cells.find((c) => c.hasAttribute('data-selected'))
        || cells.find((c) => c.hasAttribute('data-current'))
        || cells[0];
      for (const c of cells) c.tabIndex = c === active ? 0 : -1;

      this.#base.replaceChildren(...cells);
    }

    #select(year: number): void {
      if (this.disabled || this.readonly) return;
      this.setAttribute('value', String(year));
      emit(this, 'is-change', { value: String(year), year });
    }

    #onClick = (e: PointerEvent): void => {
      const btn = (e.target as Element | null)?.closest('button.year') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      this.#select(Number(btn.dataset.year));
    };

    #onKey = (e: KeyboardEvent): void => {
      const btn = (e.target as Element | null)?.closest?.('button.year') as HTMLButtonElement | null;
      if (!btn) return;
      const cols = Number(this.getAttribute('columns')) || 3;
      const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
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

    #moveFocus(year: number): void {
      const el = this.#base.querySelector<HTMLButtonElement>(`[data-year="${year}"]`);
      if (!el || el.disabled) return;
      for (const c of Array.from(this.#base.children) as HTMLElement[]) c.tabIndex = c === el ? 0 : -1;
      el.focus();
    }
  }

  defineElement('is-year-calendar', IsYearCalendar, 'IsYearCalendar');
})();
