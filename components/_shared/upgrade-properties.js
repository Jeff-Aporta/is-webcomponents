/**
 * upgradeProperties(host, props)
 *
 * Aplica el patrón canónico de "upgrade" para custom elements:
 *
 *   class MyEl extends HTMLElement {
 *     #upgradeProps = ['open', 'variant', 'disabled'];
 *
 *     connectedCallback() {
 *       upgradeProperties(this, this.#upgradeProps);
 *       // …resto del init
 *     }
 *   }
 *
 * Sin esto, si el consumidor hace `el.open = true` antes de
 * `connectedCallback()`, el setter escribe una propiedad JS que el
 * observedAttributes nunca refleja y el atributo se queda en su valor
 * por defecto cuando el componente arranca. El upgrade mueve esa
 * escritura al atributo.
 *
 * Booleanos: el valor `true` se traduce a `attr=""` (atributo vacío)
 * para que `hasAttribute('foo')` funcione. `false`/`null`/`undefined`
 * eliminan el atributo.
 *
 * @param {HTMLElement} host
 * @param {string[]} props
 */
export function upgradeProperties(host, props) {
  for (const a of props) {
    if (!Object.prototype.hasOwnProperty.call(host, a)) continue;
    const v = host[a];
    delete host[a];
    if (v == null || v === false) continue;
    if (v === true) host.setAttribute(a, '');
    else host.setAttribute(a, v);
  }
}