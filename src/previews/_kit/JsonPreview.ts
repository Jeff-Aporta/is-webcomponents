/**
 * Preview respaldado solo por PreviewDefinition (JSON) + behavior opcional.
 * Sin HTML por componente: el chrome lo pinta <iswc-preview-component>.
 * Tipado estructural local (el _kit usa JSDoc; aqui TS estricto y limpio).
 */
import { ISComponentPreview } from './ISComponentPreview.js';
import { montarControles } from '../../utils/system/controles.js';

import type { PreviewDefinition, PreviewMountContext } from './types.d.ts';

/** Forma mínima de la definición (iswc-preview/v1). */
type DefinicionPreview = { tag: string; category?: string; $schema?: string; sections?: Array<{ id?: string; blocks?: Array<Record<string, unknown>> }>; };

/** Contexto de montaje (main/root pintados por el chrome). */
type CtxMontaje = { main?: HTMLElement | null; root?: HTMLElement | null; aside?: HTMLElement | null; };

/** Módulo de comportamiento opcional (behaviors/<tag>.js). */
type ModuloBehavior = { mount?(ctx: CtxMontaje, preview: unknown): unknown; unmount?(ctx: CtxMontaje, preview: unknown): void; };

/** Vista del preview con su definición (la base la expone congelada). */
type ConDefinicion = { definition: DefinicionPreview };

export class JsonPreview extends ISComponentPreview {
  #behavior: ModuloBehavior | null = null;

  constructor(definition: DefinicionPreview, behavior: ModuloBehavior | null = null) {
    const normalized: PreviewDefinition = {
      ...definition,
      category: definition.category ?? '',
      $schema: (definition.$schema || 'iswc-preview/v1') as 'iswc-preview/v1',
      // Conservar title del JSON; si falta, el H2 muestra `<tag>` (texto, no CE).
      title: (definition as PreviewDefinition).title || `<${definition.tag}>`,
      sections: definition.sections ?? [],
    };
    if (normalized.$schema !== 'iswc-preview/v1') {
      throw new Error(`JsonPreview(${normalized.tag}): $schema debe ser "iswc-preview/v1"`);
    }
    super(normalized);
    this.#behavior = behavior;
  }

  async mount(ctx: PreviewMountContext): Promise<void> {
    if (this.#behavior?.mount) await this.#behavior.mount(ctx, this);
    // Playground JSON-driven: paneles de controles de los bloques demo/html
    // que declaren `controls` (se aplican vía JSON -> prop/attr del host).
    const definition = (this as unknown as ConDefinicion).definition;
    try {
      await montarControles(definition, ctx);
    } catch (e) {
      console.warn(`[preview] ${definition.tag}: controles no montados`, e);
    }
  }

  unmount(ctx: PreviewMountContext): void {
    try {
      this.#behavior?.unmount?.(ctx, this);
    } finally {
      super.unmount(ctx);
    }
  }
}

export default JsonPreview;
