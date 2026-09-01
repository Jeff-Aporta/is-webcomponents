import { adoptCss, defineElement, emit } from '../../core/element.js';
import { daysInMonth, isoOf, monthLabels, pad } from '../_shared/date-utils.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-month-calendar> — Rejilla de los 12 meses de un año (MUI MonthCalendar).
 *
 * Atributos: value (yyyy-mm), year, min, max (ISO), locale, columns,
 *            month-width (short|long), disabled, readonly
 * Events: is-change  detail { value, year, month }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base" role="radiogroup"></div>
  `;

  const OBSERVED = ['value', 'year', 'min', 'max', 'locale', 'columns', 'month-width', 'disabled', 'readonly'];

  class IsMonthCalendar extends ElementBase {
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
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#render();
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v ? this.setAttribute('value', v) : this.removeAttribute('value'); }

    /** Año mostrado: el de `value` si lo hay, si no `year`, si no el actual. */
    get year() {
      const fromValue = /^(\d{4})-(\d{2})/.exec(this.value);
      if (fromValue) return +fromValue[1];
      const attr = Number(this.getAttribute('year'));
      return Number.isFinite(attr) && attr > 0 ? attr : new Date().getFullYear();
    }
    set year(v) { this.setAttribute('year', String(v)); }

    get month() {
      const m = /^\d{4}-(\d{2})/.exec(this.value);
      return m ? +m[1] - 1 : null;
    }

    get locale() { return this.getAttribute('locale') || document.documentElement.lang || undefined; }
    set locale(v) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    focus(opts) {
      (this.#base.querySelector<HTMLElement>('[tabindex="0"]') || this.#base.firstElementChild)?.focus(opts);
    }

    /** ¿Queda algún día seleccionable en ese mes? */
    #reachable(month) {
      const year = this.year;
      const first = isoOf(year, month, 1);
      const last = isoOf(year, month, daysInMonth(year, month));
      const min = this.getAttribute('min');
      const max = this.getAttribute('max');
      if (min && last < min) return false;
      if (max && first > max) return false;
      return true;
    }

    #render() {
      const labels = monthLabels(this.locale, {
        width: this.getAttribute('month-width') || 'short',
        year: this.year,
      });
      const selected = this.month;
      const cols = Number(this.getAttribute('columns')) || 3;
      this.#base.style.setProperty('--is-month-columns', String(cols));
      const now = new Date();
      const isThisYear = now.getFullYear() === this.year;

      const cells = labels.map((label, m: string) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'month';
        btn.setAttribute('part', 'month');
        btn.setAttribute('role', 'radio');
        btn.dataset.month = String(m);
        btn.textContent = label;
        const on = m === selected;
        btn.setAttribute('aria-checked', String(on));
        if (on) btn.setAttribute('data-selected', '');
        if (isThisYear && m === now.getMonth()) btn.setAttribute('data-current', '');
        if (this.disabled || !this.#reachable(m)) {
          btn.disabled = true;
          btn.setAttribute('data-disabled', '');
        }
        return btn;
      });

      // Tabindex móvil: el mes activo es la única parada del tabulador.
      const active = cells.find((c) => c.hasAttribute('data-selected') && !c.disabled)
        || cells.find((c) => c.hasAttribute('data-current') && !c.disabled)
        || cells.find((c) => !c.disabled);
      for (const c of cells) c.tabIndex = c === active ? 0 : -1;

      this.#base.replaceChildren(...cells);
    }

    #select(month: number, { focus = false } = {}) {
      if (this.disabled || this.readonly) return;
      const value = `${this.year}-${pad(month + 1)}`;
      this.setAttribute('value', value);
      emit(this, 'is-change', { value, year: this.year, month });
      if (focus) this.#base.querySelector<HTMLElement>(`[data-month="${month}"]`)?.focus();
    }

    #onClick = (e: PointerEvent) => {
      const btn = e.target.closest('button.month');
      if (!btn || btn.disabled) return;
      this.#select(Number(btn.dataset.month));
    };

    #onKey = (e: KeyboardEvent) => {
      const btn = e.target.closest?.('button.month');
      if (!btn) return;
      const cols = Number(this.getAttribute('columns')) || 3;
      const from = Number(btn.dataset.month);
      const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
      if (e.key in steps) {
        e.preventDefault();
        this.#moveFocus(from, steps[e.key]);
        return;
      }
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        this.#moveFocus(e.key === 'Home' ? -1 : 12, e.key === 'Home' ? 1 : -1);
      }
    };

    /** Salta al siguiente mes habilitado en esa dirección. */
    #moveFocus(from, step) {
      for (let m = from + step; m >= 0 && m < 12; m += step) {
        const el = this.#base.querySelector<HTMLElement>(`[data-month="${m}"]`);
        if (el && !el.disabled) {
          for (const c of this.#base.children) c.tabIndex = c === el ? 0 : -1;
          el.focus();
          return;
        }
      }
    }
  }

  defineElement('is-month-calendar', IsMonthCalendar, 'IsMonthCalendar');
})();
