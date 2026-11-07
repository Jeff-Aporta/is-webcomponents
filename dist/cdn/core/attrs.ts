/**
 * attrs.ts — Todo lo relativo a los ATRIBUTOS de un componente del kit.
 *
 * Phase V5: el volcado automático del mapa `styleAttrs` quedó deshabilitado
 * en `element-base.ts` y en `withStyleAttrs` por regla del usuario. Un
 * componente NO debe setear `--iswc-*-X` desde props; el consumer define los
 * tokens vía CSS class, inline style o las props semánticas. Las funciones
 * `syncStyleAttr` / `syncPresentStyleAttrs` / `applyToneRamp` se conservan
 * para uso explícito (p.ej. `<iswc-button>` usa `syncPresentStyleAttrs`
 * para re-aplicar roles finos encima de la rampa).
 */
/** Una entrada del mapa: la custom property, o la property con condicion. */

/** Nombres CSS con los que un consumidor puede pintar de verdad. */
import type { StyleAttrDef, StyleAttrMap, Constructor, Intent, Tone, ButtonShape, MediaShape } from './schemas/attrs.schemas.js';

const NAMED_COLORS = new Set([
  'currentcolor', 'transparent', 'black', 'white', 'red', 'green', 'blue',
  'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'brown', 'cyan',
  'magenta', 'lime', 'navy', 'teal', 'olive', 'maroon', 'silver', 'gold',
  'indigo', 'violet', 'salmon', 'coral', 'crimson', 'khaki', 'lavender',
  'plum', 'orchid', 'turquoise', 'tomato', 'dodgerblue', 'steelblue',
  'slategray', 'slategrey', 'seagreen', 'skyblue', 'royalblue', 'tan',
]);

