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
/** Resultado de `html\`…\``: el literal (clave de caché) y sus valores; `svg` = se parsea en el espacio SVG. */
export type Resultado = { s: TemplateStringsArray; v: readonly unknown[]; svg: boolean };
/** Lista con clave de `repetir()`. */
export type Repeticion = { repetir: true; items: readonly unknown[]; clave: (item: unknown, i: number) => unknown; plantilla: (item: unknown, i: number) => Resultado };
/** Tipo de parte: hijo, atributo, booleano, propiedad o evento. */
export type TipoParte = 'h' | 'a' | '?' | '.' | '@';
/** Parte de una plantilla preparada: índice del valor, posición del nodo en el recorrido, tipo y nombre. */
export type DescParte = { i: number; nodo: number; tipo: TipoParte; nombre: string };
/** Plantilla preparada una vez por literal. */
export type Preparada = { t: HTMLTemplateElement; partes: readonly DescParte[] };
/** Instancia viva de una plantilla: rango [inicio, fin] en el DOM y sus partes. */
export type Instancia = { s: TemplateStringsArray; inicio: Comment; fin: Comment; partes: ParteViva[] };
/** Parte viva: el nodo, el último valor, el contenido actual (si es hijo) y el anfitrión de los eventos. */
export type ParteViva = { d: DescParte; el: Node; ultimo: unknown; texto: Text | null; sub: Instancia | null; lista: Instancia[] | null; claves: Map<unknown, Instancia> | null; host: unknown };
