/**
 * <is-video-playlist> — player + lista tipo YouTube.
 *
 * Cada clip es un <is-video> dentro del slot default. El componente
 * renderiza un reproductor con cabecera (título + canal) y una barra
 * inferior estilo YouTube con controles + herramientas inyectadas
 * (anterior / siguiente / autoplay) mediante slots.
 *
 * Atributos
 *   placement      left | right | bottom (default: bottom)
 *   autoplay-next  boolean — al terminar uno, reproduce el siguiente
 *   accordion      auto | open | closed (default auto: cerrado en móvil)
 *   channel        caption opcional que se muestra bajo el título
 *
 * Slots
 *   default        is-video (uno por clip)
 *   tools-left     botones / iconos que se muestran a la izquierda del play
 *                  (el playlist inyecta prev/next aquí por defecto)
 *   tools-right    botones / iconos que se muestran a la derecha del vol
 *                  (el playlist inyecta autoplay aquí por defecto)
 *   config         botón / menú opcional en la cabecera YouTube
 *
 * Métodos: goTo(index), next(), previous(), play(index)
 * Eventos: is-video-change, is-change
 *
 * Parts: video-playlist, playlist-head, playlist-toggle, playlist-items,
 *        playlist-item, playlist-title, playlist-duration, channel,
 *        title, header, header-actions, player-toolbar, tools-left,
 *        tools-right
 */

