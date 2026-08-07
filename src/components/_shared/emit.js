/**
 * emit.js — Disparo de eventos personalizados del kit.
 *
 * Todos los eventos del kit (`is-change`, `is-open`, `is-remove`, …) cruzan
 * el Shadow DOM y suben por el árbol, así que siempre llevan
 * `bubbles: true, composed: true`. Repetir ese objeto en los ~230 sitios que
 * lo disparaban era ruido puro:
 *
 *   this.dispatchEvent(new CustomEvent('is-remove', {
 *     bubbles: true, composed: true, detail: { value },
 *   }));
 *
 * pasa a ser:
 *
 *   emit(this, 'is-remove', { value });
 *
 * @param {EventTarget} host   Normalmente `this` (el custom element).
 * @param {string} type        Nombre del evento (`is-*`).
 * @param {*} [detail]         Payload. Se omite si es `undefined`.
 * @param {EventInit} [init]   Overrides: `{ cancelable: true }`,
 *                             `{ bubbles: false }`, etc.
 * @returns {boolean}          `false` si un listener llamó a
 *                             `preventDefault()` (sólo relevante con
 *                             `cancelable: true`); si no, `true`.
 */
export function emit(host, type, detail, init) {
  return host.dispatchEvent(new CustomEvent(type, {
    bubbles: true,
    composed: true,
    detail,
    ...init,
  }));
}

/**
 * Variante cancelable: dispara el evento y devuelve `true` si NINGÚN
 * listener llamó a `preventDefault()`. Uso típico en acciones que el
 * consumidor puede vetar (cerrar un modal, borrar un tag):
 *
 *   if (!emitCancelable(this, 'is-before-close')) return;
 *
 * @param {EventTarget} host
 * @param {string} type
 * @param {*} [detail]
 * @param {EventInit} [init]
 * @returns {boolean} `true` si se puede continuar.
 */
export function emitCancelable(host, type, detail, init) {
  return emit(host, type, detail, { cancelable: true, ...init });
}
