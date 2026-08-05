/**
 * ISComponentPreview — controlador tipado de un preview de componente.
 *
 * La definición (secciones/bloques) es datos. El comportamiento se escribe en
 * `mount` / `unmount` como métodos reales (addEventListener, whenDefined, …).
 * Nunca `eval` ni strings de lógica.
 *
 * @typedef {import('./types.d.ts').PreviewDefinition} PreviewDefinition
 * @typedef {import('./types.d.ts').PreviewMountContext} PreviewMountContext
 * @typedef {import('./types.d.ts').ISComponentPreviewLike} ISComponentPreviewLike
 */

/** @implements {ISComponentPreviewLike} */
export class ISComponentPreview {
  /** @param {PreviewDefinition} definition */
  constructor(definition) {
    if (!definition?.tag) throw new Error('ISComponentPreview: falta definition.tag');
    if (!Array.isArray(definition.sections)) {
      throw new Error(`ISComponentPreview(${definition.tag}): sections[] obligatorio`);
    }
    /** @type {PreviewDefinition} */
    this.definition = Object.freeze({
      ...definition,
      sections: definition.sections.map((s) => Object.freeze({ ...s, blocks: [...s.blocks] })),
    });
    /** @type {AbortController | null} */
    this.#ac = null;
  }

  /** @type {AbortController | null} */
  #ac;

  /**
   * Signal para listeners: this.on(el, 'is-change', handler)
   * Se aborta automáticamente en unmount.
   * @returns {AbortSignal}
   */
  get signal() {
    if (!this.#ac) this.#ac = new AbortController();
    return this.#ac.signal;
  }

  /**
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {AddEventListenerOptions} [options]
   */
  on(target, type, listener, options = {}) {
    target.addEventListener(type, listener, { ...options, signal: this.signal });
  }

  /**
   * @param {string} tag
   * @returns {Promise<CustomElementConstructor>}
   */
  whenDefined(tag) {
    return customElements.whenDefined(tag);
  }

  /**
   * @param {PreviewMountContext} _ctx
   * @returns {void | Promise<void>}
   */
  mount(_ctx) {
    /* override */
  }

  /**
   * @param {PreviewMountContext} _ctx
   */
  unmount(_ctx) {
    this.#ac?.abort();
    this.#ac = null;
  }
}

export default ISComponentPreview;
