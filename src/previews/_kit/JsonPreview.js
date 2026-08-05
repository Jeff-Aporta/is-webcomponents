/**
 * Preview respaldado solo por PreviewDefinition (JSON) + behavior opcional.
 * Sin HTML por componente: el chrome lo pinta <is-preview-component>.
 *
 * @typedef {import('./types.d.ts').PreviewDefinition} PreviewDefinition
 * @typedef {import('./types.d.ts').PreviewMountContext} PreviewMountContext
 * @typedef {import('./types.d.ts').PreviewBehaviorModule} PreviewBehaviorModule
 */
import { ISComponentPreview } from './ISComponentPreview.js';

export class JsonPreview extends ISComponentPreview {
  /** @type {PreviewBehaviorModule | null} */
  #behavior;

  /**
   * @param {PreviewDefinition} definition
   * @param {PreviewBehaviorModule | null} [behavior]
   */
  constructor(definition, behavior = null) {
    const normalized = {
      ...definition,
      category: definition.category ?? '',
      $schema: definition.$schema || 'is-preview/v1',
    };
    if (normalized.$schema !== 'is-preview/v1') {
      throw new Error(`JsonPreview(${normalized.tag}): $schema debe ser "is-preview/v1"`);
    }
    super(normalized);
    this.#behavior = behavior;
  }

  /** @param {PreviewMountContext} ctx */
  async mount(ctx) {
    if (this.#behavior?.mount) await this.#behavior.mount(ctx, this);
  }

  /** @param {PreviewMountContext} ctx */
  unmount(ctx) {
    try {
      this.#behavior?.unmount?.(ctx, this);
    } finally {
      super.unmount(ctx);
    }
  }
}

export default JsonPreview;
