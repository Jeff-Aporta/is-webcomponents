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
 */

import { sheetsBase, soportaHojasAdoptadas } from './base-sheets.js';
import { materializarAtributos } from './attrs.js';

/* ─────────────────────────────── registro ─────────────────────────────── */

/**
 * Deriva el nombre global PascalCase de un tag: `is-date-input` → `IsDateInput`.
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
 *   consumidores sin módulos que hacen `new window.IsTag()`. `true` lo deriva
 *   del tag. Omitido, no se expone.
 * @returns El mismo `ctor`, para poder encadenar.
 */
export function defineElement<T extends CustomElementConstructor>(
  tag: string,
  ctor: T,
  globalName?: string | true,
): T {
  // Antes del define: materializa @attr* para que observedAttributes no quede [].
  if (!customElements.get(tag)) {
    materializarAtributos(ctor);
    customElements.define(tag, ctor);
  }
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
 * Conserva el sufijo `.min`: `foo.min.js` → `foo.min.css`. Es lo que permite
 * que el mismo código valga en desarrollo (fuente) y en el CDN (minificado)
 * sin saber cuál de los dos está corriendo.
 */
export function siblingCssHref(moduleUrl: string): string {
  const sibling = new URL(moduleUrl);
  sibling.pathname = sibling.pathname.replace(/\.js$/i, '.css');
  return sibling.href;
}

/** CSS propio del componente, incrustado por el build (`define` en `bundleJs`). */
declare const __IS_COMPONENT_CSS__: string;

/** Una `CSSStyleSheet` por texto CSS: todas las instancias adoptan la misma. */
const cachePropias = new Map<string, CSSStyleSheet>();

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

/** Inserta el CSS como `<style>`: sin `adoptedStyleSheets`, pero sin petición. */
function estiloInline(shadowRoot: ShadowRoot, css: string): void {
  const est = document.createElement('style');
  est.textContent = css;
  shadowRoot.prepend(est);
}

/**
 * Inyecta en el ShadowRoot la hoja base, los scrollbars tematizados y el `.css`
 * hermano del módulo.
 *
 * **Llamar DESPUÉS de rellenar el shadow.** Un `innerHTML = …` posterior borra
 * los `<link>` que este método acaba de poner y el componente se queda sin
 * estilos, sin dar ningún error.
 *
 * `baseUrl` es dónde viven `host-base.css` y `scrollbars.css`. Por defecto, la
 * carpeta de este módulo — que es lo correcto mientras el core se inline en cada
 * bundle. Si algún día el core se publica externo, el llamador tiene que pasar
 * su propia URL o las dos hojas se buscarán junto al core y no junto al
 * componente.
 */
export function adoptCss(shadowRoot: ShadowRoot, moduleUrl: string, baseUrl: string = import.meta.url): void {
  const hoja = (href: string): HTMLLinkElement => {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    return el;
  };

  // El CSS propio lo incrusta el build, así que no hay petición que esperar y
  // el shadow nunca se pinta sin estilo. `replaceSync` descarta `@import`, pero
  // el build ya los aplana — ver `bundleCss` en `scripts/build.mjs`.
  const propio = typeof __IS_COMPONENT_CSS__ === 'string' ? __IS_COMPONENT_CSS__ : '';

  // Base y scrollbars primero: la hoja propia tiene que poder pisarlas por
  // cascada. Son las mismas para toda la página, así que van por referencia.
  const base = sheetsBase();
  const baseAdoptada = base !== null && adoptar(shadowRoot, base);

  let propioResuelto = false;
  if (propio && soportaHojasAdoptadas) {
    let hojaPropia = cachePropias.get(propio);
    if (!hojaPropia) {
      hojaPropia = new CSSStyleSheet();
      hojaPropia.replaceSync(propio);
      cachePropias.set(propio, hojaPropia);
    }
    propioResuelto = adoptar(shadowRoot, [hojaPropia]);
  }

  // Cada rama cae al escalón siguiente sólo si la anterior no pudo aplicarse:
  // adoptar → <style> (cero peticiones) → <link> (comportamiento anterior).
  if (propio && !propioResuelto) estiloInline(shadowRoot, propio);
  if (!propio) shadowRoot.prepend(hoja(siblingCssHref(moduleUrl)));

  if (!baseAdoptada) {
    shadowRoot.prepend(
      hoja(new URL('./host-base.css', baseUrl).href),
      hoja(new URL('./scrollbars.css', baseUrl).href),
    );
  }
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
 *   if (!emitCancelable(this, 'is-before-close')) return;
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
