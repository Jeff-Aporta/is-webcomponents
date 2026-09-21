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
 *
 * Estados accesibles (F0.3 g12):
 *   role="region" aria-label aria-keyshortcuts
 *   aria-busy durante escucha activa y durante lectura
 *   aria-disabled si SpeechRecognition / speechSynthesis no existen
 *   aria-pressed en el botón de escucha
 *   aria-live="polite" en el <p.transcript>
 *   Space / Enter sobre el host alternan escucha (Shift+Space = speak)
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
      <is-button class="listen" variant="plain" type="button" aria-pressed="false" aria-label="Iniciar escucha" disabled>
        <is-icon icon="mdi:microphone-outline"></is-icon>
      </is-button>
      <is-button class="speak" variant="plain" type="button" aria-label="Leer texto en voz alta" disabled>
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
    #mounted = false;
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
      // F0.3 g12 [keyboard/media]: Space / Enter sobre el host alternan
      // escucha (botón 1) o disparan speak (botón 2 según data-active).
      this.addEventListener('keydown', this.#onKeydown);
    }

    connectedCallback(): void {
      this.#mounted = true;
      // F0.3 g12 [a11y/region]: landmark + label.
      if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Dictado y lectura por voz');
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      if (!this.hasAttribute('aria-keyshortcuts')) {
        this.setAttribute('aria-keyshortcuts', 'Space Enter');
      }
      this.#syncSupport();
    }

    disconnectedCallback(): void {
      this.removeEventListener('keydown', this.#onKeydown);
      this.stop();
      this.cancel();
    }

    /**
     * F0.3 g12 [a11y/support]: si la Web Speech API no está disponible,
     * marcamos los botones como `aria-disabled` y emitimos is-error al
     * pulsar. Antes el click era silencioso.
     */
    #syncSupport(): void {
      const hasRec = !!recCtor();
      const hasSpeak = !!window.speechSynthesis;
      // is-button no tiene disabled nativo, así que usamos aria-disabled.
      this.#listenBtn.setAttribute('aria-disabled', String(!hasRec));
      this.#speakBtn.setAttribute('aria-disabled', String(!hasSpeak));
      this.#listenBtn.setAttribute('title', hasRec ? 'Dictado (micrófono)' : 'Dictado no soportado en este navegador');
      this.#speakBtn.setAttribute('title', hasSpeak ? 'Lectura por voz' : 'Lectura por voz no soportada en este navegador');
      // Etiqueta dinámica según estado de escucha.
      this.#listenBtn.setAttribute('aria-label', this.#listening ? 'Detener escucha' : 'Iniciar escucha');
    }

    #onKeydown = (e: KeyboardEvent): void => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target && (e.target as HTMLElement).closest('input,textarea,[contenteditable]')) return;
      if (e.key !== ' ' && e.key !== 'Enter') return;
      // Por defecto Space/Enter arrancan/paran la escucha.
      e.preventDefault();
      if (e.shiftKey) this.speak();
      else if (this.#listening) this.stop();
      else this.listen();
    };

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
      // F0.3 g12 [media/loading]: aria-busy mientras se inicializa.
      this.setAttribute('aria-busy', 'true');
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
      this.removeAttribute('aria-busy');
      this.#syncListen();
      rec.start();
    }

    stop(): void {
      this.#listening = false;
      try { this.#rec?.stop(); } catch { this.#rec?.abort?.(); }
      this.#rec = null;
      this.removeAttribute('aria-busy');
      this.#syncListen();
    }

    speak(raw?: string): void {
      const t = String(raw ?? this.text ?? this.#out.textContent ?? '').trim();
      if (!t || !window.speechSynthesis) {
        if (!window.speechSynthesis) emit(this, 'is-error', { message: 'speechSynthesis no disponible' });
        return;
      }
      window.speechSynthesis.cancel();
      // F0.3 g12 [media/loading]: aria-busy mientras suena.
      this.setAttribute('aria-busy', 'true');
      const u = new SpeechSynthesisUtterance(t);
      u.lang = this.lang;
      u.onend = () => {
        this.removeAttribute('aria-busy');
        emit(this, 'is-speak-end');
      };
      u.onerror = () => {
        this.removeAttribute('aria-busy');
      };
      window.speechSynthesis.speak(u);
    }

    cancel(): void {
      this.removeAttribute('aria-busy');
      window.speechSynthesis?.cancel();
    }

    #syncListen(): void {
      this.#listenBtn.setAttribute('aria-pressed', this.#listening ? 'true' : 'false');
      this.#listenBtn.setAttribute('aria-label', this.#listening ? 'Detener escucha' : 'Iniciar escucha');
      this.toggleAttribute('listening', this.#listening);
    }
  }

  defineElement('is-speech', IsSpeech, 'IsSpeech');
})();
