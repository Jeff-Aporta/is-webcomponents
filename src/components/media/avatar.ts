import { adoptCss, defineElement, emit } from '../../core/element.js';
import './icon.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-avatar> — Web Component (vanilla).
 *
 * Atributos
 *   image     string — URL de imagen
 *   initials  string — iniciales si no hay imagen (máx. 2)
 *   label     string — aria-label del avatar
 *   loading   eager | lazy (default eager)
 *   shape     circle | square | rounded (default circle)
 *
 * Slots
 *   icon      fallback cuando no hay image ni initials (default mdi:account)
 *
 * Eventos
 *   is-error  — cuando la imagen falla al cargar (bubbles, composed)
 *
 * CSS Parts: ::part(image) ::part(initials) ::part(icon)
 * Escala con font-size del contexto (caja = 1em × 1em).
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span class="avatar" part="avatar">
      <img class="image" part="image" alt="" hidden />
      <span class="initials" part="initials" hidden></span>
      <span class="icon" part="icon" hidden>
        <slot name="icon">
          <is-icon icon="mdi:account" aria-hidden="true"></is-icon>
        </slot>
      </span>
    </span>
  `;

  const OBSERVED = ['image', 'initials', 'label', 'loading', 'shape'];
  const VALID_SHAPE = ['circle', 'square', 'rounded'];
  const VALID_LOADING = ['eager', 'lazy'];

  class IsAvatar extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #img!: HTMLElement;
    #initials!: HTMLElement;
    #icon!: HTMLElement;
    #imgFailed = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#img = shadow.querySelector<HTMLElement>('.image')!;
      this.#initials = shadow.querySelector<HTMLElement>('.initials')!;
      this.#icon = shadow.querySelector<HTMLElement>('.icon')!;
      this.#img.addEventListener('error', this.#onImgError);
      shadow.querySelector<HTMLSlotElement>('slot[name="icon"]').addEventListener('slotchange', () => this.#syncView());
    }

    onConnected() {
      if (!this.hasAttribute('shape')) this.setAttribute('shape', 'circle');
      if (!this.hasAttribute('loading')) this.setAttribute('loading', 'eager');
      this.#imgFailed = false;
      this.#syncView();
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'image') this.#imgFailed = false;
      this.#syncView();
    }

    get image() { return this.getAttribute('image') ?? ''; }
    set image(v) { setStringAttr(this, 'image', v); }

    get initials() { return this.getAttribute('initials') ?? ''; }
    set initials(v) { setStringAttr(this, 'initials', v); }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { setStringAttr(this, 'label', v); }

    get loading() {
      const v = this.getAttribute('loading');
      return VALID_LOADING.includes(v) ? v : 'eager';
    }
    set loading(v) {
      if (v == null || v === '') this.removeAttribute('loading');
      else if (VALID_LOADING.includes(v)) this.setAttribute('loading', v);
    }

    get shape() {
      const v = this.getAttribute('shape');
      return VALID_SHAPE.includes(v) ? v : 'circle';
    }
    set shape(v) {
      if (v == null || v === '') this.removeAttribute('shape');
      else if (VALID_SHAPE.includes(v)) this.setAttribute('shape', v);
    }

    #onImgError = () => {
      if (!this.#img.getAttribute('src')) return;
      this.#imgFailed = true;
      emit(this, 'is-error');
      this.#syncView();
    };

    #clearImage() {
      this.#img.removeAttribute('src');
      this.#img.alt = '';
      this.#img.hidden = true;
    }

    #syncView() {
      const image = this.image.trim();
      const initials = this.initials.trim();
      const label = this.label.trim();

      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', label || initials || 'Avatar');
      this.dataset.shape = this.shape;

      const showImage = Boolean(image) && !this.#imgFailed;
      this.#initials.hidden = true;
      this.#icon.hidden = true;

      if (showImage) {
        this.#img.hidden = false;
        this.#img.loading = this.loading;
        this.#img.alt = label || initials || '';
        if (this.#img.getAttribute('src') !== image) this.#img.src = image;
      } else if (initials) {
        this.#clearImage();
        this.#initials.hidden = false;
        this.#initials.textContent = initials.slice(0, 2).toUpperCase();
      } else {
        this.#clearImage();
        this.#icon.hidden = false;
      }
    }
  }

  defineElement('is-avatar', IsAvatar, 'IsAvatar');
})();
