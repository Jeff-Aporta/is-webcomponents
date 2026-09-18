import '../actions/button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

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
 */
(() => {
  const OBSERVED: string[] = ['value', 'min', 'max', 'step'];

  const pad2 = (n: number | string): string => String(n).padStart(2, '0');

  class IsDurationPicker extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    bg: { prop: '--is-duration-picker-bg', onlyColorValues: true },
    'border-color': { prop: '--is-duration-picker-border', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'bg', 'border-color']; }
    #active: HTMLInputElement | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <slot name="start"></slot>
          <div class="col">
            <is-button variant="plain" pill class="up" data-target="h" aria-label="Aumentar horas">+</is-button>
            <input part="hours" class="cell" id="h" inputmode="numeric" maxlength="2" value="0" aria-label="Horas" />
            <is-button variant="plain" pill class="down" data-target="h" aria-label="Disminuir horas">−</is-button>
          </div>
          <span class="sep" aria-hidden="true">:</span>
          <div class="col">
            <is-button variant="plain" pill class="up" data-target="m" aria-label="Aumentar minutos">+</is-button>
            <input part="minutes" class="cell" id="m" inputmode="numeric" maxlength="2" value="00" aria-label="Minutos" />
            <is-button variant="plain" pill class="down" data-target="m" aria-label="Disminuir minutos">−</is-button>
          </div>
          <span class="sep" aria-hidden="true">:</span>
          <div class="col">
            <is-button variant="plain" pill class="up" data-target="s" aria-label="Aumentar segundos">+</is-button>
            <input part="seconds" class="cell" id="s" inputmode="numeric" maxlength="2" value="00" aria-label="Segundos" />
            <is-button variant="plain" pill class="down" data-target="s" aria-label="Disminuir segundos">−</is-button>
          </div>
          <slot name="end"></slot>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#root = this.shadowRoot!.querySelector<HTMLElement>('.root')!;
      this.#h = this.shadowRoot!.getElementById('h') as HTMLInputElement;
      this.#m = this.shadowRoot!.getElementById('m') as HTMLInputElement;
      this.#s = this.shadowRoot!.getElementById('s') as HTMLInputElement;
      ([this.#h, this.#m, this.#s] as HTMLInputElement[]).forEach((input: HTMLInputElement) => {
        input.addEventListener('input', () => this.#onDigitInput(input));
        input.addEventListener('focus', () => { this.#active = input; input.select(); });
        input.addEventListener('blur', () => this.#commit());
        input.addEventListener('keydown', (e: KeyboardEvent) => this.#onKey(e, input));
      });
      this.#root.addEventListener('click', (e: MouseEvent) => {
        // `is-button` es el host: el click se retarget al custom element, no
        // al <button> interno de su shadow root.
        const target = e.target as Element | null;
        const btn = target?.closest('is-button[data-target]') as HTMLElement | null;
        if (!btn) return;
        const tgt = btn.dataset.target;
        const step = Number(this.getAttribute('step')) || 1;
        const dir = btn.classList.contains('up') ? +1 : -1;
        if (tgt === 's') this.tick(step * dir);
        if (tgt === 'm') this.tick(60 * step * dir);
        if (tgt === 'h') this.tick(3600 * step * dir);
      });
    }

    onConnected(): void {
      this.#sync();
    }

    onAttributeChanged(_name: string, _oldVal: string | null, _newVal: string | null): void {
      this.#sync();
    }

    get value(): number { return Number(this.getAttribute('value') || 0); }
    set value(v: number | string) { this.setAttribute('value', String(Math.max(0, Math.round(Number(v) || 0)))); }

    get hours(): number { return Math.floor(this.value / 3600); }
    get minutes(): number { return Math.floor((this.value % 3600) / 60); }
    get seconds(): number { return this.value % 60; }

    get text(): string {
      const H = this.hours, M = this.minutes, S = this.seconds;
      return H ? `${pad2(H)}:${pad2(M)}:${pad2(S)}` : `${pad2(M)}:${pad2(S)}`;
    }

    tick(delta: number): void {
      let v = this.value + Number(delta || 0);
      const min = Number(this.getAttribute('min'));
      const max = Number(this.getAttribute('max'));
      if (Number.isFinite(min)) v = Math.max(v, min);
      if (Number.isFinite(max)) v = Math.min(v, max);
      if (v === this.value) return;
      this.value = v;
      this.#sync();
      emit(this, 'is-change', { value: this.value, text: this.text });
    }

    set(h: number | string, m: number | string, s: number | string): void {
      const v = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
      this.value = v;
      this.#sync();
    }

    setSeconds(n: number): void { this.value = n; this.#sync(); }

    #sync(): void {
      this.#h.value = pad2(this.hours);
      this.#m.value = pad2(this.minutes);
      this.#s.value = pad2(this.seconds);
    }

    #onDigitInput(input: HTMLInputElement): void {
      // filtra no numéricos
      input.value = String(input.value).replace(/\D/g, '').slice(0, 2);
      this.#commit();
    }

    #commit(): void {
      const h = Math.min(23, Number(this.#h.value) || 0);
      const m = Math.min(59, Number(this.#m.value) || 0);
      const s = Math.min(59, Number(this.#s.value) || 0);
      const v = h * 3600 + m * 60 + s;
      this.value = v;
      this.#sync();
      emit(this, 'is-input');
      emit(this, 'is-change', { value: v, text: this.text });
    }

    #onKey(e: KeyboardEvent, input: HTMLInputElement): void {
      const target = e.target as HTMLInputElement;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = Number(this.getAttribute('step')) || 1;
        const dir = e.key === 'ArrowUp' ? +1 : -1;
        const unit = input === this.#h ? 3600 : input === this.#m ? 60 : 1;
        this.tick(unit * step * dir);
        target.select();
        return;
      }
      if (e.key === ':' || e.key === ';') {
        e.preventDefault();
        if (input === this.#h) this.#m.focus();
        else if (input === this.#m) this.#s.focus();
        else input.blur();
        return;
      }
    }

    #h!: HTMLInputElement;
    #m!: HTMLInputElement;
    #s!: HTMLInputElement;
    #root!: HTMLElement;
  }

  defineElement('is-duration-picker', IsDurationPicker);
})();
