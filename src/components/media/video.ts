import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import '../actions/button.js';
import '../actions/check-icon-button.js';
import './icon.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-video> — Web Component (vanilla).
 *
 * Reproductor con chrome tipo YouTube: barra de progreso propia (con buffer y
 * scrubber) sobre la fila de botones, scrim inferior, overlay de play central,
 * auto-ocultado mientras reproduce, atajos de teclado, pantalla completa,
 * picture-in-picture y menú de velocidad.
 *
 * Atributos
 *   src, poster
 *   without-controls  boolean — oculta la chrome propia (por defecto se muestra)
 *   muted, loop, autoplay, playsinline  boolean
 *
 * Slots: default — tracks / sources
 *
 * Métodos: play(), pause(), toggleFullscreen(), togglePictureInPicture()
 *
 * Eventos (bubbles, composed): is-play, is-pause, is-ended
 * También reenvía play/pause/ended nativos (bubbles, composed)
 *
 * Teclado (con foco en el reproductor)
 *   espacio / k  play-pausa      m  silenciar        f  pantalla completa
 *   ← →          ±5 s            j l  ±10 s          0-9  salto por decenas
 *   ↑ ↓          ±5 % volumen
 *
 * CSS Parts: ::part(base) ::part(video) ::part(controls) ::part(play-button)
 *            ::part(mute-button) ::part(volume) ::part(volume-slider)
 *            ::part(time) ::part(seek) ::part(progress) ::part(big-play)
 *            ::part(fullscreen-button) ::part(pip-button) ::part(settings-button)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="wrap" part="base">
      <video part="video" class="video" playsinline></video>
      <slot></slot>
      <div class="scrim" aria-hidden="true"></div>
      <is-button part="big-play" class="big-play" variant="text" color="neutral" aria-label="Reproducir">
        <is-icon icon="mdi:play" aria-hidden="true"></is-icon>
      </is-button>
      <div part="controls" class="controls" hidden>
        <div part="progress" class="progress">
          <input part="seek" class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Posición" />
          <div class="bar" aria-hidden="true">
            <div class="buffered"></div>
            <div class="played"></div>
          </div>
          <span class="thumb" aria-hidden="true"></span>
          <span class="tip" aria-hidden="true">0:00</span>
        </div>
        <div class="row">
          <is-check-icon-button
            part="play-button"
            class="ctrl play"
            variant="plain"
            icon="mdi:play"
            checked-icon="mdi:pause"
            label="Reproducir"
            checked-label="Pausar"
          ></is-check-icon-button>
          <div part="volume" class="vol">
            <is-check-icon-button
              part="mute-button"
              class="ctrl mute"
              variant="plain"
              icon="mdi:volume-high"
              checked-icon="mdi:volume-off"
              label="Silenciar"
              checked-label="Activar sonido"
            ></is-check-icon-button>
            <input
              part="volume-slider"
              class="volume"
              type="range"
              min="0"
              max="100"
              value="100"
              aria-label="Volumen"
            />
          </div>
          <span part="time" class="time">
            <span class="cur">0:00</span><span class="sep">/</span><span class="dur">0:00</span>
          </span>
          <span class="spacer"></span>
          <div class="settings">
            <is-button part="settings-button" class="iconbtn speed" variant="text" color="neutral"
                    aria-label="Velocidad de reproducción" aria-haspopup="true" aria-expanded="false">
              <is-icon icon="mdi:cog-outline" aria-hidden="true"></is-icon>
            </is-button>
            <ul class="menu" role="menu" hidden>
              <li class="menu__head" role="presentation">Velocidad</li>
            </ul>
          </div>
          <is-check-icon-button
            part="pip-button"
            class="ctrl pip"
            variant="plain"
            icon="mdi:picture-in-picture-bottom-right"
            checked-icon="mdi:picture-in-picture-top-right"
            label="Picture in picture"
            checked-label="Salir de picture in picture"
            hidden
          ></is-check-icon-button>
          <is-check-icon-button
            part="fullscreen-button"
            class="ctrl fs"
            variant="plain"
            icon="mdi:fullscreen"
            checked-icon="mdi:fullscreen-exit"
            label="Pantalla completa"
            checked-label="Salir de pantalla completa"
          ></is-check-icon-button>
        </div>
      </div>
    </div>
  `;

  const OBSERVED = ['src', 'poster', 'without-controls', 'muted', 'loop', 'autoplay', 'playsinline'];
  const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const IDLE_MS = 2600;

  function fmtTime(sec: number) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const s = Math.floor(sec % 60);
    const m = Math.floor(sec / 60) % 60;
    const h = Math.floor(sec / 3600);
    const pad = (n: string) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  class IsVideo extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    accent: { prop: '--is-video-accent', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'accent']; }

    #video!: HTMLElement;
    #controls!: HTMLElement;
    #playBtn!: HTMLElement;
    #muteBtn!: HTMLElement;
    #volume!: HTMLElement;
    #seek!: HTMLElement;
    #time!: HTMLElement;
    #slot!: HTMLSlotElement;
    #wrap!: HTMLElement;
    #bigPlay!: HTMLElement;
    #progress!: HTMLElement;
    #tip!: HTMLElement;
    #cur!: HTMLElement;
    #dur!: HTMLElement;
    #fsBtn!: HTMLElement;
    #pipBtn!: HTMLElement;
    #speedBtn!: HTMLElement;
    #menu!: HTMLElement;
    #mounted = false;
    #seeking = false;
    #lastVolume = 1;
    #idleTimer = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#video = shadow.querySelector<HTMLElement>('.video')!;
      this.#controls = shadow.querySelector<HTMLElement>('.controls')!;
      this.#playBtn = shadow.querySelector<HTMLElement>('.play')!;
      this.#muteBtn = shadow.querySelector<HTMLElement>('.mute')!;
      this.#volume = shadow.querySelector<HTMLElement>('.volume')!;
      this.#seek = shadow.querySelector<HTMLElement>('.seek')!;
      this.#time = shadow.querySelector<HTMLElement>('.time')!;
      this.#slot = shadow.querySelector<HTMLSlotElement>('slot')!;
      this.#wrap = shadow.querySelector<HTMLElement>('.wrap')!;
      this.#bigPlay = shadow.querySelector<HTMLElement>('.big-play')!;
      this.#progress = shadow.querySelector<HTMLElement>('.progress')!;
      this.#tip = shadow.querySelector<HTMLElement>('.tip')!;
      this.#cur = shadow.querySelector<HTMLElement>('.cur')!;
      this.#dur = shadow.querySelector<HTMLElement>('.dur')!;
      this.#fsBtn = shadow.querySelector<HTMLElement>('.fs')!;
      this.#pipBtn = shadow.querySelector<HTMLElement>('.pip')!;
      this.#speedBtn = shadow.querySelector<HTMLElement>('.speed')!;
      this.#menu = shadow.querySelector<HTMLElement>('.menu')!;

      this.#buildSpeedMenu();

      this.#playBtn.addEventListener('is-change', (e) => {
        if (e.detail.checked) {
          const p = this.play();
          if (p && typeof p.catch === 'function') {
            p.catch(() => { this.#playBtn.checked = false; });
          }
        } else {
          this.pause();
        }
      });
      this.#muteBtn.addEventListener('is-change', (e) => {
        if (e.detail.checked) {
          if (this.#video.volume > 0) this.#lastVolume = this.#video.volume;
          this.muted = true;
        } else {
          this.muted = false;
          if (this.#video.volume === 0) {
            this.#video.volume = this.#lastVolume || 1;
          }
        }
      });
      this.#volume.addEventListener('input', () => {
        const v = Number(this.#volume.value) / 100;
        this.#video.volume = v;
        if (v > 0) {
          this.#lastVolume = v;
          this.muted = false;
        } else {
          this.muted = true;
        }
      });
      this.#seek.addEventListener('pointerdown', () => { this.#seeking = true; });
      this.#seek.addEventListener('pointerup', () => { this.#seeking = false; this.#applySeek(); });
      this.#seek.addEventListener('change', () => { this.#seeking = false; this.#applySeek(); });
      this.#seek.addEventListener('input', () => {
        if (!this.#video.duration) return;
        const ratio = Number(this.#seek.value) / 1000;
        this.#cur.textContent = fmtTime(ratio * this.#video.duration);
        this.#dur.textContent = fmtTime(this.#video.duration);
        this.style.setProperty('--played', `${ratio * 100}%`);
      });

      // Tooltip de tiempo sobre la barra, como YouTube.
      this.#progress.addEventListener('pointermove', (e) => {
        const r = this.#progress.getBoundingClientRect();
        if (!r.width) return;
        const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        this.#tip.textContent = fmtTime(ratio * (this.#video.duration || 0));
        this.#tip.style.left = `${ratio * 100}%`;
      });

      this.#bigPlay.addEventListener('click', () => this.#togglePlay());
      // Clic en la imagen alterna play; doble clic, pantalla completa.
      this.#video.addEventListener('click', () => { if (this.controls) this.#togglePlay(); });
      this.#video.addEventListener('dblclick', () => { if (this.controls) this.toggleFullscreen(); });

      // `checked` es optimista: fullscreenchange / enter-leavepictureinpicture
      // lo corrigen si el navegador rechaza el gesto.
      this.#fsBtn.addEventListener('is-change', () => this.toggleFullscreen());
      this.#pipBtn.addEventListener('is-change', () => this.togglePictureInPicture());
      this.#speedBtn.addEventListener('click', () => this.#toggleMenu());
      this.addEventListener('keydown', this.#onKeydown);

      // Auto-ocultado del chrome: cualquier señal de vida lo devuelve.
      for (const ev of ['pointermove', 'pointerdown', 'focusin']) {
        this.addEventListener(ev, this.#wake);
      }
      this.addEventListener('pointerleave', () => {
        if (!this.#video.paused) this.#goIdle();
      });

      this.#video.addEventListener('play', this.#onPlay);
      this.#video.addEventListener('pause', this.#onPause);
      this.#video.addEventListener('ended', this.#onEnded);
      this.#video.addEventListener('timeupdate', this.#onTime);
      this.#video.addEventListener('loadedmetadata', this.#onTime);
      this.#video.addEventListener('progress', this.#onBuffer);
      this.#video.addEventListener('volumechange', this.#syncVolumeUi);
      this.#video.addEventListener('ratechange', () => this.#syncMenuUi());
      this.#video.addEventListener('enterpictureinpicture', this.#syncPipUi);
      this.#video.addEventListener('leavepictureinpicture', this.#syncPipUi);
      document.addEventListener('fullscreenchange', this.#syncFsUi);

      this.#slot.addEventListener('slotchange', () => this.#distributeSlot());
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.#mounted = true;
      // Foco propio para los atajos de teclado (como el player de YouTube).
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      this.#syncAttrs();
      this.#syncControlsVisibility();
      this.#syncPlayUi();
      this.#syncVolumeUi();
      this.#syncPipUi();
      this.#syncFsUi();
      this.#syncMenuUi();
      this.#distributeSlot();
      // PiP no existe en todos los navegadores: el botón solo si hay soporte.
      this.#pipBtn.hidden = !document.pictureInPictureEnabled;
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      clearTimeout(this.#idleTimer);
      document.removeEventListener('fullscreenchange', this.#syncFsUi);
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'without-controls') this.#syncControlsVisibility();
      else this.#syncAttrs();
      if (name === 'muted') this.#syncVolumeUi();
    }

    get src() { return this.getAttribute('src') ?? ''; }
    set src(v) { setStringAttr(this, 'src', v); }

    get poster() { return this.getAttribute('poster') ?? ''; }
    set poster(v) { setStringAttr(this, 'poster', v); }

    get withoutControls() { return this.hasAttribute('without-controls'); }
    set withoutControls(v) { this.toggleAttribute('without-controls', !!v); }

    /** Conveniencia: `controls` es el inverso de `without-controls`. */
    get controls() { return !this.withoutControls; }
    set controls(v) { this.withoutControls = !v; }

    get muted() { return this.hasAttribute('muted'); }
    set muted(v) { this.toggleAttribute('muted', !!v); }

    get loop() { return this.hasAttribute('loop'); }
    set loop(v) { this.toggleAttribute('loop', !!v); }

    get autoplay() { return this.hasAttribute('autoplay'); }
    set autoplay(v) { this.toggleAttribute('autoplay', !!v); }

    get playsInline() { return this.hasAttribute('playsinline'); }
    set playsInline(v) { this.toggleAttribute('playsinline', !!v); }

    /** Expose underlying media element */
    get media() { return this.#video; }

    play() { return this.#video.play(); }
    pause() { this.#video.pause(); }

    /** Pantalla completa sobre el host (mantiene el chrome propio dentro). */
    toggleFullscreen() {
      if (document.fullscreenElement === this) document.exitFullscreen?.();
      else this.requestFullscreen?.().catch(() => { /* gesto denegado */ });
    }

    togglePictureInPicture() {
      if (!document.pictureInPictureEnabled) return;
      if (document.pictureInPictureElement === this.#video) document.exitPictureInPicture?.();
      else this.#video.requestPictureInPicture?.().catch(() => { /* no disponible */ });
    }

    #togglePlay() {
      if (this.#video.paused) {
        const p = this.play();
        if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay bloqueado */ });
      } else {
        this.pause();
      }
    }

    #seekBy(delta: number) {
      const d = this.#video.duration;
      if (!Number.isFinite(d)) return;
      this.#video.currentTime = Math.min(d, Math.max(0, this.#video.currentTime + delta));
      this.#wake();
    }

    #volumeBy(delta: number) {
      const v = Math.min(1, Math.max(0, this.#video.volume + delta));
      this.#video.volume = v;
      if (v > 0) this.muted = false;
      this.#wake();
    }

    #onKeydown = (e) => {
      if (!this.controls || e.altKey || e.ctrlKey || e.metaKey) return;
      // Los sliders ya manejan sus propias flechas: no las duplicamos.
      const onSlider = e.target === this.#seek || e.target === this.#volume;
      const key = e.key;

      if (key === ' ' || key === 'k') { this.#togglePlay(); }
      else if (key === 'm') { this.muted = !this.#video.muted; this.#video.muted = this.muted; }
      else if (key === 'f') { this.toggleFullscreen(); }
      else if (key === 'ArrowRight' && !onSlider) { this.#seekBy(5); }
      else if (key === 'ArrowLeft' && !onSlider) { this.#seekBy(-5); }
      else if (key === 'l') { this.#seekBy(10); }
      else if (key === 'j') { this.#seekBy(-10); }
      else if (key === 'ArrowUp' && !onSlider) { this.#volumeBy(0.05); }
      else if (key === 'ArrowDown' && !onSlider) { this.#volumeBy(-0.05); }
      else if (/^[0-9]$/.test(key) && Number.isFinite(this.#video.duration)) {
        this.#video.currentTime = (Number(key) / 10) * this.#video.duration;
      } else return;

      e.preventDefault();
      this.#wake();
    };

    /** Devuelve el chrome y reinicia la cuenta atrás de ocultado. */
    #wake = () => {
      this.removeAttribute('data-idle');
      clearTimeout(this.#idleTimer);
      if (this.#video.paused || !this.controls) return;
      this.#idleTimer = setTimeout(() => this.#goIdle(), IDLE_MS);
    };

    #goIdle() {
      if (this.#video.paused || !this.controls) return;
      if (!this.#menu.hidden) return;   // menú abierto: no esconder
      this.setAttribute('data-idle', '');
    }

    #buildSpeedMenu() {
      for (const rate of RATES) {
        const li = document.createElement('li');
        li.setAttribute('role', 'presentation');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('role', 'menuitemradio');
        btn.dataset.rate = String(rate);
        btn.textContent = rate === 1 ? 'Normal' : `${rate}×`;
        btn.addEventListener('click', () => {
          this.#video.playbackRate = rate;
          this.#toggleMenu(false);
        });
        li.appendChild(btn);
        this.#menu.appendChild(li);
      }
      // Clic fuera cierra: un solo listener en el wrap, sin doc listeners.
      this.#wrap.addEventListener('pointerdown', (e) => {
        if (this.#menu.hidden) return;
        const path = e.composedPath();
        if (!path.includes(this.#menu) && !path.includes(this.#speedBtn)) this.#toggleMenu(false);
      });
    }

    #toggleMenu(force) {
      const open = force ?? this.#menu.hidden;
      this.#menu.hidden = !open;
      this.#speedBtn.setAttribute('aria-expanded', String(open));
      if (open) this.#wake();
    }

    #syncMenuUi() {
      const rate = this.#video.playbackRate;
      for (const btn of this.#menu.querySelectorAll<HTMLButtonElement>('button[data-rate]')) {
        btn.setAttribute('aria-checked', String(Number(btn.dataset.rate) === rate));
      }
      // Señal visible de que no va a velocidad normal.
      this.#speedBtn.querySelector<HTMLElement>('is-icon')
        ?.setAttribute('icon', rate === 1 ? 'mdi:cog-outline' : 'mdi:play-speed');
    }

    // is-check-icon-button ya intercambia icono y aria-label según `checked`.
    #syncPipUi = () => {
      this.#pipBtn.checked = document.pictureInPictureElement === this.#video;
    };

    #syncFsUi = () => {
      this.#fsBtn.checked = document.fullscreenElement === this;
    };

    #onBuffer = () => {
      const d = this.#video.duration;
      const buf = this.#video.buffered;
      if (!Number.isFinite(d) || d <= 0 || !buf.length) return;
      const end = buf.end(buf.length - 1);
      this.style.setProperty('--buffered', `${Math.min(100, (end / d) * 100)}%`);
    };

    #syncAttrs() {
      const src = this.src.trim();
      if (src) {
        if (this.#video.getAttribute('src') !== src) this.#video.src = src;
      } else if (!this.#hasSlottedSources()) {
        this.#video.removeAttribute('src');
      }

      const poster = this.poster.trim();
      if (poster) this.#video.poster = poster;
      else this.#video.removeAttribute('poster');

      this.#video.muted = this.muted;
      this.#video.loop = this.loop;
      this.#video.autoplay = this.autoplay;
      this.#video.playsInline = this.hasAttribute('playsinline');
      this.#video.controls = false;
    }

    #hasSlottedSources() {
      return this.#slot.assignedElements({ flatten: true }).some(
        (el) => el.tagName === 'SOURCE' || el.tagName === 'TRACK'
      );
    }

    #distributeSlot() {
      this.#video.querySelectorAll<HTMLElement>('[data-is-injected]').forEach((el) => el.remove());
      for (const el of this.#slot.assignedElements({ flatten: true })) {
        if (el.tagName === 'SOURCE' || el.tagName === 'TRACK') {
          const clone = el.cloneNode(true);
          clone.setAttribute('data-is-injected', '');
          this.#video.appendChild(clone);
        }
      }
      if (!this.src.trim() && this.#hasSlottedSources()) this.#video.load();
    }

    #syncControlsVisibility() {
      const on = this.controls;
      this.#controls.hidden = !on;
      // data-no-controls apaga scrim y overlay (el playlist usa este modo).
      this.toggleAttribute('data-no-controls', !on);
      if (!on) this.removeAttribute('data-idle');
    }

    #syncPlayUi() {
      const playing = !this.#video.paused;
      this.#playBtn.checked = playing;
      this.toggleAttribute('data-playing', playing);
    }

    #syncVolumeUi = () => {
      const muted = this.#video.muted || this.#video.volume === 0;
      this.#muteBtn.checked = muted;
      this.toggleAttribute('muted', this.#video.muted);
      const level = muted ? 0 : this.#video.volume;
      this.#volume.value = String(Math.round(level * 100));
      this.style.setProperty('--vol', `${Math.round(level * 100)}%`);
      if (this.#video.volume > 0) this.#lastVolume = this.#video.volume;
      // Icono según nivel (solo cuando no está muteado)
      if (!muted) {
        if (level < 0.35) this.#muteBtn.icon = 'mdi:volume-low';
        else if (level < 0.7) this.#muteBtn.icon = 'mdi:volume-medium';
        else this.#muteBtn.icon = 'mdi:volume-high';
      }
    };

    #applySeek() {
      if (!this.#video.duration) return;
      this.#video.currentTime = (Number(this.#seek.value) / 1000) * this.#video.duration;
    }

    #onPlay = () => {
      this.#playBtn.checked = true;
      this.setAttribute('data-playing', '');
      this.#wake();
      this.dispatchEvent(new Event('play', { bubbles: true, composed: true }));
      emit(this, 'is-play');
    };

    #onPause = () => {
      this.#playBtn.checked = false;
      this.removeAttribute('data-playing');
      // En pausa el chrome se queda: nunca se oculta sobre un fotograma fijo.
      this.removeAttribute('data-idle');
      clearTimeout(this.#idleTimer);
      this.dispatchEvent(new Event('pause', { bubbles: true, composed: true }));
      emit(this, 'is-pause');
    };

    #onEnded = () => {
      this.removeAttribute('data-playing');
      this.removeAttribute('data-idle');
      this.dispatchEvent(new Event('ended', { bubbles: true, composed: true }));
      emit(this, 'is-ended');
    };

    #onTime = () => {
      const d = this.#video.duration || 0;
      const t = this.#video.currentTime || 0;
      this.#cur.textContent = fmtTime(t);
      this.#dur.textContent = fmtTime(d);
      const ratio = d > 0 ? t / d : 0;
      this.style.setProperty('--played', `${ratio * 100}%`);
      if (!this.#seeking && d > 0) {
        this.#seek.value = String(Math.round(ratio * 1000));
      }
      this.#onBuffer();
    };
  }

  defineElement('is-video', IsVideo, 'IsVideo');
})();
