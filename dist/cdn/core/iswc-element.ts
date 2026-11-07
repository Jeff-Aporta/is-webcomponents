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
 *     static observed = ['color', 'variant'];        // + styleAttrs (+ @prop) → observedAttributes
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
import textoBase from 'iswc:css/host-base';
import textoScroll from 'iswc:css/scrollbars';
import { styleAttrNames } from './attrs.js';
import { routeThroughLoader } from '../build/asset-url.js';
import type { StyleAttrMap } from './schemas/attrs.schemas.js';
import type { ConstructorConTag, IswcElementStatics, LoaderDeps } from './schemas/iswc-element.schemas.js';


// ── base-sheets ──
/**
 * base-sheets.ts — `host-base.css` y `scrollbars.css` como hojas construidas,
 * creadas una sola vez y compartidas por todos los ShadowRoot de la página.
 *
 * Antes cada instancia de cada componente metía dos `<link>` a estas hojas en
 * su shadow, y el build las copiaba a las 14 carpetas de categoría. Para pintar
 * un `<iswc-tree-view>` eso eran 10 de las 38 peticiones, y ninguna se podía
 * paralelizar: el `href` sólo se conoce cuando el módulo que lo pide ya se
 * ejecutó.
 *
 * Este módulo se publica **externo** (`dist/cdn/core/iswc-element.min.mjs`),
 * igual que `decors`: una petición por página en lugar de dos por carpeta, y
 * una única `CSSStyleSheet` que todos los shadows adoptan por referencia.
 *
 * El CSS llega por los módulos virtuales `iswc:css/host-base` e
 * `iswc:css/scrollbars` (plan D6): el plugin `cssVirtual`
 * (src/cdn/build/css-virtual.ts) los resuelve contra `.tmp-scss/src/core/` en
 * cada build, y `scripts/serve.mjs` los sirve igual desde el staging. En Deno sin
 * empaquetar (tests jsdom) el import map de `deno.json` los apunta a un módulo
 * vacío: no hay texto que adoptar y `sheetsBase()` devuelve `null`.
 */
/** `true` si el navegador admite hojas construidas y adoptadas. */
export const soportaHojasAdoptadas = (() => {
  try {
    return (
      typeof ShadowRoot !== 'undefined' &&
      'adoptedStyleSheets' in ShadowRoot.prototype &&
      typeof new CSSStyleSheet().replaceSync === 'function'
    );
  } catch {
    return false;
  }
})();

let hojas: CSSStyleSheet[] | null | undefined;

/** Texto de las dos hojas base, en orden de cascada (base y luego scrollbars). Para el respaldo `<style>`. */
export function textoHojasBase(): string {
  return [textoBase, textoScroll].filter(Boolean).join('\n');
}

/**
 * Las dos hojas base, construidas al primer uso y memorizadas.
 *
 * Devuelve `null` cuando el navegador no admite `adoptedStyleSheets` o cuando
 * no hay CSS incrustado; en ambos casos el llamador recurre a `<style>`.
 */
export function sheetsBase(): CSSStyleSheet[] | null {
  if (hojas !== undefined) return hojas;
  if (!soportaHojasAdoptadas || (!textoBase && !textoScroll)) {
    hojas = null;
    return hojas;
  }
  const construir = (css: string): CSSStyleSheet => {
    const hoja = new CSSStyleSheet();
    hoja.replaceSync(css);
    return hoja;
  };
  // Orden: base y luego scrollbars, el mismo que tenían los `<link>`.
  hojas = [construir(textoBase), construir(textoScroll)];
  return hojas;
}

// ── element ──
/**
 * element.ts — Todo lo que hace falta para *ser* un custom element del kit.
 *
 * Consolida cuatro módulos que estaban sueltos en `_shared/` y que ningún
 * componente usaba por separado: quien define un elemento necesita registrarlo,
 * adoptar su CSS, recuperar las propiedades escritas antes del upgrade y emitir
 * eventos. Tenerlos en cuatro ficheros obligaba a cuatro imports en cada
 * componente y no compraba nada: 152 de 155 importaban `define`, 148
 * `adopt-css` y 115 `emit`.
 *
 * Lo que NO entra aquí son los atributos: eso es `attrs.ts`. La frontera es
 * «el elemento» contra «sus atributos», y es la única que ha resultado estable.
 *
 * Los componentes del kit NO usan este módulo para ser elementos: extienden el
 * molde `IswcElement` y se registran con `define()` (core/iswc-element.ts,
 * plan D4). Aquí quedan las funciones sueltas que el molde reutiliza
 * (`defineElement`, `emit`, `upgradeProperties`) y `adoptCss`, que sólo sirve a
 * código externo que todavía enlaza su `.css` hermano por `import.meta.url`.
 */
