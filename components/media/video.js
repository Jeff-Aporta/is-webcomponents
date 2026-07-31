import { adoptCss } from '../_shared/adopt-css.js';
import '../actions/check-icon-button.js';

/**
 * <is-video> — Web Component (vanilla).
 *
 * Reproductor de vídeo con controles propios.
 *
 * Atributos
 *   src, poster
 *   controls     boolean (default true)
 *   muted, loop, autoplay, playsinline  boolean
 *
 * Slots: default — tracks / sources
 *
 * Métodos: play(), pause()
 *
 * Eventos (bubbles, composed): is-play, is-pause, is-ended
 * También reenvía play/pause/ended nativos (bubbles, composed)
 *
 * CSS Parts: ::part(video) ::part(controls) ::part(play-button)
 *            ::part(mute-button) ::part(volume) ::part(volume-slider)
 *            ::part(time) ::part(seek)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="wrap" part="base">
      <video part="video" class="video" playsinline></video>
      <slot></slot>
      <div part="controls" class="controls" hidden>
        <is-check-icon-button
          part="play-button"
          class="ctrl play"
          appearance="plain"
          icon="mdi:play"
          checked-icon="mdi:pause"
          label="Reproducir"
          checked-label="Pausar"
        ></is-check-icon-button>
        <input part="seek" class="seek" type="range" min="0" max="1000" value="0" aria-label="Posición" />
        <span part="time" class="time">0:00 / 0:00</span>
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
      </div>
    </div>
  `;

  const OBSERVED = ['src', 'poster', 'controls', 'muted', 'loop', 'autoplay', 'playsinline'];

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
    #mounted = false;
    #seeking = false;
    #lastVolume = 1;

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
        const t = (Number(this.#seek.value) / 1000) * this.#video.duration;
        this.#time.textContent = `${fmtTime(t)} / ${fmtTime(this.#video.duration)}`;
      });

      this.#video.addEventListener('play', this.#onPlay);
      this.#video.addEventListener('pause', this.#onPause);
      this.#video.addEventListener('ended', this.#onEnded);
      this.#video.addEventListener('timeupdate', this.#onTime);
      this.#video.addEventListener('loadedmetadata', this.#onTime);
      this.#video.addEventListener('volumechange', this.#syncVolumeUi);

      this.#slot.addEventListener('slotchange', () => this.#distributeSlot());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncAttrs();
      this.#syncControlsVisibility();
      this.#syncPlayUi();
      this.#syncVolumeUi();
      this.#distributeSlot();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'controls') this.#syncControlsVisibility();
      else this.#syncAttrs();
      if (name === 'muted') this.#syncVolumeUi();
    }

    get src() { return this.getAttribute('src') ?? ''; }
    set src(v) { v == null || v === '' ? this.removeAttribute('src') : this.setAttribute('src', v); }

    get poster() { return this.getAttribute('poster') ?? ''; }
    set poster(v) { v == null || v === '' ? this.removeAttribute('poster') : this.setAttribute('poster', v); }

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
      this.#controls.hidden = !this.controls;
    }

    #syncPlayUi() {
      this.#playBtn.checked = !this.#video.paused;
    }

    #syncVolumeUi = () => {
      const muted = this.#video.muted || this.#video.volume === 0;
      this.#muteBtn.checked = muted;
      this.toggleAttribute('muted', this.#video.muted);
      const level = muted ? 0 : this.#video.volume;
      this.#volume.value = String(Math.round(level * 100));
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
      this.dispatchEvent(new Event('play', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('is-play', { bubbles: true, composed: true }));
    };

    #onPause = () => {
      this.#playBtn.checked = false;
      this.dispatchEvent(new Event('pause', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('is-pause', { bubbles: true, composed: true }));
    };

    #onEnded = () => {
      this.dispatchEvent(new Event('ended', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('is-ended', { bubbles: true, composed: true }));
    };

    #onTime = () => {
      const d = this.#video.duration || 0;
      const t = this.#video.currentTime || 0;
      this.#time.textContent = `${fmtTime(t)} / ${fmtTime(d)}`;
      if (!this.#seeking && d > 0) {
        this.#seek.value = String(Math.round((t / d) * 1000));
      }
    };
  }

  if (!customElements.get('is-video')) {
    customElements.define('is-video', IsVideo);
  }
  if (typeof window !== 'undefined') {
    window.IsVideo = IsVideo;
  }
})();
