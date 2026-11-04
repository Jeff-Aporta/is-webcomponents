/**
 * iswc-element.ts — El molde único de los componentes del kit (plan D4, D6).
 *
 *   import { IswcElement, define } from './iswc-element.js';
 *   import css from 'iswc:css';                      // .css compilado hermano, lo pone el build
 *
 *   class IswcFoo extends IswcElement {
 *     static tag = 'iswc-foo';
 *     static css = css;                              // UNA CSSStyleSheet por clase
 *     static template = TEMPLATE;                    // opcional: se clona en el shadow
 *     static observed = ['color', 'variant'];        // + styleAttrs + @attr → observedAttributes
 *     static deps = ['iswc-icon'];                   // hijos que se piden al loader al conectar
 *     onConnected(): void { … }
 *   }
 *   define(IswcFoo);
 *
 * Lo que el molde hace una sola vez para todos:
 *   constructor            shadow con `shadowInit` (null = light DOM) + clon de `template` + hojas base + hoja propia.
 *   connectedCallback      `upgradeProperties` (una vez), `mounted`, dependencias perezosas, `onConnected()`.
 *   attributeChangedCallback  silenciado antes de montar y si el valor no cambió; luego `onAttributeChanged()`.
 *
 * El CSS no se busca junto al módulo (`import.meta.url`): llega como texto por `import css from 'iswc:css'`
 * (src/cdn/build/css-virtual.ts). `static cssHref` queda para quien de verdad necesite `url()` relativos: añade un
 * `<link>` a esa hoja. `ElementBase`, `PropsElement`, `withStyleAttrs`, `DiagramElementBase`, `ModalBase` y
 * `BreakpointHost` son subclases o mixins de este molde.
 */
import { atributosDeclarados, styleAttrNames } from './attrs.js';
import { sheetsBase, textoHojasBase } from './base-sheets.js';
import { defineElement, emit as emitir, upgradeProperties } from './element.js';
import { routeThroughLoader } from '../build/asset-url.js';
import type { StyleAttrMap } from './schemas/attrs.schemas.js';
import type { ConstructorConTag, IswcElementStatics, LoaderDeps } from './schemas/iswc-element.schemas.js';

/** Una hoja por clase dueña del texto: las subclases que heredan `css` comparten la del padre. */
const HOJAS = new WeakMap<object, CSSStyleSheet | null>();

/** Clases cuyas `deps` ya se pidieron al loader: una vez por clase, no por instancia. */
const DEPS_PEDIDAS = new WeakSet<object>();

/** Clase de la cadena donde `css` es propio (la que lo declaró). */
function claseDelCss(ctor: object): object {
  for (let c: object | null = ctor; c; c = Object.getPrototypeOf(c)) {
    if (Object.prototype.hasOwnProperty.call(c, 'css')) return c;
  }
  return ctor;
}

/** `CSSStyleSheet` construida del `static css`, memorizada; null si no hay texto o el navegador no la admite. */
function hojaPropia(ctor: IswcElementStatics): CSSStyleSheet | null {
  const clase = claseDelCss(ctor);
  if (HOJAS.has(clase)) return HOJAS.get(clase) ?? null;
  let hoja: CSSStyleSheet | null = null;
  if (ctor.css) {
    try {
      hoja = new CSSStyleSheet();
      hoja.replaceSync(ctor.css);
    } catch {
      hoja = null;
    }
  }
  HOJAS.set(clase, hoja);
  return hoja;
}

/**
 * Añade hojas al shadow sin duplicar. `false` si la adopción falló: `'adoptedStyleSheets' in ShadowRoot.prototype`
 * da `true` en entornos donde el acceso real lanza (polyfills parciales), y sin este guard el componente se quedaba
 * sin estilos y con la excepción subiendo al constructor.
 */
function adoptar(shadow: ShadowRoot, nuevas: CSSStyleSheet[]): boolean {
  try {
    const actuales = shadow.adoptedStyleSheets;
    const faltan = nuevas.filter((h) => actuales.indexOf(h) === -1);
    if (faltan.length > 0) shadow.adoptedStyleSheets = [...actuales, ...faltan];
    return true;
  } catch {
    return false;
  }
}