import { adoptCss } from '../_shared/adopt-css.js';
import '../actions/button.js';
import './video.js';
import './icon.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base video-playlist" class="video-playlist">
      <div class="player">
        <div class="stage">
          <slot></slot>
          <header part="header" class="player-header">
            <div class="player-header__text">
              <h3 part="title" class="player-title"></h3>
              <p part="channel" class="player-channel"></p>
            </div>
            <div class="player-header__actions" part="header-actions">
              <slot name="config"></slot>
            </div>
          </header>
          <div class="player-toolbar" part="player-toolbar">
            <slot name="tools-left" part="tools-left" class="tools tools-left"></slot>
            <button type="button" class="vp-tool vp-play" part="play-button" aria-label="Reproducir / pausar">
              <is-icon icon="mdi:play" aria-hidden="true"></is-icon>
            </button>
            <input type="range" class="vp-seek" part="seek" min="0" max="1000" value="0" aria-label="Posición" />
            <span class="vp-time" part="time">0:00 / 0:00</span>
            <button type="button" class="vp-tool vp-mute" part="mute-button" aria-label="Silenciar / activar sonido">
              <is-icon icon="mdi:volume-high" aria-hidden="true"></is-icon>
            </button>
            <input type="range" class="vp-volume" part="volume-slider" min="0" max="100" value="100" aria-label="Volumen" />
            <slot name="tools-right" part="tools-right" class="tools tools-right"></slot>
          </div>
        </div>
      </div>
      <section part="playlist" class="playlist" aria-label="Lista de vídeos">
        <header class="playlist-head">
          <h3 id="playlist-label" class="playlist-heading">
            Playlist <span part="status" class="playlist-count"></span>
          </h3>
          <button
            type="button"
            part="playlist-toggle"
            class="playlist-toggle"
            aria-controls="playlist-items"
            aria-expanded="true"
            title="Mostrar / ocultar lista"
          >
            <is-icon icon="mdi:chevron-up" aria-hidden="true"></is-icon>
          </button>
        </header>
        <div
          id="playlist-items"
          part="playlist-items"
          class="playlist-items"
          role="listbox"
          aria-labelledby="playlist-label"
        ></div>
      </section>
    </div>
  `;

  const OBSERVED = ['autoplay-next', 'placement', 'channel', 'accordion'];
  // `top` se eliminó: ocupaba la zona superior con la lista delante del
  // reproductor y no resultaba usable. Si alguien lo manda, lo ignoramos.
  const PLACEMENTS = new Set(['left', 'right', 'bottom']);
  const ACCORDIONS = new Set(['auto', 'open', 'closed']);
  const posterCache = new WeakMap();

  /** Botón por defecto de la barra de herramientas (light DOM, proyectado). */
  function makeTool(cls, slot, label, html, onClick) {
    const btn = document.createElement('is-button');
    btn.className = `vp-default ${cls}`;
    btn.setAttribute('slot', slot);
    btn.setAttribute('variant', 'text');
    btn.setAttribute('color', 'neutral');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = html;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function fmtTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '';
    const s = Math.floor(sec % 60);
    const m = Math.floor(sec / 60) % 60;
    const h = Math.floor(sec / 3600);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function videoTitle(v, i) {
    const t = (v.getAttribute('title') || v.title || '').trim();
    return t || `Video ${i + 1}`;
  }

  function videoChannel(v) {
    return (v.getAttribute('channel') || v.getAttribute('data-channel') || '').trim();
  }

  function videoPosterAttr(v) {
    return (v.getAttribute('poster') || '').trim();
  }

  function capturePoster(v) {
    if (posterCache.has(v)) return posterCache.get(v);
    const media = v.media;
    if (!media || media.readyState < 2 || !media.videoWidth) return '';
    try {
      const c = document.createElement('canvas');
      const w = Math.min(480, media.videoWidth);
      const h = Math.round((w / media.videoWidth) * media.videoHeight);
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(media, 0, 0, w, h);
      const url = c.toDataURL('image/jpeg', 0.72);
      posterCache.set(v, url);
      return url;
    } catch {
      return '';
    }
  }

  function videoPoster(v) {
    return videoPosterAttr(v) || capturePoster(v);
  }

  function videoDuration(v) {
    const media = v.media;
    if (media && Number.isFinite(media.duration) && media.duration > 0) {
      return fmtTime(media.duration);
    }
    const attr = v.getAttribute('duration');
    return attr ? attr.trim() : '';
  }

  class IsVideoPlaylist extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #root;
    #listEl;
    #slot;
    #titleEl;
    #channelEl;
    #countEl;
    #toggleBtn;
    #playBtn;
    #seekEl;
    #timeEl;
    #muteBtn;
    #volumeEl;
    #playIcon;
    #muteIcon;
    #accordionOpen = true;
    #index = 0;
    #mounted = false;
    #boundEnded = null;
    #metaHandlers = new WeakMap();
    #attrObs = null;
    #mediaObs = null;
    #seeking = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#root = shadow.querySelector('.video-playlist');
      this.#listEl = shadow.querySelector('.playlist-items');
      this.#slot = shadow.querySelector('slot:not([name])');
      this.#titleEl = shadow.querySelector('.player-title');
      this.#channelEl = shadow.querySelector('.player-channel');
      this.#countEl = shadow.querySelector('.playlist-count');
      this.#toggleBtn = shadow.querySelector('.playlist-toggle');
      this.#playBtn = shadow.querySelector('.vp-play');
      this.#seekEl = shadow.querySelector('.vp-seek');
      this.#timeEl = shadow.querySelector('.vp-time');
      this.#muteBtn = shadow.querySelector('.vp-mute');
      this.#volumeEl = shadow.querySelector('.vp-volume');
      this.#playIcon = this.#playBtn.querySelector('is-icon');
      this.#muteIcon = this.#muteBtn.querySelector('is-icon');

      this.#slot.addEventListener('slotchange', () => this.#refresh());
      this.#listEl.addEventListener('click', this.#onListClick);
      this.#listEl.addEventListener('keydown', this.#onListKeydown);
      this.#toggleBtn.addEventListener('click', () => this.#toggleAccordion());

      // Controles nativos del player-toolbar.
      this.#playBtn.addEventListener('click', () => this.#togglePlay());
      this.#muteBtn.addEventListener('click', () => this.#toggleMute());
      this.#volumeEl.addEventListener('input', () => this.#setVolume(this.#volumeEl.value));
      this.#seekEl.addEventListener('pointerdown', () => { this.#seeking = true; });
      this.#seekEl.addEventListener('pointerup', () => { this.#seeking = false; this.#applySeek(); });
      this.#seekEl.addEventListener('change', () => { this.#seeking = false; this.#applySeek(); });
      this.#seekEl.addEventListener('input', () => this.#previewSeek());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncPlacement();
      this.#syncAccordion();
      this.#buildDefaultTools();
      this.#syncAutoplayUi();
      this.#syncChannel();
      this.#refresh();
    }

    disconnectedCallback() {
      this.#unbindVideos();
      this.#attrObs?.disconnect();
      this.#attrObs = null;
      if (this.#mediaObs) {
        this.#mediaObs.mq.removeEventListener('change', this.#mediaObs.handler);
        this.#mediaObs = null;
      }
      this.#mounted = false;
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'placement') this.#syncPlacement();
      if (name === 'autoplay-next') this.#syncAutoplayUi();
      if (name === 'accordion') this.#syncAccordion();
      if (name === 'channel') this.#syncChannel();
    }

    get autoplayNext() { return this.hasAttribute('autoplay-next'); }
    set autoplayNext(v) { this.toggleAttribute('autoplay-next', !!v); }

    get placement() {
      const v = (this.getAttribute('placement') || 'bottom').toLowerCase();
      return PLACEMENTS.has(v) ? v : 'bottom';
    }
    set placement(v) {
      const next = String(v || 'bottom').toLowerCase();
      this.setAttribute('placement', PLACEMENTS.has(next) ? next : 'bottom');
    }

    get channel() { return this.getAttribute('channel') || ''; }
    set channel(v) {
      if (v == null || v === '') this.removeAttribute('channel');
      else this.setAttribute('channel', String(v));
    }

    get accordion() {
      const v = (this.getAttribute('accordion') || 'auto').toLowerCase();
      return ACCORDIONS.has(v) ? v : 'auto';
    }
    set accordion(v) {
      const next = String(v || 'auto').toLowerCase();
      this.setAttribute('accordion', ACCORDIONS.has(next) ? next : 'auto');
    }

    get index() { return this.#index; }

    get videos() {
      return this.#slot.assignedElements({ flatten: true }).filter(
        (el) => el.localName === 'is-video'
      );
    }

    get #active() {
      const list = this.videos;
      return list[this.#index];
    }

    goTo(index) { return this.#activate(index, { play: true }); }
    play(index) { return this.goTo(index); }

    next() {
      const list = this.videos;
      if (!list.length || this.#index >= list.length - 1) return;
      return this.goTo(this.#index + 1);
    }

    previous() {
      const list = this.videos;
      if (!list.length || this.#index <= 0) return;
      return this.goTo(this.#index - 1);
    }

    #syncPlacement() {
      this.#root.dataset.placement = this.placement;
      if (this.getAttribute('placement') !== this.placement) {
        this.setAttribute('placement', this.placement);
      }
    }

    #syncChannel() {
      const text = this.channel;
      this.#channelEl.textContent = text;
      this.#channelEl.hidden = !text;
    }

    #syncAccordion() {
      const mode = this.accordion;
      if (mode === 'open') {
        this.#setAccordion(true);
        return;
      }
      if (mode === 'closed') {
        this.#setAccordion(false);
        return;
      }
      const mq = window.matchMedia('(max-width: 720px)');
      const open = !mq.matches;
      this.#setAccordion(open);
      if (!this.#mediaObs) {
        const handler = () => this.#syncAccordion();
        mq.addEventListener('change', handler);
        this.#mediaObs = { mq, handler };
      }
    }

    #setAccordion(open) {
      this.#accordionOpen = open;
      this.#root.dataset.accordion = open ? 'open' : 'closed';
      this.#toggleBtn.setAttribute('aria-expanded', String(open));
      const icon = this.#toggleBtn.querySelector('is-icon');
      if (icon) icon.setAttribute('icon', open ? 'mdi:chevron-up' : 'mdi:chevron-down');
    }

    #toggleAccordion() {
      if (this.accordion === 'auto') this.setAttribute('accordion', this.#accordionOpen ? 'closed' : 'open');
      else this.#setAccordion(!this.#accordionOpen);
    }

    #syncAutoplayUi() {
      // La UI de autoplay vive en tools-right; si el usuario provee un botón
      // custom, sincronizamos su `aria-pressed`. Si no, el playlist inyecta
      // su propio botón (#buildDefaultTools).
      for (const node of this.#toolRightChildren()) {
        if (node.tagName === 'IS-BUTTON' || node.tagName === 'BUTTON') node.setAttribute('aria-pressed', String(this.autoplayNext));
      }
    }

    /** Construye las herramientas por defecto (first / prev / next / autoplay)
     *  si el usuario no las ha inyectado. Se activan salvo que el atributo
     *  `no-default-tools` esté presente. */
    #buildDefaultTools() {
      // Si el usuario desactivó los defaults, no hacemos nada.
      if (this.hasAttribute('no-default-tools')) return;
      // Solo añadimos los defaults que falten.
      if (this.#toolLeftChildren().length === 0) {
        this.appendChild(makeTool('vp-first', 'tools-left', 'Primero',
          '<is-icon icon="mdi:skip-backward" aria-hidden="true"></is-icon>',
          () => this.goTo(0)));
        this.appendChild(makeTool('vp-prev', 'tools-left', 'Anterior',
          '<is-icon icon="mdi:skip-previous" aria-hidden="true"></is-icon>',
          () => this.previous()));
        this.appendChild(makeTool('vp-next', 'tools-left', 'Siguiente',
          '<is-icon icon="mdi:skip-next" aria-hidden="true"></is-icon>',
          () => this.next()));
      }
      if (this.#toolRightChildren().length === 0) {
        const autoplay = makeTool('vp-autoplay', 'tools-right', 'Autoplay', `
          <is-icon icon="mdi:playlist-play" aria-hidden="true"></is-icon>
          <span class="vp-autoplay__label">Autoplay</span>
        `, () => { this.autoplayNext = !this.autoplayNext; });
        autoplay.setAttribute('aria-pressed', String(this.autoplayNext));
        this.appendChild(autoplay);
      }
    }

    /** Lista de nodos proyectados en slot="tools-right" (light DOM). */
    #toolRightChildren() {
      const slot = this.shadowRoot.querySelector('slot[name="tools-right"]');
      return slot ? slot.assignedElements({ flatten: true }) : [];
    }

    /** Lista de nodos proyectados en slot="tools-left" (light DOM). */
    #toolLeftChildren() {
      const slot = this.shadowRoot.querySelector('slot[name="tools-left"]');
      return slot ? slot.assignedElements({ flatten: true }) : [];
    }

    #onListClick = (e) => {
      const item = e.target.closest('[data-index]');
      if (!item || !this.#listEl.contains(item)) return;
      const i = Number(item.dataset.index);
      if (Number.isFinite(i)) this.goTo(i);
    };

    #onListKeydown = (e) => {
      const items = [...this.#listEl.querySelectorAll('[data-index]')];
      if (!items.length) return;
      const current = items.findIndex((el) => el.classList.contains('active'));
      let next = current;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (current >= items.length - 1) return;
        next = current + 1;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (current <= 0) return;
        next = current - 1;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (current >= 0) this.goTo(current);
        return;
      } else return;
      e.preventDefault();
      items[next]?.focus();
      this.goTo(next);
    };

    #refresh() {
      this.#unbindVideos();
      const list = this.videos;
      if (this.#index >= list.length) this.#index = Math.max(0, list.length - 1);
      this.#bindVideos(list);
      this.#watchAttrs(list);
      this.#applyActive(list, { emit: false });
      this.#rebuildList(list);
      this.#updateCount(list);
      this.#updateHeader(list);
      this.#syncAutoplayUi();
      this.#syncActiveMediaState();
    }

    #bindVideos(list) {
      this.#boundEnded = (e) => {
        if (!this.autoplayNext) return;
        const listNow = this.videos;
        const active = listNow[this.#index];
        if (e.target !== active && e.currentTarget !== active) return;
        if (this.#index >= listNow.length - 1) return;
        this.next();
      };
      for (const v of list) {
        v.addEventListener('is-ended', this.#boundEnded);
        const onMeta = () => {
          try {
            const media = v.media;
            if (media && !videoPosterAttr(v) && media.readyState >= 2) {
              const t = media.currentTime;
              if (t < 0.05 && media.duration > 0.2) {
                media.currentTime = Math.min(0.25, media.duration * 0.1);
                media.addEventListener('seeked', () => {
                  capturePoster(v);
                  if (media !== list[this.#index]?.media) media.currentTime = 0;
                  this.#rebuildList(this.videos);
                }, { once: true });
              } else {
                capturePoster(v);
              }
            }
          } catch { /* noop */ }
          this.#rebuildList(this.videos);
          this.#updateCount(this.videos);
          this.#updateHeader(this.videos);
          this.#syncActiveMediaState();
        };
        this.#metaHandlers.set(v, onMeta);
        v.media?.addEventListener('loadedmetadata', onMeta);
        v.media?.addEventListener('loadeddata', onMeta);
        if (v.media?.readyState >= 1) onMeta();
        // Reenviamos eventos nativos del <video> al playlist para que el
        // player-toolbar refleje el estado.
        const onPlay = () => this.#syncPlayUi();
        const onPause = () => this.#syncPlayUi();
        const onTime = () => this.#syncTimeUi();
        const onVol = () => this.#syncVolumeUi();
        v.media?.addEventListener('play', onPlay);
        v.media?.addEventListener('pause', onPause);
        v.media?.addEventListener('timeupdate', onTime);
        v.media?.addEventListener('loadedmetadata', onTime);
        v.media?.addEventListener('volumechange', onVol);
        v.addEventListener('is-play', onPlay);
        v.addEventListener('is-pause', onPlay);
      }
      this.#syncActiveMediaState();
    }

    #unbindVideos() {
      if (this.#boundEnded) {
        for (const v of this.videos) {
          v.removeEventListener('is-ended', this.#boundEnded);
          const onMeta = this.#metaHandlers.get(v);
          if (onMeta) {
            v.media?.removeEventListener('loadedmetadata', onMeta);
            v.media?.removeEventListener('loadeddata', onMeta);
          }
        }
        this.#boundEnded = null;
      }
      this.#metaHandlers = new WeakMap();
    }

    #watchAttrs(list) {
      this.#attrObs?.disconnect();
      this.#attrObs = new MutationObserver(() => {
        if (this.#mounted) {
          this.#rebuildList(this.videos);
          this.#updateHeader(this.videos);
        }
      });
      for (const v of list) {
        this.#attrObs.observe(v, {
          attributes: true,
          attributeFilter: ['title', 'channel', 'poster', 'duration', 'src'],
        });
      }
    }

    #activate(index, { play = false } = {}) {
      const list = this.videos;
      if (!list.length) return;
      const previousIndex = this.#index;
      const i = Math.max(0, Math.min(list.length - 1, Number(index) || 0));
      const changed = i !== this.#index;
      this.#index = i;
      this.#applyActive(list, { emit: changed, previousIndex });
      this.#rebuildList(list);
      this.#updateCount(list);
      this.#updateHeader(list);
      this.#syncActiveMediaState();
      if (!play) return;
      return list[this.#index]?.play?.();
    }

    #applyActive(list, { emit = false, previousIndex = this.#index } = {}) {
      list.forEach((v, i) => {
        const on = i === this.#index;
        v.toggleAttribute('data-active', on);
        v.removeAttribute('hidden');
        v.style.position = 'absolute';
        v.style.inset = '0';
        v.style.width = '100%';
        v.style.height = '100%';
        v.style.opacity = on ? '1' : '0';
        v.style.pointerEvents = on ? 'auto' : 'none';
        v.style.zIndex = on ? '1' : '0';
        // Desactivamos la barra de controles nativa del <is-video>; el
        // playlist muestra su propia barra (player-toolbar) encima.
        v.setAttribute('without-controls', '');
        if (!on) v.pause?.();
      });
      if (emit) {
        const video = list[this.#index];
        emit(this, 'is-video-change', { previousIndex, currentIndex: this.#index, video });
        emit(this, 'is-change', { index: this.#index });
      }
    }

    /** Sincroniza los controles del player-toolbar con el media del is-video activo. */
    #syncActiveMediaState() {
      const active = this.#active;
      const media = active?.media;
      if (!media) {
        this.#playIcon?.setAttribute('icon', 'mdi:play');
        this.#muteIcon?.setAttribute('icon', 'mdi:volume-high');
        this.#timeEl.textContent = '0:00 / 0:00';
        this.#seekEl.value = '0';
        return;
      }
      this.#syncPlayUi();
      this.#syncVolumeUi();
      this.#syncTimeUi();
    }

    #syncPlayUi = () => {
      const media = this.#active?.media;
      if (!media || !this.#playIcon) return;
      this.#playIcon.setAttribute('icon', media.paused ? 'mdi:play' : 'mdi:pause');
    };

    #syncVolumeUi = () => {
      const media = this.#active?.media;
      if (!media || !this.#muteIcon || !this.#volumeEl) return;
      const muted = media.muted || media.volume === 0;
      this.#muteIcon.setAttribute('icon', muted
        ? 'mdi:volume-off'
        : (media.volume < 0.35 ? 'mdi:volume-low' : media.volume < 0.7 ? 'mdi:volume-medium' : 'mdi:volume-high')
      );
      this.#volumeEl.value = String(Math.round((muted ? 0 : media.volume) * 100));
    };

    #syncTimeUi = () => {
      const media = this.#active?.media;
      if (!media) return;
      const d = media.duration || 0;
      const t = media.currentTime || 0;
      this.#timeEl.textContent = `${fmtTime(t)} / ${fmtTime(d)}`;
      if (!this.#seeking && d > 0) {
        this.#seekEl.value = String(Math.round((t / d) * 1000));
      }
    };

    #previewSeek() {
      const media = this.#active?.media;
      if (!media?.duration) return;
      const t = (Number(this.#seekEl.value) / 1000) * media.duration;
      this.#timeEl.textContent = `${fmtTime(t)} / ${fmtTime(media.duration)}`;
    }

    #applySeek() {
      const media = this.#active?.media;
      if (!media?.duration) return;
      media.currentTime = (Number(this.#seekEl.value) / 1000) * media.duration;
    }

    #togglePlay() {
      const media = this.#active?.media;
      if (!media) return;
      if (media.paused) this.#active.play?.();
      else this.#active.pause?.();
    }

    #toggleMute() {
      const media = this.#active?.media;
      if (!media) return;
      media.muted = !media.muted;
    }

    #setVolume(pct) {
      const media = this.#active?.media;
      if (!media) return;
      const v = Number(pct) / 100;
      media.volume = v;
      media.muted = v === 0;
    }

    #updateCount(list) {
      const total = list.length || 0;
      const cur = total ? this.#index + 1 : 0;
      this.#countEl.textContent = total ? `${cur} / ${total}` : '';
    }

    #updateHeader(list) {
      const v = list[this.#index];
      this.#titleEl.textContent = v ? videoTitle(v, this.#index) : '';
      const channel = (this.channel || (v ? videoChannel(v) : '') || '').trim();
      this.#channelEl.textContent = channel;
      this.#channelEl.hidden = !channel;
    }

    #rebuildList(list) {
      const frag = document.createDocumentFragment();
      list.forEach((v, i) => {
        const title = videoTitle(v, i);
        const poster = videoPoster(v);
        const duration = videoDuration(v);
        const active = i === this.#index;

        const item = document.createElement('div');
        item.setAttribute('part', 'playlist-item');
        item.className = `playlist-item${active ? ' active' : ''}`;
        item.dataset.index = String(i);
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', active ? '0' : '-1');
        item.setAttribute('aria-selected', String(active));
        item.setAttribute('aria-label', active ? `${title}, currently playing` : title);

        // Columna de índice: número, y ▶ en el que suena (patrón YouTube).
        const idx = document.createElement('span');
        idx.className = 'playlist-item-index';
        idx.setAttribute('aria-hidden', 'true');
        if (active) {
          const ico = document.createElement('is-icon');
          ico.setAttribute('icon', 'mdi:play');
          idx.appendChild(ico);
        } else {
          idx.textContent = String(i + 1);
        }
        item.appendChild(idx);

        // La miniatura lleva la duración encima, como en YouTube.
        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'playlist-item-thumb';
        if (poster) {
          const img = document.createElement('img');
          img.className = 'playlist-thumbnail';
          img.setAttribute('part', 'playlist-thumbnail');
          img.src = poster;
          img.alt = '';
          img.loading = 'lazy';
          img.decoding = 'async';
          img.addEventListener('error', () => {
            img.replaceWith(this.#makePlaceholder());
          }, { once: true });
          thumbWrap.appendChild(img);
        } else {
          thumbWrap.appendChild(this.#makePlaceholder());
        }
        if (duration) {
          const durEl = document.createElement('span');
          durEl.className = 'playlist-item-duration';
          durEl.setAttribute('part', 'playlist-duration');
          durEl.textContent = duration;
          thumbWrap.appendChild(durEl);
        }
        item.appendChild(thumbWrap);

        const content = document.createElement('div');
        content.className = 'playlist-item-content';

        const titleEl = document.createElement('div');
        titleEl.className = 'playlist-item-title';
        titleEl.setAttribute('part', 'playlist-title');
        titleEl.textContent = title;
        content.appendChild(titleEl);

        const channelEl = document.createElement('div');
        channelEl.className = 'playlist-item-channel';
        const ch = videoChannel(v);
        if (ch) channelEl.textContent = ch;
        content.appendChild(channelEl);

        if (active) {
          const now = document.createElement('div');
          now.className = 'playlist-item-now';
          now.textContent = 'Reproduciendo';
          content.appendChild(now);
        }

        item.appendChild(content);
        frag.appendChild(item);
      });
      this.#listEl.replaceChildren(frag);
    }

    #makePlaceholder() {
      const ph = document.createElement('div');
      ph.className = 'playlist-thumbnail playlist-thumbnail-placeholder';
      ph.setAttribute('part', 'playlist-thumbnail');
      ph.setAttribute('aria-hidden', 'true');
      const ico = document.createElement('is-icon');
      ico.setAttribute('icon', 'mdi:play-circle-outline');
      ph.appendChild(ico);
      return ph;
    }
  }

  defineElement('is-video-playlist', IsVideoPlaylist, 'IsVideoPlaylist');
})();