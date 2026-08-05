import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-duration-picker> — Selector de duración HH:MM:SS.
 *
 * Atributos
 *   value       segundos totales (default 0)
 *   min, max    límites (segundos)
 *   step        incremento del botón (default 1)
 *
 * Slots
 *   start, end  adornos
 *
 * API
 *   dur.value      segundos
 *   dur.text       string formateado "HH:MM:SS" (o "MM:SS" si hours=0)
 *   dur.hours / minutes / seconds
 *   dur.setSeconds(n)
 *   dur.set(h, m, s)
 *   dur.tick(delta)  suma delta segundos respetando límites
 *
 * Eventos
 *   is-input, is-change
 *   Custom states: valid, invalid (sólo lectura — los inputs nativos se invalidan)
 *
 * Tokens CSS:
 *   --is-duration-step-size (default 2.5rem para los botones up/down)
 */
(() => {
  const OBSERVED = ['value', 'min', 'max', 'step'];

  const pad2 = (n) => String(n).padStart(2, '0');

  class IsDurationPicker extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;
    #active = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <slot name="start"></slot>
          <div class="col">
            <button class="up" type="button" data-target="h" aria-label="Aumentar horas">+</button>
            <input part="hours" class="cell" id="h" inputmode="numeric" maxlength="2" value="0" aria-label="Horas" />
            <button class="down" type="button" data-target="h" aria-label="Disminuir horas">−</button>
          </div>
          <span class="sep" aria-hidden="true">:</span>
          <div class="col">
            <button class="up" type="button" data-target="m" aria-label="Aumentar minutos">+</button>
            <input part="minutes" class="cell" id="m" inputmode="numeric" maxlength="2" value="00" aria-label="Minutos" />
            <button class="down" type="button" data-target="m" aria-label="Disminuir minutos">−</button>
          </div>
          <span class="sep" aria-hidden="true">:</span>
          <div class="col">
            <button class="up" type="button" data-target="s" aria-label="Aumentar segundos">+</button>
            <input part="seconds" class="cell" id="s" inputmode="numeric" maxlength="2" value="00" aria-label="Segundos" />
            <button class="down" type="button" data-target="s" aria-label="Disminuir segundos">−</button>
          </div>
          <slot name="end"></slot>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#root = this.shadowRoot.querySelector('.root');
      this.#h = this.shadowRoot.getElementById('h');
      this.#m = this.shadowRoot.getElementById('m');
      this.#s = this.shadowRoot.getElementById('s');
      [this.#h, this.#m, this.#s].forEach((input) => {
        input.addEventListener('input', () => this.#onDigitInput(input));
        input.addEventListener('focus', () => { this.#active = input; input.select(); });
        input.addEventListener('blur', () => this.#commit());
        input.addEventListener('keydown', (e) => this.#onKey(e, input));
      });
      this.#root.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-target]');
        if (!btn) return;
        const target = btn.dataset.target;
        const step = Number(this.getAttribute('step')) || 1;
        const dir = btn.classList.contains('up') ? +1 : -1;
        if (target === 's') this.tick(step * dir);
        if (target === 'm') this.tick(60 * step * dir);
        if (target === 'h') this.tick(3600 * step * dir);
      });
    }

    connectedCallback() {
      this.#mounted = true;
      this.#sync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    get value() { return Number(this.getAttribute('value') || 0); }
    set value(v) { this.setAttribute('value', String(Math.max(0, Math.round(Number(v) || 0)))); }

    get hours() { return Math.floor(this.value / 3600); }
    get minutes() { return Math.floor((this.value % 3600) / 60); }
    get seconds() { return this.value % 60; }

    get text() {
      const H = this.hours, M = this.minutes, S = this.seconds;
      return H ? `${pad2(H)}:${pad2(M)}:${pad2(S)}` : `${pad2(M)}:${pad2(S)}`;
    }

    tick(delta) {
      let v = this.value + Number(delta || 0);
      const min = Number(this.getAttribute('min'));
      const max = Number(this.getAttribute('max'));
      if (Number.isFinite(min)) v = Math.max(v, min);
      if (Number.isFinite(max)) v = Math.min(v, max);
      if (v === this.value) return;
      this.value = v;
      this.#sync();
      this.dispatchEvent(new CustomEvent('is-change', { bubbles: true, composed: true, detail: { value: this.value, text: this.text } }));
    }

    set(h, m, s) {
      let v = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
      this.value = v;
      this.#sync();
    }

    setSeconds(n) { this.value = n; this.#sync(); }

    #sync() {
      this.#h.value = pad2(this.hours);
      this.#m.value = pad2(this.minutes);
      this.#s.value = pad2(this.seconds);
    }

    #onDigitInput(input) {
      // filtra no numéricos
      input.value = String(input.value).replace(/\D/g, '').slice(0, 2);
      this.#commit();
    }

    #commit() {
      const h = Math.min(23, Number(this.#h.value) || 0);
      const m = Math.min(59, Number(this.#m.value) || 0);
      const s = Math.min(59, Number(this.#s.value) || 0);
      const v = h * 3600 + m * 60 + s;
      this.value = v;
      this.#sync();
      this.dispatchEvent(new CustomEvent('is-input', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('is-change', { bubbles: true, composed: true, detail: { value: v, text: this.text } }));
    }

    #onKey(e, input) {
      const target = e.target;
      if (e.key === 'ArrowUp') { e.preventDefault(); target.select(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); target.select(); return; }
      if (e.key === ':' || e.key === ';') {
        e.preventDefault();
        if (input === this.#h) this.#m.focus();
        else if (input === this.#m) this.#s.focus();
        else input.blur();
        return;
      }
    }

    #h;
    #m;
    #s;
    #root;
  }

  if (!customElements.get('is-duration-picker')) customElements.define('is-duration-picker', IsDurationPicker);
})();
