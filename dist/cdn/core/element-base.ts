/**
 * element-base.ts — Clase base de los componentes del kit.
 *
 * Centraliza el patrón que se repetía en ~150 componentes: shadow más template,
 * la bandera de montado que silencia `attributeChangedCallback` antes de la
 * primera conexión, el upgrade de propiedades escritas demasiado pronto, el
 * volcado del mapa `styleAttrs`, y tres hooks para que la subclase añada lo suyo
 * sin reescribir el ciclo de vida.
 *
 *   class IsFoo extends ElementBase {
 *     static TEMPLATE = TEMPLATE;
 *     static override get observedAttributes(): string[] { return ['color']; }
 *
 *     constructor() {
 *       super();
 *       this.initShadow();
 *       adoptCss(this.shadowRoot!, import.meta.url);
 *     }
 *
 *     override onConnected(): void { this.#syncColor(); }
 *   }
 *
 * `adoptCss` lo llama la SUBCLASE, no esta base: tiene que resolver el `.css`
 * hermano del fichero de la subclase. Llamarlo aquí apuntaría siempre a
 * `element-base.css`, que no existe.
 */

import { upgradeProperties } from './element.js';
import { syncStyleAttrs, styleAttrNames, type StyleAttrMap } from './attrs.js';

/** Lo que la subclase puede declarar como estático. */
export type ElementBaseConstructor = { observedAttributes?: string[]; styleAttrs?: StyleAttrMap; TEMPLATE?: HTMLTemplateElement; __TEMPLATE?: HTMLTemplateElement; };

export class ElementBase extends HTMLElement {
  /**
   * `true` desde la primera conexión; nunca vuelve a `false`.
   *
   * Silencia `attributeChangedCallback` para los atributos que el parser ya
   * trae puestos: esos se procesan en `onConnected()`, cuando el shadow existe.
   */
  #mounted = false;

  /** `true` tras correr `upgradeProperties` una vez. */
  #upgraded = false;

  static get observedAttributes(): string[] { return []; }

  /**
   * Mapa `atributo → custom property`, para personalizar sin `<style>` aparte.
   *
   *   static override styleAttrs = { radius: '--is-foo-radius' };
   */
  static styleAttrs: StyleAttrMap = {};

  /** Atajo para concatenar a `observedAttributes`. */
  static get styleAttrNames(): string[] { return styleAttrNames(this.styleAttrs); }

  /* ─────────────────────────────── hooks ──────────────────────────────── */

  /** Tras `connectedCallback`, con `#mounted` ya en `true`. */
  onConnected(): void {}
  /** Desde `disconnectedCallback`. */
  onDisconnected(): void {}
  /** Desde `attributeChangedCallback`, tras los guards de montado y de igualdad. */
  onAttributeChanged(_name: string, _oldVal: string | null, _newVal: string | null): void {}

  /* ──────────────────────────────── shadow ────────────────────────────── */

  /**
   * Crea el shadow y clona el template estático si lo hay.
   *
   * Idempotente: si ya existe shadow, no hace nada. La subclase puede pasar
   * otras opciones (`delegatesFocus: true`) o saltarse este método y montar el
   * shadow a mano.
   */
  initShadow(options: ShadowRootInit = { mode: 'open' }): void {
    if (this.shadowRoot) return;
    const shadow = this.attachShadow(options);
    const ctor = this.constructor as unknown as ElementBaseConstructor;
    const tpl = ctor.TEMPLATE ?? ctor.__TEMPLATE;
    if (tpl) shadow.appendChild(tpl.content.cloneNode(true));
  }

  get shadow(): ShadowRoot | null { return this.shadowRoot; }
  get mounted(): boolean { return this.#mounted; }

  /* ────────────────────────────── ciclo de vida ───────────────────────── */

  /**
   * `onConnected()` corre en CADA conexión, no sólo en la primera.
   *
   * Mover un elemento en el DOM —`appendChild` a otro padre, reordenar una
   * lista— lo desconecta y lo vuelve a conectar, y los componentes crean ahí
   * sus observers y listeners. Saltarse la segunda conexión dejaba al elemento
   * sin `ResizeObserver` para siempre.
   *
   * Lo que sí corre una única vez es `upgradeProperties`: sólo tiene sentido
   * mientras pueda haber propiedades JS escritas sobre la instancia antes de que
   * el custom element se registrara.
   */
  connectedCallback(): void {
    const ctor = this.constructor as unknown as ElementBaseConstructor;
    if (!this.#upgraded) {
      this.#upgraded = true;
      upgradeProperties(this, ctor.observedAttributes ?? []);
    }
    this.#mounted = true;
    // Antes del hook: la subclase puede leer ya las custom properties puestas.
    syncStyleAttrs(this, ctor.styleAttrs ?? {});
    this.onConnected();
  }

  disconnectedCallback(): void {
    this.onDisconnected();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (!this.#mounted || oldVal === newVal) return;
    const styleAttrs = (this.constructor as unknown as ElementBaseConstructor).styleAttrs;
    if (styleAttrs && name in styleAttrs) syncStyleAttrs(this, { [name]: styleAttrs[name]! });
    this.onAttributeChanged(name, oldVal, newVal);
  }

  /**
   * Atajo para un setter booleano reflejado como atributo.
   *
   *   set open(v: boolean) { this.setBooleanAttr('open', v); }
   */
  setBooleanAttr(name: string, value: unknown): void {
    this.toggleAttribute(name, !!value);
  }
}
