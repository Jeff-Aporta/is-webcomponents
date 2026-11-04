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

import { sheetsBase, textoHojasBase } from './base-sheets.js';
import { materializarAtributos } from './attrs.js';
import { routeThroughLoader } from '../build/asset-url.js';

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
