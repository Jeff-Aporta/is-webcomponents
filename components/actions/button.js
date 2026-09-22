import { ElementBase } from '../_shared/element-base.js';
import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-button> — Web Component (vanilla).
 *
 * Define el custom element `is-button` automáticamente al importarse.
 * Usa Shadow DOM con CSS propio, es form-associated (participa en <form>),
 * y expone parts + custom states para personalización desde fuera.
 *
 * Atributos
 *  variant      brand | neutral | success | warning | danger   (default: neutral)
 *  appearance   filled | outlined | plain                     (default: filled)
 *  hue          number (0-360)  color propio para el highlight cuando está
 *                             [selected] dentro de <is-button-group>. Si no
 *                             se define, el grupo usa su --is-accent.
 *  disabled     boolean
 *  loading      boolean
 *  pill         boolean
 *  with-caret   boolean
 *  href         string   → renderiza como <a>
 *  target       string
 *  rel          string
 *  download     string
 *  type         button | submit | reset                       (default: button)
 *  title        string
 *  name         string   (form data)
 *  value        string   (form data)
 *  form, formaction, formenctype, formmethod,
 *  formnovalidate, formtarget                                (form association)
 *  aria-label, aria-pressed, aria-expanded, aria-haspopup,
 *  aria-current                                              (se reenvían al inner)
 *
 * Slots
 *  default   etiqueta del botón
 *  start     icono / nodo a la izquierda
 *  end       icono / nodo a la derecha
 *
 * CSS Parts:  ::part(button) ::part(label) ::part(start) ::part(end)
 *             ::part(caret) ::part(spinner)
 *
 * Custom States: :state(loading) :state(disabled) :state(link) :state(icon-button)
 *
 * Events nativos (burbujean, composed:true): focus, blur, click
 *
 * Custom events (composed:true, bubbles:true — cruzan Shadow DOM y son
 * consumibles desde React via addEventListener o React 19+ on<EventName>):
 *   is-focus   — emitido al recibir foco (mismo momento que `focus`)
 *   is-blur    — emitido al perder foco
 *   is-click   — emitido al hacer click (mismo momento que `click`)
 *   is-invalid — emitido cuando la validación de formulario falla
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <button part="button" class="btn" type="button">
    <span part="start"   class="btn__prefix"><slot name="start"></slot></span>
    <span part="label"   class="btn__label"><slot></slot></span>
    <span part="end"     class="btn__suffix"><slot name="end"></slot></span>
    <span part="caret"   class="btn__caret" aria-hidden="true">
      <is-icon icon="mdi:chevron-down"></is-icon>
    </span>
    <span part="spinner" class="btn__spinner" aria-hidden="true">
      <is-icon icon="mdi:loading"></is-icon>
    </span>
  </button>
