import { adoptCss } from './adopt-css.js';
import { computePosition } from './position.js';
import { formatDate, formatTime, splitDateTime, todayISO, toTime } from './date-utils.js';
import { defineElement } from './define.js';
import { emit } from './emit.js';
import { resolveLocale } from './resolve-locale.js';

/**
 * Fábrica de los pickers "campo + panel": is-date-input, is-time-input,
 * is-date-time-input e is-date-range-input.
 *
 * El panel vive en un <dialog> modal (top layer) para no perderse por overflow,
 * y se coloca junto al campo con computePosition. En `color="mobile"` se
 * centra en pantalla con barra de acciones, como los pickers móviles de MUI.
 */

const TRIGGER_ICONS = {
  date: 'M4 2v1H3a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1h-1V2h-1v1H5V2H4zm9 4H3v7h10V6z',
  time: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5A5.5 5.5 0 118 13.5 5.5 5.5 0 018 2.5zM7.5 4v4.3l3 1.7.5-.9-2.5-1.4V4h-1z',
};

const OBSERVED = [
  'label', 'hint', 'name', 'value', 'min', 'max', 'required', 'disabled',
  'readonly', 'locale', 'ampm', 'hour24', 'seconds', 'clearable', 'color',
  'placement', 'action-bar', 'views', 'open-to', 'calendars', 'shortcuts',
  'panel', 'close-on-select', 'invalid', 'start-label', 'end-label',
];

/** Atributos que el picker copia a su(s) campo(s). */
const FIELD_ATTRS = [
  'name', 'min', 'max', 'required', 'disabled', 'readonly', 'locale',
  'ampm', 'hour24', 'seconds', 'clearable', 'invalid',
];

/** Atributos que el picker copia al panel (calendario / reloj). */
const PANEL_ATTRS = [
  'min', 'max', 'locale', 'disabled', 'readonly', 'ampm', 'hour24', 'seconds',
  'views', 'open-to', 'calendars', 'shortcuts', 'first-day-of-week',
  'show-outside-days', 'fixed-weeks', 'show-week-numbers', 'disable-past',
  'disable-future', 'disabled-dates', 'disabled-days', 'minutes-step', 'step',
];

