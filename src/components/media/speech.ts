import '../actions/button.js';
import '../media/icon.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-speech> — SpeechRecognition (dictado) + SpeechSynthesis (lectura).
 *
 * Atributos: lang, text
 * Métodos: listen(), stop(), speak(text?), cancel()
 * Eventos: is-result { transcript, isFinal }, is-speak-end, is-error { message }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="bar" part="bar">
      <is-button class="listen" variant="plain" type="button" aria-pressed="false">
        <is-icon icon="mdi:microphone-outline"></is-icon>
      </is-button>
      <is-button class="speak" variant="plain" type="button">
        <is-icon icon="mdi:volume-high"></is-icon>
      </is-button>
    </div>
    <p class="out" part="transcript" aria-live="polite"></p>
    <slot></slot>
  `;

  function recCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  class IsSpeech extends HTMLElement {
    static get observedAttributes(): string[] { return ['lang', 'text']; }

    #rec = null;
    #listening = false;
    #out!: HTMLElement;
    #listenBtn!: HTMLElement;
    #speakBtn!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#out = shadow.querySelector<HTMLElement>('.out')!;
      this.#listenBtn = shadow.querySelector<HTMLElement>('.listen')!;
      this.#speakBtn = shadow.querySelector<HTMLElement>('.speak')!;
      this.#listenBtn.addEventListener('click', () => this.#listening ? this.stop() : this.listen());
      this.#speakBtn.addEventListener('click', () => this.speak());
    }

    disconnectedCallback(): void { this.stop(); this.cancel(); }

    get lang() { return this.getAttribute('lang') || document.documentElement.lang || 'es-ES'; }
    set lang(v) { setStringAttr(this, 'lang', v); }
    get text() { return this.getAttribute('text') ?? this.textContent ?? ''; }
    set text(v) { setStringAttr(this, 'text', v); }

    listen() {
      const Ctor = recCtor();
      if (!Ctor) {
        emit(this, 'is-error', { message: 'SpeechRecognition no disponible' });
        return;
      }
      this.stop();
      const rec = new Ctor();
      rec.lang = this.lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev) => {
        let finals = '';
        let inter = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0]?.transcript || '';
          if (ev.results[i].isFinal) finals += t;
          else inter += t;
        }
        const transcript = `${finals}${inter}`.trim();
        this.#out.textContent = transcript;
        emit(this, 'is-result', { transcript, isFinal: Boolean(finals) });
      };
      rec.onerror = (ev) => {
        if (ev.error === 'no-speech' || ev.error === 'aborted') return;
        emit(this, 'is-error', { message: ev.error || 'speech' });
      };
      rec.onend = () => {
        if (this.#listening) {
          try { rec.start(); } catch { this.#listening = false; this.#syncListen(); }
        }
      };
      this.#rec = rec;
      this.#listening = true;
      this.#syncListen();
      rec.start();
    }

    stop() {
      this.#listening = false;
      try { this.#rec?.stop(); } catch { this.#rec?.abort?.(); }
      this.#rec = null;
      this.#syncListen();
    }

    speak(raw) {
      const t = String(raw ?? this.text ?? this.#out.textContent ?? '').trim();
      if (!t || !window.speechSynthesis) {
        if (!window.speechSynthesis) emit(this, 'is-error', { message: 'speechSynthesis no disponible' });
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = this.lang;
      u.onend = () => emit(this, 'is-speak-end');
      window.speechSynthesis.speak(u);
    }

    cancel() {
      window.speechSynthesis?.cancel();
    }

    #syncListen() {
      this.#listenBtn.setAttribute('aria-pressed', this.#listening ? 'true' : 'false');
      this.toggleAttribute('listening', this.#listening);
    }
  }

  defineElement('is-speech', IsSpeech, 'IsSpeech');
})();