/* ─────────────────────────────── registro ─────────────────────────────── */

/**
 * Deriva el nombre global PascalCase de un tag: `iswc-date-input` → `IswcDateInput`.
 *
 * Las tres fábricas del kit (`defineTypedChart`, `definePickerInput`,
 * `defineDateField`) llevaban cada una su copia de este `replace`.
 */
export function globalNameFor(tag: string): string {
  return tag.replace(/(^|-)([a-z0-9])/g, (_m, _sep, c: string) => c.toUpperCase());
}

/**
 * Registro idempotente de un custom element.
 *
 * El guard sobre `customElements.get` es obligatorio, no defensivo: el kit se
 * puede cargar dos veces —CDN más bundle local, o dos apps en la misma página—
 * y `customElements.define` lanza `NotSupportedError` al re-registrar un tag.
 * Gana el primero que defina.
 *
 * @param globalName Nombre bajo el que exponer `ctor` en `window`, para tests y
 *   consumidores sin módulos que hacen `new window.IswcTag()`. `true` lo deriva
 *   del tag. Omitido, no se expone.
 * @returns El mismo `ctor`, para poder encadenar.
 */
export function defineElement<T extends CustomElementConstructor>(
  tag: string,
  ctor: T,
  globalName?: string | true,
): T {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
  const name = globalName === true ? globalNameFor(tag) : globalName;
  if (name && typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[name] = ctor;
  }
  return ctor;
}

/* ──────────────────────────────── estilos ─────────────────────────────── */

/**
 * Href del `.css` hermano de un módulo JS.
 *
 * Conserva el sufijo `.min`: `foo.min.mjs` (o `foo.min.js`) → `foo.min.css`. Es lo
 * que permite que el mismo código valga en desarrollo (fuente) y en el CDN
 * (minificado) sin saber cuál de los dos está corriendo.
 */
export function siblingCssHref(moduleUrl: string): string {
  const sibling = new URL(moduleUrl);
  sibling.pathname = sibling.pathname.replace(/\.m?js$/i, '.css');
  return sibling.href;
}

/**
 * Añade hojas al shadow sin duplicar las que ya tuviera.
 *
 * Devuelve `false` si la adopción no fue posible. El `catch` no es defensivo:
 * `'adoptedStyleSheets' in ShadowRoot.prototype` da `true` en entornos donde el
 * acceso real falla (polyfills parciales, el propio getter parcheado), y sin
 * este guard el componente se quedaba **sin ningún estilo** y con la excepción
 * subiendo al constructor.
 */
function adoptar(shadowRoot: ShadowRoot, nuevas: CSSStyleSheet[]): boolean {
  try {
    const actuales = shadowRoot.adoptedStyleSheets;
    const faltan = nuevas.filter((h) => actuales.indexOf(h) === -1);
    if (faltan.length > 0) shadowRoot.adoptedStyleSheets = [...actuales, ...faltan];
    return true;
  } catch {
    return false;
  }
}

/**
 * Compatibilidad para código EXTERNO al kit: hojas base + `<link>` al `.css`
 * hermano de `moduleUrl`. Los componentes del kit no la usan: el molde
 * `IswcElement` adopta su `static css` (import `iswc:css`) sin petición.
 *
 * **Llamar DESPUÉS de rellenar el shadow.** Un `innerHTML = …` posterior borra
 * el `<link>` que este método acaba de poner.
 *
 * `baseUrl` es dónde viven `host-base.css` y `scrollbars.css`, para cuando las
 * hojas base no vinieron incrustadas (consumo de `src/` sin empaquetar).
 */
export function adoptCss(shadowRoot: ShadowRoot, moduleUrl: string, baseUrl: string = import.meta.url): void {
  const hoja = (href: string): HTMLLinkElement => {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = routeThroughLoader(href);
    return el;
  };
  shadowRoot.prepend(hoja(siblingCssHref(moduleUrl)));
  // Base y scrollbars primero en la cascada: la hoja propia tiene que poder pisarlas.
  const base = sheetsBase();
  if (base !== null && adoptar(shadowRoot, base)) return;
  const texto = textoHojasBase();
  if (texto) {
    const est = document.createElement('style');
    est.textContent = texto;
    shadowRoot.prepend(est);
    return;
  }
  shadowRoot.prepend(
    hoja(new URL('./host-base.css', baseUrl).href),
    hoja(new URL('./scrollbars.css', baseUrl).href),
  );
}

