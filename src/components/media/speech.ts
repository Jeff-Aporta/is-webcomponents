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

// Tipos de la Web Speech API: no están en lib.dom.d.ts (Chromium/webkit las
// expone bajo `webkitSpeechRecognition` y en Firefox detrás de flag). Declaramos
// sólo el subset que el componente usa para que `rec.lang = 'es-ES'` typecheckee.
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionConstructorBag {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

declare global {
  interface Window extends SpeechRecognitionConstructorBag { }
}

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

  function recCtor(): SpeechRecognitionCtor | null {
    const w = window as Window & SpeechRecognitionConstructorBag;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  class IsSpeech extends HTMLElement {
    static get observedAttributes(): string[] { return ['lang', 'text']; }

    /**
     * 2026-Q1 fix: attributeChangedCallback faltaba → los cambios de
     * atributo vía playground o setAttribute programático no se
     * procesaban. Si el usuario cambia `lang` mientras escucha, la sesión
     * de SpeechRecognition sigue con el idioma anterior; si cambia
     * `text`, el componente no releía para speak(). Ahora `lang` se
     * re-aplica a la sesión activa y `text` dispara speak() automáticamente.
     */
    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
      if (name === 'lang' && this.#rec) {
        // lang cambia → reiniciar sesión para que tome el nuevo idioma.
        try { this.#rec.lang = newVal || 'es-ES'; } catch { /* no-op */ }
      } else if (name === 'text' && newVal) {
        this.speak(newVal);
      }
    }

    #rec: SpeechRecognitionInstance | null = null;
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

    get lang(): string { return this.getAttribute('lang') || document.documentElement.lang || 'es-ES'; }
    set lang(v: string) { setStringAttr(this, 'lang', v); }
    get text(): string { return this.getAttribute('text') ?? this.textContent ?? ''; }
    set text(v: string) { setStringAttr(this, 'text', v); }

    listen(): void {
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
      rec.onresult = (ev: SpeechRecognitionEvent) => {
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
      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
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

    stop(): void {
      this.#listening = false;
      try { this.#rec?.stop(); } catch { this.#rec?.abort?.(); }
      this.#rec = null;
      this.#syncListen();
    }

    speak(raw?: string): void {
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

    cancel(): void {
      window.speechSynthesis?.cancel();
    }

    #syncListen(): void {
      this.#listenBtn.setAttribute('aria-pressed', this.#listening ? 'true' : 'false');
      this.toggleAttribute('listening', this.#listening);
    }
  }

  defineElement('is-speech', IsSpeech, 'IsSpeech');
})();
