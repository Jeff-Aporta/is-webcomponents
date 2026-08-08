/**
 * upgradeProperties(host, props)
 *
 * Aplica el patrón canónico de "upgrade" para custom elements:
 *
 *   class MyEl extends HTMLElement {
 *     connectedCallback() {
 *       upgradeProperties(this, ['label-placement', 'open']);
 *       // …resto del init
 *     }
 *   }
 *
 * Sin esto, si el consumidor hace `el.labelPlacement = 'x'` antes de
 * `connectedCallback()`, el setter escribe una propiedad JS que el
 * observedAttributes nunca refleja y el atributo se queda en su valor
 * por defecto cuando el componente arranca. El upgrade mueve esa
 * escritura al setter (y de ahí al atributo reflejado).
 *
 * Cada nombre en `props` es el atributo observado (kebab-case). Se
 * convierte a camelCase para localizar la own-property que el consumidor
 * pudo haber escrito antes del upgrade (`label-placement` →
 * `labelPlacement`). Si no hay own-property en camel, se prueba el
 * nombre crudo. La reasignación siempre pasa por el setter camelCase
 * para que booleanos y lógica custom del setter se ejecuten.
 *
 * Se omiten `null`/`undefined`. `false` y demás valores falsy sí se
 * reasignan vía setter.
 *
 * @param {HTMLElement} host
 * @param {string[]} props — nombres de atributo (kebab-case)
 */
export function upgradeProperties(host, props) {
  for (const a of props) {
    const camel = a.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const key = Object.prototype.hasOwnProperty.call(host, camel)
      ? camel
      : Object.prototype.hasOwnProperty.call(host, a)
        ? a
        : null;
    if (key == null) continue;
    const v = host[key];
    delete host[key];
    if (v == null) continue;
    host[camel] = v;
  }
}