/** Plantilla de la clase: `template`, o los alias heredados de `ElementBase` (`TEMPLATE`, `__TEMPLATE`). */
function plantillaDe(ctor: IswcElementStatics): HTMLTemplateElement | null {
  return ctor.template ?? ctor.TEMPLATE ?? ctor.__TEMPLATE ?? null;
}

export class IswcElement extends HTMLElement {
  /** Tag del custom element. Obligatorio en la subclase concreta: `define()` lo usa. */
  static tag: string = '';
  /** Texto CSS propio (llega por `import css from 'iswc:css'`). El molde crea UNA `CSSStyleSheet` por clase. */
  static css: string = '';
  /** Hoja externa opcional, sólo para CSS con `url()` relativos. Se añade como `<link>`. */
  static cssHref: string | null = null;
  /** Plantilla que se clona en el shadow al construir. */
  static template: HTMLTemplateElement | null = null;
  /** Atributos observados propios. `observedAttributes` = esto ∪ `styleAttrs` ∪ `@attr`. */
  static observed: readonly string[] = [];
  /** Tags hijos que se piden a `iswcLoader.ensure()` al primer `connectedCallback` (sin loader no hace nada). */
  static deps: readonly string[] = [];
  /** Opciones del shadow. `null` = light DOM (el molde no crea shadow ni adopta hojas). */
  static shadowInit: ShadowRootInit | null = { mode: 'open' };
  /** Mapa `atributo → custom property` (contrato histórico; su volcado sigue deshabilitado desde V5). */
  static styleAttrs: StyleAttrMap = {};

  static get observedAttributes(): string[] {
    return [...new Set([...this.observed, ...styleAttrNames(this.styleAttrs), ...atributosDeclarados(this)])];
  }

  /** Atajo histórico para concatenar el mapa `styleAttrs`. */
  static get styleAttrNames(): string[] { return styleAttrNames(this.styleAttrs); }

  /** `true` desde la primera conexión; nunca vuelve a `false`. Silencia `attributeChangedCallback` antes de montar. */
  #mounted = false;
  /** `true` tras correr `upgradeProperties` una vez. */
  #upgraded = false;
  #shadow: ShadowRoot | null = null;
  /** Respaldo `<style>` cuando no se pudo adoptar: se repone si un `innerHTML` posterior lo borró. */
  #estiloRespaldo: HTMLStyleElement | null = null;

  constructor() {
    super();
    const init = (this.constructor as unknown as IswcElementStatics).shadowInit;
    if (init) this.initShadow(init);
  }

  /* ─────────────────────────────── hooks ──────────────────────────────── */

  /** Tras `connectedCallback`, con `mounted` ya en `true`. Corre en CADA conexión. */
  onConnected(): void {}
  /** Desde `disconnectedCallback`. */
  onDisconnected(): void {}
  /** Desde `attributeChangedCallback`, tras los guards de montado y de igualdad. */
  onAttributeChanged(_name: string, _oldVal: string | null, _newVal: string | null): void {}

  /* ──────────────────────────────── shadow ────────────────────────────── */

