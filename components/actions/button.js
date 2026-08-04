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
 *  color      brand | neutral | success | warning | danger | info | error   (default: brand)
 *  variant   filled | outlined | plain | ghost | soft | text  (default: filled)
 *  shape        round | rect | pill                          (default: round)
 *                             `round` = radio del tema, `rect` = esquinas vivas,
 *                             `pill` = cápsula (equivalente al booleano `pill`).
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
 *
 * Mapping para React:
 *   onClick       → click  (nativo, React 17+)
 *   onFocus       → focus  (nativo, React 17+)
 *   onBlur        → blur   (nativo, React 17+)
 *   onIsFocus     → is-focus   (React 19+  |  ref.addEventListener('is-focus', fn))
 *   onIsBlur      → is-blur
 *   onIsClick     → is-click
 *   onIsInvalid   → is-invalid
 *
 * El host expone los custom states :state(loading|disabled|link|icon-button)
 * (y como fallback los atributos data-state-* equivalentes para entornos sin
 * soporte de ElementInternals.states).
 *
 * CSS variables del componente (todas con fallback, override-friendly):
 *  --is-color-brand-{50..950}
 *  --is-color-neutral-{50..950}
 *  --is-color-success-{50..950}
 *  --is-color-warning-{50..950}
 *  --is-color-danger-{50..950}
 *  --is-button-font-family, --is-button-font-weight
 *  --is-button-border-radius, --is-button-border-width
 *  --is-button-transition-duration
 */

