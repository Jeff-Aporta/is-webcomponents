// @contexto INDICE.md · src/core/README.md
/**
 * plantilla.schemas.ts — tipos de `core/plantilla.ts` (plantilla `html` y sus partes).
 */

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
