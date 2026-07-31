import { adoptCss } from '../_shared/adopt-css.js';
import { formatTime, from12Hour, pad, parseTime, to12Hour, toTime, uses12Hour } from '../_shared/date-utils.js';

/**
 * <is-time-clock> — Reloj analógico para elegir hora (MUI TimeClock).
 *
 * Vistas encadenadas: horas → minutos → segundos (si `seconds`). El disco es
 * un slider: se puede arrastrar, hacer clic o usar el teclado.
 *
 * Atributos: value (HH:mm[:ss]), view (hours|minutes|seconds), ampm,
 *            hour24, seconds, minutes-step, min-time, max-time, locale,
 *            disabled, readonly
 * Events: is-change { value } · is-view-change { view }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <div part="header" class="header">
        <button type="button" class="unit" data-view="hours" part="hours">--</button>
        <span class="sep">:</span>
        <button type="button" class="unit" data-view="minutes" part="minutes">--</button>
        <span class="sep secs" hidden>:</span>
        <button type="button" class="unit secs" data-view="seconds" part="seconds" hidden>--</button>
        <div class="meridiem" hidden role="group" aria-label="AM / PM">
          <button type="button" class="mer" data-mer="AM">AM</button>
          <button type="button" class="mer" data-mer="PM">PM</button>
        </div>
      </div>
      <div part="clock" class="clock" role="slider" tabindex="0" aria-orientation="horizontal">
        <div class="hand" part="hand"><span class="knob"></span></div>
        <span class="center"></span>
        <div class="ring outer"></div>
        <div class="ring inner" hidden></div>
      </div>
    </div>
  `;

  const OBSERVED = [
    'value', 'view', 'ampm', 'hour24', 'seconds', 'minutes-step',
    'min-time', 'max-time', 'locale', 'disabled', 'readonly',
  ];

  const VIEWS = ['hours', 'minutes', 'seconds'];

  class IsTimeClock extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #base;
    #clock;
    #hand;
    #outer;
    #inner;
    #units;
    #meridiem;
    #mounted = false;
    #dragging = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#base = shadow.querySelector('.base');
      this.#clock = shadow.querySelector('.clock');
      this.#hand = shadow.querySelector('.hand');
      this.#outer = shadow.querySelector('.ring.outer');
      this.#inner = shadow.querySelector('.ring.inner');
      this.#units = [...shadow.querySelectorAll('.unit')];
      this.#meridiem = shadow.querySelector('.meridiem');

      shadow.querySelector('.header').addEventListener('click', this.#onHeader);
      this.#clock.addEventListener('pointerdown', this.#onPointerDown);
      this.#clock.addEventListener('pointermove', this.#onPointerMove);
      this.#clock.addEventListener('pointerup', this.#onPointerUp);
      this.#clock.addEventListener('pointercancel', this.#onPointerUp);
      this.#clock.addEventListener('keydown', this.#onKey);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('view')) this.setAttribute('view', 'hours');
      this.#render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'view') this.#emit('is-view-change', { view: this.view });
      this.#render();
    }

    /* ── API ──────────────────────────────────────────────────────────── */

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get view() {
      const v = this.getAttribute('view');
      if (v === 'seconds' && !this.seconds) return 'minutes';
      return VIEWS.includes(v) ? v : 'hours';
    }
    set view(v) { this.setAttribute('view', v); }

    /** 12 horas: por defecto lo decide el locale, `ampm`/`hour24` lo fuerzan. */
    get ampm() {
      if (this.hasAttribute('hour24')) return false;
      if (this.hasAttribute('ampm')) return this.getAttribute('ampm') !== 'false';
      return uses12Hour(this.locale);
    }
    set ampm(v) { this.toggleAttribute('ampm', !!v); }

    get seconds() { return this.hasAttribute('seconds'); }
    set seconds(v) { this.toggleAttribute('seconds', !!v); }

    get minutesStep() {
      const n = Number(this.getAttribute('minutes-step'));
      return Number.isFinite(n) && n > 0 ? Math.min(30, n) : 1;
    }
    set minutesStep(v) { this.setAttribute('minutes-step', String(v)); }

    get locale() { return this.getAttribute('locale') || document.documentElement.lang || undefined; }
    set locale(v) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get time() { return parseTime(this.value) || { h: 0, m: 0, s: 0 }; }

    /* ── Interno ──────────────────────────────────────────────────────── */

    #emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    #minTime() { return this.getAttribute('min-time') || ''; }
    #maxTime() { return this.getAttribute('max-time') || ''; }

    /** ¿Cabe este candidato dentro de min-time / max-time? */
    #allowed(time) {
      const min = this.#minTime();
      const max = this.#maxTime();
      const withSeconds = this.seconds;
      const v = toTime(time, withSeconds);
      const norm = (raw) => {
        const t = parseTime(raw);
        return t ? toTime(t, withSeconds) : null;
      };
      const lo = norm(min);
      const hi = norm(max);
      if (lo && v < lo) return false;
      if (hi && v > hi) return false;
      return true;
    }

    /** Candidato que resulta de fijar la unidad de la vista actual. */
    #candidate(view, raw) {
      const t = { ...this.time };
      if (view === 'hours') t.h = raw;
      else if (view === 'minutes') t.m = raw;
      else t.s = raw;
      return t;
    }

    #commit(time, { advance = false } = {}) {
      if (this.disabled || this.readonly) return;
      const next = toTime(time, this.seconds);
      if (next !== this.value) {
        this.setAttribute('value', next);
        this.#emit('is-change', { value: next });
      } else {
        this.#render();
      }
      if (!advance) return;
      const order = this.seconds ? VIEWS : VIEWS.slice(0, 2);
      const at = order.indexOf(this.view);
      if (at > -1 && at < order.length - 1) this.view = order[at + 1];
    }

    /* ── Render ───────────────────────────────────────────────────────── */

    #render() {
      const view = this.view;
      const t = this.time;
      const has = !!parseTime(this.value);
      this.#base.dataset.view = view;

      // Cabecera: la unidad de la vista actual queda resaltada.
      const { hour, meridiem } = to12Hour(t.h);
      const labels = {
        hours: has ? (this.ampm ? String(hour) : pad(t.h)) : '--',
        minutes: has ? pad(t.m) : '--',
        seconds: has ? pad(t.s) : '--',
      };
      for (const btn of this.#units) {
        btn.textContent = labels[btn.dataset.view];
        btn.toggleAttribute('data-active', btn.dataset.view === view);
      }
      for (const el of this.shadowRoot.querySelectorAll('.secs')) el.hidden = !this.seconds;

      this.#meridiem.hidden = !this.ampm;
      for (const btn of this.#meridiem.querySelectorAll('.mer')) {
        btn.toggleAttribute('data-active', has && btn.dataset.mer === meridiem);
      }

      this.#renderRing(view);
      this.#renderHand(view, t, has);
      this.#syncAria(view, t, has);
    }

    #renderRing(view) {
      const ampm = this.ampm;
      const outer = [];
      const inner = [];

      if (view === 'hours') {
        if (ampm) {
          for (let i = 1; i <= 12; i++) outer.push({ label: String(i), raw: from12Hour(i, to12Hour(this.time.h).meridiem) });
        } else {
          // 24 h: anillo exterior 00-11, interior 12-23, como el reloj de MUI.
          for (let i = 0; i < 12; i++) outer.push({ label: pad(i), raw: i });
          for (let i = 12; i < 24; i++) inner.push({ label: pad(i), raw: i });
        }
      } else {
        const step = view === 'minutes' ? Math.max(5, this.minutesStep) : 5;
        for (let i = 0; i < 60; i += step) outer.push({ label: pad(i), raw: i });
      }

      this.#inner.hidden = inner.length === 0;
      this.#fillRing(this.#outer, outer, view);
      if (inner.length) this.#fillRing(this.#inner, inner, view);
    }

    #fillRing(ring, items, view) {
      const unit = view === 'hours' ? 30 : 6;
      const nodes = items.map(({ label, raw }) => {
        // El envoltorio ocupa todo el disco y gira; la etiqueta se desgira para
        // quedar recta. Así los radios son relativos y el reloj escala solo.
        const el = document.createElement('span');
        el.className = 'num';
        el.setAttribute('part', 'number');
        el.dataset.raw = String(raw);
        const lbl = document.createElement('span');
        lbl.className = 'lbl';
        lbl.textContent = label;
        el.appendChild(lbl);
        el.style.setProperty('--a', `${((view === 'hours' ? raw % 12 : raw / (60 / 12)) * unit)}deg`);
        if (!this.#allowed(this.#candidate(view, raw))) el.setAttribute('data-disabled', '');
        const current = view === 'hours' ? this.time.h : view === 'minutes' ? this.time.m : this.time.s;
        if (raw === current) el.setAttribute('data-selected', '');
        return el;
      });
      ring.replaceChildren(...nodes);
    }

    #renderHand(view, t, has) {
      const value = view === 'hours' ? t.h : view === 'minutes' ? t.m : t.s;
      const angle = view === 'hours' ? (value % 12) * 30 : value * 6;
      // Mano corta para las horas del anillo interior (12-23 en formato 24 h).
      const short = view === 'hours' && !this.ampm && value >= 12;
      this.#hand.hidden = !has;
      this.#hand.style.setProperty('--a', `${angle}deg`);
      this.#hand.toggleAttribute('data-short', short);
    }

    #syncAria(view, t, has) {
      const max = view === 'hours' ? (this.ampm ? 12 : 23) : 59;
      const min = view === 'hours' && this.ampm ? 1 : 0;
      const value = view === 'hours' ? (this.ampm ? to12Hour(t.h).hour : t.h) : view === 'minutes' ? t.m : t.s;
      this.#clock.setAttribute('aria-valuemin', String(min));
      this.#clock.setAttribute('aria-valuemax', String(max));
      this.#clock.setAttribute('aria-valuenow', has ? String(value) : '');
      this.#clock.setAttribute('aria-label', { hours: 'Horas', minutes: 'Minutos', seconds: 'Segundos' }[view]);
      this.#clock.setAttribute('aria-valuetext', has
        ? formatTime(this.time, this.locale, { seconds: this.seconds, hour12: this.ampm })
        : 'sin hora');
      this.#clock.toggleAttribute('aria-disabled', this.disabled);
    }

    /* ── Interacción ──────────────────────────────────────────────────── */

    /** Punto del disco → unidad más cercana de la vista actual. */
    #valueAt(e) {
      const view = this.view;
      const rect = this.#clock.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (deg < 0) deg += 360;

      if (view === 'hours') {
        const slot = Math.round(deg / 30) % 12;
        if (this.ampm) {
          const hour12 = slot === 0 ? 12 : slot;
          return from12Hour(hour12, to12Hour(this.time.h).meridiem);
        }
        // Sin AM/PM el radio decide anillo: dentro son las 12-23.
        const dist = Math.hypot(dx, dy) / (rect.width / 2);
        return dist < 0.62 ? slot + 12 : slot;
      }

      const step = view === 'minutes' ? this.minutesStep : 1;
      const raw = Math.round(deg / 6) % 60;
      return (Math.round(raw / step) * step) % 60;
    }

    #pick(e, { advance = false } = {}) {
      const raw = this.#valueAt(e);
      const candidate = this.#candidate(this.view, raw);
      if (!this.#allowed(candidate)) return;
      this.#commit(candidate, { advance });
    }

    #onPointerDown = (e) => {
      if (this.disabled || this.readonly) return;
      this.#dragging = true;
      // Un pointerId inexistente (o sintético) hace que capture lance: da igual,
      // el arrastre funciona sin captura mientras el puntero siga en el disco.
      try { this.#clock.setPointerCapture(e.pointerId); } catch { /* noop */ }
      this.#pick(e);
    };

    #onPointerMove = (e) => {
      if (!this.#dragging) return;
      this.#pick(e);
    };

    #onPointerUp = (e) => {
      if (!this.#dragging) return;
      this.#dragging = false;
      try { this.#clock.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      // Al soltar se pasa a la siguiente unidad: el flujo típico horas → minutos.
      this.#pick(e, { advance: true });
    };

    #onKey = (e) => {
      if (this.disabled || this.readonly) return;
      const view = this.view;
      const step = view === 'minutes' ? this.minutesStep : 1;
      const wrap = view === 'hours' ? 24 : 60;
      const t = { ...this.time };
      const get = () => (view === 'hours' ? t.h : view === 'minutes' ? t.m : t.s);
      const set = (v) => {
        const norm = ((v % wrap) + wrap) % wrap;
        if (view === 'hours') t.h = norm;
        else if (view === 'minutes') t.m = norm;
        else t.s = norm;
      };

      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') set(get() + step);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') set(get() - step);
      else if (e.key === 'Home') set(0);
      else if (e.key === 'End') set(wrap - step);
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#commit(this.time, { advance: true });
        return;
      } else return;

      e.preventDefault();
      if (this.#allowed(t)) this.#commit(t);
    };

    #onHeader = (e) => {
      const unit = e.target.closest('.unit');
      if (unit) {
        this.view = unit.dataset.view;
        this.#clock.focus();
        return;
      }
      const mer = e.target.closest('.mer');
      if (!mer || !this.ampm) return;
      const t = { ...this.time };
      const { hour } = to12Hour(t.h);
      t.h = from12Hour(hour, mer.dataset.mer);
      if (this.#allowed(t)) this.#commit(t);
    };
  }

  if (!customElements.get('is-time-clock')) {
    customElements.define('is-time-clock', IsTimeClock);
  }
  if (typeof window !== 'undefined') window.IsTimeClock = IsTimeClock;
})();