(() => {
  // --- 1. Template (clonado por instancia) -------------------------------

  const TEMPLATE = document.createElement("template");
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

  // --- 2. Custom element ----------------------------------------------

  const VALID_SHAPE = ["round", "rect", "pill"];

  const OBSERVED = [
    "color", "variant", "shape", "hue",
    "disabled", "loading", "pill", "with-caret",
    "href", "target", "rel", "download",
    "type", "title", "name", "value",
    "form", "formaction", "formenctype", "formmethod",
    "formnovalidate", "formtarget"
  ];

  // El role lo tiene el <button> interno: sin reenviar, un aria-* en el host
  // no llega a AT. Solo los que no dependen de IDs del documento externo.
  const ARIA_FORWARD = [
    "aria-label", "aria-pressed", "aria-expanded", "aria-haspopup", "aria-current"
  ];

  class IsButton extends HTMLElement {
    static formAssociated = true;
    static get observedAttributes() { return [...OBSERVED, ...ARIA_FORWARD]; }

    #internals = null;
    #initialAttrs = new Map();
    #btn;          // inner <button> or <a>
    #rootEl;       // shadow root first child wrapper
    #mounted = false;
    #wired = false; // idem-potente: re-registrar listeners de eventos

    constructor() {
      super();

      const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#btn = shadow.querySelector(".btn");
      this.#rootEl = shadow.querySelector(".btn");

      // form-associated (en navegadores sin attachInternals, no rompe)
      if ("attachInternals" in this) {
        try { this.#internals = this.attachInternals(); } catch { /* already attached */ }
      }

      // capturar atributos iniciales para formResetCallback
      for (const a of OBSERVED) {
        if (this.hasAttribute(a)) this.#initialAttrs.set(a, this.getAttribute(a));
      }

      // slotchange → detectar icon-only
      shadow.querySelectorAll("slot").forEach(slot => {
        slot.addEventListener("slotchange", () => this.#updateIconOnly());
      });
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProperties();
      if (!this.hasAttribute('color')) this.setAttribute('color', 'brand');
      this.#syncTag();       // <button> o <a> según href
      this.#syncAttrs();     // propaga atributos al inner
      this.#syncDisabled();
      this.#updateIconOnly();
      this.#updateLinkState();
      this.#updateLoadingState();
      this.#syncHue();
      this.#wireEvents();    // re-envía focus/blur/click como is-* custom events
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === "href") {
        this.#syncTag();
        this.#syncAttrs();
        this.#updateLinkState();
      } else if (name === "disabled") {
        this.#syncDisabled();
      } else if (name === "loading") {
        this.#updateLoadingState();
      } else if (name === "hue") {
        this.#syncHue();
      } else if (name === "shape") {
        // Red de seguridad: un valor fuera de la enum vuelve al default.
        if (newVal && !VALID_SHAPE.includes(newVal)) this.setAttribute("shape", "round");
      } else {
        this.#syncAttrs();
      }
    }

    // ---- form-associated callbacks ---------------------------------

    formResetCallback() {
      // restaura atributos iniciales
      for (const a of OBSERVED) {
        if (this.#initialAttrs.has(a)) {
          this.setAttribute(a, this.#initialAttrs.get(a));
        } else {
          this.removeAttribute(a);
        }
      }
    }

    formDisabledCallback(disabled) {
      // cuando el <form> se deshabilita, reflejar
      this.#syncDisabled(disabled);
    }

    formStateRestoreCallback(state) {
      // restauración tras navegación/autocomplete
      if (typeof state === "string") this.setAttribute("value", state);
    }

    // ---- público ---------------------------------------------------

    /**
     * Hue HSL opcional (0-360). Cuando está presente, el botón expone
     *   --is-button-selected-hue
     * en el :host para que <is-button-group> lo consuma en el highlight
     * del estado [selected]. Si no se define, el grupo usa su --is-accent.
     */
    get hue() {
      const raw = this.getAttribute("hue");
      if (raw == null || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    set hue(v) {
      if (v == null || v === "") this.removeAttribute("hue");
      else this.setAttribute("hue", String(v));
    }

    /** Forma del contorno. Ortogonal a `color` y a `variant`. */
    get shape() {
      const v = this.getAttribute("shape");
      return VALID_SHAPE.includes(v) ? v : "round";
    }
    set shape(v) {
      if (v == null || v === "") this.removeAttribute("shape");
      else if (VALID_SHAPE.includes(String(v))) this.setAttribute("shape", String(v));
    }

    setFocus(options) { this.#btn.focus(options); }
    get validity()    { return this.#internals?.validity ?? super.validity; }
    get validationMessage() { return this.#internals?.validationMessage ?? ""; }
    get willValidate()      { return this.#internals?.willValidate ?? false; }
    checkValidity()  { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg) { this.#internals?.setValidity({ customError: !!msg }, msg); }

    // Custom events composed+bubbles para cruzar Shadow DOM.
    // React: onIsFocus / onIsBlur / onIsClick / onIsInvalid (o addEventListener).
    #boundFocus = (e) => { this.#emit("is-focus",   { originalEvent: e }); };
    #boundBlur  = (e) => { this.#emit("is-blur",    { originalEvent: e }); };
    #boundClick = (e) => { this.#emit("is-click",   { originalEvent: e }); };

    #wireEvents() {
      if (this.#wired) return;
      this.#wired = true;
      const b = this.#btn;
      b.addEventListener("focus", this.#boundFocus);
      b.addEventListener("blur",  this.#boundBlur);
      b.addEventListener("click", this.#boundClick);
    }

    #emit(name, detail = {}) {
      // composed:true para que React (u otros listeners fuera del shadow)
      // puedan recibirlo. bubbles:true para que suba por el DOM.
      this.dispatchEvent(new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true
      }));
    }

    // ---- privados --------------------------------------------------

    #upgradeProperties() {
      // si alguien hizo `button.variant = "brand"` antes de connectedCallback
      for (const a of OBSERVED) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          if (v != null) this.setAttribute(a, v);
        }
      }
    }

    #syncTag() {
      const wantLink = this.hasAttribute("href");
      const currentTag = this.#btn.tagName.toLowerCase();
      const needTag = wantLink ? "a" : "button";
      if (currentTag === needTag) return;

      // Reemplazar el nodo preservando hijos (slots incluidos)
      const fresh = document.createElement(needTag);
      fresh.className = this.#btn.className;
      fresh.setAttribute("part", "button");
      // mover hijos
      while (this.#btn.firstChild) fresh.appendChild(this.#btn.firstChild);
      this.#btn.replaceWith(fresh);
      this.#btn = fresh;
    }

    #syncAttrs() {
      const b = this.#btn;
      const isLink = b.tagName.toLowerCase() === "a";

      // type solo aplica a <button>
      if (!isLink) {
        b.setAttribute("type", this.getAttribute("type") || "button");
      } else {
        b.removeAttribute("type");
      }

      const map = {
        title: "title",
        href: "href",
        target: "target",
        rel: "rel",
        download: "download",
        name: "name",
        value: "value",
        form: "form",
        formaction: "formaction",
        formenctype: "formenctype",
        formmethod: "formmethod",
        formnovalidate: "formnovalidate",
        formtarget: "formtarget"
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

    /** CustomStateSet no tiene .toggle() — solo add/delete. */
    #setState(name, on) {
      const s = this.#internals?.states;
      if (!s) return;
      if (on) s.add(name);
      else s.delete(name);
    }

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.hasAttribute("disabled");
      this.#btn.toggleAttribute("disabled", disabled);
      this.#btn.setAttribute("aria-disabled", String(disabled));
      this.#setState("disabled", disabled);
      this.toggleAttribute("tabindex", disabled ? -1 : null);
    }

    #updateIconOnly() {
      const slots = this.shadowRoot.querySelectorAll("slot");
      let elems = 0, hasText = false;
      for (const slot of slots) {
        for (const n of slot.assignedNodes({ flatten: true })) {
          if (n.nodeType === 1) elems++;
          else if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
        }
      }
      const isIconOnly = elems === 1 && !hasText;
      this.#setState("icon-button", isIconOnly);
    }

    #updateLinkState() {
      this.#setState("link", this.hasAttribute("href"));
    }

    #updateLoadingState() {
      const loading = this.hasAttribute("loading");
      this.#setState("loading", loading);
      this.toggleAttribute("data-state-loading", loading);
      this.#btn.setAttribute("aria-busy", String(loading));
      if (loading) {
        this.#syncDisabled(true);
      } else {
        this.#syncDisabled();
      }
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
        this.style.removeProperty("--is-button-selected-hue");
        this.style.removeProperty("--is-button-selected-color");
      } else {
        const norm = ((h % 360) + 360) % 360;
        this.style.setProperty("--is-button-selected-hue", String(norm));
        this.style.setProperty("--is-button-selected-color", `hsl(${norm} 70% 45%)`);
      }
    }
  }

  if (!customElements.get("is-button")) {
    customElements.define("is-button", IsButton);
  }

  // Exponer para tests / dev
  if (typeof window !== "undefined") {
    window.IsButton = IsButton;
  }
})();