`;

const OBSERVED = [
  'variant', 'appearance', 'hue',
  'disabled', 'loading', 'pill', 'with-caret',
  'href', 'target', 'rel', 'download',
  'type', 'title', 'name', 'value',
  'form', 'formaction', 'formenctype', 'formmethod',
  'formnovalidate', 'formtarget',
];

// El role lo tiene el <button> interno: sin reenviar, un aria-* en el host
// no llega a AT. Solo los que no dependen de IDs del documento externo.
const ARIA_FORWARD = [
  'aria-label', 'aria-pressed', 'aria-expanded', 'aria-haspopup', 'aria-current',
];

class IsButton extends ElementBase {
  static formAssociated = true;
  static TEMPLATE = TEMPLATE;
  static get observedAttributes() { return [...OBSERVED, ...ARIA_FORWARD]; }

  #internals = null;
  #initialAttrs = new Map();
  #btn;
  #wired = false;

  constructor() {
    super();
    this.initShadow({ mode: 'open', delegatesFocus: true });
    adoptCss(this.shadowRoot, import.meta.url);

    this.#btn = this.shadowRoot.querySelector('.btn');

    if ('attachInternals' in this) {
      try { this.#internals = this.attachInternals(); } catch { /* already attached */ }
    }

    for (const a of OBSERVED) {
      if (this.hasAttribute(a)) this.#initialAttrs.set(a, this.getAttribute(a));
    }

    this.shadowRoot.querySelectorAll('slot').forEach((slot) => {
      slot.addEventListener('slotchange', () => this.#updateIconOnly());
    });
  }

  onConnected() {
    this.#syncTag();
    this.#syncAttrs();
    this.#syncDisabled();
    this.#updateIconOnly();
    this.#updateLinkState();
    this.#updateLoadingState();
    this.#syncHue();
    this.#wireEvents();
  }

  onAttributeChanged(name, oldVal, newVal) {
    if (name === 'href') {
      this.#syncTag();
      this.#syncAttrs();
      this.#updateLinkState();
    } else if (name === 'disabled') {
      this.#syncDisabled();
    } else if (name === 'loading') {
      this.#updateLoadingState();
    } else if (name === 'hue') {
      this.#syncHue();
    } else {
      this.#syncAttrs();
    }
  }

  // ---- form-associated callbacks ---------------------------------

  formResetCallback() {
    for (const a of OBSERVED) {
      if (this.#initialAttrs.has(a)) {
        this.setAttribute(a, this.#initialAttrs.get(a));
      } else {
        this.removeAttribute(a);
      }
    }
  }

  formDisabledCallback(disabled) {
    this.#syncDisabled(disabled);
  }

  formStateRestoreCallback(state) {
    if (typeof state === 'string') this.setAttribute('value', state);
  }

  // ---- público ---------------------------------------------------

  /**
   * Hue HSL opcional (0-360). Cuando está presente, el botón expone
   *   --is-button-selected-hue
   * en el :host para que <is-button-group> lo consuma en el highlight
   * del estado [selected]. Si no se define, el grupo usa su --is-accent.
   */
  get hue() {
    const raw = this.getAttribute('hue');
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  set hue(v) {
    if (v == null || v === '') this.removeAttribute('hue');
    else this.setAttribute('hue', String(v));
  }

  setFocus(options) { this.#btn.focus(options); }
  get validity()    { return this.#internals?.validity ?? super.validity; }
  get validationMessage() { return this.#internals?.validationMessage ?? ''; }
  get willValidate()      { return this.#internals?.willValidate ?? false; }
  checkValidity()  { return this.#internals?.checkValidity() ?? true; }
  reportValidity() { return this.#internals?.reportValidity() ?? true; }
  setCustomValidity(msg) { this.#internals?.setValidity({ customError: !!msg }, msg); }

  #boundFocus = (e) => { this.#emit('is-focus', { originalEvent: e }); };
  #boundBlur  = (e) => { this.#emit('is-blur',  { originalEvent: e }); };
  #boundClick = (e) => { this.#emit('is-click', { originalEvent: e }); };

  #wireEvents() {
    if (this.#wired) return;
    this.#wired = true;
    const b = this.#btn;
    b.addEventListener('focus', this.#boundFocus);
    b.addEventListener('blur',  this.#boundBlur);
    b.addEventListener('click', this.#boundClick);
  }

  #emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  // ---- privados --------------------------------------------------

  #syncTag() {
    const wantLink = this.hasAttribute('href');
    const currentTag = this.#btn.tagName.toLowerCase();
    const needTag = wantLink ? 'a' : 'button';
    if (currentTag === needTag) return;
    const fresh = document.createElement(needTag);
    fresh.className = this.#btn.className;
    fresh.setAttribute('part', 'button');
    while (this.#btn.firstChild) fresh.appendChild(this.#btn.firstChild);
    this.#btn.replaceWith(fresh);
    this.#btn = fresh;
  }

  #syncAttrs() {
    const b = this.#btn;
    const isLink = b.tagName.toLowerCase() === 'a';
    if (!isLink) {
      b.setAttribute('type', this.getAttribute('type') || 'button');
    } else {
      b.removeAttribute('type');
    }
    const map = {
      title: 'title',
      href: 'href',
      target: 'target',
      rel: 'rel',
      download: 'download',
      name: 'name',
      value: 'value',
      form: 'form',
      formaction: 'formaction',
      formenctype: 'formenctype',
      formmethod: 'formmethod',
      formnovalidate: 'formnovalidate',
      formtarget: 'formtarget',
    };
    for (const [attr, prop] of Object.entries(map)) {
      const v = this.getAttribute(attr);
      if (v == null) b.removeAttribute(prop);
      else b.setAttribute(prop, v);
    }
    for (const attr of ARIA_FORWARD) {
      const v = this.getAttribute(attr);
      if (v == null) b.removeAttribute(attr);
      else b.setAttribute(attr, v);
    }
  }

  #setState(name, on) {
    const s = this.#internals?.states;
    if (!s) return;
    if (on) s.add(name);
    else s.delete(name);
  }

  #syncDisabled(formDisabled) {
    const disabled = !!formDisabled || this.hasAttribute('disabled');
    this.#btn.toggleAttribute('disabled', disabled);
    this.#btn.setAttribute('aria-disabled', String(disabled));
    this.#setState('disabled', disabled);
    this.toggleAttribute('tabindex', disabled ? -1 : null);
  }

  #updateIconOnly() {
    const slots = this.shadowRoot.querySelectorAll('slot');
    let elems = 0, hasText = false;
    for (const slot of slots) {
      for (const n of slot.assignedNodes({ flatten: true })) {
        if (n.nodeType === 1) elems++;
        else if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
      }
    }
    const isIconOnly = elems === 1 && !hasText;
    this.#setState('icon-button', isIconOnly);
  }

  #updateLinkState() {
    this.#setState('link', this.hasAttribute('href'));
  }

  #updateLoadingState() {
    const loading = this.hasAttribute('loading');
    this.#setState('loading', loading);
    this.toggleAttribute('data-state-loading', loading);
    this.#btn.setAttribute('aria-busy', String(loading));
    this.#syncDisabled(loading ? true : undefined);
  }

  /**
   * Publica el hue en una CSS var del host para que el padre
   * (p.ej. <is-button-group>) pinte el highlight del estado [selected]
   * con el color del botón. Si no hay hue, la var queda sin definir y
   * el consumidor cae a su propio --is-accent.
   */
  #syncHue() {
    const h = this.hue;
    if (h == null) {
      this.style.removeProperty('--is-button-selected-hue');
      this.style.removeProperty('--is-button-selected-color');
    } else {
      const norm = ((h % 360) + 360) % 360;
      this.style.setProperty('--is-button-selected-hue', String(norm));
      this.style.setProperty('--is-button-selected-color', `hsl(${norm} 70% 45%)`);
    }
  }
}

if (!customElements.get('is-button')) {
  customElements.define('is-button', IsButton);
}
if (typeof window !== 'undefined') {
  window.IsButton = IsButton;
}