/* ──────────────────────────────── eventos ─────────────────────────────── */

/**
 * Dispara un evento del kit.
 *
 * Todos cruzan el Shadow DOM y suben por el árbol, así que siempre llevan
 * `bubbles: true, composed: true`. Repetir ese objeto en los ~230 sitios que lo
 * hacían era ruido puro.
 *
 * @returns `false` si un listener llamó a `preventDefault()`; sólo es
 *   significativo con `cancelable: true`.
 */
export function emit<T = unknown>(
  host: EventTarget,
  type: string,
  detail?: T,
  init?: EventInit,
): boolean {
  return host.dispatchEvent(new CustomEvent(type, {
    bubbles: true,
    composed: true,
    detail,
    ...init,
  }));
}

/**
 * Variante cancelable. Devuelve `true` si NINGÚN listener vetó.
 *
 *   if (!emitCancelable(this, 'iswc-before-close')) return;
 */
export function emitCancelable<T = unknown>(
  host: EventTarget,
  type: string,
  detail?: T,
  init?: EventInit,
): boolean {
  return emit(host, type, detail, { cancelable: true, ...init });
}

/* ─────────────────────────────── upgrade ──────────────────────────────── */

/**
 * Recupera las propiedades que el consumidor escribió antes del upgrade.
 *
 * Sin esto, un `el.labelPlacement = 'x'` **antes** de que el elemento se
 * defina crea una propiedad propia que tapa al setter del prototipo: el setter
 * no llega a correr nunca, el atributo se queda en su valor por defecto y el
 * componente arranca ignorando lo que le pidieron.
 *
 * Cada nombre es el atributo observado en kebab-case. Se busca la propiedad
 * propia en camelCase (`label-placement` → `labelPlacement`) y, si no está, con
 * el nombre crudo. La reasignación siempre va por el setter camelCase para que
 * la lógica del setter se ejecute.
 *
 * `null` y `undefined` se descartan; `false` y demás falsy sí se reasignan.
 */
export function upgradeProperties(host: HTMLElement, props: readonly string[]): void {
  const registro = host as unknown as Record<string, unknown>;
  for (const attr of props) {
    const camel = attr.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    const propia = (k: string) => Object.prototype.hasOwnProperty.call(host, k);
    const key = propia(camel) ? camel : propia(attr) ? attr : null;
    if (key == null) continue;
    const valor = registro[key];
    delete registro[key];
    if (valor == null) continue;
    registro[camel] = valor;
  }
}

// ── iswc-element ──
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
  /** Atributos observados propios. `observedAttributes` = esto ∪ `styleAttrs` (∪ `@prop` en `IswcReactive`). */
  static observed: readonly string[] = [];
  /** Tags hijos que se piden a `iswcLoader.ensure()` al primer `connectedCallback` (sin loader no hace nada). */
  static deps: readonly string[] = [];
  /** Opciones del shadow. `null` = light DOM (el molde no crea shadow ni adopta hojas). */
  static shadowInit: ShadowRootInit | null = { mode: 'open' };
  /** Mapa `atributo → custom property` (contrato histórico; su volcado sigue deshabilitado desde V5). */
  static styleAttrs: StyleAttrMap = {};

  static get observedAttributes(): string[] {
    return [...new Set([...this.observed, ...styleAttrNames(this.styleAttrs)])];
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
    return emit(this, name, detail, opts);
  }

  /** Setter booleano reflejado como atributo: `set open(v) { this.setBooleanAttr('open', v); }`. */
  setBooleanAttr(name: string, value: unknown): void {
    this.toggleAttribute(name, !!value);
  }
}

/**
 * Registra la clase con su `static tag`. Idempotente (gana el primero que define: el kit puede cargarse dos veces),
 * y, con `globalName`, expone la clase en `window` (`true` lo deriva del tag).
 */
export function define<T extends CustomElementConstructor>(ctor: T, globalName?: string | true): T {
  const tag = (ctor as unknown as ConstructorConTag).tag;
  if (!tag) throw new Error(`define(${ctor.name}): falta static tag`);
  return defineElement(tag, ctor, globalName);
}
