// @contexto INDICE.md · src/core/README.md
/**
 * iswc-element.schemas.ts — tipos de `core/iswc-element.ts` (el molde único de los componentes).
 */
import type { StyleAttrMap } from './attrs.schemas.js';

/** Lo que el molde lee de la clase concreta (estáticos del componente y alias heredados de `ElementBase`). */
export type IswcElementStatics = { tag: string; css: string; cssHref: string | null; template: HTMLTemplateElement | null; observed: readonly string[]; deps: readonly string[]; shadowInit: ShadowRootInit | null; styleAttrs: StyleAttrMap; observedAttributes: string[]; TEMPLATE?: HTMLTemplateElement | null; __TEMPLATE?: HTMLTemplateElement | null };

/** Lo único que el molde usa del loader global (`globalThis.iswcLoader`) para las dependencias perezosas. */
export type LoaderDeps = { ensure?(tag: string): Promise<unknown> };

/** Constructor que `define()` acepta: un custom element con `static tag`. */
export type ConstructorConTag = CustomElementConstructor & { tag: string };
