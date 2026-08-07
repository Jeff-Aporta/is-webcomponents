import { adoptCss } from '../_shared/adopt-css.js';
import '../actions/check-icon-button.js';
import './icon.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
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
 *   controls     boolean (default true)
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
      <button part="big-play" class="big-play" type="button" aria-label="Reproducir">
        <is-icon icon="mdi:play" aria-hidden="true"></is-icon>
      </button>
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
            appearance="plain"
            icon="mdi:play"
            checked-icon="mdi:pause"
            label="Reproducir"
            checked-label="Pausar"
          ></is-check-icon-button>
          <div part="volume" class="vol">
            <is-check-icon-button
              part="mute-button"
              class="ctrl mute"
              appearance="plain"
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
            <button part="settings-button" class="iconbtn speed" type="button"
                    aria-label="Velocidad de reproducción" aria-haspopup="true" aria-expanded="false">
              <is-icon icon="mdi:cog-outline" aria-hidden="true"></is-icon>
            </button>
            <ul class="menu" role="menu" hidden>
              <li class="menu__head" role="presentation">Velocidad</li>
            </ul>
          </div>
          <button part="pip-button" class="iconbtn pip" type="button" aria-label="Picture in picture" hidden>
            <is-icon icon="mdi:picture-in-picture-bottom-right" aria-hidden="true"></is-icon>
          </button>
          <button part="fullscreen-button" class="iconbtn fs" type="button" aria-label="Pantalla completa">
            <is-icon icon="mdi:fullscreen" aria-hidden="true"></is-icon>
          </button>
        </div>
      </div>
    </div>
  `;

  const OBSERVED = ['src', 'poster', 'controls', 'muted', 'loop', 'autoplay', 'playsinline'];
  const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const IDLE_MS = 2600;

  function fmtTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const s = Math.floor(sec % 60);
    const m = Math.floor(sec / 60) % 60;
    const h = Math.floor(sec / 3600);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  class IsVideo extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #video;
    #controls;
    #playBtn;
    #muteBtn;
    #volume;
    #seek;
    #time;
    #slot;
    #wrap;
    #bigPlay;
    #progress;
    #tip;
    #cur;
    #dur;
    #fsBtn;
    #pipBtn;
    #speedBtn;
    #menu;
    #mounted = false;
    #seeking = false;
    #lastVolume = 1;
    #idleTimer = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#video = shadow.querySelector('.video');
      this.#controls = shadow.querySelector('.controls');
      this.#playBtn = shadow.querySelector('.play');
      this.#muteBtn = shadow.querySelector('.mute');
      this.#volume = shadow.querySelector('.volume');
      this.#seek = shadow.querySelector('.seek');
      this.#time = shadow.querySelector('.time');
      this.#slot = shadow.querySelector('slot');
      this.#wrap = shadow.querySelector('.wrap');
      this.#bigPlay = shadow.querySelector('.big-play');
      this.#progress = shadow.querySelector('.progress');
      this.#tip = shadow.querySelector('.tip');
      this.#cur = shadow.querySelector('.cur');
      this.#dur = shadow.querySelector('.dur');
      this.#fsBtn = shadow.querySelector('.fs');
      this.#pipBtn = shadow.querySelector('.pip');
      this.#speedBtn = shadow.querySelector('.speed');
      this.#menu = shadow.querySelector('.menu');

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

      this.#fsBtn.addEventListener('click', () => this.toggleFullscreen());
      this.#pipBtn.addEventListener('click', () => this.togglePictureInPicture());
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

    connectedCallback() {
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

    disconnectedCallback() {
      this.#mounted = false;
      clearTimeout(this.#idleTimer);
      document.removeEventListener('fullscreenchange', this.#syncFsUi);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'controls') this.#syncControlsVisibility();
      else this.#syncAttrs();
      if (name === 'muted') this.#syncVolumeUi();
    }

    get src() { return this.getAttribute('src') ?? ''; }
    set src(v) { setStringAttr(this, 'src', v); }

    get poster() { return this.getAttribute('poster') ?? ''; }
    set poster(v) { setStringAttr(this, 'poster', v); }

    get controls() {
      if (!this.hasAttribute('controls')) return true;
      return this.getAttribute('controls') !== 'false';
    }
    set controls(v) {
      if (v) this.setAttribute('controls', '');
      else this.setAttribute('controls', 'false');
    }

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

    #seekBy(delta) {
      const d = this.#video.duration;
      if (!Number.isFinite(d)) return;
      this.#video.currentTime = Math.min(d, Math.max(0, this.#video.currentTime + delta));
      this.#wake();
    }

    #volumeBy(delta) {
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
      for (const btn of this.#menu.querySelectorAll('button[data-rate]')) {
        btn.setAttribute('aria-checked', String(Number(btn.dataset.rate) === rate));
      }
      // Señal visible de que no va a velocidad normal.
      this.#speedBtn.querySelector('is-icon')
        ?.setAttribute('icon', rate === 1 ? 'mdi:cog-outline' : 'mdi:play-speed');
    }

    #syncPipUi = () => {
      const on = document.pictureInPictureElement === this.#video;
      this.#pipBtn.querySelector('is-icon')?.setAttribute(
        'icon',
        on ? 'mdi:picture-in-picture-top-right' : 'mdi:picture-in-picture-bottom-right',
      );
    };

    #syncFsUi = () => {
      const on = document.fullscreenElement === this;
      this.#fsBtn.querySelector('is-icon')?.setAttribute('icon', on ? 'mdi:fullscreen-exit' : 'mdi:fullscreen');
      this.#fsBtn.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
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
      this.#video.querySelectorAll('[data-is-injected]').forEach((el) => el.remove());
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
