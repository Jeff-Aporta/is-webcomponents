/**
 * element-base.js — Base class para Web Components del kit.
 *
 * Centraliza el patrón repetido en ~50 componentes:
 *
 *   1. `attachShadow` + `adoptCss` + clonar template.
 *   2. `#mounted` flag para silenciar `attributeChangedCallback` antes del
 *      connect (cuando el consumidor todavía no ha visto la luz).
 *   3. `upgradeProperties` para que `el.foo = 'x'` ANTES del connect pase
 *      por el setter camelCase (p. ej. `labelPlacement` → atributo
 *      `label-placement`).
 *   4. Hooks `onConnected / onDisconnected / onAttributeChanged` para que la
 *      subclase añada su lógica sin reescribir la lifecycle.
 *   5. `setBooleanAttr(name, value)` para que un setter de property booleano
 *      reflejado como atributo sea de una línea.
 *
 * La subclase hace lo siguiente:
 *
 *   import { ElementBase } from '../_shared/element-base.js';
 *   import { adoptCss } from '../_shared/adopt-css.js';
 *
 *   const TEMPLATE = document.createElement('template');
 *   TEMPLATE.innerHTML = `…`;
 *
 *   class IsFoo extends ElementBase {
 *     static TEMPLATE = TEMPLATE;
 *     static get observedAttributes() { return ['color', 'size']; }
 *
 *     constructor() {
 *       super();
 *       adoptCss(this.shadowRoot, import.meta.url);
 *       this.#something = this.shadowRoot.querySelector('.something');
 *     }
 *
 *     onConnected() { this.#syncColor(); }
 *     onAttributeChanged(name, _old, _new) { if (name === 'color') this.#syncColor(); }
 *
 *     get color() { return this.getAttribute('color') ?? 'brand'; }
 *     set color(v) { v ? this.setAttribute('color', v) : this.removeAttribute('color'); }
 *   }
 *
 * Notas:
 *   - `adoptCss` se llama desde la subclase (no desde aquí) para que el
 *     adoptCss apunte al archivo CSS de la subclase, no a element-base.css.
 *   - El `__TEMPLATE` se puede pasar como `static TEMPLATE = TEMPLATE` (en
 *     cuyo caso la subclase debe referenciarlo) o por la subclase llamando
 *     a `super()` y luego `this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true))`
 *     manualmente.
 *
 *     Por defecto, si existe `this.constructor.TEMPLATE` o
 *     `this.constructor.__TEMPLATE`, se clona automáticamente.
 */

import { upgradeProperties } from './upgrade-properties.js';
import { syncStyleAttrs, styleAttrNames } from './style-attrs.js';

export class ElementBase extends HTMLElement {
  /** true desde la primera conexión; nunca vuelve a false. Silencia
   *  `attributeChangedCallback` para los atributos que el parser ya trae
   *  puestos, que se procesan en `onConnected()`. */
  #mounted = false;
  /** true tras correr `upgradeProperties` una vez. */
  #upgraded = false;
  /** Subclasses pueden sobrescribir este getter para añadir atributos extra. */
  static get observedAttributes() { return []; }

  /**
   * Mapa `atributo → custom property` para personalizar sin `<style>` aparte
   * (ver `_shared/style-attrs.js`). La subclase lo declara así:
   *
   *   static styleAttrs = { radius: '--is-button-border-radius' };
   *
   * y añade `...IsFoo.styleAttrNames` a su `observedAttributes`.
   */
  static styleAttrs = {};

  /** Atajo para concatenar a `observedAttributes`. */
  static get styleAttrNames() { return styleAttrNames(this.styleAttrs); }

  // Hooks que las subclases pueden implementar:
  /** Se llama tras connectedCallback una vez que #mounted=true y los
   *  upgrade-properties han corrido. */
  onConnected() {}
  /** Se llama desde disconnectedCallback. */
  onDisconnected() {}
  /** Se llama desde attributeChangedCallback (después del guard de
   *  `#mounted` y de `oldVal === newVal`). */
  onAttributeChanged(_name, _oldVal, _newVal) {}

  /**
   * Inicializa el shadow root y clona el template si está definido.
   * La subclase puede sobrescribir `shadowInit` o `attachShadow` para
   * customizar el modo (e.g. delegatesFocus: true) y luego llamar a
   * `super.connectedCallback()` (o simplemente reusar este método con
   * argumentos).
   *
   * Por defecto hace attachShadow({ mode: 'open' }) y clona
   * this.constructor.TEMPLATE / __TEMPLATE.
   */
  initShadow(options = { mode: 'open' }) {
    if (this.shadowRoot) return;
    const shadow = this.attachShadow(options);
    const tpl = this.constructor.TEMPLATE ?? this.constructor.__TEMPLATE;
    if (tpl) {
      shadow.appendChild(tpl.content.cloneNode(true));
    }
  }

  get shadow() { return this.shadowRoot; }
  get mounted() { return this.#mounted; }

  /**
   * `onConnected()` se llama en CADA conexión, no sólo en la primera: mover
   * un elemento en el DOM (`appendChild` a otro padre, reordenar una lista)
   * lo desconecta y lo vuelve a conectar, y los componentes crean ahí sus
   * observers y listeners (ver `isp/block-layout.js`). Saltarse la segunda
   * conexión dejaba el elemento sin ResizeObserver para siempre.
   *
   * Lo que sí corre una única vez es `upgradeProperties`: sólo tiene sentido
   * la primera vez, cuando aún puede haber propiedades JS escritas sobre la
   * instancia antes de que el custom element se registrara.
   */
  connectedCallback() {
    if (!this.#upgraded) {
      this.#upgraded = true;
      upgradeProperties(this, this.constructor.observedAttributes || []);
    }
    this.#mounted = true;
    // Antes del hook: la subclase puede leer ya las custom properties puestas.
    syncStyleAttrs(this, this.constructor.styleAttrs);
    this.onConnected();
  }

  disconnectedCallback() {
    this.onDisconnected();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.#mounted || oldVal === newVal) return;
    const styleAttrs = this.constructor.styleAttrs;
    if (styleAttrs && name in styleAttrs) syncStyleAttrs(this, { [name]: styleAttrs[name] });
    this.onAttributeChanged(name, oldVal, newVal);
  }

  /**
   * Helper para setters booleanos reflejados como atributo. Sin esto,
   * cada componente repite:
   *   set foo(v) { this.toggleAttribute('foo', !!v); }
   *   get foo() { return this.hasAttribute('foo'); }
   *
   * Uso:
   *   set open(v) { this.setBooleanAttr('open', v); }
   *   get open() { return this.hasAttribute('open'); }
   */
  setBooleanAttr(name, value) {
    this.toggleAttribute(name, !!value);
  }
}
