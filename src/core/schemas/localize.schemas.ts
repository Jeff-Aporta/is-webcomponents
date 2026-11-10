// @contexto INDICE.md · src/core/README.md
/**
 * localize.schemas.ts — tipos de `core/localize.ts`.
 */

/** Un término: texto fijo o función para plural/interpolación. */
export type Termino = string | ((...args: unknown[]) => string);
/** Diccionario de un idioma: clave camelCase → término. */
export type Terminos = Record<string, Termino>;
/** Lo que el observador de idioma necesita de un componente vivo. */
export type Localizable = { solicitarRender(): unknown };
/** Familias de `Intl` memorizadas. */
export type TipoFormato = 'number' | 'date' | 'relative';
/** Formateador devuelto por `formato()` según la familia. */
export type Formateador = Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat;
