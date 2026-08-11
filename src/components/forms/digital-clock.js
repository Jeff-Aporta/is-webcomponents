import { adoptCss } from '../_shared/adopt-css.js';
import { formatTime, from12Hour, pad, parseTime, to12Hour, toTime, uses12Hour } from '../_shared/date-utils.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-digital-clock> — Selector de hora en lista (MUI DigitalClock) o en
 * columnas de horas / minutos / segundos / AM-PM (MultiSectionDigitalClock).
 *
 * Atributos: value (HH:mm[:ss]), layout (list|sections), step (minutos en
 *            lista), minutes-step, seconds, ampm, hour24, min-time, max-time,
 *            skip-disabled, locale, disabled, readonly
 * Events: is-change { value }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base"></div>
  `;

  const OBSERVED = [
    'value', 'layout', 'step', 'minutes-step', 'seconds', 'ampm', 'hour24',
    'min-time', 'max-time', 'skip-disabled', 'locale', 'disabled', 'readonly',
  ];

  class IsDigitalClock extends ElementBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'clock-height': '--is-clock-height',
    };

    static get observedAttributes() { return [...OBSERVED, 'clock-height']; }

    #base;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#base = shadow.querySelector('.base');
      this.#base.addEventListener('click', this.#onClick);
      this.#base.addEventListener('keydown', this.#onKey);
    }

    onConnected() {
      this.#render();
      this.scrollToSelection();
    }

    onAttributeChanged(name, oldVal, newVal) {
      this.#render();
      if (name === 'value') this.scrollToSelection();
    }

    /* ── API ──────────────────────────────────────────────────────────── */

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get layout() { return this.getAttribute('layout') === 'sections' ? 'sections' : 'list'; }
    set layout(v) { this.setAttribute('layout', v === 'sections' ? 'sections' : 'list'); }

    get step() {
      const n = Number(this.getAttribute('step'));
      return Number.isFinite(n) && n > 0 ? n : 30;
    }
    set step(v) { this.setAttribute('step', String(v)); }

    get minutesStep() {
      const n = Number(this.getAttribute('minutes-step'));
      return Number.isFinite(n) && n > 0 ? n : 5;
    }
    set minutesStep(v) { this.setAttribute('minutes-step', String(v)); }

    get seconds() { return this.hasAttribute('seconds'); }
    set seconds(v) { this.toggleAttribute('seconds', !!v); }

    get ampm() {
      if (this.hasAttribute('hour24')) return false;
      if (this.hasAttribute('ampm')) return this.getAttribute('ampm') !== 'false';
      return uses12Hour(this.locale);
    }
    set ampm(v) { this.toggleAttribute('ampm', !!v); }

    get skipDisabled() { return this.hasAttribute('skip-disabled'); }
    set skipDisabled(v) { this.toggleAttribute('skip-disabled', !!v); }

    get locale() { return this.getAttribute('locale') || document.documentElement.lang || undefined; }
    set locale(v) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get time() { return parseTime(this.value); }

    scrollToSelection() {
      for (const col of this.#base.querySelectorAll('.col, .list')) {
        col.querySelector('[data-selected]')?.scrollIntoView({ block: 'center' });
      }
    }

    /* ── Interno ──────────────────────────────────────────────────────── */

    #allowed(time) {
      const withSeconds = this.seconds;
      const v = toTime(time, withSeconds);
      const norm = (raw) => {
        const t = parseTime(raw);
        return t ? toTime(t, withSeconds) : null;
      };
      const lo = norm(this.getAttribute('min-time'));
      const hi = norm(this.getAttribute('max-time'));
      if (lo && v < lo) return false;
      if (hi && v > hi) return false;
      return true;
    }

    #commit(time) {
      if (this.disabled || this.readonly) return;
      const next = toTime(time, this.seconds);
      if (next === this.value) return;
      this.setAttribute('value', next);
      emit(this, 'is-change', { value: next });
    }

    #option(label, { section, raw, selected, disabled }) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      btn.setAttribute('part', 'option');
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', String(!!selected));
      btn.dataset.section = section;
      btn.dataset.raw = String(raw);
      btn.textContent = label;
      if (selected) btn.setAttribute('data-selected', '');
      if (disabled) {
        btn.disabled = true;
        btn.setAttribute('data-disabled', '');
      }
      btn.tabIndex = selected ? 0 : -1;
      return btn;
    }

    #render() {
      this.#base.dataset.layout = this.layout;
      if (this.layout === 'sections') this.#renderSections();
      else this.#renderList();
    }

    #renderList() {
      const list = document.createElement('div');
      list.className = 'list';
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', 'Hora');

      const step = this.step;
      const current = this.time;
      const currentKey = current ? toTime(current, false) : null;
      let anyTabbable = false;

      for (let minutes = 0; minutes < 24 * 60; minutes += step) {
        const time = { h: Math.floor(minutes / 60), m: minutes % 60, s: 0 };
        const key = toTime(time, false);
        const disabled = this.disabled || !this.#allowed(time);
        if (disabled && this.skipDisabled) continue;
        const selected = key === currentKey;
        if (selected) anyTabbable = true;
        list.appendChild(this.#option(
          formatTime(time, this.locale, { hour12: this.ampm }),
          { section: 'time', raw: key, selected, disabled },
        ));
      }

      if (!anyTabbable) {
        const first = list.querySelector('.opt:not([disabled])');
        if (first) first.tabIndex = 0;
      }
      this.#base.replaceChildren(list);
    }

    #renderSections() {
      const t = this.time;
      const ampm = this.ampm;
      const cols = [];

      const hours = [];
      if (ampm) for (let h = 1; h <= 12; h++) hours.push(h);
      else for (let h = 0; h < 24; h++) hours.push(h);

      cols.push(this.#column('hours', 'Horas', hours.map((h) => {
        const raw = ampm ? from12Hour(h, t ? to12Hour(t.h).meridiem : 'AM') : h;
        const selected = !!t && raw === t.h;
        return {
          label: ampm ? String(h) : pad(h),
          raw,
          selected,
          disabled: this.disabled || !this.#allowed({ ...(t || { m: 0, s: 0 }), h: raw }),
        };
      })));

      const minutes = [];
      for (let m = 0; m < 60; m += this.minutesStep) minutes.push(m);
      cols.push(this.#column('minutes', 'Minutos', minutes.map((m) => ({
        label: pad(m),
        raw: m,
        selected: !!t && m === t.m,
        disabled: this.disabled || !this.#allowed({ h: t?.h ?? 0, m, s: t?.s ?? 0 }),
      }))));

      if (this.seconds) {
        const secs = [];
        for (let s = 0; s < 60; s += 5) secs.push(s);
        cols.push(this.#column('seconds', 'Segundos', secs.map((s) => ({
          label: pad(s),
          raw: s,
          selected: !!t && s === t.s,
          disabled: this.disabled || !this.#allowed({ h: t?.h ?? 0, m: t?.m ?? 0, s }),
        }))));
      }

      if (ampm) {
        cols.push(this.#column('meridiem', 'AM / PM', ['AM', 'PM'].map((mer) => ({
          label: mer,
          raw: mer,
          selected: !!t && to12Hour(t.h).meridiem === mer,
          disabled: this.disabled
            || !this.#allowed({ ...(t || { m: 0, s: 0 }), h: from12Hour(to12Hour(t?.h ?? 0).hour, mer) }),
        }))));
      }

      this.#base.replaceChildren(...cols);
    }

    #column(section, label, items) {
      const col = document.createElement('div');
      col.className = 'col';
      col.setAttribute('role', 'listbox');
      col.setAttribute('aria-label', label);
      col.dataset.section = section;
      for (const item of items) {
        if (item.disabled && this.skipDisabled) continue;
        col.appendChild(this.#option(item.label, { section, ...item }));
      }
      if (!col.querySelector('[tabindex="0"]')) {
        const first = col.querySelector('.opt:not([disabled])');
        if (first) first.tabIndex = 0;
      }
      return col;
    }

    #apply(section, raw) {
      const t = this.time || { h: 0, m: 0, s: 0 };
      if (section === 'time') {
        const parsed = parseTime(raw);
        if (parsed) this.#commit({ ...parsed, s: this.seconds ? parsed.s : 0 });
        return;
      }
      const next = { ...t };
      if (section === 'hours') next.h = Number(raw);
      else if (section === 'minutes') next.m = Number(raw);
      else if (section === 'seconds') next.s = Number(raw);
      else if (section === 'meridiem') next.h = from12Hour(to12Hour(t.h).hour, raw);
      if (this.#allowed(next)) this.#commit(next);
    }

    #onClick = (e) => {
      const btn = e.target.closest('button.opt');
      if (!btn || btn.disabled) return;
      this.#apply(btn.dataset.section, btn.dataset.raw);
    };

    #onKey = (e) => {
      const btn = e.target.closest?.('button.opt');
      if (!btn) return;
      const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const siblings = [...btn.parentElement.querySelectorAll('.opt:not([disabled])')];
      const at = siblings.indexOf(btn);
      const next = siblings[at + step];
      if (!next) return;
      for (const s of siblings) s.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    };
  }

  defineElement('is-digital-clock', IsDigitalClock, 'IsDigitalClock');
})();
