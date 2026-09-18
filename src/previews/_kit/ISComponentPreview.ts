/**
 * ISComponentPreview — controlador tipado de un preview de componente.
 *
 * La definición (secciones/bloques) es datos. El comportamiento se escribe en
 * `mount` / `unmount` como métodos reales (addEventListener, whenDefined, …).
 * Nunca `eval` ni strings de lógica.
 */

import type {
  PreviewDefinition,
  PreviewMountContext,
  ISComponentPreviewLike,
} from './types.d.ts';

/** Implementación concreta de ISComponentPreviewLike. */
export class ISComponentPreview implements ISComponentPreviewLike {
  readonly definition: PreviewDefinition;
  #ac: AbortController | null = null;

  constructor(definition: PreviewDefinition) {
    if (!definition?.tag) throw new Error('ISComponentPreview: falta definition.tag');
    if (!Array.isArray(definition.sections)) {
      throw new Error(`ISComponentPreview(${definition.tag}): sections[] obligatorio`);
    }
    this.definition = Object.freeze({
      ...definition,
      sections: definition.sections.map((s) => Object.freeze({ ...s, blocks: [...s.blocks] })),
    }) as PreviewDefinition;
  }

  /**
   * Signal para listeners: this.on(el, 'is-change', handler)
   * Se aborta automáticamente en unmount.
   */
  get signal(): AbortSignal {
    if (!this.#ac) this.#ac = new AbortController();
    return this.#ac.signal;
  }

  on(
    target: HTMLElement,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options: AddEventListenerOptions = {},
  ): void {
    if (!target || typeof target.addEventListener !== 'function') return;
    target.addEventListener(type, listener, { ...options, signal: this.signal });
  }

  whenDefined(tag: string): Promise<CustomElementConstructor> {
    return customElements.whenDefined(tag);
  }

  mount(_ctx: PreviewMountContext): void | Promise<void> {
    /* override */
  }

  unmount(_ctx: PreviewMountContext): void {
    this.#ac?.abort();
    this.#ac = null;
  }
}

export default ISComponentPreview;