const COLOR_FN = /^(?:#|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\(|color-mix\(|var\(|light-dark\()/i;

/**
 * ¿El valor es un color CSS literal (o una var/función que resuelve a color)?
 */
export function isCssColorValue(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  if (!v) return false;
  return COLOR_FN.test(v) || NAMED_COLORS.has(v);
}

/**
 * Una entrada del mapa puede ser:
 *   'radius': '--iswc-button-border-radius'          → siempre se aplica
 *   'color':  { prop: '--x', onlyColorValues: true } → solo si parece color
 */

/** @param {StyleAttrDef} def */
function normalize(def: StyleAttrDef): { prop: string; onlyColorValues: boolean } {
  return typeof def === 'string'
    ? { prop: def, onlyColorValues: false }
    : { prop: def.prop, onlyColorValues: def.onlyColorValues ?? false };
}

/**
 * Vuelca UN atributo a su custom property inline.
 */
export function syncStyleAttr(el: HTMLElement, attr: string, def: StyleAttrDef): void {
  const { prop, onlyColorValues } = normalize(def);
  const raw = el.getAttribute(attr);
  const apply = raw != null && raw !== '' && (!onlyColorValues || isCssColorValue(raw));
  if (apply) el.style.setProperty(prop, raw);
  else el.style.removeProperty(prop);
}

/**
 * Vuelca todos los atributos del mapa.
 */
export function syncStyleAttrs(el: HTMLElement, map: StyleAttrMap): void {
  for (const [attr, def] of Object.entries(map || {})) syncStyleAttr(el, attr, def);
}

/**
 * Como `syncStyleAttrs`, pero SOLO para los atributos presentes: no borra la
 * propiedad cuando el atributo falta. Es lo que hace falta después de aplicar
 * una rampa derivada (`applyToneRamp`), donde borrar por ausencia se llevaría
 * por delante los roles que acaba de calcular la rampa.
 */
export function syncPresentStyleAttrs(el: HTMLElement, map: StyleAttrMap): void {
  for (const [attr, def] of Object.entries(map || {})) {
    if (el.hasAttribute(attr)) syncStyleAttr(el, attr, def);
  }
}

/**
 * Nombres de atributo del mapa, para concatenarlos a `observedAttributes`.
 */
export function styleAttrNames(map: StyleAttrMap): string[] {
  return Object.keys(map || {});
}

/**
 * Documentación legible del mapa (la usan los .md y el panel de demos).
 */
export function describeStyleAttrs(map: StyleAttrMap): Array<{ attr: string; prop: string; onlyColorValues: boolean }> {
  return Object.entries(map || {}).map(([attr, def]) => ({ attr, ...normalize(def) }));
}

/**
 * Rampa de tono a partir de UN color literal.
 *
 * Un componente con variantes (filled/outlined/soft/…) no consume un color
 * suelto: consume roles (base, hover, active, texto, suave). Si el consumidor
 * escribe `color="#ae3ec9"` y solo se fija el rol base, el hover y el activo
 * se quedan con el tono semántico anterior y el botón cambia de familia al
 * pasar el puntero. Aquí se derivan todos los roles del mismo color con
 * `color-mix`, que el navegador resuelve en el espacio correcto.
 *
 */
export function applyToneRamp(el: HTMLElement, color: string | null, opts: { prefix?: string } = {}): void {
  const p = opts.prefix ?? '--_tone';
  const roles = {
    '': color,
    '-strong': color,
    '-stronger': `color-mix(in srgb, ${color} 86%, black)`,
    '-strongest': `color-mix(in srgb, ${color} 74%, black)`,
    '-paler': `color-mix(in srgb, ${color} 12%, white)`,
    '-pale': `color-mix(in srgb, ${color} 22%, white)`,
    '-text': `color-mix(in srgb, ${color} 86%, black)`,
    '-soft': `color-mix(in srgb, ${color} 16%, transparent)`,
    '-soft-active': `color-mix(in srgb, ${color} 26%, transparent)`,
    '-on': '#fff',
  };
  for (const [suffix, value] of Object.entries(roles)) {
    const prop = `${p}${suffix}`;
    if (color) el.style.setProperty(prop, value);
    else el.style.removeProperty(prop);
  }
}

/**
 * Mixin del mapa `styleAttrs` sobre el molde (core/iswc-element.ts):
 *
 *   class IswcFoo extends withStyleAttrs(IswcElement) {
 *     static tag = 'iswc-foo';
 *     static styleAttrs = { radius: '--iswc-foo-radius' };
 *     static observed = OBSERVED;   // el molde suma styleAttrNames a observedAttributes
 *   }
 *
 * Phase V5: el volcado automático del mapa `styleAttrs` quedó deshabilitado
 * por regla del usuario (un componente NO debe setear `--iswc-*-X` desde
 * props; el consumer define los tokens vía CSS class, inline style o props
 * semánticas). El campo `static styleAttrs` se conserva como documentación
 * histórica del contrato anterior, pero ya no se vuelca al host.
 * Encadena con los callbacks de la subclase: si la clase base ya definía
 * `connectedCallback` / `attributeChangedCallback`, se llaman igual.
 */

export function withStyleAttrs<T extends Constructor>(Base: T) {
  return class StyleAttrsElement extends Base {
    static styleAttrs: StyleAttrMap = {};

    static get styleAttrNames(): string[] { return styleAttrNames(this.styleAttrs); }

    // `super.x?.()` no vale: la clase base es generica y TS no sabe si define
    // los callbacks. Se resuelve por el prototipo, que es lo que hace el
    // encadenado real, y ademas respeta la cadena aunque la base los anada
    // despues.
    connectedCallback(...args: unknown[]): void {
      // Phase V5: deshabilitado el volcado automático del mapa styleAttrs.
      // syncStyleAttrs(this, (this.constructor as typeof StyleAttrsElement).styleAttrs);
      const heredado = (Base.prototype as Record<string, unknown>)['connectedCallback'];
      if (typeof heredado === 'function') heredado.apply(this, args);
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null, ...rest: unknown[]): void {
      // Phase V5: deshabilitado el volcado automático del mapa styleAttrs.
      // const map = (this.constructor as typeof StyleAttrsElement).styleAttrs;
      // if (map && name in map) syncStyleAttrs(this, { [name]: map[name]! });
      const heredado = (Base.prototype as Record<string, unknown>)['attributeChangedCallback'];
      if (typeof heredado === 'function') heredado.apply(this, [name, oldValue, newValue, ...rest]);
    }
  };
}


// ── reflect ──
/**
 * reflect.js — Reflejo de propiedades JS a atributos HTML.
 *
 * El kit escribía la MISMA operación de siete maneras distintas repartidas
 * por ~145 setters:
 *
 *   v == null || v === '' ? this.removeAttribute('x') : this.setAttribute('x', v);
 *   v == null || v === '' ? this.removeAttribute('x') : this.setAttribute('x', String(v));
 *   if (v == null || v === '') this.removeAttribute('x'); else this.setAttribute('x', v);
 *   if (v == null || v === '') this.removeAttribute('x'); else this.setAttribute('x', String(v));
 *
 * Las cuatro son idénticas (`setAttribute` ya convierte a string), pero al
 * estar escritas distinto nadie podía ver de un vistazo si el componente de
 * al lado trataba el string vacío igual. Aquí queda UNA forma por semántica,
 * y la semántica está en el nombre.
 *
 * Booleanos: no hay helper. `this.toggleAttribute('x', !!v)` ya es una línea
 * y añadir una función encima sólo alarga la pila de llamadas.
 */
/**
 * Atributo de texto: `null`, `undefined` y `''` QUITAN el atributo.
 *
 * Es la semántica correcta cuando "vacío" y "ausente" significan lo mismo
 * para el componente (`label`, `placeholder`, `icon`, `href`…): así el CSS
 * puede usar `:not([label])` sin tener que contemplar `label=""`.
 *
 *   set label(v) { setStringAttr(this, 'label', v); }
 *
 * @param {Element} el
 * @param {string} attr
 * @param {*} value
 */
export function setStringAttr(el: Element, attr: string, value: unknown) {
  if (value == null || value === '') el.removeAttribute(attr);
  else el.setAttribute(attr, String(value));
}

/**
 * Atributo opcional: sólo `null` y `undefined` quitan el atributo; el string
 * vacío SE CONSERVA (`x=""`).
 *
 * Para atributos donde "" es un valor con significado propio, distinto de
 * "sin poner" — típicamente `value` en los controles de formulario, donde
 * `value=""` es "el usuario lo borró" y ausente es "aún sin tocar".
 *
 * @param {Element} el
 * @param {string} attr
 * @param {*} value
 */
export function setOptionalAttr(el: Element, attr: string, value: unknown) {
  if (value == null) el.removeAttribute(attr);
  else el.setAttribute(attr, String(value));
}

/**
 * Lee un atributo numérico. Devuelve `fallback` si falta, está vacío o no es
 * un número finito — nunca `NaN`, que es la fuente habitual de anchos y
 * porcentajes rotos aguas abajo.
 *
 *   get max() { return getNumberAttr(this, 'max', 100); }
 *
 * @param {Element} el
 * @param {string} attr
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function getNumberAttr(el: Element, attr: string, fallback: number = 0) {
  const raw = el.getAttribute(attr);
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// ── intent ──
/**
 * intent.js — Intenciones semánticas (atributo `color`) compartidas.
 *
 * Un "intent" describe EL SIGNIFICADO del color que aplica el componente,
 * no su apariencia. Ejemplos: success (verde), warning (amarillo), danger
 * (rojo), brand (color de marca), neutral (gris muted), text (foreground
 * del tema — plain/outlined legibles: Editar, Descargar…).
 *
 * Default: 'brand' (no 'neutral'). Convención 2026-08 — ver LLM.md §6.16.
 *
 * Compartido por: iswc-button, iswc-tag, iswc-badge, iswc-callout, iswc-toast,
 * iswc-toast-item, iswc-stat, iswc-fab, iswc-checkbox, iswc-radio, iswc-radio-group,
 * iswc-rating, iswc-switch.
 *
 * CDN: reexportado en `helpers/ui.min.mjs` (`IswcUi.INTENT`, `ensureDefaultColor`, …).
 */
export const INTENT = Object.freeze([
  'brand',     // color de marca (default)
  'neutral',   // gris #888, sin tinte semántico (muted)
  'text',      // foreground del tema (--iswc-text)
  'success',   // verde — confirmación / validación OK
  'warning',   // amarillo — atención, no crítico
  'danger',    // rojo — error / acción destructiva
  'info',      // azul informativo
  'error',     // rojo de error (alias semántico de danger en varios CE)
]);

export const DEFAULT_INTENT = 'brand';

/** Los valores validos de intencion, derivados de la lista: una sola fuente. */

/**
 * Devuelve el intent si es válido, o `fallback` si no.
 * Útil en setters para rechazar valores fuera de la enum sin romper el render.
 */
export function normalizeIntent(value: unknown, fallback: Intent = DEFAULT_INTENT): Intent {
  if (typeof value !== 'string') return fallback;
  return (INTENT as readonly string[]).includes(value) ? (value as Intent) : fallback;
}

/**
 * Setter helper para atributos reflected: acepta cualquier valor y guarda
 * sólo si está en la enum. Uso típico en componentes con intent:
 *
 *   set color(v) { setEnumAttr(this, 'color', normalizeIntent(v)); }
 */
export function setEnumAttr(el: Element, attr: string, normalized: string | null | undefined): void {
  if (normalized == null || normalized === '') el.removeAttribute(attr);
  else el.setAttribute(attr, normalized);
}

/**
 * Garantiza `color` con default de kit (`brand`) si el consumer no lo puso.
 * Misma regla que button/switch: sin atributo → brand; con valor → se respeta
 * (tras normalizar). Apps CDN: `IswcUi.ensureDefaultColor(el)`.
 */
export function ensureDefaultColor(
  el: Element,
  fallback: Intent = DEFAULT_INTENT,
): Intent {
  if (!el.hasAttribute('color')) {
    el.setAttribute('color', fallback);
    return fallback;
  }
  const next = normalizeIntent(el.getAttribute('color'), fallback);
  if (el.getAttribute('color') !== next) el.setAttribute('color', next);
  return next;
}

// ── tone ──
/**
 * tone.js — Niveles de relleno (atributo `variant`) compartidos.
 *
 * Un "tone" describe EL GRADO DE PESO VISUAL: outlined (sin relleno, sólo
 * borde), filled (relleno sólido), plain (texto plano), accent (borde +
 * acento lateral), filled-outlined (combinación).
 *
 * Compartido por: iswc-tag, iswc-badge, iswc-card, iswc-callout, iswc-details.
 *
 * Diferencia con intent.js: el intent define QUÉ color aplica; el tone
 * define CUÁNTO PESO VISUAL tiene ese color.
 */
export const TONE = Object.freeze([
  'accent',           // borde + acento lateral (sidebar TOC, callout admonition)
  'filled',           // relleno sólido
  'outlined',         // sin relleno, sólo borde
  'filled-outlined',  // relleno + borde (caso intermedio)
  'plain',            // texto plano sin borde ni fondo
]);

export const DEFAULT_TONE = 'filled';

/** Variantes validas, derivadas de la lista: una sola fuente. */

/**
 * Devuelve el tone si es válido, o `fallback` si no.
 */
export function normalizeTone(value: unknown, fallback: Tone = DEFAULT_TONE): Tone {
  if (typeof value !== 'string') return fallback;
  return (TONE as readonly string[]).includes(value) ? (value as Tone) : fallback;
}

/**
 * Setter helper para atributos reflected: acepta cualquier valor y guarda
 * sólo si está en la enum. Espejo de `setEnumAttr` en intent.js.
 *
 *   set color(v) { setEnumToneAttr(this, 'color', normalizeTone(v)); }
 */
export function setEnumToneAttr(el: Element, attr: string, normalized: string | null | undefined): void {
  if (normalized == null || normalized === '') el.removeAttribute(attr);
  else el.setAttribute(attr, normalized);
}

// ── button-shape ──
/**
 * button-shape.ts — Contorno de controles tipo botón (atributo `shape`).
 *
 * Compartido por: iswc-button (y quien reenvía `shape` al botón, p. ej. prefs-clear).
 * No mezclar con MEDIA_SHAPE (avatar / theme-img): otro dominio (recorte de media).
 */
export const BUTTON_SHAPE = Object.freeze([
  'none',
  'round',
  'square',
  'rect',
  'pill',
] as const);

export const DEFAULT_BUTTON_SHAPE = 'round';

/** Iconos sugeridos para paneles de demo / selects. */
export const BUTTON_SHAPE_ICON: Record<ButtonShape, string> = Object.freeze({
  none: 'mdi:cancel',
  round: 'mdi:rounded-corner',
  square: 'mdi:square-outline',
  rect: 'mdi:rectangle-outline',
  pill: 'mdi:capsule',
});

export function normalizeButtonShape(
  value: unknown,
  fallback: ButtonShape = DEFAULT_BUTTON_SHAPE,
): ButtonShape {
  if (typeof value !== 'string') return fallback;
  return (BUTTON_SHAPE as readonly string[]).includes(value)
    ? (value as ButtonShape)
    : fallback;
}

// ── media-shape ──
/**
 * media-shape.ts — Recorte visual de media (atributo `shape`).
 *
 * Compartido por: iswc-avatar, iswc-theme-img.
 * Distinto de BUTTON_SHAPE (contorno de botón / chrome).
 */
export const MEDIA_SHAPE = Object.freeze(['circle', 'square', 'rounded'] as const);

export const DEFAULT_MEDIA_SHAPE = 'circle';

export const MEDIA_SHAPE_ICON: Record<MediaShape, string> = Object.freeze({
  circle: 'mdi:circle-outline',
  square: 'mdi:square-outline',
  rounded: 'mdi:rounded-corner',
});

export function normalizeMediaShape(
  value: unknown,
  fallback: MediaShape = DEFAULT_MEDIA_SHAPE,
): MediaShape {
  if (typeof value !== 'string') return fallback;
  return (MEDIA_SHAPE as readonly string[]).includes(value)
    ? (value as MediaShape)
    : fallback;
}
