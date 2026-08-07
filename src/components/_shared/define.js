/**
 * define.js — Registro idempotente de custom elements.
 *
 * Centraliza el bloque que se repetía al final de ~110 componentes:
 *
 *   if (!customElements.get('is-tag')) {
 *     customElements.define('is-tag', IsTag);
 *   }
 *   if (typeof window !== 'undefined') {
 *     window.IsTag = IsTag;
 *   }
 *
 * que pasa a ser una línea:
 *
 *   defineElement('is-tag', IsTag, 'IsTag');
 *
 * El guard `customElements.get` es obligatorio porque el kit se puede cargar
 * dos veces (CDN + bundle local, o dos apps en la misma página) y
 * `customElements.define` lanza `NotSupportedError` al re-registrar un tag.
 * Gana el primero que defina.
 *
 * El global `window.IsX` existe para tests y para consumidores sin módulos
 * (snippets CDN que hacen `new window.IsTag()`); se omite pasando sólo dos
 * argumentos.
 *
 * @param {string} tag                Nombre del tag (`is-foo`).
 * @param {CustomElementConstructor} ctor
 * @param {string|true} [globalName]  Nombre bajo el que exponer `ctor` en
 *                                    `window`. `true` lo deriva del tag
 *                                    (`is-date-input` → `IsDateInput`).
 *                                    Si se omite, no se expone.
 * @returns {CustomElementConstructor} El mismo `ctor`, para encadenar.
 */
export function defineElement(tag, ctor, globalName) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
  const name = globalName === true ? globalNameFor(tag) : globalName;
  if (name && typeof window !== 'undefined') window[name] = ctor;
  return ctor;
}

/**
 * Deriva el nombre global PascalCase de un tag: `is-date-input` →
 * `IsDateInput`. Las fábricas (`defineTypedChart`, `definePickerInput`,
 * `defineDateField`) lo usaban con copias locales de este `replace`.
 *
 * @param {string} tag
 * @returns {string}
 */
export function globalNameFor(tag) {
  return tag.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
}