export function definePickerInput({ tag, kind, cssUrl, fieldTag, panels, range = false }) {
  class IsPickerInput extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #base;
    #dialog;
    #panel;
    #content;
    #toolbar;
    #actions;
    #fields = [];
    #triggers = [];
    #panelEls = [];
    #mounted = false;
    #open = false;
    #draft = null;
    #raf = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
      adoptCss(shadow, cssUrl);
      shadow.appendChild(this.#template());

      this.#base = shadow.querySelector('.base');
      this.#dialog = shadow.querySelector('.popup');
      this.#panel = shadow.querySelector('.panel');
      this.#content = shadow.querySelector('.content');
      this.#toolbar = shadow.querySelector('.toolbar');
      this.#actions = shadow.querySelector('.actions');
      this.#fields = [...shadow.querySelectorAll('.field')];
      this.#triggers = [...shadow.querySelectorAll('.trigger')];

      for (const field of this.#fields) {
        field.addEventListener('is-change', this.#onFieldChange);
        field.addEventListener('keydown', this.#onFieldKey);
      }
      for (const trigger of this.#triggers) {
        trigger.addEventListener('click', this.#onTrigger);
      }
      this.#actions.addEventListener('click', this.#onAction);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('keydown', this.#onDialogKey);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncFields();
      this.#syncActions();
      addEventListener('resize', this.#reposition, { passive: true });
      addEventListener('scroll', this.#reposition, true);
    }

    disconnectedCallback() {
      removeEventListener('resize', this.#reposition);
      removeEventListener('scroll', this.#reposition, true);
      cancelAnimationFrame(this.#raf);
      if (this.#dialog.open) this.#dialog.close();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'action-bar' || name === 'color') this.#syncActions();
      this.#syncFields();
      if (this.#open) {
        this.#syncPanels();
        this.#reposition();
      }
    }

    /* ── API ──────────────────────────────────────────────────────────── */

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get open() { return this.#open; }

    get color() { return this.getAttribute('color') === 'mobile' ? 'mobile' : 'desktop'; }
    set color(v) { this.setAttribute('color', v); }

    /** Barra de acciones: obligatoria en móvil, opcional en escritorio. */
    get actionBar() { return this.variant === 'mobile' || this.hasAttribute('action-bar'); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get locale() { return resolveLocale(this.getAttribute('locale')); }
    set locale(v) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    /** Cierra al elegir; en móvil o con barra de acciones espera a Aceptar. */
    get closeOnSelect() {
      const attr = this.getAttribute('close-on-select');
      if (attr != null) return attr !== 'false';
      return !this.actionBar && kind === 'date';
    }

    show() {
      if (this.disabled || this.readonly || this.#open) return;
      this.#open = true;
      this.#draft = this.value;
      this.#buildPanels();
      this.#syncPanels();
      for (const t of this.#triggers) t.setAttribute('aria-expanded', 'true');
      if (!this.#dialog.open) this.#dialog.showModal();
      this.#reposition();
      queueMicrotask(() => this.#panelEls[0]?.focus?.({ preventScroll: true }));
      emit(this, 'is-show', {});
    }

    hide({ restore = false } = {}) {
      if (!this.#open) return;
      if (restore && this.#draft !== this.value) this.#write(this.#draft, 'cancel');
      this.#open = false;
      this.#draft = null;
      for (const t of this.#triggers) t.setAttribute('aria-expanded', 'false');
      if (this.#dialog.open) this.#dialog.close();
      this.#fields[0]?.focus?.();
      emit(this, 'is-hide', {});
    }

    checkValidity() { return this.#fields.every((f) => f.checkValidity?.() !== false); }
    reportValidity() { return this.#fields.every((f) => f.reportValidity?.() !== false); }

    /* ── Plantilla ────────────────────────────────────────────────────── */

    #template() {
      const frag = document.createDocumentFragment();
      const wrap = document.createElement('div');
      wrap.className = 'base';
      wrap.setAttribute('part', 'base');

      const names = range ? ['start', 'end'] : ['single'];
      for (const which of names) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const field = document.createElement(fieldTag);
        field.className = 'field';
        field.setAttribute('part', `field ${which}`);
        field.dataset.which = which;
        const trigger = document.createElement('is-button');
        trigger.variant = 'plain';
        trigger.className = 'trigger';
        trigger.setAttribute('part', 'trigger');
        trigger.setAttribute('slot', 'end');
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Abrir selector');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('width', '1.05em');
        svg.setAttribute('height', '1.05em');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('d', TRIGGER_ICONS[kind === 'time' ? 'time' : 'date']);
        svg.appendChild(path);
        trigger.appendChild(svg);
        field.appendChild(trigger);
        cell.appendChild(field);
        wrap.appendChild(cell);
        if (range && which === 'start') {
          const dash = document.createElement('span');
          dash.className = 'dash';
          dash.setAttribute('aria-hidden', 'true');
          dash.textContent = '–';
          wrap.appendChild(dash);
        }
      }

      const dialog = document.createElement('dialog');
      dialog.className = 'popup';
      dialog.setAttribute('part', 'dialog');
      dialog.tabIndex = -1;
      const panelWrap = document.createElement('div');
      panelWrap.setAttribute('part', 'panel');
      panelWrap.className = 'panel';
      panelWrap.setAttribute('role', 'document');
      const toolbar = document.createElement('div');
      toolbar.setAttribute('part', 'toolbar');
      toolbar.className = 'toolbar';
      toolbar.hidden = true;
      const content = document.createElement('div');
      content.setAttribute('part', 'content');
      content.className = 'content';
      const actions = document.createElement('div');
      actions.setAttribute('part', 'actions');
      actions.className = 'actions';
      actions.hidden = true;

      const mkAct = (act, label, variant = 'plain', color = 'neutral') => {
        const b = document.createElement('is-button');
        b.variant = variant;
        if (color !== 'neutral') b.color = color;
        b.className = 'act';
        b.dataset.act = act;
        b.textContent = label;
        return b;
      };
      actions.append(
        mkAct('clear', 'Limpiar'),
        mkAct('now', 'Hoy'),
        Object.assign(document.createElement('span'), { className: 'spacer' }),
        mkAct('cancel', 'Cancelar'),
        mkAct('accept', 'Aceptar', 'filled', 'brand'),
      );
      panelWrap.append(toolbar, content, actions);
      dialog.appendChild(panelWrap);

      frag.appendChild(wrap);
      frag.appendChild(dialog);
      return frag;
    }

    /* ── Interno ──────────────────────────────────────────────────────── */

    #parts() {
      if (!range) return [this.value];
      const [a = '', b = ''] = this.value.split(/\s*[/,|]\s*/);
      return [a, b];
    }

    #syncFields() {
      const [a, b] = this.#parts();
      this.#fields.forEach((field, i) => {
        const v = range ? (i === 0 ? a : b) : a;
        if (v) field.setAttribute('value', v);
        else field.removeAttribute('value');
        for (const name of FIELD_ATTRS) {
          // min/max de un rango acotan cada extremo, no el par.
          const attr = this.getAttribute(name);
          if (attr == null) field.removeAttribute(name);
          else field.setAttribute(name, attr);
        }
        const label = range
          ? this.getAttribute(i === 0 ? 'start-label' : 'end-label')
          : this.getAttribute('label');
        if (label) field.setAttribute('label', label);
        else field.removeAttribute('label');
        const hint = this.getAttribute('hint');
        if (hint && (!range || i === this.#fields.length - 1)) field.setAttribute('hint', hint);
        else field.removeAttribute('hint');
        // El name de un rango se reparte para que el form reciba los dos.
        if (range && this.getAttribute('name')) {
          field.setAttribute('name', `${this.getAttribute('name')}-${field.dataset.which}`);
        }
      });
      for (const t of this.#triggers) t.disabled = this.disabled || this.readonly;
    }

    #syncActions() {
      const on = this.actionBar;
      this.#actions.hidden = !on;
      this.#panel.dataset.color = this.variant;
      this.#actions.querySelector('[data-act="now"]').textContent = kind === 'time' ? 'Ahora' : 'Hoy';
    }

    /** El contenido del panel lo aporta la definición del componente. */
    #buildPanels() {
      if (this.#panelEls.length) return;
      this.#panelEls = panels({ host: this, range });
      for (const el of this.#panelEls) {
        el.addEventListener('is-change', this.#onPanelChange);
        this.#content.appendChild(el);
      }
    }

    #syncPanels() {
      for (const el of this.#panelEls) {
        for (const name of PANEL_ATTRS) {
          const attr = this.getAttribute(name);
          if (attr == null) el.removeAttribute(name);
          else el.setAttribute(name, attr);
        }
        el.dataset.sync = '1';
      }
      const value = this.value;
      const { date, time } = splitDateTime(value);
      // En un picker de solo hora el valor entero ES la hora, no hay parte fecha.
      const timeValue = kind === 'time' ? (date || time) : time;
      for (const el of this.#panelEls) {
        const role = el.dataset.role;
        // El panel de rango recibe el par completo; los demás, su mitad.
        const next = role === 'time' ? timeValue : role === 'date' ? date : value;
        if (next) el.setAttribute('value', next);
        else el.removeAttribute('value');
      }
      this.#syncToolbar();
    }

    #syncToolbar() {
      if (this.variant !== 'mobile') {
        this.#toolbar.hidden = true;
        return;
      }
      this.#toolbar.hidden = false;
      this.#toolbar.textContent = this.#readable() || 'Seleccione';
    }

    /** Texto humano del valor actual, para la cabecera del panel móvil. */
    #readable() {
      const loc = this.locale;
      const pretty = (raw) => {
        if (!raw) return '';
        const { date, time } = splitDateTime(raw);
        if (kind === 'time') return formatTime(date || time, loc, { seconds: this.hasAttribute('seconds') });
        const d = formatDate(date, loc, { day: '2-digit', month: 'short', year: 'numeric' });
        return time ? `${d} · ${formatTime(time, loc)}` : d;
      };
      if (!range) return pretty(this.value);
      const [a, b] = this.#parts();
      return [pretty(a), pretty(b)].filter(Boolean).join(' – ');
    }

    #write(value, source) {
      const prev = this.value;
      if (value) this.setAttribute('value', value);
      else this.removeAttribute('value');
      this.#syncFields();
      if (this.#open) this.#syncPanels();
      if (prev !== (value || '')) emit(this, 'is-change', { value: value || '', source });
    }

    #reposition = () => {
      if (!this.#open || this.variant === 'mobile') return;
      cancelAnimationFrame(this.#raf);
      this.#raf = requestAnimationFrame(() => {
        const result = computePosition({
          anchor: this.#base,
          popupEl: this.#panel,
          placement: this.getAttribute('placement') || 'bottom-start',
          distance: 6,
          flip: true,
          shift: true,
          strategy: 'fixed',
          boundary: 'viewport',
        });
        if (!result) return;
        Object.assign(this.#panel.style, { top: `${result.top}px`, left: `${result.left}px` });
        this.#panel.dataset.currentPlacement = result.placement;
      });
    };

    /* ── Eventos ──────────────────────────────────────────────────────── */

    #onFieldChange = (e) => {
      e.stopPropagation();
      if (!range) {
        this.#write(e.target.value, 'field');
        return;
      }
      const [a, b] = this.#fields.map((f) => f.value);
      this.#write([a, b].filter(Boolean).join('/'), 'field');
    };

    #onFieldKey = (e) => {
      if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        this.show();
      } else if (e.key === 'Escape' && this.#open) {
        e.preventDefault();
        this.hide();
      }
    };

    #onTrigger = (e) => {
      e.preventDefault();
      if (this.#open) this.hide();
      else this.show();
    };

    #onPanelChange = (e) => {
      e.stopPropagation();
      const el = e.target;
      const role = el.dataset.role;
      const detail = e.detail || {};

      if (range) {
        const start = detail.start || '';
        const end = detail.end || '';
        this.#write([start, end].filter(Boolean).join('/'), 'panel');
        if (start && end && this.closeOnSelect) this.hide();
        return;
      }

      if (kind === 'datetime') {
        const { date, time } = splitDateTime(this.value);
        const nextDate = role === 'date' ? detail.value : date;
        const nextTime = role === 'time' ? detail.value : time || '00:00';
        this.#write(nextDate ? `${nextDate}T${nextTime}` : '', 'panel');
        if (role === 'time' && this.closeOnSelect) this.hide();
        return;
      }

      this.#write(detail.value || '', 'panel');
      if (this.closeOnSelect) this.hide();
    };

    #onAction = (e) => {
      const btn = e.target.closest('.act');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'clear') {
        this.#write('', 'clear');
        this.hide();
      } else if (act === 'now') {
        const now = new Date();
        const time = toTime({ h: now.getHours(), m: now.getMinutes(), s: 0 }, this.hasAttribute('seconds'));
        if (kind === 'time') this.#write(time, 'now');
        else if (kind === 'datetime') this.#write(`${todayISO()}T${time}`, 'now');
        else if (range) this.#write(`${todayISO()}/${todayISO()}`, 'now');
        else this.#write(todayISO(), 'now');
      } else if (act === 'cancel') {
        this.hide({ restore: true });
      } else if (act === 'accept') {
        this.hide();
      }
    };

    #onDialogClick = (e) => {
      if (e.target !== this.#dialog) return;
      // Clic sobre la superficie del dialog (no en el panel) = clic fuera.
      const rect = this.#base.getBoundingClientRect();
      const overField = e.clientX >= rect.left && e.clientX <= rect.right
        && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (overField) return;
      this.hide({ restore: this.actionBar });
    };

    #onDialogCancel = (e) => {
      e.preventDefault();
      this.hide({ restore: this.actionBar });
    };

    #onDialogKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      this.hide({ restore: this.actionBar });
    };
  }

  defineElement(tag, IsPickerInput, true);
  return IsPickerInput;
}
