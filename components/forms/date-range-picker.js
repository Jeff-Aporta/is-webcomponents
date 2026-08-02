import { adoptCss } from '../_shared/adopt-css.js';
import { addMonths, monthKey, parseISO, startOfMonth, toISO } from '../_shared/date-utils.js';
import '../actions/button.js';
import './date-picker.js';

/**
 * <is-date-range-picker> — Rango de fechas con varios meses a la vista
 * (equivalente a DateRangeCalendar de MUI X) y panel de atajos.
 *
 * Compone N <is-date-picker mode="range">: el rango vive aquí y se empuja a
 * todos, así que el segundo clic puede caer en cualquier mes y el rango
 * tentativo se pinta en todos a la vez.
 *
 * Atributos: value ("inicio/fin"), calendars (1-3), month (ancla yyyy-mm),
 *            shortcuts ("this-week last-7-days …" | "none"), min, max, locale,
 *            first-day-of-week, weekday-width, show-outside-days, fixed-weeks,
 *            show-week-numbers, disable-past, disable-future, disabled-dates,
 *            disabled-days, disabled, readonly
 * Slots: shortcut (atajos propios con data-range="inicio/fin")
 * Events: is-change { start, end } · is-month-change { month }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <div part="shortcuts" class="shortcuts" role="group" hidden>
        <div class="presets"></div>
        <slot name="shortcut"></slot>
      </div>
      <div part="calendars" class="calendars"></div>
    </div>
  `;

  const OBSERVED = [
    'value', 'calendars', 'month', 'shortcuts', 'min', 'max', 'locale',
    'first-day-of-week', 'weekday-width', 'show-outside-days', 'fixed-weeks',
    'show-week-numbers', 'disable-past', 'disable-future', 'disabled-dates',
    'disabled-days', 'disabled', 'readonly',
  ];

  /** Atributos que se copian tal cual a cada calendario hijo. */
  const MIRRORED = [
    'min', 'max', 'locale', 'first-day-of-week', 'weekday-width',
    'show-outside-days', 'fixed-weeks', 'show-week-numbers', 'disable-past',
    'disable-future', 'disabled-dates', 'disabled-days', 'disabled', 'readonly',
  ];

  const LABELS = {
    es: {
      'this-week': 'Esta semana',
      'last-week': 'Semana pasada',
      'last-7-days': 'Últimos 7 días',
      'current-month': 'Mes actual',
      'next-month': 'Mes siguiente',
      'this-year': 'Este año',
      reset: 'Limpiar',
    },
    en: {
      'this-week': 'This week',
      'last-week': 'Last week',
      'last-7-days': 'Last 7 days',
      'current-month': 'Current month',
      'next-month': 'Next month',
      'this-year': 'This year',
      reset: 'Reset',
    },
  };

  const PRESETS = Object.keys(LABELS.es);

  function shift(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /** Lunes de la semana de `date` (los atajos siguen la semana ISO). */
  function weekStart(date) {
    return shift(date, -((date.getDay() + 6) % 7));
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function presetRange(key) {
    const today = new Date();
    switch (key) {
      case 'this-week': {
        const from = weekStart(today);
        return [toISO(from), toISO(shift(from, 6))];
      }
      case 'last-week': {
        const from = shift(weekStart(today), -7);
        return [toISO(from), toISO(shift(from, 6))];
      }
      case 'last-7-days':
        return [toISO(shift(today, -6)), toISO(today)];
      case 'current-month':
        return [toISO(startOfMonth(today)), toISO(endOfMonth(today))];
      case 'next-month': {
        const next = addMonths(today, 1);
        return [toISO(next), toISO(endOfMonth(next))];
      }
      case 'this-year':
        return [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`];
      default:
        return null;
    }
  }

  class IsDateRangePicker extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #shortcuts;
    #presets;
    #calendars;
    #mounted = false;
    #pickers = [];
    #anchor = startOfMonth(new Date());

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#shortcuts = shadow.querySelector('.shortcuts');
      this.#presets = shadow.querySelector('.presets');
      this.#calendars = shadow.querySelector('.calendars');
      this.#shortcuts.addEventListener('click', this.#onShortcut);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#anchor = this.#anchorFromState();
      this.#syncPickerCount();
      this.#renderShortcuts();
      this.#sync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'calendars') this.#syncPickerCount();
      if (name === 'shortcuts' || name === 'locale') this.#renderShortcuts();
      if (name === 'value') this.#anchor = this.#anchorFromState();
      if (name === 'month' && newVal) {
        const d = parseISO(`${newVal}-01`);
        if (d) this.#anchor = d;
      }
      this.#sync();
    }

    /* ── API ──────────────────────────────────────────────────────────── */

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get start() { return this.#parts()[0]; }
    get end() { return this.#parts()[1]; }

    get calendars() {
      const n = Number(this.getAttribute('calendars'));
      return Math.min(3, Math.max(1, Number.isFinite(n) && n ? n : 2));
    }
    set calendars(v) { this.setAttribute('calendars', String(v)); }

    get locale() { return this.getAttribute('locale') || document.documentElement.lang || undefined; }
    set locale(v) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    /** Mes del primer calendario, `yyyy-mm`. */
    get month() { return monthKey(this.#anchor); }
    set month(v) { this.setAttribute('month', String(v)); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    clear() {
      this.removeAttribute('value');
      this.#emit('is-change', { start: null, end: null });
    }

    /* ── Interno ──────────────────────────────────────────────────────── */

    #emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    #parts() {
      const [a = null, b = null] = this.value.split(/\s*[/,|]\s*/).filter(Boolean);
      return [a && parseISO(a) ? a : null, b && parseISO(b) ? b : null];
    }

    #anchorFromState() {
      const [start] = this.#parts();
      const d = start ? parseISO(start) : null;
      if (d) return startOfMonth(d);
      const attr = this.getAttribute('month');
      const fromAttr = attr && parseISO(`${attr}-01`);
      return fromAttr || this.#anchor;
    }

    #syncPickerCount() {
      const want = this.calendars;
      while (this.#pickers.length > want) this.#pickers.pop().remove();
      while (this.#pickers.length < want) {
        const picker = document.createElement('is-date-picker');
        picker.setAttribute('mode', 'range');
        picker.setAttribute('frameless', '');
        picker.setAttribute('views', 'day month year');
        picker.addEventListener('is-change', this.#onPickerChange);
        picker.addEventListener('is-day-hover', this.#onPickerHover);
        picker.addEventListener('is-month-change', this.#onPickerMonth);
        // Los eventos de los hijos no son API de is-date-range-picker.
        for (const type of ['is-view-change', 'is-day-hover']) {
          picker.addEventListener(type, (e) => e.stopPropagation());
        }
        this.#pickers.push(picker);
        this.#calendars.appendChild(picker);
      }
    }

    /** Empuja rango, mes y opciones a cada calendario. */
    #sync() {
      const value = this.value;
      this.#pickers.forEach((picker, i) => {
        picker.dataset.index = String(i);
        // Un solo calendario navega libre; con varios, cada extremo mueve el set.
        picker.setAttribute('nav', this.#pickers.length === 1
          ? 'both'
          : i === 0 ? 'prev' : i === this.#pickers.length - 1 ? 'next' : 'none');
        if (value) picker.setAttribute('value', value);
        else picker.removeAttribute('value');
        picker.setAttribute('month', monthKey(addMonths(this.#anchor, i)));
        for (const name of MIRRORED) {
          const v = this.getAttribute(name);
          if (v == null) picker.removeAttribute(name);
          else picker.setAttribute(name, v);
        }
      });
      this.#markActiveShortcut();
    }

    #renderShortcuts() {
      const raw = (this.getAttribute('shortcuts') || '').trim().toLowerCase();
      const keys = raw === 'none' || raw === ''
        ? []
        : raw.split(/[\s,]+/).filter((k) => PRESETS.includes(k));
      const lang = String(this.locale || 'es').slice(0, 2);
      const dict = LABELS[lang] || LABELS.es;

      this.#presets.replaceChildren(...keys.map((key) => {
        const btn = document.createElement('is-button');
        btn.setAttribute('variant', 'outlined');
        btn.setAttribute('color', key === 'reset' ? 'neutral' : 'brand');
        btn.setAttribute('pill', '');
        btn.dataset.preset = key;
        btn.textContent = dict[key];
        return btn;
      }));

      const custom = this.querySelectorAll('[slot="shortcut"]').length;
      this.#shortcuts.hidden = keys.length === 0 && custom === 0;
      this.#shortcuts.setAttribute('aria-label', lang === 'en' ? 'Shortcuts' : 'Atajos');
    }

    /** Resalta el atajo cuyo rango coincide con la selección actual. */
    #markActiveShortcut() {
      const current = this.#parts().join('/');
      for (const btn of this.#presets.children) {
        const range = presetRange(btn.dataset.preset);
        const on = !!range && range.join('/') === current;
        btn.toggleAttribute('data-active', on);
        btn.setAttribute('variant', on ? 'filled' : 'outlined');
      }
    }

    #applyRange(start, end, source) {
      if (this.disabled || this.readonly) return;
      if (!start) this.removeAttribute('value');
      else this.setAttribute('value', end ? `${start}/${end}` : start);
      this.#anchor = this.#anchorFromState();
      this.#sync();
      this.#emit('is-change', { start: start || null, end: end || null, source });
    }

    #onPickerChange = (e) => {
      e.stopPropagation();
      const { start, end } = e.detail;
      // El ancla no se mueve al elegir: el usuario está mirando estos meses.
      const keep = this.#anchor;
      if (!start) this.removeAttribute('value');
      else this.setAttribute('value', end ? `${start}/${end}` : start);
      this.#anchor = keep;
      this.#sync();
      this.#emit('is-change', { start: start || null, end: end || null, source: 'calendar' });
    };

    #onPickerHover = (e) => {
      const iso = e.detail?.iso || null;
      for (const picker of this.#pickers) {
        if (iso) picker.setAttribute('preview-to', iso);
        else picker.removeAttribute('preview-to');
      }
    };

    #onPickerMonth = (e) => {
      e.stopPropagation();
      const key = e.detail?.month;
      const d = key && parseISO(`${key}-01`);
      if (!d) return;
      const index = Number(e.target.dataset.index) || 0;
      const anchor = addMonths(d, -index);
      if (monthKey(anchor) === monthKey(this.#anchor)) return;
      this.#anchor = anchor;
      this.#sync();
      this.#emit('is-month-change', { month: this.month });
    };

    #onShortcut = (e) => {
      const btn = e.target.closest('[data-preset], [data-range]');
      if (!btn) return;
      if (btn.dataset.preset === 'reset') {
        this.#applyRange(null, null, 'shortcut');
        return;
      }
      const range = btn.dataset.range
        ? btn.dataset.range.split(/\s*[/,|]\s*/)
        : presetRange(btn.dataset.preset);
      if (!range) return;
      const [start, end] = range;
      this.#anchor = startOfMonth(parseISO(start) || new Date());
      this.#applyRange(start, end, 'shortcut');
    };
  }

  if (!customElements.get('is-date-range-picker')) {
    customElements.define('is-date-range-picker', IsDateRangePicker);
  }
  if (typeof window !== 'undefined') window.IsDateRangePicker = IsDateRangePicker;
})();
