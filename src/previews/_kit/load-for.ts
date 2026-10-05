/**
 * src/previews/_kit/load-for.ts — Helper de carga perezosa para previews.
 *
 * Phase W56: cada JSON de preview puede declarar `loads: string[]`, una
 * lista de tags `iswc-*` que el demo necesita pero que el chrome de la
 * galería no trae de base. Antes de pintar el primer `iswc-demo`, el
 * caller espera a `loadFor(def)` para que el upgrade de los CEs ocurra
 * sin parpadeos.
 *
 * ¿Por qué un módulo aparte?
 *   `render.ts` arrastra dependencias del DOM (HTMLElement, customElements,
 *   document, etc.) y por tanto no se puede importar desde tests en
 *   Node. `loadFor` no toca el DOM: solo habla con
 *   `ISWebComponentsLoader` (vía `globalThis`). Aislado aquí, los
 *   tests de W56 lo pueden importar y mockear sin pasar por el bundle
 *   del chrome.
 *
 * Contrato:
 *   - Si `def.loads` está ausente o vacío → `null` (cero fetches).
 *   - Si tiene tags → `ISWebComponentsLoader.load(...loads)`. El
 *     loader ya es idempotente: tags ya cargados se reportan en
 *     `skipped`.
 *   - Sin `ISWebComponentsLoader` en `globalThis` (caso de tests en
 *     Node o de previews que se montan sin loader), `loadFor` degrada
 *     a un no-op: `{ loaded: [], skipped: [], requested: true }`.
 *
 * Tags que **no** deben listarse en `loads`:
 *   - Componentes del chrome de la galería (`iswc-demo-section`,
 *     `iswc-playground`, `iswc-icon`, `iswc-button`, `iswc-tooltip`,
 *     `iswc-tab-group`, `iswc-tab`, `iswc-tab-panel`, `iswc-select`,
 *     `iswc-option`, `iswc-input`, `iswc-details`; ver
 *     `collect-iswc-tags.ts → GALLERY_CHROME_TAGS`).
 *   - El propio `def.tag` (ya está cubierto por la navegación del
 *     chrome).
 *
 * Listar **solo** los específicos del preview que no entren en el
 * chrome (p. ej. un `<iswc-flowchart>` dentro de un demo de
 * `iswc-button-group`, o un `<iswc-pdf-viewer>` en un preview de
 * overlays).
 */
import type { PreviewDefinition } from './types.d.ts';
import type { LoadForResult, LoaderLike } from './load-for.schemas.ts';

export type { LoadForResult, LoaderLike } from './load-for.schemas.ts';

/** Filtra `def.loads` quedándose solo con strings no-vacíos. */
export function normalizeLoads(def: PreviewDefinition): string[] {
  if (!def || !Array.isArray(def.loads)) return [];
  return def.loads.filter((t): t is string => typeof t === 'string' && !!t.trim());
}

/**
 * Precarga los tags declarados en `def.loads` vía el loader CDN.
 *
 * Esta función es independiente del `renderDefinition`: la galería puede
 * esperar a `loadFor` antes de pintar el demo, o correrlas en paralelo
 * (el loader no interfiere con el `replaceChildren` del main).
 *
 * @param def Definición del preview (incluye `loads?: string[]`).
 * @param loaderOverride Opcional: pasar un mock del loader (tests).
 * @returns Resultado de la carga; `null` si el def no declaraba `loads`.
 */
export async function loadFor(
  def: PreviewDefinition,
  loaderOverride?: LoaderLike,
): Promise<LoadForResult | null> {
  const declared = normalizeLoads(def);
  if (!declared.length) return null;

  // Resolver loader: override (tests) → globalThis (runtime).
  let loader: LoaderLike | null = loaderOverride ?? null;
  if (!loader && typeof globalThis !== 'undefined') {
    const g = (globalThis as { ISWebComponentsLoader?: unknown }).ISWebComponentsLoader;
    if (g && typeof g === 'object' && 'load' in g) {
      loader = g as LoaderLike;
    }
  }
  if (!loader) {
    // Sin loader: degradamos a no-op. El caller recibe la lista
    // `requested` para que pueda mostrarla en logs si quiere.
    return { loaded: [], skipped: [], requested: true };
  }

  const result = await loader.load(...declared);
  return {
    loaded: result.loaded ?? [],
    skipped: result.skipped ?? [],
    requested: true,
  };
}
