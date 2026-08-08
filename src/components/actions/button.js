import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { applyToneRamp, isCssColorValue, syncPresentStyleAttrs } from '../_shared/style-attrs.js';
import { setCustomState } from '../_shared/form-associated.js';

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
 *  tabindex     se reenvía al <button> interno, que es el que está en el
 *               orden de tabulación. `tabindex="-1"` lo saca del recorrido:
 *               es lo que necesita un componente que envuelva is-button y
 *               quiera ser él mismo el control accesible.
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
 * Color × appearance: ortogonales. Cada `color` enlaza roles `--_tone-*`
 * a tokens relativos de is-base; cada `variant` solo consume esos roles.
 * Añadir color = una regla de enlace; añadir apariencia = una de variant.
 *
 * Tokens de familia (por color X = brand|success|warning|danger|info|error):
 *  --is-color-X, --is-color-X-strong, -stronger, -strongest, -pale, -paler
 *  --is-X-text, --is-X-soft, --is-X-soft-active  (brand usa --is-brand-*)
 * Componente:
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
    "aria-label", "aria-pressed", "aria-expanded", "aria-haspopup",
    "aria-current", "aria-controls",
    // `tabindex` va en la misma lista porque tiene el mismo problema: el que
    // entra en el orden de tabulación es el <button> del Shadow DOM, no el
    // host, así que ponerlo fuera no lo saca del recorrido. Lo necesita
    // cualquier componente que envuelva is-button y quiera ser ÉL el control
    // accesible (is-check-icon-button): sin esto quedan dos paradas de tab,
    // la del host envolvente y la del botón interno.
    "tabindex",
  ];

  class IsButton extends ElementBase {
    static formAssociated = true;

    /**
     * Personalización sin `<style>` aparte (ver `_shared/style-attrs.js`).
     * `color` es doble: un nombre de familia (`brand`, `danger`, …) sigue
     * siendo la variante semántica de siempre; un color CSS literal
     * (`#ae3ec9`, `var(--x)`, `oklch(…)`) pinta el tono base directamente.
     */
    static styleAttrs = {
      radius: '--is-button-border-radius',
      'border-width': '--is-button-border-width',
      'font-weight': '--is-button-font-weight',
      'font-family': '--is-button-font-family',
      'transition-duration': '--is-button-transition-duration',
      // `color` literal no se mapea aquí: deriva la rampa entera en
      // `#syncToneColor()`. Estos tres afinan roles concretos por encima
      // de esa rampa (o del tono semántico, si `color` es una familia).
      'color-hover': { prop: '--_tone-stronger', onlyColorValues: true },
      'color-active': { prop: '--_tone-strongest', onlyColorValues: true },
      'color-text': { prop: '--_tone-on', onlyColorValues: true },
    };

    static get observedAttributes() {
      return [...OBSERVED, ...ARIA_FORWARD, ...IsButton.styleAttrNames];
    }

    /** `color` es doble: familia semántica (la resuelve el CSS) o color CSS
     *  literal (la rampa la deriva aquí). */
    #syncToneColor() {
      const raw = this.getAttribute('color');
      applyToneRamp(this, isCssColorValue(raw) ? raw : null);
      // La rampa pisa los mismos roles que `color-hover` / `color-active` /
      // `color-text`: re-aplicarlos deja mandando al ajuste fino explícito.
      syncPresentStyleAttrs(this, IsButton.styleAttrs);
    }

    #internals = null;
    #initialAttrs = new Map();
    #btn;          // inner <button> or <a>
    #rootEl;       // shadow root first child wrapper
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

    onConnected() {
      // El upgrade de propiedades (el.variant = 'x' antes de connect) ya lo
      // hace ElementBase.connectedCallback() vía upgradeProperties(); no hay
      // que repetirlo aquí.
      if (!this.hasAttribute('color')) this.setAttribute('color', 'brand');
      this.#syncToneColor();
      this.#syncTag();       // <button> o <a> según href
      this.#syncAttrs();     // propaga atributos al inner
      this.#syncDisabled();
      this.#updateIconOnly();
      this.#updateLinkState();
      this.#updateLoadingState();
      this.#syncHue();
      this.#wireEvents();    // re-envía focus/blur/click como is-* custom events
    }

    onAttributeChanged(name, oldVal, newVal) {
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
      } else if (name === "color") {
        this.#syncToneColor();
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
    #boundFocus = (e) => { emit(this, "is-focus",   { originalEvent: e }); };
    #boundBlur  = (e) => { emit(this, "is-blur",    { originalEvent: e }); };
    #boundClick = (e) => {
      emit(this, "is-click", { originalEvent: e });
      // El <button> interno está en Shadow DOM: no es descendiente del <form>
      // light, así que type=submit|reset no hace nada solos. Activamos el
      // formulario asociado vía ElementInternals (o closest como fallback).
      if (e.defaultPrevented) return;
      if (this.hasAttribute("disabled") || this.hasAttribute("loading")) return;
      if (this.hasAttribute("href")) return;
      const type = (this.getAttribute("type") || "button").toLowerCase();
      if (type !== "submit" && type !== "reset") return;
      const form = this.#internals?.form ?? this.closest("form");
      if (!form) return;
      e.preventDefault();
      if (type === "reset") {
        form.reset();
        return;
      }
      if (typeof form.requestSubmit === "function") {
        try { form.requestSubmit(this); }
        catch { form.requestSubmit(); }
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    };

    // `invalid` lo dispara el propio elemento form-associated: tanto cuando
    // alguien llama a reportValidity() como cuando el <form> intenta enviarse
    // y este control no pasa la validación. Escuchar el evento nativo —en vez
    // de envolver checkValidity()/reportValidity()— es lo que cubre también el
    // submit, donde el navegador valida sin pasar por nuestros métodos.
    #boundInvalid = (e) => { emit(this, "is-invalid", { originalEvent: e, validationMessage: this.validationMessage }); };

    #wireEvents() {
      if (this.#wired) return;
      this.#wired = true;
      const b = this.#btn;
      b.addEventListener("focus", this.#boundFocus);
      b.addEventListener("blur",  this.#boundBlur);
      b.addEventListener("click", this.#boundClick);
      // En el host, no en #btn: el <button> del shadow no está asociado al form.
      this.addEventListener("invalid", this.#boundInvalid);
    }

    // ---- privados --------------------------------------------------

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
      // Los listeners se fueron con el nodo viejo: reenganchar.
      this.#btn.addEventListener("focus", this.#boundFocus);
      this.#btn.addEventListener("blur", this.#boundBlur);
      this.#btn.addEventListener("click", this.#boundClick);
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

    #syncDisabled(formDisabled) {
      const disabled = !!formDisabled || this.hasAttribute("disabled");
      this.#btn.toggleAttribute("disabled", disabled);
      this.#btn.setAttribute("aria-disabled", String(disabled));
      setCustomState(this.#internals, "disabled", disabled);

      // Sacar del orden de tabulación mientras esté deshabilitado. Va sobre
      // el nodo interno, que es el que está en el recorrido: cuando hay
      // `href` el inner es un <a>, y un <a> ignora `disabled`.
      //
      // Antes era `this.toggleAttribute("tabindex", disabled ? -1 : null)`
      // sobre el HOST, y hacía dos cosas mal: con `disabled` escribía
      // `tabindex=""` (que el navegador lee como 0, o sea seguía siendo
      // enfocable), y sin `disabled` BORRABA el tabindex que hubiera puesto
      // el autor — `<is-button tabindex="-1">` perdía su valor al conectarse.
      if (disabled) {
        this.#btn.setAttribute("tabindex", "-1");
      } else {
        const propio = this.getAttribute("tabindex");
        if (propio == null) this.#btn.removeAttribute("tabindex");
        else this.#btn.setAttribute("tabindex", propio);
      }
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
      setCustomState(this.#internals, "icon-button", isIconOnly);
    }

    #updateLinkState() {
      setCustomState(this.#internals, "link", this.hasAttribute("href"));
    }

    #updateLoadingState() {
      const loading = this.hasAttribute("loading");
      setCustomState(this.#internals, "loading", loading);
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

  defineElement("is-button", IsButton);

  // Exponer para tests / dev
  if (typeof window !== "undefined") {
    window.IsButton = IsButton;
  }
})();
