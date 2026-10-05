import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';
import { ElementBase } from '../../core/element-base.js';
import { applyToneRamp, isCssColorValue, syncPresentStyleAttrs } from '../../core/attrs.js';

import { setCustomState } from '../_shared/form-associated.js';
import {
  BUTTON_SHAPE,
  DEFAULT_BUTTON_SHAPE,
  normalizeButtonShape,
} from '../_shared/button-shape.js';
import { DEFAULT_INTENT, ensureDefaultColor } from '../_shared/intent.js';

/**
 * <iswc-button> — Web Component (vanilla).
 *
 * Define el custom element `iswc-button` automáticamente al importarse.
 * Usa Shadow DOM con CSS propio, es form-associated (participa en <form>),
 * y expone parts + custom states para personalización desde fuera.
 *
 * Atributos
 *  color      brand | neutral | success | warning | danger | info | error   (default: brand)
 *  variant   filled | outlined | plain | ghost | soft | soft-filled | text  (default: filled)
 *  shape        none | round | square | rect | pill  (default: round)
 *                             `none` = sin conversión de forma; `round` = radio tema;
 *                             `square`/`rect` = esquinas vivas; `pill` = cápsula
 *                             (border-radius: 999px).
 *  hue          number (0-360)  color propio para el highlight cuando está
 *                             [selected] dentro de <iswc-button-group>. Si no
 *                             se define, el grupo usa su --iswc-accent.
 *  disabled     boolean
 *  loading      boolean
 *  pill         boolean
 *  with-caret   boolean
 *  href         string   → renderiza como <a>
 *  download     string   (reenviado al <a> interno; útil con `data:` URLs)
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
 *               es lo que necesita un componente que envuelva iswc-button y
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
 *   iswc-focus   — emitido al recibir foco (mismo momento que `focus`)
 *   iswc-blur    — emitido al perder foco
 *   iswc-click   — emitido al hacer click (mismo momento que `click`)
 *   iswc-invalid — emitido cuando la validación de formulario falla
 *
 * Mapping para React:
 *   onClick       → click  (nativo, React 17+)
 *   onFocus       → focus  (nativo, React 17+)
 *   onBlur        → blur   (nativo, React 17+)
 *   onIsFocus     → iswc-focus   (React 19+  |  ref.addEventListener('iswc-focus', fn))
 *   onIsBlur      → iswc-blur
 *   onIsClick     → iswc-click
 *   onIsInvalid   → iswc-invalid
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
 *  --iswc-color-X, --iswc-color-X-strong, -stronger, -strongest, -pale, -paler
 *  --iswc-X-text, --iswc-X-soft, --iswc-X-soft-active  (brand usa --iswc-brand-*)
 * Componente:
 *  --iswc-button-font-family, --iswc-button-font-weight
 *  --iswc-button-border-radius, --iswc-button-border-width
 *  --iswc-button-transition-duration
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
        <iswc-icon icon="mdi:chevron-down"></iswc-icon>
      </span>
      <span part="spinner" class="btn__spinner" aria-hidden="true">
        <iswc-icon icon="mdi:loading"></iswc-icon>
      </span>
    </button>
    <span class="btn__sr-status" part="sr-status" aria-live="polite" aria-atomic="true"></span>
  `;

  // --- 2. Custom element ----------------------------------------------

  // Literal para audit-preview-controls; fuente canónica = BUTTON_SHAPE.
  const VALID_SHAPE = [
    "none", "round", "square", "rect", "pill",
  ];
  void BUTTON_SHAPE;

  const OBSERVED = [
    "color", "variant", "shape", "hue",
    "disabled", "loading", "pill", "with-caret",
    "href", "download",
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
    // cualquier componente que envuelva iswc-button y quiera ser ÉL el control
    // accesible (iswc-check-icon-button): sin esto quedan dos paradas de tab,
    // la del host envolvente y la del botón interno.
    "tabindex",
  ];

  class IswcButton extends ElementBase {
    static formAssociated = true;

    /**
     * `color` es doble: un nombre de familia (`brand`, `danger`, …) sigue
     * siendo la variante semántica de siempre; un color CSS literal
     * (`#ae3ec9`, `var(--x)`, `oklch(…)`) pinta el tono base directamente.
     *
     * Phase W31: los atributos `color-hover` / `color-active` /
     * `border-width` se erradicaron del componente; el consumer define
     * estos tokens vía CSS class o inline style.
     */

    static get observedAttributes(): string[] {
      return [...OBSERVED, ...ARIA_FORWARD];
    }

    /** `color` es doble: familia semántica (la resuelve el CSS) o color CSS
     *  literal (la rampa la deriva aquí). */
    #syncToneColor() {
      const raw = this.getAttribute('color');
      applyToneRamp(this, isCssColorValue(raw) ? raw : null);
    }

    #internals: ElementInternals | null = null;
    #initialAttrs = new Map();
    #btn;          // inner <button> or <a>
    #rootEl!: HTMLElement;       // shadow root first child wrapper
    #wired = false; // idem-potente: re-registrar listeners de eventos

    constructor() {
      super();

      const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#btn = shadow.querySelector<HTMLElement>(".btn")!;
      this.#rootEl = shadow.querySelector<HTMLElement>(".btn")!;

      // form-associated (en navegadores sin attachInternals, no rompe)
      if ("attachInternals" in this) {
        try { this.#internals = this.attachInternals(); } catch { /* already attached */ }
      }

      // capturar atributos iniciales para formResetCallback
      for (const a of OBSERVED) {
        if (this.hasAttribute(a)) this.#initialAttrs.set(a, this.getAttribute(a));
      }

      // slotchange → detectar icon-only
      shadow.querySelectorAll<HTMLSlotElement>("slot").forEach(slot => {
        slot.addEventListener("slotchange", () => this.#updateIconOnly());
      });
    }

    onConnected() {
      // El upgrade de propiedades (el.variant = 'x' antes de connect) ya lo
      // hace ElementBase.connectedCallback() vía upgradeProperties(); no hay
      // que repetirlo aquí.
      ensureDefaultColor(this, DEFAULT_INTENT);
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

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
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
        if (newVal && !VALID_SHAPE.includes(newVal)) {
          this.setAttribute("shape", DEFAULT_BUTTON_SHAPE);
        }
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

    formDisabledCallback(disabled: boolean): void {
      // cuando el <form> se deshabilita, reflejar
      this.#syncDisabled(disabled);
    }

    formStateRestoreCallback(state: unknown): void {
      // restauración tras navegación/autocomplete
      if (typeof state === "string") this.setAttribute("value", state);
    }

    // ---- público ---------------------------------------------------

    /**
     * Hue HSL opcional (0-360). Cuando está presente, el botón expone
     *   --iswc-button-selected-hue
     * en el :host para que <iswc-button-group> lo consuma en el highlight
     * del estado [selected]. Si no se define, el grupo usa su --iswc-accent.
     */
    get hue() {
      const raw = this.getAttribute("hue");
      if (raw == null || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    set hue(v: string | number | null | undefined) {
      if (v == null || String(v) === "") this.removeAttribute("hue");
      else this.setAttribute("hue", String(v));
    }

    /** Forma del contorno. Ortogonal a `color` y a `variant`. */
    get shape(): string {
      return normalizeButtonShape(this.getAttribute("shape"), DEFAULT_BUTTON_SHAPE);
    }
    set shape(v: string | null | undefined) {
      if (v == null || String(v) === "") this.removeAttribute("shape");
      else this.setAttribute("shape", normalizeButtonShape(v, DEFAULT_BUTTON_SHAPE));
    }

    setFocus(options?: FocusOptions): void { this.#btn.focus(options); }
    // Sin `attachInternals` (navegador viejo) no hay validacion nativa: se
    // devuelven valores neutros en vez de propagar `undefined`.
    get validity(): ValidityState | null { return this.#internals?.validity ?? null; }
    get validationMessage(): string { return this.#internals?.validationMessage ?? ""; }
    get willValidate(): boolean { return this.#internals?.willValidate ?? false; }
    checkValidity()  { return this.#internals?.checkValidity() ?? true; }
    reportValidity() { return this.#internals?.reportValidity() ?? true; }
    setCustomValidity(msg: string): void { this.#internals?.setValidity({ customError: !!msg }, msg); }

    // Custom events composed+bubbles para cruzar Shadow DOM.
    // React: onIsFocus / onIsBlur / onIsClick / onIsInvalid (o addEventListener).
    #boundFocus = (e: Event) => { emit(this, "iswc-focus",   { originalEvent: e }); };
    #boundBlur  = (e: Event) => { emit(this, "iswc-blur",    { originalEvent: e }); };
    #boundClick = (e: Event) => {
      emit(this, "iswc-click", { originalEvent: e });
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
    #boundInvalid = (e: Event) => { emit(this, "iswc-invalid", { originalEvent: e, validationMessage: this.validationMessage }); };

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

    #syncDisabled(formDisabled?: boolean): void {
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
      // el autor — `<iswc-button tabindex="-1">` perdía su valor al conectarse.
      if (disabled) {
        this.#btn.setAttribute("tabindex", "-1");
      } else {
        const propio = this.getAttribute("tabindex");
        if (propio == null) this.#btn.removeAttribute("tabindex");
        else this.#btn.setAttribute("tabindex", propio);
      }
    }

    #updateIconOnly() {
      const slots = this.shadowRoot!.querySelectorAll<HTMLSlotElement>("slot");
      let elems = 0, hasText = false;
      for (const slot of slots) {
        for (const n of slot.assignedNodes({ flatten: true })) {
          if (n.nodeType === 1) elems++;
          else if (n.nodeType === 3 && (n.textContent ?? '').trim()) hasText = true;
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
      // Anunciar el cambio de estado a screen readers via la region aria-live.
      // g10 proposal: cuando el botón entra en loading, debe anunciarse
      // "Cargando"; al terminar, anunciar "Listo" o vacío.
      const sr = this.shadowRoot?.querySelector<HTMLElement>(".btn__sr-status");
      if (sr) sr.textContent = loading ? 'Cargando' : 'Listo';
      if (loading) {
        this.#syncDisabled(true);
      } else {
        this.#syncDisabled();
      }
    }

    /**
     * Publica el hue en una CSS var del host para que el padre
     * (p.ej. <iswc-button-group>) pinte el highlight del estado [selected]
     * con el color del botón. Si no hay hue, la var queda sin definir y
     * el consumidor cae a su propio --iswc-accent.
     */
    #syncHue() {
      const h = this.hue;
      if (h == null) {
        this.style.removeProperty("--iswc-button-selected-hue");
        this.style.removeProperty("--iswc-button-selected-color");
      } else {
        const norm = ((Number(h) % 360) + 360) % 360;
        this.style.setProperty("--iswc-button-selected-hue", String(norm));
        this.style.setProperty("--iswc-button-selected-color", `hsl(${norm} 70% 45%)`);
      }
    }
  }

  defineElement("iswc-button", IswcButton);

  // Exponer para tests / dev
  if (typeof window !== "undefined") {
    // `window` no declara los globals del kit; se expone por indice.
    (window as unknown as Record<string, unknown>).IswcButton = IswcButton;
  }
})();
