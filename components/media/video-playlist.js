/**
 * <is-video-playlist> — player + lista (estilo playlist / YouTube).
 *
 * Atributos
 *   placement      left | top | right | bottom (default: bottom)
 *   autoplay-next  boolean — al terminar uno, reproduce el siguiente (toggle en UI)
 *   controls       forwarded a cada is-video (si está presente)
 *
 * Métodos: goTo(index), next(), previous(), play(index)
 * Events: is-video-change, is-change
 * Parts: video-playlist, playlist, playlist-item, playlist-thumbnail,
 *        playlist-title, playlist-duration, player-chrome, nav-button, autoplay
 */

import { adoptCss } from '../_shared/adopt-css.js';
import './video.js';
import './icon.js';
import '../actions/check-icon-button.js';

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base video-playlist" class="video-playlist">
      <div class="player">
        <div class="stage">
          <slot></slot>
        </div>
          <div part="player-chrome" class="player-chrome">
          <div class="player-chrome__nav">
            <button type="button" part="nav-button" class="nav-btn first" aria-label="Primero" title="Primero">
              <is-icon icon="mdi:skip-backward" aria-hidden="true"></is-icon>
            </button>
            <button type="button" part="nav-button" class="nav-btn prev" aria-label="Anterior" title="Anterior">
              <is-icon icon="mdi:skip-previous" aria-hidden="true"></is-icon>
            </button>
            <button type="button" part="nav-button" class="nav-btn next" aria-label="Siguiente" title="Siguiente">
              <is-icon icon="mdi:skip-next" aria-hidden="true"></is-icon>
            </button>
            <span class="player-chrome__status" part="status"></span>
          </div>
          <div class="autoplay-chrome" title="Autoplay">
            <span class="autoplay-chrome__text">Autoplay</span>
            <is-check-icon-button
              part="autoplay"
              class="autoplay"
              appearance="plain"
              icon="mdi:playlist-play"
              checked-icon="mdi:playlist-check"
              label="Activar autoplay"
              checked-label="Desactivar autoplay"
            ></is-check-icon-button>
          </div>
        </div>
      </div>
      <div part="playlist" class="playlist">
        <div class="playlist-head">
          <h3 id="playlist-label" class="playlist-heading">Playlist</h3>
        </div>
        <div class="playlist-items" role="listbox" aria-labelledby="playlist-label"></div>
      </div>
    </div>
  `;

  const OBSERVED = ['autoplay-next', 'placement', 'controls'];
  const PLACEMENTS = new Set(['left', 'top', 'right', 'bottom']);
  const posterCache = new WeakMap();

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
    #status;
    #autoplayBtn;
    #btnFirst;
    #btnPrev;
    #btnNext;
    #index = 0;
    #mounted = false;
    #boundEnded = null;
    #metaHandlers = new WeakMap();
    #attrObs = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#root = shadow.querySelector('.video-playlist');
      this.#listEl = shadow.querySelector('.playlist-items');
      this.#slot = shadow.querySelector('slot');
      this.#status = shadow.querySelector('.player-chrome__status');
      this.#autoplayBtn = shadow.querySelector('.autoplay');
      this.#btnFirst = shadow.querySelector('.first');
      this.#btnPrev = shadow.querySelector('.prev');
      this.#btnNext = shadow.querySelector('.next');

      this.#slot.addEventListener('slotchange', () => this.#refresh());
      this.#listEl.addEventListener('click', this.#onListClick);
      this.#listEl.addEventListener('keydown', this.#onListKeydown);
      this.#btnFirst.addEventListener('click', () => this.goTo(0));
      this.#btnPrev.addEventListener('click', () => this.previous());
      this.#btnNext.addEventListener('click', () => this.next());
      this.#autoplayBtn.addEventListener('is-change', (e) => {
        this.autoplayNext = e.detail.checked;
      });
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncPlacement();
      this.#syncAutoplayUi();
      this.#refresh();
    }

    disconnectedCallback() {
      this.#unbindVideos();
      this.#attrObs?.disconnect();
      this.#attrObs = null;
      this.#mounted = false;
    }

    attributeChangedCallback(name) {
      if (!this.#mounted) return;
      if (name === 'placement') this.#syncPlacement();
      if (name === 'controls') this.#forwardControls();
      if (name === 'autoplay-next') this.#syncAutoplayUi();
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

    get controls() { return this.getAttribute('controls'); }
    set controls(v) {
      if (v == null || v === false) this.removeAttribute('controls');
      else this.setAttribute('controls', v === true ? '' : String(v));
    }

    get index() { return this.#index; }

    get videos() {
      return this.#slot.assignedElements({ flatten: true }).filter(
        (el) => el.localName === 'is-video'
      );
    }

    goTo(index) {
      return this.#activate(index, { play: true });
    }

    play(index) {
      return this.goTo(index);
    }

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
      this.setAttribute('placement', this.placement);
    }

    #syncAutoplayUi() {
      const on = this.autoplayNext;
      this.#autoplayBtn.checked = on;
      this.#autoplayBtn.title = on ? 'Autoplay on' : 'Autoplay off';
    }

    #forwardControls() {
      if (!this.hasAttribute('controls')) return;
      const val = this.getAttribute('controls');
      for (const v of this.videos) {
        if (val === 'false' || val === 'none') v.setAttribute('controls', 'false');
        else v.setAttribute('controls', '');
      }
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
      this.#forwardControls();
      this.#bindVideos(list);
      this.#watchAttrs(list);
      this.#applyActive(list, { emit: false });
      this.#rebuildList(list);
      this.#updateStatus(list);
    }

    #bindVideos(list) {
      this.#boundEnded = (e) => {
        if (!this.autoplayNext) return;
        const listNow = this.videos;
        const active = listNow[this.#index];
        if (e.target !== active && e.currentTarget !== active) return;
        // Siguiente clip; al llegar al último se detiene (no vuelve al primero)
        if (this.#index >= listNow.length - 1) return;
        this.next();
      };
      for (const v of list) {
        v.addEventListener('is-ended', this.#boundEnded);
        const onMeta = () => {
          // Precargar un frame para poster si falta
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
          this.#updateStatus(this.videos);
        };
        this.#metaHandlers.set(v, onMeta);
        v.media?.addEventListener('loadedmetadata', onMeta);
        v.media?.addEventListener('loadeddata', onMeta);
        if (v.media?.readyState >= 1) onMeta();
      }
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
        if (this.#mounted) this.#rebuildList(this.videos);
      });
      for (const v of list) {
        this.#attrObs.observe(v, {
          attributes: true,
          attributeFilter: ['title', 'poster', 'duration', 'src'],
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
      this.#updateStatus(list);
      if (!play) return;
      return list[this.#index]?.play?.();
    }

    #applyActive(list, { emit = false, previousIndex = this.#index } = {}) {
      list.forEach((v, i) => {
        const on = i === this.#index;
        // Mantener en layout (no display:none) para que carguen metadata/poster
        v.toggleAttribute('data-active', on);
        v.removeAttribute('hidden');
        v.style.position = 'absolute';
        v.style.inset = '0';
        v.style.width = '100%';
        v.style.height = '100%';
        v.style.opacity = on ? '1' : '0';
        v.style.pointerEvents = on ? 'auto' : 'none';
        v.style.zIndex = on ? '1' : '0';
        if (!on) v.pause?.();
      });
      const many = list.length > 1;
      this.#btnFirst.disabled = !many || this.#index === 0;
      this.#btnPrev.disabled = !many || this.#index === 0;
      this.#btnNext.disabled = !many || this.#index >= list.length - 1;
      if (emit) {
        const video = list[this.#index];
        this.dispatchEvent(new CustomEvent('is-video-change', {
          bubbles: true,
          composed: true,
          detail: { previousIndex, currentIndex: this.#index, video },
        }));
        this.dispatchEvent(new CustomEvent('is-change', {
          bubbles: true,
          composed: true,
          detail: { index: this.#index },
        }));
      }
    }

    #updateStatus(list) {
      const total = list.length || 0;
      const cur = total ? this.#index + 1 : 0;
      this.#status.textContent = total ? `${cur} / ${total}` : '';
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

        if (poster) {
          const img = document.createElement('img');
          img.className = 'playlist-thumbnail';
          img.setAttribute('part', 'playlist-thumbnail');
          img.src = poster;
          img.alt = title;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.addEventListener('error', () => {
            img.replaceWith(this.#makePlaceholder());
          }, { once: true });
          item.appendChild(img);
        } else {
          item.appendChild(this.#makePlaceholder());
        }

        const info = document.createElement('div');
        info.className = 'playlist-item-info';
        const content = document.createElement('div');
        content.className = 'playlist-item-content';

        const titleEl = document.createElement('div');
        titleEl.className = 'playlist-item-title';
        titleEl.setAttribute('part', 'playlist-title');
        titleEl.textContent = title;
        content.appendChild(titleEl);

        if (duration) {
          const durEl = document.createElement('div');
          durEl.className = 'playlist-item-duration';
          durEl.setAttribute('part', 'playlist-duration');
          durEl.textContent = duration;
          content.appendChild(durEl);
        }

        info.appendChild(content);
        item.appendChild(info);
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

  if (!customElements.get('is-video-playlist')) {
    customElements.define('is-video-playlist', IsVideoPlaylist);
  }
  if (typeof window !== 'undefined') {
    window.IsVideoPlaylist = IsVideoPlaylist;
  }
})();