  /**
   * Crea el shadow (o toma el declarativo que ya hubiera), clona la plantilla y adopta las hojas. Idempotente.
   * El constructor lo llama con `shadowInit`; una clase con `shadowInit = null` puede llamarlo más tarde.
   */
  initShadow(options: ShadowRootInit = { mode: 'open' }): ShadowRoot {
    if (this.#shadow) return this.#shadow;
    const ctor = this.constructor as unknown as IswcElementStatics;
    const previo = this.shadowRoot;
    const shadow = previo ?? this.attachShadow(options);
    const tpl = previo ? null : plantillaDe(ctor);
    if (tpl) shadow.appendChild(tpl.content.cloneNode(true));
    this.#shadow = shadow;
    this.#adoptarEstilos(shadow, ctor);
    return shadow;
  }

  /** Hojas base + hoja propia; si no se pueden adoptar, un `<style>` con el mismo texto (cero peticiones). */
  #adoptarEstilos(shadow: ShadowRoot, ctor: IswcElementStatics): void {
    const base = sheetsBase();
    const propia = hojaPropia(ctor);
    const hojas = [...(base ?? []), ...(propia ? [propia] : [])];
    const adoptadas = hojas.length > 0 && adoptar(shadow, hojas);
    const faltaBase = !(adoptadas && base);
    const faltaPropia = !!ctor.css && !(adoptadas && propia);
    const respaldo = [faltaBase ? textoHojasBase() : '', faltaPropia ? ctor.css : ''].filter(Boolean).join('\n');
    if (respaldo) {
      const estilo = document.createElement('style');
      estilo.textContent = respaldo;
      shadow.prepend(estilo);
      this.#estiloRespaldo = estilo;
    }
    if (ctor.cssHref) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = routeThroughLoader(ctor.cssHref);
      shadow.prepend(link);
    }
  }

  get shadow(): ShadowRoot | null { return this.#shadow ?? this.shadowRoot; }
  get mounted(): boolean { return this.#mounted; }

  /* ────────────────────────────── ciclo de vida ───────────────────────── */

  /**
   * `onConnected()` corre en CADA conexión: mover un elemento lo desconecta y lo vuelve a conectar, y los
   * componentes crean ahí sus observers. Lo que corre una sola vez es `upgradeProperties` (propiedades JS escritas
   * antes de que el tag se registrara) y la petición de `deps` (una vez por clase).
   */
  connectedCallback(): void {
    const ctor = this.constructor as unknown as IswcElementStatics;
    if (!this.#upgraded) {
      this.#upgraded = true;
      upgradeProperties(this, ctor.observedAttributes ?? []);
    }
    this.#mounted = true;
    const estilo = this.#estiloRespaldo;
    if (estilo && this.#shadow && estilo.parentNode !== this.#shadow) this.#shadow.prepend(estilo);
    this.#pedirDeps(ctor);
    this.onConnected();
  }

  disconnectedCallback(): void {
    this.onDisconnected();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (!this.#mounted || oldVal === newVal) return;
    this.onAttributeChanged(name, oldVal, newVal);
  }

  /** Pide al loader los hijos declarados que aún no estén definidos. Sin loader no hace nada (D4: lazy). */
  #pedirDeps(ctor: IswcElementStatics): void {
    const deps = ctor.deps ?? [];
    if (deps.length === 0 || DEPS_PEDIDAS.has(ctor)) return;
    const loader = (globalThis as { iswcLoader?: LoaderDeps }).iswcLoader;
    if (typeof loader?.ensure !== 'function') return;
    DEPS_PEDIDAS.add(ctor);
    for (const tag of deps) {
      if (!customElements.get(tag)) loader.ensure(tag)?.catch?.(() => false);
    }
  }

  /* ──────────────────────────────── utilidades ────────────────────────── */

  /** Dispara un evento del kit (`bubbles` + `composed`). `false` si un listener lo canceló. */
  emit<T = unknown>(name: string, detail?: T, opts?: EventInit): boolean {
    return emitir(this, name, detail, opts);
  }

  /** Setter booleano reflejado como atributo: `set open(v) { this.setBooleanAttr('open', v); }`. */
  setBooleanAttr(name: string, value: unknown): void {
    this.toggleAttribute(name, !!value);
  }
}

/**
 * Registra la clase con su `static tag`. Idempotente (gana el primero que define: el kit puede cargarse dos veces),
 * materializa los `@attr` antes del `define` y, con `globalName`, expone la clase en `window` (`true` lo deriva del tag).
 */
export function define<T extends CustomElementConstructor>(ctor: T, globalName?: string | true): T {
  const tag = (ctor as unknown as ConstructorConTag).tag;
  if (!tag) throw new Error(`define(${ctor.name}): falta static tag`);
  return defineElement(tag, ctor, globalName);
}
