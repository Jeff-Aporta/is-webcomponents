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
export function setStringAttr(el, attr, value) {
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
export function setOptionalAttr(el, attr, value) {
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
export function getNumberAttr(el, attr, fallback = 0) {
  const raw = el.getAttribute(attr);
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
