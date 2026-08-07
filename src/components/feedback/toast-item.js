import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { INTENT } from '../_shared/intent.js';

/**
 * <is-toast-item> — Web Component (vanilla).
 *
 * Ítem individual de toast con countdown y cierre.
 *
 * Atributos
 *   color   brand | success | warning | danger | neutral (default neutral)
 *   duration  number ms (default 5000; 0 = hasta dismiss). Reflect.
 *   open      boolean — visible
 *
 * Slots: default, icon | start
 *
 * Métodos: show(), hide()
 *
 * Eventos (bubbles, composed): is-after-show, is-after-hide
 *
 * CSS Parts: ::part(base) ::part(icon) ::part(message) ::part(close-button) ::part(progress)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base" role="status" aria-live="polite">
      <span part="icon" class="icon">
        <slot name="icon"><slot name="start"></slot></slot>
      </span>
      <div part="message" class="message"><slot></slot></div>
      <button type="button" part="close-button" class="close" aria-label="Cerrar">
        <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
      </button>
      <div part="progress" class="progress" hidden aria-hidden="true">
        <div class="progress-bar"></div>
      </div>
    </div>
  `;

  const OBSERVED = ['color', 'duration', 'open'];
  const VALID_COLOR = INTENT;
  const DEFAULT_DURATION = 5000;

  class IsToastItem extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #base;
    #progress;
    #progressBar;
    #closeBtn;
    #mounted = false;
    #timer = null;
    #raf = null;
    #startedAt = 0;
    #remaining = 0;
    #paused = false;
    #hiding = false;
    #showing = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#base = shadow.querySelector('.base');
      this.#progress = shadow.querySelector('.progress');
      this.#progressBar = shadow.querySelector('.progress-bar');
      this.#closeBtn = shadow.querySelector('.close');
      this.#closeBtn.addEventListener('click', () => this.hide());
      this.#base.addEventListener('mouseenter', this.#onPause);
      this.#base.addEventListener('mouseleave', this.#onResume);
      this.#base.addEventListener('focusin', this.#onPause);
      this.#base.addEventListener('focusout', this.#onResume);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('color')) this.setAttribute('color', 'brand');
      if (!this.hasAttribute('duration')) this.setAttribute('duration', String(DEFAULT_DURATION));
      if (this.hasAttribute('open')) this.show();
      else this.hidden = true;
    }

    disconnectedCallback() {
      this.#clearTimers();
      this.#mounted = false;
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'color' && newVal && !VALID_COLOR.includes(newVal)) {
        this.setAttribute('color', 'neutral');
        return;
      }
      if (name === 'open') {
        if (this.hasAttribute('open')) {
          if (!this.#showing) this.show();
        } else if (!this.#hiding) {
          this.hide();
        }
      }
      if (name === 'duration' && this.hasAttribute('open') && !this.#hiding) {
        this.#restartCountdown();
      }
    }

    get color() {
      const v = this.getAttribute('color');
      return VALID_COLOR.includes(v) ? v : 'neutral';
    }
    set color(v) {
      if (v == null || v === '') this.removeAttribute('color');
      else this.setAttribute('color', VALID_COLOR.includes(v) ? v : 'neutral');
    }

    get duration() {
      const n = parseFloat(this.getAttribute('duration'));
      return Number.isFinite(n) ? Math.max(0, n) : DEFAULT_DURATION;
    }
    set duration(v) {
      if (v == null || v === '') this.removeAttribute('duration');
      else this.setAttribute('duration', String(v));
    }

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    /** Relanza el countdown con la duración actual (usado por toast.promise). */
    restartTimer() {
      if (this.hasAttribute('open')) this.#restartCountdown();
      return this;
    }

    show() {
      if (this.#showing) return this;
      this.#showing = true;
      this.#hiding = false;
      this.hidden = false;
      if (!this.hasAttribute('open')) this.setAttribute('open', '');
      this.#restartCountdown();
      emit(this, 'is-after-show');
      this.#showing = false;
      return this;
    }

    hide() {
      if (this.#hiding) return Promise.resolve(this);
      this.#hiding = true;
      this.#clearTimers();
      if (this.hasAttribute('open')) this.removeAttribute('open');
      this.hidden = true;
      emit(this, 'is-after-hide');
      this.#hiding = false;
      return Promise.resolve(this);
    }

    #restartCountdown() {
      this.#clearTimers();
      const dur = this.duration;
      if (dur <= 0) {
        this.#progress.hidden = true;
        this.#progressBar.style.width = '0%';
        this.#progressBar.style.transition = 'none';
        return;
      }
      this.#remaining = dur;
      this.#paused = false;
      this.#progress.hidden = false;
      this.#progressBar.style.transition = 'none';
      this.#progressBar.style.width = '100%';
      // Force reflow so the transition starts from 100%
      void this.#progressBar.offsetWidth;
      this.#progressBar.style.transition = `width ${dur}ms linear`;
      this.#progressBar.style.width = '0%';
      this.#startedAt = performance.now();
      this.#timer = setTimeout(() => this.hide(), dur);
    }

    #onPause = () => {
      if (this.duration <= 0 || this.#paused || !this.hasAttribute('open')) return;
      this.#paused = true;
      const elapsed = performance.now() - this.#startedAt;
      this.#remaining = Math.max(0, this.#remaining - elapsed);
      this.#clearTimers();
      const computed = getComputedStyle(this.#progressBar).width;
      this.#progressBar.style.transition = 'none';
      this.#progressBar.style.width = computed;
    };

    #onResume = (e) => {
      if (!this.#paused || this.duration <= 0) return;
      // Still focused inside → keep paused
      if (e?.type === 'focusout' && this.#base.contains(e.relatedTarget)) return;
      this.#paused = false;
      if (this.#remaining <= 0) {
        this.hide();
        return;
      }
      this.#startedAt = performance.now();
      this.#progressBar.style.transition = `width ${this.#remaining}ms linear`;
      this.#progressBar.style.width = '0%';
      this.#timer = setTimeout(() => this.hide(), this.#remaining);
    };

    #clearTimers() {
      if (this.#timer != null) { clearTimeout(this.#timer); this.#timer = null; }
      if (this.#raf != null) { cancelAnimationFrame(this.#raf); this.#raf = null; }
    }
  }

  defineElement('is-toast-item', IsToastItem, 'IsToastItem');
})();
