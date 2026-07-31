import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-date-input> — Campo de fecha ISO (yyyy-mm-dd) + calendario en <dialog>.
 *
 * El panel usa dialog modal (top layer) para no perderse por overflow.
 * Clic fuera (superficie del dialog) cierra.
 *
 * Atributos: label, hint, name, value, min, max, disabled, required, locale, format
 * Events: is-change, is-input
 * Methods: show(), hide()
 */

(() => {
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <label part="label" class="label" hidden></label>
      <div part="base" class="base">
        <input part="input" class="input" type="text" inputmode="numeric" autocomplete="off" placeholder="yyyy-mm-dd" />
        <button type="button" part="trigger" class="trigger" aria-label="Abrir calendario" aria-haspopup="dialog" aria-expanded="false">
          <svg viewBox="0 0 16 16" width="1.1em" height="1.1em" aria-hidden="true">
            <path fill="currentColor" d="M4 2v1H3a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1h-1V2h-1v1H5V2H4zm9 4H3v7h10V6z"/>
          </svg>
        </button>
      </div>
      <div part="hint" class="hint" hidden></div>
    </div>
    <dialog part="dialog" class="popup" tabindex="-1">
      <div part="panel" class="panel" role="document">
        <div class="nav">
          <button type="button" class="nav-btn" data-nav="-1" aria-label="Mes anterior">‹</button>
          <div class="nav-title" part="month-label"></div>
          <button type="button" class="nav-btn" data-nav="1" aria-label="Mes siguiente">›</button>
        </div>
        <div class="weekdays" part="weekdays"></div>
        <div class="grid" part="grid" role="grid"></div>
      </div>
    </dialog>
  `;

  const OBSERVED = [
    'label', 'hint', 'name', 'value', 'min', 'max',
    'disabled', 'required', 'locale', 'format'
  ];

  function parseISO(s) {
    if (!s || !ISO.test(s)) return null;
    const [, y, m, d] = ISO.exec(s);
    const dt = new Date(+y, +m - 1, +d);
    if (dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) return null;
    return dt;
  }

  function toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

  class IsDateInput extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes() { return OBSERVED; }

    #internals = null;
    #input;
    #dialog;
    #panel;
    #base;
    #labelEl;
    #hintEl;
    #trigger;
    #grid;
    #weekdays;
    #navTitle;
    #mounted = false;
    #open = false;
    #view = startOfMonth(new Date());
    #ignoreFocus = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#input = shadow.querySelector('.input');
      this.#dialog = shadow.querySelector('.popup');
      this.#panel = shadow.querySelector('.panel');
      this.#base = shadow.querySelector('.base');
      this.#labelEl = shadow.querySelector('.label');
      this.#hintEl = shadow.querySelector('.hint');
      this.#trigger = shadow.querySelector('.trigger');
      this.#grid = shadow.querySelector('.grid');
      this.#weekdays = shadow.querySelector('.weekdays');
      this.#navTitle = shadow.querySelector('.nav-title');

      if ('attachInternals' in this) {
        try { this.#internals = this.attachInternals(); } catch { /* noop */ }
      }

      this.#input.addEventListener('input', this.#onType);
      this.#input.addEventListener('change', this.#onBlurCommit);
      this.#input.addEventListener('keydown', this.#onKey);
      this.#trigger.addEventListener('click', this.#onTrigger);
      shadow.querySelector('.nav').addEventListener('click', this.#onNav);
      this.#grid.addEventListener('click', this.#onPick);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('keydown', this.#onDialogKey);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProps();
      this.#syncMeta();
      this.#syncFromValue();
      this.#syncDisabled();
      this.#renderWeekdays();
      this.#updateValidity();
      this.#setFormValue();
      addEventListener('resize', this.#onReposition, { passive: true });
      addEventListener('scroll', this.#onReposition, true);
    }

    disconnectedCallback() {
      removeEventListener('resize', this.#onReposition);
      removeEventListener('scroll', this.#onReposition, true);
      if (this.#dialog.open) this.#dialog.close();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'value') {
        this.#syncFromValue();
        this.#setFormValue();
        this.#updateValidity();
        if (this.#open) this.#renderCalendar();
      } else if (name === 'disabled') this.#syncDisabled();
      else if (name === 'min' || name === 'max' || name === 'locale') {
        if (name === 'locale') this.#renderWeekdays();
        if (this.#open) this.#renderCalendar();
        this.#updateValidity();
      } else if (name === 'required') this.#updateValidity();
      else this.#syncMeta();
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', !!v); }

    get locale() {
      return this.getAttribute('locale') || document.documentElement.lang || undefined;
    }
    set locale(v) {
      if (v == null || v === '') this.removeAttribute('locale');
      else this.setAttribute('locale', String(v));
    }

    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { v == null || v === '' ? this.removeAttribute('name') : this.setAttribute('name', v); }

    get open() { return this.#open; }

    show() {
      if (this.disabled) return;
      const cur = parseISO(this.value) || new Date();
      this.#view = startOfMonth(cur);
      this.#open = true;
      this.#setState('open', true);
      this.#trigger.setAttribute('aria-expanded', 'true');
      this.#renderCalendar();
      this.#positionPanel();
      if (!this.#dialog.open) this.#dialog.showModal();
      else this.#positionPanel();
      queueMicrotask(() => {
        try { this.#dialog.focus({ preventScroll: true }); } catch { /* noop */ }
      });
    }

    hide() {
      const was = this.#open;
      this.#open = false;
      this.#setState('open', false);
      this.#trigger.setAttribute('aria-expanded', 'false');
      if (this.#dialog.open) this.#dialog.close();
      if (was) {
        this.#ignoreFocus = true;
        this.#input.focus();
        queueMicrotask(() => { this.#ignoreFocus = false; });
      }
    }

    formResetCallback() {
      const initial = this.getAttribute('value');
      if (initial == null) this.removeAttribute('value');
      else this.setAttribute('value', initial);
      this.#syncFromValue();
    }

    formDisabledCallback(disabled) { this.#syncDisabled(disabled); }

    checkValidity() { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) {
      if (!this.#internals) return;
      this.#internals.setValidity(msg ? { customError: true } : {}, msg || '', this.#input);
    }

    #upgradeProps() {
      for (const a of OBSERVED) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          this[a] = v;
        }
      }
    }

    #setState(name, on) {
      const s = this.#internals?.states;
      if (!s) return;
      if (on) s.add(name);
      else s.delete(name);
    }

    #emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    #syncMeta() {
      const label = this.getAttribute('label');
      this.#labelEl.hidden = !label;
      this.#labelEl.textContent = label || '';
      const hint = this.getAttribute('hint');
      this.#hintEl.hidden = !hint;
      this.#hintEl.textContent = hint || '';
      const fmt = this.getAttribute('format');
      if (fmt) this.#input.placeholder = fmt;
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.disabled;
      this.#input.disabled = disabled;
      this.#trigger.disabled = disabled;
      this.#setState('disabled', disabled);
      if (disabled) this.hide();
    }

    #syncFromValue() {
      const v = this.value;
      this.#input.value = v;
      const d = parseISO(v);
      if (d) this.#view = startOfMonth(d);
    }

    #positionPanel() {
      const rect = this.#base.getBoundingClientRect();
      const panelW = Math.min(18.5 * 16, window.innerWidth - 16);
      let left = rect.left;
      if (left + panelW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - panelW - 8);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp = spaceBelow < 280 && rect.top > spaceBelow;
      Object.assign(this.#panel.style, {
        width: `${panelW}px`,
        left: `${left}px`,
        top: openUp ? 'auto' : `${rect.bottom + 4}px`,
        bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : 'auto',
      });
    }

    #onReposition = () => {
      if (this.#open) this.#positionPanel();
    };

    #renderWeekdays() {
      const loc = this.locale;
      const fmt = new Intl.DateTimeFormat(loc, { weekday: 'short' });
      const base = new Date(2024, 0, 1); // Monday
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

    #inRange(iso) {
      const min = this.getAttribute('min');
      const max = this.getAttribute('max');
      if (min && iso < min) return false;
      if (max && iso > max) return false;
      return true;
    }

    #renderCalendar() {
      const loc = this.locale;
      const month = new Intl.DateTimeFormat(loc, { month: 'long' }).format(this.#view);
      const year = this.#view.getFullYear();
      this.#navTitle.textContent = `${month} | ${year}`;
      const y = year;
      const m = this.#view.getMonth();
      const first = new Date(y, m, 1);
      const startPad = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const today = toISO(new Date());
      const selected = this.value;

      this.#grid.replaceChildren();
      for (let i = 0; i < startPad; i++) {
        const cell = document.createElement('div');
        cell.className = 'day empty';
        this.#grid.appendChild(cell);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'day';
        btn.setAttribute('part', 'day');
        btn.dataset.iso = iso;
        btn.textContent = String(day);
        if (iso === today) btn.setAttribute('data-today', '');
        if (iso === selected) btn.setAttribute('data-selected', '');
        if (!this.#inRange(iso)) {
          btn.disabled = true;
          btn.setAttribute('data-disabled', '');
        }
        this.#grid.appendChild(btn);
      }
    }

    #commit(iso, fromUser = true) {
      const prev = this.value;
      if (iso) this.setAttribute('value', iso);
      else this.removeAttribute('value');
      this.#input.value = iso || '';
      this.#setFormValue();
      this.#updateValidity();
      if (fromUser) {
        this.#emit('is-input', { value: iso || '' });
        if (prev !== (iso || '')) this.#emit('is-change', { value: iso || '' });
      }
    }

    #setFormValue() {
      this.#internals?.setFormValue(this.value || null);
    }

    #updateValidity() {
      if (!this.#internals) return;
      const v = this.value;
      if (this.required && !v) {
        this.#internals.setValidity({ valueMissing: true }, 'Introduzca una fecha', this.#input);
        return;
      }
      if (v && !parseISO(v)) {
        this.#internals.setValidity({ typeMismatch: true }, 'Formato inválido (yyyy-mm-dd)', this.#input);
        return;
      }
      if (v && !this.#inRange(v)) {
        this.#internals.setValidity({ rangeOverflow: true }, 'Fecha fuera de rango', this.#input);
        return;
      }
      this.#internals.setValidity({});
    }

    #onType = () => {
      const raw = this.#input.value.trim();
      this.#emit('is-input', { value: raw });
      if (ISO.test(raw) && parseISO(raw)) {
        this.setAttribute('value', raw);
        this.#setFormValue();
        this.#updateValidity();
        this.#emit('is-change', { value: raw });
        if (this.#open) {
          this.#view = startOfMonth(parseISO(raw));
          this.#renderCalendar();
        }
      } else if (!raw) {
        this.removeAttribute('value');
        this.#setFormValue();
        this.#updateValidity();
        this.#emit('is-change', { value: '' });
      }
    };

    #onBlurCommit = () => {
      if (this.#ignoreFocus) return;
      const raw = this.#input.value.trim();
      if (!raw) {
        this.#commit('', true);
        return;
      }
      if (parseISO(raw)) this.#commit(raw, true);
      else this.#updateValidity();
    };

    #onKey = (e) => {
      if (e.key === 'Escape' && this.#open) {
        e.preventDefault();
        this.hide();
      } else if (e.key === 'ArrowDown' && !this.#open) {
        e.preventDefault();
        this.show();
      }
    };

    #onDialogKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      }
    };

    #onTrigger = (e) => {
      e.preventDefault();
      if (this.disabled) return;
      if (this.#open) this.hide();
      else this.show();
    };

    #onNav = (e) => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      e.preventDefault();
      const delta = Number(btn.dataset.nav);
      this.#view = new Date(this.#view.getFullYear(), this.#view.getMonth() + delta, 1);
      this.#renderCalendar();
    };

    #onPick = (e) => {
      const btn = e.target.closest('button.day');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      this.#commit(btn.dataset.iso, true);
      this.hide();
    };

    #onDialogClick = (e) => {
      if (e.target !== this.#dialog) return;
      const base = this.#base.getBoundingClientRect();
      const overControl =
        e.clientX >= base.left && e.clientX <= base.right &&
        e.clientY >= base.top && e.clientY <= base.bottom;
      if (overControl) return;
      this.hide();
    };

    #onDialogCancel = (e) => {
      e.preventDefault();
      this.hide();
    };
  }

  if (!customElements.get('is-date-input')) {
    customElements.define('is-date-input', IsDateInput);
  }
  if (typeof window !== 'undefined') window.IsDateInput = IsDateInput;
})();
