/**
 * Preview respaldado solo por PreviewDefinition (JSON) + behavior opcional.
 * Sin HTML por componente: el chrome lo pinta <iswc-preview-component>.
 * Tipado estructural local (el _kit usa JSDoc; aqui TS estricto y limpio).
 *
 * Soporta dos shapes de JSON de entrada (Phase N — zod-migration):
 *   - `iswc-preview/v1` (legacy): `sections: [{ id, title, blocks[] }]`.
 *   - `iswc-ficha/v1` o sub-objeto `ficha:` (ver `ficha-bridge.ts`):
 *     Zod validation + `console.warn` para secciones ausentes (respetando
 *     `exclude`). El bridge convierte a PreviewDefinition o prepende el
 *     `playground` HTML a la primera sección del preview, según el modo.
 *
 * Tradeoff de tamaño: la ficha-bridge importa zod (≈330 KB minificado) y se
 * bundlea dentro del SPA. Por ahora lo aceptamos para no añadir un external
 * dependency a la build (zod no está publicado en el CDN del kit). Si en
 * el futuro el bundle se vuelve problema, mover el bridge a un chunk aparte
 * con `external: ['zod']` en la build de gallery-app.
 */
import { ISComponentPreview } from './ISComponentPreview.js';
import { montarControles } from '../../utils/system/controles.js';
import { loadFichaLikeDefinition } from './ficha-bridge.ts';

import type { PreviewDefinition, PreviewMountContext } from './types.d.ts';
import type { DefinicionPreview, CtxMontaje, ModuloBehavior, ConDefinicion } from "./JsonPreview.schemas.js";

/** Forma mínima de la definición (iswc-preview/v1 o ficha via sub-objeto). */

/** Contexto de montaje (main/root pintados por el chrome). */

/** Módulo de comportamiento opcional (behaviors/<tag>.js). */

/** Vista del preview con su definición (la base la expone congelada). */

export class JsonPreview extends ISComponentPreview {
  #behavior: ModuloBehavior | null = null;

  constructor(definition: DefinicionPreview, behavior: ModuloBehavior | null = null) {
    // Si la definición viene en formato ficha (sub-objeto `ficha:` o
    // `$schema: iswc-ficha/v1` o `sections` objeto), el bridge la convierte
    // a PreviewDefinition y emite los warnings de secciones ausentes. Para
    // iswc-preview/v1 puro, el bridge es un no-op.
    const converted = loadFichaLikeDefinition(definition as Record<string, unknown>);

    const normalized: PreviewDefinition = {
      ...converted,
      category: converted.category ?? '',
      $schema: (converted.$schema || 'iswc-preview/v1') as 'iswc-preview/v1',
      // Conservar title del JSON; si falta, el H2 muestra `<tag>` (texto, no CE).
      title: converted.title || `<${definition.tag}>`,
      sections: converted.sections ?? [],
      // Phase W21: preservar `examples` (tipado Zod en section-schema.ts).
      // El render lo inyecta en cualquier <iswc-examples-carousel>.
      ...(Array.isArray(converted.examples) ? { examples: converted.examples } : {}),
    };
    if (normalized.$schema !== 'iswc-preview/v1') {
      throw new Error(`JsonPreview(${normalized.tag}): $schema debe ser "iswc-preview/v1" (post-bridge)`);
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
