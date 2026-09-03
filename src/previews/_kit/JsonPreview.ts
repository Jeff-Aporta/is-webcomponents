/**
 * Preview respaldado solo por PreviewDefinition (JSON) + behavior opcional.
 * Sin HTML por componente: el chrome lo pinta <is-preview-component>.
 * Tipado estructural local (el _kit usa JSDoc; aqui TS estricto y limpio).
 */
import { ISComponentPreview } from './ISComponentPreview.js';
import { montarControles } from '../../utils/system/controles.js';

/** Forma mínima de la definición (is-preview/v1). */
type DefinicionPreview = { tag: string; category?: string; $schema?: string; sections?: Array<{ id?: string; blocks?: Array<Record<string, unknown>> }>; };

/** Contexto de montaje (main/root pintados por el chrome). */
type CtxMontaje = { main?: HTMLElement | null; root?: HTMLElement | null; aside?: HTMLElement | null; };

/** Módulo de comportamiento opcional (behaviors/<tag>.js). */
type ModuloBehavior = { mount?(ctx: CtxMontaje, preview: unknown): unknown; unmount?(ctx: CtxMontaje, preview: unknown): void; };

export class JsonPreview extends ISComponentPreview {
  #behavior: ModuloBehavior | null = null;

  constructor(definition: DefinicionPreview, behavior: ModuloBehavior | null = null) {
    const normalized: DefinicionPreview = {
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

  async mount(ctx: CtxMontaje): Promise<void> {
    if (this.#behavior?.mount) await this.#behavior.mount(ctx, this);
    // Playground JSON-driven: paneles de controles de los bloques demo/html
    // que declaren `controls` (se aplican vía JSON -> prop/attr del host).
    const definition = (this as unknown as { definition: DefinicionPreview }).definition;
    try {
      await montarControles(definition, ctx);
    } catch (e) {
      console.warn(`[preview] ${definition.tag}: controles no montados`, e);
    }
  }

  unmount(ctx: CtxMontaje): void {
    try {
      this.#behavior?.unmount?.(ctx, this);
    } finally {
      super.unmount(ctx);
    }
  }
}

export default JsonPreview;
