import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-date-picker> — Calendario inline.
 *
 * Atributos: value, min, max, locale, mode (single|range)
 * Events: is-change  detail { value } | { start, end }
 */

(() => {
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <div class="nav" part="nav">
        <button type="button" class="nav-btn" data-nav="-1" aria-label="Mes anterior">‹</button>
        <div class="nav-title" part="month-label"></div>
        <button type="button" class="nav-btn" data-nav="1" aria-label="Mes siguiente">›</button>
      </div>
      <div class="weekdays" part="weekdays"></div>
      <div class="grid" part="grid" role="grid"></div>
    </div>
  `;

  const OBSERVED = ['value', 'min', 'max', 'locale', 'mode'];

  function parseISO(s) {
    if (!s || !ISO.test(s)) return null;
    const [, y, m, d] = ISO.exec(s);
    const dt = new Date(+y, +m - 1, +d);
    if (dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) return null;
    return dt;
  }

  function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

  class IsDatePicker extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #navTitle;
    #weekdays;
    #grid;
    #mounted = false;
    #view = startOfMonth(new Date());
    #rangeStart = null;
    #rangeEnd = null;
    #pickingEnd = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#navTitle = shadow.querySelector('.nav-title');
      this.#weekdays = shadow.querySelector('.weekdays');
      this.#grid = shadow.querySelector('.grid');
      shadow.querySelector('.nav').addEventListener('click', this.#onNav);
      this.#grid.addEventListener('click', this.#onPick);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('mode')) this.setAttribute('mode', 'single');
      this.#parseValueAttr();
      this.#renderWeekdays();
      this.#render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value' || name === 'mode') this.#parseValueAttr();
      if (name === 'locale') this.#renderWeekdays();
      this.#render();
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get mode() { return this.getAttribute('mode') === 'range' ? 'range' : 'single'; }
    set mode(v) { this.setAttribute('mode', v === 'range' ? 'range' : 'single'); }

    get locale() {
      return this.getAttribute('locale') || document.documentElement.lang || undefined;
    }
    set locale(v) {
      if (v == null || v === '') this.removeAttribute('locale');
      else this.setAttribute('locale', String(v));
    }

    get min() { return this.getAttribute('min') ?? ''; }
    set min(v) { v ? this.setAttribute('min', v) : this.removeAttribute('min'); }

    get max() { return this.getAttribute('max') ?? ''; }
    set max(v) { v ? this.setAttribute('max', v) : this.removeAttribute('max'); }

    #emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    #parseValueAttr() {
      const raw = this.value.trim();
      if (this.mode === 'range') {
        const parts = raw.split(/\s*[/,|]\s*/).filter(Boolean);
        this.#rangeStart = parts[0] && parseISO(parts[0]) ? parts[0] : null;
        this.#rangeEnd = parts[1] && parseISO(parts[1]) ? parts[1] : null;
        this.#pickingEnd = !!this.#rangeStart && !this.#rangeEnd;
        const anchor = parseISO(this.#rangeStart) || parseISO(this.#rangeEnd) || new Date();
        this.#view = startOfMonth(anchor);
      } else {
        this.#rangeStart = raw && parseISO(raw) ? raw : null;
        this.#rangeEnd = null;
        this.#pickingEnd = false;
        if (this.#rangeStart) this.#view = startOfMonth(parseISO(this.#rangeStart));
      }
    }

    #writeValue() {
      if (this.mode === 'range') {
        if (this.#rangeStart && this.#rangeEnd) {
          this.setAttribute('value', `${this.#rangeStart}/${this.#rangeEnd}`);
        } else if (this.#rangeStart) {
          this.setAttribute('value', this.#rangeStart);
        } else {
          this.removeAttribute('value');
        }
      } else if (this.#rangeStart) {
        this.setAttribute('value', this.#rangeStart);
      } else {
        this.removeAttribute('value');
      }
    }

    #inRange(iso) {
      const min = this.getAttribute('min');
      const max = this.getAttribute('max');
      if (min && iso < min) return false;
      if (max && iso > max) return false;
      return true;
    }

    #renderWeekdays() {
      const fmt = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });
      const base = new Date(2024, 0, 1);
      this.#weekdays.replaceChildren();
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const el = document.createElement('div');
        el.className = 'wd';
        el.textContent = fmt.format(d);
        this.#weekdays.appendChild(el);
      }
    }

    #isInSelection(iso) {
      if (!this.#rangeStart) return false;
      if (this.mode !== 'range' || !this.#rangeEnd) return iso === this.#rangeStart;
      const a = this.#rangeStart < this.#rangeEnd ? this.#rangeStart : this.#rangeEnd;
      const b = this.#rangeStart < this.#rangeEnd ? this.#rangeEnd : this.#rangeStart;
      return iso >= a && iso <= b;
    }

    #render() {
      const monthLabel = new Intl.DateTimeFormat(this.locale, { month: 'long' }).format(this.#view);
      const year = this.#view.getFullYear();
      this.#navTitle.textContent = `${monthLabel} | ${year}`;

      const month = this.#view.getMonth();
      const first = new Date(year, month, 1);
      const startPad = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = toISO(new Date());

      this.#grid.replaceChildren();
      for (let i = 0; i < startPad; i++) {
        const cell = document.createElement('div');
        cell.className = 'day empty';
        this.#grid.appendChild(cell);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'day';
        btn.setAttribute('part', 'day');
        btn.dataset.iso = iso;
        btn.textContent = String(day);
        if (iso === today) btn.setAttribute('data-today', '');
        if (iso === this.#rangeStart || iso === this.#rangeEnd) btn.setAttribute('data-selected', '');
        if (this.#isInSelection(iso)) btn.setAttribute('data-in-range', '');
        if (!this.#inRange(iso)) {
          btn.disabled = true;
          btn.setAttribute('data-disabled', '');
        }
        this.#grid.appendChild(btn);
      }
    }

    #onNav = (e) => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      const delta = Number(btn.dataset.nav);
      this.#view = new Date(this.#view.getFullYear(), this.#view.getMonth() + delta, 1);
      this.#render();
    };

    #onPick = (e) => {
      const btn = e.target.closest('button.day');
      if (!btn || btn.disabled) return;
      const iso = btn.dataset.iso;

      if (this.mode === 'range') {
        if (!this.#pickingEnd || !this.#rangeStart) {
          this.#rangeStart = iso;
          this.#rangeEnd = null;
          this.#pickingEnd = true;
          this.#writeValue();
          this.#render();
          this.#emit('is-change', { start: this.#rangeStart, end: null });
        } else {
          let start = this.#rangeStart;
          let end = iso;
          if (end < start) [start, end] = [end, start];
          this.#rangeStart = start;
          this.#rangeEnd = end;
          this.#pickingEnd = false;
          this.#writeValue();
          this.#render();
          this.#emit('is-change', { start, end });
        }
      } else {
        this.#rangeStart = iso;
        this.#rangeEnd = null;
        this.#writeValue();
        this.#render();
        this.#emit('is-change', { value: iso });
      }
    };
  }

  if (!customElements.get('is-date-picker')) {
    customElements.define('is-date-picker', IsDatePicker);
  }
  if (typeof window !== 'undefined') window.IsDatePicker = IsDatePicker;
})();
