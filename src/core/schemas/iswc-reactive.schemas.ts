// @contexto INDICE.md · src/core/README.md
/**
 * iswc-reactive.schemas.ts — tipos de `core/iswc-reactive.ts` (propiedades reactivas y plantilla `html`).
 */

/** Conversión atributo ↔ propiedad. */
export type TipoProp = 'str' | 'bool' | 'num' | 'json';
/** Opciones de `@prop`. `attr: false` = solo propiedad; `reflect: false` no escribe el atributo; `vacio` conserva `x=""`. */
export type OpcionesProp = { attr?: string | false; reflect?: boolean; type?: TipoProp; enum?: readonly string[]; vacio?: boolean };
/** Definición resuelta de una propiedad reactiva (una por campo decorado). */
export type DefProp = { prop: string; attr: string | false; reflect: boolean; type: TipoProp; enum: readonly string[] | null; vacio: boolean; defecto: unknown };
/** Vigía de `@watch`: método a llamar cuando cambie alguna de `props`. */
type Vigia = { props: readonly string[]; metodo: string; esperar: boolean };
/** Lo que guardan los decoradores en `Clase[Symbol.metadata]`. */
export type MetaReactiva = { iswcProps?: Record<string, DefProp>; iswcVigias?: readonly Vigia[] };
/** Cambios de un ciclo: nombre de la propiedad → valor anterior. */
export type Cambios = Map<string, unknown>;
