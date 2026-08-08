/**
 * style-attrs.js — Personalización por ATRIBUTO en vez de por hoja externa.
 *
 * El problema: para cambiar el radio o el color de un componente había que
 * escribir un `<style>` aparte apuntando a un id y redefinir ahí las custom
 * properties. Teniendo el tag delante, eso es ceremonia innecesaria:
 *
 *   <style> #b { --is-button-border-radius: 0; } </style>
 *   <is-button id="b">Guardar</is-button>
 *
 * Con esto:
 *
 *   <is-button radius="0">Guardar</is-button>
 *
 * Cada componente declara un mapa `atributo → custom property`. El valor del
 * atributo se escribe como propiedad INLINE en el host, así que sigue siendo
 * una custom property normal: cascada, herencia y `::part` no cambian, y un
 * `<style>` externo con mayor especificidad sigue pudiendo ganar.
 *
 * Sobre `color`: en este kit `color` ya es una VARIANTE SEMÁNTICA
 * (`brand | danger | success | …`), no un valor CSS. Para no romper ese
 * contrato, un valor que parezca color CSS (`#…`, `rgb()`, `oklch()`,
 * `var(--x)`, `color-mix()`, o un nombre CSS conocido) se aplica como color
 * literal; cualquier otro valor se deja pasar para que el componente lo trate
 * como variante. Así `color="danger"` y `color="#ae3ec9"` conviven.
 */

/** Nombres CSS con los que un consumidor puede pintar de verdad. */
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
 * @param {string | null | undefined} value
 */
export function isCssColorValue(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  if (!v) return false;
  return COLOR_FN.test(v) || NAMED_COLORS.has(v);
}

/**
 * Una entrada del mapa puede ser:
 *   'radius': '--is-button-border-radius'          → siempre se aplica
 *   'color':  { prop: '--x', onlyColorValues: true } → solo si parece color
 * @typedef {string | { prop: string, onlyColorValues?: boolean }} StyleAttrDef
 */

/** @param {StyleAttrDef} def */
function normalize(def) {
  return typeof def === 'string' ? { prop: def, onlyColorValues: false } : def;
}

/**
 * Vuelca UN atributo a su custom property inline.
 * @param {HTMLElement} el
 * @param {string} attr
 * @param {StyleAttrDef} def
 */
export function syncStyleAttr(el, attr, def) {
  const { prop, onlyColorValues } = normalize(def);
  const raw = el.getAttribute(attr);
  const apply = raw != null && raw !== '' && (!onlyColorValues || isCssColorValue(raw));
  if (apply) el.style.setProperty(prop, raw);
  else el.style.removeProperty(prop);
}

/**
 * Vuelca todos los atributos del mapa.
 * @param {HTMLElement} el
 * @param {Record<string, StyleAttrDef>} map
 */
export function syncStyleAttrs(el, map) {
  for (const [attr, def] of Object.entries(map || {})) syncStyleAttr(el, attr, def);
}

/**
 * Como `syncStyleAttrs`, pero SOLO para los atributos presentes: no borra la
 * propiedad cuando el atributo falta. Es lo que hace falta después de aplicar
 * una rampa derivada (`applyToneRamp`), donde borrar por ausencia se llevaría
 * por delante los roles que acaba de calcular la rampa.
 * @param {HTMLElement} el
 * @param {Record<string, StyleAttrDef>} map
 */
export function syncPresentStyleAttrs(el, map) {
  for (const [attr, def] of Object.entries(map || {})) {
    if (el.hasAttribute(attr)) syncStyleAttr(el, attr, def);
  }
}

/**
 * Nombres de atributo del mapa, para concatenarlos a `observedAttributes`.
 * @param {Record<string, StyleAttrDef>} map
 * @returns {string[]}
 */
export function styleAttrNames(map) {
  return Object.keys(map || {});
}

/**
 * Documentación legible del mapa (la usan los .md y el panel de demos).
 * @param {Record<string, StyleAttrDef>} map
 * @returns {{ attr: string, prop: string, onlyColorValues: boolean }[]}
 */
export function describeStyleAttrs(map) {
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
 * @param {HTMLElement} el
 * @param {string | null} color  color CSS literal, o null para limpiar
 * @param {{ prefix?: string }} [opts]
 */
export function applyToneRamp(el, color, opts = {}) {
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
